"use client";

import { useState } from "react";
import { TierPlan } from "@/lib/api";
import {
  ExternalLink,
  ShieldCheck,
  Scale,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Target,
  AlertTriangle,
  Info,
} from "lucide-react";

interface MultiTierStrategyBoardProps {
  riskSections?: {
    low: TierPlan[];
    medium: TierPlan[];
    high: TierPlan[];
  };
  onExecutePlan: (plan: TierPlan) => Promise<any>;
  onRejectPlan?: (planId: string) => void;
}

export default function MultiTierStrategyBoard({
  riskSections = { low: [], medium: [], high: [] },
  onExecutePlan,
  onRejectPlan,
}: MultiTierStrategyBoardProps) {
  const [activeTier, setActiveTier] = useState<"low" | "medium" | "high">("medium");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [activeModalPlan, setActiveModalPlan] = useState<TierPlan | null>(null);
  const [copied, setCopied] = useState(false);

  const plans = riskSections[activeTier] || [];

  const handleExecute = async (plan: TierPlan) => {
    setExecutingId(plan.id);
    try {
      const res = await onExecutePlan(plan);
      // Auto-copy Pine Script to clipboard
      if (plan.pine_script) {
        try {
          await navigator.clipboard.writeText(plan.pine_script);
          setCopied(true);
        } catch {
          /* clipboard permission fallback */
        }
      }
      // Open modal with TradingView redirect
      setActiveModalPlan(plan);

      // Open TradingView chart automatically in new window
      const tvUrl = plan.tradingview_url || `https://in.tradingview.com/chart/?symbol=${plan.symbol}&interval=1`;
      window.open(tvUrl, "_blank");
    } finally {
      setExecutingId(null);
    }
  };

  const handleCopyPineScript = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-6">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#1e2738]">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00f0ff]" />
            AI Strategy Predictions & Approval Board (3 Risk Sections)
          </h2>
          <p className="text-[10px] text-[#788296] mt-0.5">
            Real-time multi-tier technical analysis, ML conviction scores, visual patterns & TradingView auto-execution
          </p>
        </div>

        {/* ── Risk Tier Tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-3 sm:mt-0 bg-[#0a0f18] p-1 rounded-md border border-[#1e2738]">
          <button
            onClick={() => setActiveTier("low")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
              activeTier === "low"
                ? "bg-[#00e87b] text-black shadow-lg shadow-[#00e87b]/20"
                : "text-[#788296] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            LOW RISK (78% WR)
          </button>

          <button
            onClick={() => setActiveTier("medium")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
              activeTier === "medium"
                ? "bg-[#4da6ff] text-black shadow-lg shadow-[#4da6ff]/20"
                : "text-[#788296] hover:text-white"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            MEDIUM RISK (68% WR)
          </button>

          <button
            onClick={() => setActiveTier("high")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
              activeTier === "high"
                ? "bg-[#ff3e3e] text-white shadow-lg shadow-[#ff3e3e]/20"
                : "text-[#788296] hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            HIGH RISK (60% WR)
          </button>
        </div>
      </div>

      {/* ── Tier Info Banner ──────────────────────────────────────── */}
      <div className="mb-4 p-3 rounded-lg bg-[#0e1626] border border-[#1e2d48] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <span className="text-[#a0acc0]">
            {activeTier === "low" && (
              <>
                <strong className="text-[#00e87b]">LOW RISK PROFILE:</strong> Conservative capital preservation. Tight stop loss (8%), 1 lot (10 shares), high-conviction ML threshold (&ge;0.65). Ideal for low drawdown and steady compounding.
              </>
            )}
            {activeTier === "medium" && (
              <>
                <strong className="text-[#4da6ff]">MEDIUM RISK PROFILE:</strong> Balanced alpha & trend momentum. Standard stop loss (14%), 2 lots (25 shares), target 38% upside (&ge;0.58 score). Optimal risk/reward ratio (1:2.7).
              </>
            )}
            {activeTier === "high" && (
              <>
                <strong className="text-[#ff3e3e]">HIGH RISK PROFILE:</strong> Aggressive breakout momentum. Wider stop loss (20%), 4 lots (50 shares), target 60% upside (&ge;0.50 score). Designed for maximum alpha on volatility expansions.
              </>
            )}
          </span>
        </div>
        <span className="text-[10px] text-[#5a6880] shrink-0 ml-4 font-mono">
          {plans.length} setup(s) available
        </span>
      </div>

      {/* ── Plans Grid ────────────────────────────────────────────── */}
      {plans.length === 0 ? (
        <div className="p-8 rounded-lg bg-[#0a0f18] border border-[#1a2333] text-center text-xs text-[#5a6880]">
          No active setups for {activeTier.toUpperCase()} risk profile right now. The continuous scanner is monitoring real-time market data...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isCall = plan.direction === "CALL";
            const isExecuting = executingId === plan.id;

            return (
              <div
                key={plan.id}
                className="bg-[#0b101b] border-2 border-[#1c273b] hover:border-[#2e3f5e] rounded-lg p-4 transition-all relative overflow-hidden flex flex-col justify-between"
              >
                {/* Top Badge Row */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white tracking-wider">
                        {plan.tradingview_symbol || plan.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider ${
                          isCall
                            ? "bg-[#00e87b]/15 text-[#00e87b] border border-[#00e87b]/30"
                            : "bg-[#ff3e3e]/15 text-[#ff3e3e] border border-[#ff3e3e]/30"
                        }`}
                      >
                        {isCall ? "🚀 LONG / CALL" : "🔻 SHORT / PUT"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1e2738] text-[#8ea0be]">
                        {plan.strategy.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#5a6880]">Edge:</span>
                      <span className="text-xs font-mono font-bold text-[#00e87b]">
                        {(plan.ml_prob * 100).toFixed(1)}% ML
                      </span>
                    </div>
                  </div>

                  {/* ── Visual Pattern Chart Diagram (SVG) ──────────────── */}
                  <div className="bg-[#060910] border border-[#141c2c] rounded-md p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Pattern: {plan.pattern_name}
                      </span>
                      <span className="text-[9px] font-bold text-[#e8c300] bg-[#e8c300]/10 px-1.5 py-0.5 rounded border border-[#e8c300]/20">
                        R:R {plan.risk_reward_ratio}
                      </span>
                    </div>

                    {/* SVG Visual Corridor */}
                    <div className="relative h-28 w-full bg-[#04060a] rounded overflow-hidden border border-[#0f1724]">
                      <svg className="w-full h-full" viewBox="0 0 400 110" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`grad-profit-${plan.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00e87b" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#00e87b" stopOpacity="0.03" />
                          </linearGradient>
                          <linearGradient id={`grad-loss-${plan.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff3e3e" stopOpacity="0.03" />
                            <stop offset="100%" stopColor="#ff3e3e" stopOpacity="0.25" />
                          </linearGradient>
                        </defs>

                        {/* Profit Zone Box (Green) */}
                        <rect x="180" y="10" width="215" height="42" fill={`url(#grad-profit-${plan.id})`} stroke="#00e87b" strokeWidth="1" strokeDasharray="2,2" />

                        {/* Loss Zone Box (Red) */}
                        <rect x="180" y="52" width="215" height="48" fill={`url(#grad-loss-${plan.id})`} stroke="#ff3e3e" strokeWidth="1" strokeDasharray="2,2" />

                        {/* Candlestick Simulated Trajectory */}
                        <path
                          d="M 10 75 Q 60 85 100 65 T 180 52 T 260 30 T 360 16"
                          fill="none"
                          stroke={isCall ? "#00f0ff" : "#ffaa00"}
                          strokeWidth="2.5"
                        />

                        {/* Target Line */}
                        <line x1="170" y1="12" x2="395" y2="12" stroke="#00e87b" strokeWidth="2" />
                        <text x="185" y="24" fill="#00e87b" fontSize="10" fontWeight="bold">
                          TARGET: ${plan.target_price.toFixed(2)} (+${plan.target_profit_usd.toLocaleString()})
                        </text>

                        {/* Entry Line */}
                        <line x1="0" y1="52" x2="395" y2="52" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="4,4" />
                        <text x="15" y="47" fill="#00f0ff" fontSize="10" fontWeight="bold">
                          ENTRY: ${plan.entry_price.toFixed(2)}
                        </text>

                        {/* Stop Loss Line */}
                        <line x1="170" y1="98" x2="395" y2="98" stroke="#ff3e3e" strokeWidth="2" />
                        <text x="185" y="93" fill="#ff3e3e" fontSize="10" fontWeight="bold">
                          STOP LOSS: ${plan.sl_price.toFixed(2)} (-${plan.max_loss_usd.toLocaleString()})
                        </text>
                      </svg>
                    </div>

                    <p className="text-[10px] text-[#7888a0] mt-2 leading-relaxed">
                      {plan.pattern_desc}
                    </p>
                  </div>

                  {/* ── Key Metrics Grid ─────────────────────────────────── */}
                  <div className="grid grid-cols-4 gap-2 text-[10px] mb-4">
                    <div className="bg-[#0e1422] p-2 rounded border border-[#161f30]">
                      <span className="text-[#5a6880] block text-[9px]">POSITION</span>
                      <span className="font-extrabold text-white text-xs">
                        {plan.shares} shs ({plan.lots} lot)
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-2 rounded border border-[#161f30]">
                      <span className="text-[#5a6880] block text-[9px]">TARGET PROFIT</span>
                      <span className="font-extrabold text-[#00e87b] text-xs">
                        +${plan.target_profit_usd.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-2 rounded border border-[#161f30]">
                      <span className="text-[#5a6880] block text-[9px]">MAX RISK (SL)</span>
                      <span className="font-extrabold text-[#ff3e3e] text-xs">
                        -${plan.max_loss_usd.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-2 rounded border border-[#161f30]">
                      <span className="text-[#5a6880] block text-[9px]">EXP. WIN RATE</span>
                      <span className="font-extrabold text-[#00f0ff] text-xs">
                        {plan.win_rate_target}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Action Buttons ──────────────────────────────────── */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#161f30]">
                  <button
                    onClick={() => handleExecute(plan)}
                    disabled={isExecuting}
                    className="flex-1 bg-gradient-to-r from-[#00b05b] to-[#00e87b] hover:from-[#00c567] hover:to-[#17f78c] text-black font-extrabold py-2 px-3 rounded text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00e87b]/15 disabled:opacity-50 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isExecuting ? "EXECUTING..." : "⚡ EXECUTE & TEST ON TRADINGVIEW"}
                  </button>

                  {onRejectPlan && (
                    <button
                      onClick={() => onRejectPlan(plan.id)}
                      className="px-3 py-2 rounded bg-[#161f30] hover:bg-[#202b40] text-[#7888a0] hover:text-[#ff3e3e] text-[11px] font-bold transition-all border border-[#212d42]"
                      title="Reject this signal"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TradingView Auto-Implementation Modal ─────────────────── */}
      {activeModalPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d131f] border-2 border-[#00e87b] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2738]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#00e87b]" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Order Placed & Strategy Exported to TradingView!
                  </h3>
                  <p className="text-[11px] text-[#7888a0]">
                    Alpaca Paper execution confirmed for {activeModalPlan.symbol}. Follow the 2 steps below:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalPlan(null)}
                className="text-[#5a6880] hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick 2-Step Confirmation Guide */}
            <div className="space-y-3 mb-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#111928] border border-[#1e2d44]">
                <div className="w-5 h-5 rounded-full bg-[#00e87b] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">
                    TradingView Window Opened Automatically
                  </p>
                  <p className="text-[11px] text-[#a0acc0]">
                    If a popup blocker stopped it, click here to open the chart:
                  </p>
                  <a
                    href={activeModalPlan.tradingview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00f0ff] hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open {activeModalPlan.tradingview_symbol} Chart on TradingView
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#111928] border border-[#1e2d44]">
                <div className="w-5 h-5 rounded-full bg-[#00f0ff] text-black font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-white">
                      Pine Script Strategy Code (Copied to Clipboard)
                    </p>
                    <button
                      onClick={() => handleCopyPineScript(activeModalPlan.pine_script)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#1f2d48] text-[#00f0ff] hover:bg-[#283b5e]"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "COPIED!" : "COPY AGAIN"}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#a0acc0] mb-2">
                    In TradingView, click <strong>&quot;Pine Editor&quot;</strong> on the bottom bar, paste (Ctrl+V), and click <strong>&quot;Add to chart&quot;</strong>. The exact entry, visual target box, stop-loss line, and Strategy Tester profit/loss will render directly on your chart!
                  </p>
                  <pre className="bg-[#060910] p-2.5 rounded text-[10px] font-mono text-[#7888a0] max-h-32 overflow-y-auto border border-[#151f30]">
                    {activeModalPlan.pine_script}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#1e2738]">
              <a
                href={activeModalPlan.tradingview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1e2d44] hover:bg-[#283c5c] text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Go to TradingView Chart
              </a>
              <button
                onClick={() => setActiveModalPlan(null)}
                className="bg-[#00e87b] hover:bg-[#16f085] text-black font-extrabold py-2 px-5 rounded text-xs"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

