"""
Alpaca Paper Trading Adapter
─────────────────────────────
Execution and position management via Alpaca's Paper Trading API v2.
API Base: https://paper-api.alpaca.markets/v2
Dashboard: https://app.alpaca.markets/dashboard/overview

Capabilities:
  - Direct paper orders (Market, Limit, Stop, Bracket with SL/TP)
  - Live account equity, cash, and buying power inspection
  - Real-time position tracking and unrealized/realized P&L
  - Emergency Kill Switch (cancels all orders and closes all positions)
  - Seamless simulated fallback if credentials are pending

Docs: https://docs.alpaca.markets/docs/trading-api
"""

from __future__ import annotations

import os
import uuid
import requests
from datetime import datetime
from typing import Optional

from broker.base_adapter import (
    BrokerAdapter,
    OrderRequest,
    OrderResponse,
    OrderSide,
    OrderStatus,
    OrderType,
    Position,
    ProductType,
)
from utils.logger import get_logger

logger = get_logger("alpaca_adapter")


class AlpacaAdapter(BrokerAdapter):
    """
    Alpaca Paper Trading Adapter.
    Communicates directly with https://paper-api.alpaca.markets/v2
    """

    def __init__(self):
        self._api_key = os.getenv("ALPACA_API_KEY", os.getenv("APCA_API_KEY_ID", "")).strip()
        self._secret_key = os.getenv("ALPACA_SECRET_KEY", os.getenv("APCA_API_SECRET_KEY", "")).strip()
        self._base_url = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets/v2").rstrip("/")
        self._connected = False
        self._account_info: dict = {}
        # In-memory backup / paper fallback if credentials are empty
        self._simulated_positions: dict[str, Position] = {}
        self._simulated_orders: list[OrderResponse] = []

    @property
    def headers(self) -> dict:
        return {
            "APCA-API-KEY-ID": self._api_key,
            "APCA-API-SECRET-KEY": self._secret_key,
            "Content-Type": "application/json",
        }

    # ── Authentication ────────────────────────────────────────────────

    def authenticate(self) -> bool:
        """
        Verify credentials by querying Alpaca Paper Account endpoint.
        """
        if not self._api_key or not self._secret_key:
            logger.warning(
                "ALPACA_API_KEY or ALPACA_SECRET_KEY not set in .env. "
                "Operating in simulated paper mode until keys are provided."
            )
            self._connected = False
            return True  # Allows server to boot cleanly in simulated paper mode

        try:
            resp = requests.get(f"{self._base_url}/account", headers=self.headers, timeout=8)
            if resp.status_code == 200:
                self._account_info = resp.json()
                self._connected = True
                logger.info(
                    f"Alpaca Paper Connected! Account: {self._account_info.get('account_number')}, "
                    f"Equity: ${float(self._account_info.get('equity', 0)):,.2f}, "
                    f"Buying Power: ${float(self._account_info.get('buying_power', 0)):,.2f}"
                )
                return True
            else:
                logger.error(f"Alpaca auth failed (status {resp.status_code}): {resp.text}")
                self._connected = False
                return False
        except Exception as e:
            logger.error(f"Alpaca connection error: {e}")
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def broker_name(self) -> str:
        return "Alpaca Paper" if self._connected else "Paper (Simulation)"

    def get_account_summary(self) -> dict:
        """Fetch current balance, buying power and equity from Alpaca."""
        if self._connected:
            try:
                resp = requests.get(f"{self._base_url}/account", headers=self.headers, timeout=5)
                if resp.status_code == 200:
                    self._account_info = resp.json()
            except Exception as e:
                logger.warning(f"Error fetching Alpaca account: {e}")

        return {
            "connected": self._connected,
            "broker": self.broker_name,
            "equity": float(self._account_info.get("equity", 100000.0)),
            "cash": float(self._account_info.get("cash", 100000.0)),
            "buying_power": float(self._account_info.get("buying_power", 200000.0)),
            "portfolio_value": float(self._account_info.get("portfolio_value", 100000.0)),
            "status": self._account_info.get("status", "ACTIVE" if self._connected else "SIMULATED"),
            "currency": self._account_info.get("currency", "USD"),
        }

    # ── Order Placement ───────────────────────────────────────────────

    def place_order(self, request: OrderRequest) -> OrderResponse:
        """
        Place an order with Alpaca Paper API.
        If credentials not connected, uses internal instant simulated fill.
        """
        side_val = "buy" if request.side == OrderSide.BUY else "sell"
        qty = max(1, int(request.quantity))
        symbol = request.symbol.upper()

        if self._connected:
            try:
                payload = {
                    "symbol": symbol,
                    "qty": qty,
                    "side": side_val,
                    "type": "market" if request.order_type == OrderType.MARKET else "limit",
                    "time_in_force": "day",
                }

                if request.order_type == OrderType.LIMIT and request.price > 0:
                    payload["limit_price"] = round(request.price, 2)

                # Optional Bracket Order with Stop Loss
                if request.trigger_price > 0:
                    payload["order_class"] = "bracket"
                    payload["stop_loss"] = {"stop_price": round(request.trigger_price, 2)}
                    if request.price > 0:
                        # Target ~ 1.5x - 2x
                        target = round(request.price + abs(request.price - request.trigger_price) * 1.5, 2)
                        payload["take_profit"] = {"limit_price": target}

                resp = requests.post(f"{self._base_url}/orders", headers=self.headers, json=payload, timeout=8)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    order_id = data.get("id", f"ALPAC-{uuid.uuid4().hex[:8]}")
                    status_raw = data.get("status", "accepted")
                    avg_fill = float(data.get("filled_avg_price") or request.price or 0.0)

                    logger.info(f"Alpaca Order Submitted: {side_val.upper()} {qty} {symbol} [ID: {order_id}] status={status_raw}")
                    return OrderResponse(
                        order_id=str(order_id),
                        status=OrderStatus.COMPLETE if status_raw in ("filled", "partially_filled") else OrderStatus.OPEN,
                        filled_quantity=int(data.get("filled_qty", 0)),
                        average_price=avg_fill,
                        message=f"Alpaca {side_val.upper()} {status_raw}",
                        timestamp=datetime.now(),
                        raw=data,
                    )
                else:
                    err_msg = resp.text
                    logger.error(f"Alpaca order placement rejected: {err_msg}")
                    return OrderResponse(
                        status=OrderStatus.REJECTED,
                        message=err_msg,
                        timestamp=datetime.now(),
                    )
            except Exception as e:
                logger.error(f"Alpaca order exception: {e}")
                return OrderResponse(status=OrderStatus.ERROR, message=str(e), timestamp=datetime.now())

        # Fallback simulated order execution
        sim_id = f"SIM-{uuid.uuid4().hex[:10]}"
        fill_price = request.price if request.price > 0 else 100.0
        response = OrderResponse(
            order_id=sim_id,
            status=OrderStatus.COMPLETE,
            filled_quantity=qty,
            average_price=fill_price,
            message=f"Simulated {side_val.upper()} filled at ${fill_price:.2f}",
            timestamp=datetime.now(),
            raw={"symbol": symbol, "side": side_val, "qty": qty},
        )
        self._simulated_orders.append(response)

        if request.side == OrderSide.BUY:
            self._simulated_positions[sim_id] = Position(
                symbol=symbol,
                exchange="NASDAQ",
                quantity=qty,
                average_price=fill_price,
                last_price=fill_price,
                pnl=0.0,
                product=ProductType.MIS,
                order_id=sim_id,
            )
        elif request.side == OrderSide.SELL:
            for pid, pos in list(self._simulated_positions.items()):
                if pos.symbol == symbol and pos.quantity > 0:
                    pos.quantity = max(0, pos.quantity - qty)
                    if pos.quantity == 0:
                        del self._simulated_positions[pid]
                    break

        return response

    def modify_order(
        self,
        order_id: str,
        quantity: Optional[int] = None,
        price: Optional[float] = None,
        trigger_price: Optional[float] = None,
        order_type: Optional[OrderType] = None,
    ) -> OrderResponse:
        if not self._connected:
            return OrderResponse(order_id=order_id, status=OrderStatus.OPEN, message="Simulated modified")

        try:
            payload: dict = {}
            if quantity is not None:
                payload["qty"] = int(quantity)
            if price is not None:
                payload["limit_price"] = round(price, 2)
            if trigger_price is not None:
                payload["stop_price"] = round(trigger_price, 2)

            resp = requests.patch(f"{self._base_url}/orders/{order_id}", headers=self.headers, json=payload, timeout=8)
            if resp.status_code == 200:
                return OrderResponse(order_id=order_id, status=OrderStatus.OPEN, message="Modified on Alpaca")
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=resp.text)
        except Exception as e:
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=str(e))

    def cancel_order(self, order_id: str) -> OrderResponse:
        if not self._connected:
            return OrderResponse(order_id=order_id, status=OrderStatus.CANCELLED, message="Simulated cancelled")

        try:
            resp = requests.delete(f"{self._base_url}/orders/{order_id}", headers=self.headers, timeout=8)
            if resp.status_code in (200, 204):
                return OrderResponse(order_id=order_id, status=OrderStatus.CANCELLED, message="Cancelled on Alpaca")
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=resp.text)
        except Exception as e:
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=str(e))

    # ── Position & Order Queries ──────────────────────────────────────

    def get_positions(self) -> list[Position]:
        if not self._connected:
            return list(self._simulated_positions.values())

        try:
            resp = requests.get(f"{self._base_url}/positions", headers=self.headers, timeout=8)
            if resp.status_code == 200:
                positions = []
                for p in resp.json():
                    qty = int(p.get("qty", 0))
                    if qty != 0:
                        positions.append(Position(
                            symbol=p.get("symbol", ""),
                            exchange=p.get("exchange", "US"),
                            quantity=qty,
                            average_price=float(p.get("avg_entry_price", 0.0)),
                            last_price=float(p.get("current_price", 0.0)),
                            pnl=float(p.get("unrealized_pl", 0.0)),
                            product=ProductType.MIS,
                            order_id=p.get("asset_id", ""),
                        ))
                return positions
            return []
        except Exception as e:
            logger.error(f"Alpaca get_positions failed: {e}")
            return []

    def get_order_status(self, order_id: str) -> OrderResponse:
        if not self._connected:
            for o in self._simulated_orders:
                if o.order_id == order_id:
                    return o
            return OrderResponse(order_id=order_id, status=OrderStatus.COMPLETE)

        try:
            resp = requests.get(f"{self._base_url}/orders/{order_id}", headers=self.headers, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                raw_st = data.get("status", "")
                st = OrderStatus.COMPLETE if raw_st == "filled" else OrderStatus.OPEN if raw_st in ("new", "accepted") else OrderStatus.CANCELLED
                return OrderResponse(
                    order_id=order_id,
                    status=st,
                    filled_quantity=int(data.get("filled_qty", 0)),
                    average_price=float(data.get("filled_avg_price") or 0.0),
                    message=raw_st,
                    raw=data,
                )
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=resp.text)
        except Exception as e:
            return OrderResponse(order_id=order_id, status=OrderStatus.ERROR, message=str(e))

    def get_orders_today(self) -> list[OrderResponse]:
        if not self._connected:
            return list(self._simulated_orders)

        try:
            resp = requests.get(f"{self._base_url}/orders?status=all&limit=50", headers=self.headers, timeout=8)
            if resp.status_code == 200:
                results = []
                for o in resp.json():
                    raw_st = o.get("status", "")
                    st = OrderStatus.COMPLETE if raw_st == "filled" else OrderStatus.OPEN
                    results.append(OrderResponse(
                        order_id=str(o.get("id")),
                        status=st,
                        filled_quantity=int(o.get("filled_qty", 0)),
                        average_price=float(o.get("filled_avg_price") or 0.0),
                        message=raw_st,
                        raw=o,
                    ))
                return results
            return []
        except Exception as e:
            logger.error(f"Alpaca get_orders_today failed: {e}")
            return []

    # ── Safety ────────────────────────────────────────────────────────

    def kill_switch(self) -> list[OrderResponse]:
        """
        EMERGENCY KILL SWITCH: Liquidate all open positions & cancel all orders.
        """
        logger.warning("ALPACAPAPER: KILL SWITCH ACTIVATED!")
        responses = []

        if self._connected:
            try:
                # Cancel all orders
                resp_orders = requests.delete(f"{self._base_url}/orders", headers=self.headers, timeout=10)
                logger.info(f"Kill switch cancelled orders: {resp_orders.status_code}")
                # Close all positions
                resp_pos = requests.delete(f"{self._base_url}/positions", headers=self.headers, timeout=10)
                logger.info(f"Kill switch liquidated positions: {resp_pos.status_code}")
                responses.append(OrderResponse(status=OrderStatus.COMPLETE, message="Alpaca liquidated all positions and cancelled orders"))
            except Exception as e:
                logger.error(f"Alpaca kill switch error: {e}")
                responses.append(OrderResponse(status=OrderStatus.ERROR, message=str(e)))
        else:
            self._simulated_positions.clear()
            self._simulated_orders.clear()
            responses.append(OrderResponse(status=OrderStatus.COMPLETE, message="Simulated positions cleared"))

        return responses

