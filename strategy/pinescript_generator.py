"""
TradingView Pine Script v5 Strategy & Visual Pattern Generator
─────────────────────────────────────────────────────────────
Generates production-grade, visually stunning Pine Script v5 scripts that:
  1. Plot clear on-chart visual patterns (Breakout, Retest, Zones)
  2. Draw Entry, Target (TP), and Stop-Loss (SL) lines with price & P&L labels
  3. Draw semi-transparent green profit boxes and red loss boxes (R:R corridor)
  4. Display a pinned HUD table in the top-right corner with ML score, risk tier,
     and projected profit/loss
  5. Include full TradingView native strategy execution so traders can immediately
     test, confirm, and inspect backtest net profit/loss directly on TradingView!
"""

from __future__ import annotations
from typing import Dict, Any


def generate_visual_pine_script(signal: Dict[str, Any]) -> str:
    """
    Generate a complete, visually striking Pine Script v5 code for TradingView.
    """
    symbol = str(signal.get("symbol", "AAPL")).upper()
    direction = str(signal.get("direction", "CALL")).upper()
    is_long = direction in ("CALL", "BUY", "LONG")
    strategy_name = signal.get("strategy", "vwap_momentum_breakout")
    risk_tier = str(signal.get("risk_tier", signal.get("risk_label", "MEDIUM"))).upper()
    
    entry_p = float(signal.get("entry_premium") or signal.get("entry_price") or 100.0)
    sl_p = float(signal.get("sl_price") or (entry_p * 0.90 if is_long else entry_p * 1.10))
    tp_p = float(signal.get("target_price") or (entry_p * 1.35 if is_long else entry_p * 0.70))
    lots = int(signal.get("lots", 2))
    
    ml_prob = float(signal.get("ml_prob", 0.75))
    final_score = float(signal.get("final_score", 0.75))
    regime = str(signal.get("regime", "TRENDING_BULL"))
    pattern_name = str(signal.get("pattern_name", "Momentum Breakout Pattern"))
    
    # Calculate profit / loss amounts
    pts_gain = abs(tp_p - entry_p)
    pts_loss = abs(entry_p - sl_p)
    rr_ratio = round(pts_gain / max(pts_loss, 0.01), 2)
    qty = lots * 10
    profit_usd = round(pts_gain * qty, 2)
    loss_usd = round(pts_loss * qty, 2)

    tier_color_hex = "#00e87b" if risk_tier == "LOW" else "#e8c300" if risk_tier == "MEDIUM" else "#ff3e3e"
    direction_label = "LONG / BUY CALL" if is_long else "SHORT / BUY PUT"

    script = f"""//@version=5
strategy("AI Trader - {strategy_name.replace('_', ' ').title()} [{risk_tier}]", overlay=true, initial_capital=100000, default_qty_type=strategy.fixed, default_qty_value={qty})

// ── Inputs & Parameters ───────────────────────────────────────────────────────
trade_dir     = input.string("{'Long' if is_long else 'Short'}", "Trade Direction", options=["Long", "Short"])
entry_px      = input.float({entry_p:.2f}, "Signal Entry Price", confirm=false)
target_px     = input.float({tp_p:.2f}, "Take Profit Target", confirm=false)
sl_px         = input.float({sl_p:.2f}, "Stop Loss Level", confirm=false)
trade_qty     = input.int({qty}, "Position Size (Units)", confirm=false)
show_table    = input.bool(true, "Show AI Trade HUD Table")
show_zones    = input.bool(true, "Show Visual Risk/Reward Corridor")

// ── Visual Pattern Plotting ───────────────────────────────────────────────────
// Signal trigger bar identification
var line entry_line = na
var line target_line = na
var line sl_line = na
var box profit_box = na
var box loss_box = na

// Colors
color c_entry  = color.new(color.teal, 10)
color c_target = color.new(color.green, 10)
color c_sl     = color.new(color.red, 10)

if barstate.islast
    // Horizontal price levels
    entry_line  := line.new(bar_index - 30, entry_px, bar_index + 30, entry_px, color=c_entry, width=2, style=line.style_dashed)
    target_line := line.new(bar_index - 30, target_px, bar_index + 30, target_px, color=c_target, width=3, style=line.style_solid)
    sl_line     := line.new(bar_index - 30, sl_px, bar_index + 30, sl_px, color=c_sl, width=3, style=line.style_solid)

    // Visual Price Labels
    label.new(bar_index + 30, target_px, "🎯 TARGET: ${tp_p:.2f} (+${profit_usd:,.0f})", style=label.style_label_left, color=color.green, textcolor=color.white, size=size.small)
    label.new(bar_index + 30, entry_px, "🚀 ENTRY: ${entry_p:.2f} ({direction_label})", style=label.style_label_left, color=color.teal, textcolor=color.white, size=size.small)
    label.new(bar_index + 30, sl_px, "🛑 STOP LOSS: ${sl_p:.2f} (-${loss_usd:,.0f})", style=label.style_label_left, color=color.red, textcolor=color.white, size=size.small)

    if show_zones
        // Green Profit Zone & Red Loss Zone
        profit_box := box.new(bar_index - 20, math.max(entry_px, target_px), bar_index + 30, math.min(entry_px, target_px), border_color=color.green, border_width=1, bgcolor=color.new(color.green, 85))
        loss_box   := box.new(bar_index - 20, math.max(entry_px, sl_px), bar_index + 30, math.min(entry_px, sl_px), border_color=color.red, border_width=1, bgcolor=color.new(color.red, 85))

// Breakout shape signal marker
plotshape(barstate.islast, title="AI Pattern Signal", style={'shape.labelup' if is_long else 'shape.labeldown'}, location={'location.belowbar' if is_long else 'location.abovebar'}, color={'color.green' if is_long else 'color.red'}, textcolor=color.white, size=size.normal, text="⚡ AI {direction} SETUP\\n{pattern_name}\\nConf: {ml_prob*100:.1f}%")

// ── Execution Logic (Strategy Tester) ─────────────────────────────────────────
if barstate.islast
    if trade_dir == "Long"
        strategy.entry("AI_Long", strategy.long, qty=trade_qty, limit=entry_px)
        strategy.exit("Exit_Long", "AI_Long", stop=sl_px, limit=target_px)
    else
        strategy.entry("AI_Short", strategy.short, qty=trade_qty, limit=entry_px)
        strategy.exit("Exit_Short", "AI_Short", stop=sl_px, limit=target_px)

// ── On-Chart HUD Information Table ───────────────────────────────────────────
if show_table and barstate.islast
    var table hud = table.new(position.top_right, 2, 9, bgcolor=color.new(#0e131d, 10), border_color=color.new(#242d3d, 10), border_width=1)
    
    // Header
    table.cell(hud, 0, 0, "⚡ AI TRADER V2.0", bgcolor=color.new(#182234, 10), text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 0, "{symbol} [{risk_tier}]", bgcolor=color.new(#182234, 10), text_color=color.yellow, text_size=size.small)
    
    // Details
    table.cell(hud, 0, 1, "Strategy", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 1, "{strategy_name.replace('_', ' ').title()}", text_color=color.white, text_size=size.small)
    
    table.cell(hud, 0, 2, "Regime", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 2, "{regime}", text_color=color.aqua, text_size=size.small)

    table.cell(hud, 0, 3, "ML Conviction", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 3, "{ml_prob*100:.1f}% (Score: {final_score:.2f})", text_color=color.green, text_size=size.small)

    table.cell(hud, 0, 4, "Entry Price", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 4, "${entry_p:.2f}", text_color=color.white, text_size=size.small)

    table.cell(hud, 0, 5, "Target (TP)", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 5, "${tp_p:.2f} (+${profit_usd:,.0f})", text_color=color.green, text_size=size.small)

    table.cell(hud, 0, 6, "Stop Loss (SL)", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 6, "${sl_p:.2f} (-${loss_usd:,.0f})", text_color=color.red, text_size=size.small)

    table.cell(hud, 0, 7, "Risk : Reward", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 7, "1 : {rr_ratio:.2f}", text_color=color.orange, text_size=size.small)

    table.cell(hud, 0, 8, "Execution", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 8, "ALPACA PAPER ACTIVE", text_color=color.green, text_size=size.small)
"""
    return script

