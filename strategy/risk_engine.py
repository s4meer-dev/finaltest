"""
Multi-Tier Risk Strategy Engine
───────────────────────────────
Calculates specific risk-calibrated trade plans across Low, Medium, and High
risk profiles for any detected setup.

For each tier:
  - Generates exact SL, Target, position sizing, and dollar risk/reward
  - Generates visually stunning Pine Script v5 code ready for TradingView
  - Formats pattern descriptions and visual annotations
"""

from __future__ import annotations
from typing import Dict, Any, List
from strategy.pinescript_generator import generate_visual_pine_script


def build_multi_tier_plans(
    symbol: str,
    direction: str,
    strategy: str,
    entry_price: float,
    ml_prob: float,
    final_score: float,
    regime: str,
    technical_strength: float = 0.8,
) -> Dict[str, Dict[str, Any]]:
    """
    Generate tailored trade plans for Low, Medium, and High risk profiles.
    Returns: {"low": plan_dict, "medium": plan_dict, "high": plan_dict}
    """
    is_long = direction.upper() in ("CALL", "BUY", "LONG")
    sym = symbol.upper()
    prefix = "NASDAQ" if sym in ("AAPL", "TSLA", "NVDA", "QQQ", "MSFT", "AMZN", "GOOGL") else "AMEX" if sym == "SPY" else ""
    tv_sym = f"{prefix}:{sym}" if prefix else sym
    tv_url = f"https://in.tradingview.com/chart/?symbol={tv_sym}&interval=1"

    tiers = {
        "low": {
            "risk_tier": "LOW",
            "tier_title": "Conservative Wealth Preservation",
            "lots": 1,
            "shares": 10,
            "sl_pct": 0.08,
            "tgt_pct": 0.22,
            "win_rate_target": "78%",
            "pattern_name": "Consolidation Retest & Tight Channel",
            "pattern_desc": "High-conviction entry with tight invalidation below local support. Designed for low drawdown and steady compounding.",
            "min_score": 0.65,
        },
        "medium": {
            "risk_tier": "MEDIUM",
            "tier_title": "Balanced Alpha & Trend Following",
            "lots": 2,
            "shares": 25,
            "sl_pct": 0.14,
            "tgt_pct": 0.38,
            "win_rate_target": "68%",
            "pattern_name": "Institutional VWAP Surge & Liquidity Expansion",
            "pattern_desc": "Balanced momentum setup capturing mid-session trends with dynamic trailing protection.",
            "min_score": 0.58,
        },
        "high": {
            "risk_tier": "HIGH",
            "tier_title": "Aggressive Breakout & Maximum Momentum",
            "lots": 4,
            "shares": 50,
            "sl_pct": 0.20,
            "tgt_pct": 0.60,
            "win_rate_target": "60%",
            "pattern_name": "High-Beta Expansion Breakout",
            "pattern_desc": "Aggressive breakout setup seeking maximum volatility upside with wider stop cushions.",
            "min_score": 0.50,
        },
    }

    plans = {}
    for tier_key, cfg in tiers.items():
        sl_pct = cfg["sl_pct"]
        tgt_pct = cfg["tgt_pct"]
        
        if is_long:
            sl_price = round(entry_price * (1.0 - sl_pct), 2)
            target_price = round(entry_price * (1.0 + tgt_pct), 2)
        else:
            sl_price = round(entry_price * (1.0 + sl_pct), 2)
            target_price = round(entry_price * (1.0 - tgt_pct), 2)

        pts_gain = abs(target_price - entry_price)
        pts_loss = abs(entry_price - sl_price)
        shares = cfg["shares"]
        
        max_loss_usd = round(pts_loss * shares, 2)
        target_profit_usd = round(pts_gain * shares, 2)
        rr_ratio = round(pts_gain / max(pts_loss, 0.01), 2)

        plan = {
            "id": f"{sym}-{direction}-{tier_key}",
            "symbol": sym,
            "tradingview_symbol": tv_sym,
            "tradingview_url": tv_url,
            "direction": direction,
            "strategy": strategy,
            "risk_tier": cfg["risk_tier"],
            "tier_title": cfg["tier_title"],
            "lots": cfg["lots"],
            "shares": shares,
            "entry_price": entry_price,
            "entry_premium": entry_price,
            "sl_price": sl_price,
            "target_price": target_price,
            "sl_pct": sl_pct,
            "target_pct": tgt_pct,
            "max_loss_usd": max_loss_usd,
            "target_profit_usd": target_profit_usd,
            "risk_reward_ratio": f"1 : {rr_ratio}",
            "win_rate_target": cfg["win_rate_target"],
            "ml_prob": round(ml_prob, 4),
            "final_score": round(final_score, 4),
            "regime": regime,
            "technical_strength": round(technical_strength, 2),
            "pattern_name": cfg["pattern_name"],
            "pattern_desc": cfg["pattern_desc"],
        }
        # Attach complete visual Pine Script
        plan["pine_script"] = generate_visual_pine_script(plan)
        plans[tier_key] = plan

    return plans

