"""
Execution Broker Adapter Bridge
───────────────────────────────
Routes orders to the modern broker adapter layer (Alpaca Paper / PaperAdapter).
Maintains backwards compatibility for any legacy callers.
"""

from broker.alpaca_adapter import AlpacaAdapter
from broker.base_adapter import OrderRequest, OrderResponse, OrderSide, OrderType, OrderStatus
from utils.logger import get_logger

logger = get_logger("execution.broker_adapter")


class BrokerAdapter:
    """Compatibility wrapper that delegates to AlpacaAdapter."""

    def __init__(self):
        self._adapter = AlpacaAdapter()
        self._adapter.authenticate()

    def place_order(
        self,
        symbol: str,
        qty: int,
        side: str = "BUY",
        order_type: str = "MARKET",
        price: float = 0,
        exchange: str = "NASDAQ",
        product: str = "MIS",
    ):
        req = OrderRequest(
            symbol=symbol,
            quantity=qty,
            side=OrderSide.BUY if side.upper() == "BUY" else OrderSide.SELL,
            order_type=OrderType.MARKET if order_type.upper() == "MARKET" else OrderType.LIMIT,
            price=price,
            exchange=exchange,
        )
        resp = self._adapter.place_order(req)
        return resp.order_id if resp.order_id else None
