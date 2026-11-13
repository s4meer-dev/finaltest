"""
Broker Execution Adapters
─────────────────────────
Broker-agnostic execution layer for the AI Trader signal pipeline.

Architecture:
  scan_market() → OrderManager → BrokerAdapter.buy/sell/modify_sl

Adapters:
  AlpacaAdapter   — Alpaca Paper Trading API v2 (https://paper-api.alpaca.markets/v2)
  PaperAdapter    — local simulated in-memory paper trades

Config:
  TRADE_MODE env var: "alpaca" (default) | "paper"
  ORDER_CONFIRMATION: "manual" (default for human approval) | "auto"
"""

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
from broker.alpaca_adapter import AlpacaAdapter
from broker.paper_adapter import PaperAdapter

__all__ = [
    "BrokerAdapter",
    "OrderRequest",
    "OrderResponse",
    "OrderSide",
    "OrderStatus",
    "OrderType",
    "Position",
    "ProductType",
    "AlpacaAdapter",
    "PaperAdapter",
]
