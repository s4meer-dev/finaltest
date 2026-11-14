"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import EquityChart from "@/components/EquityChart";
import TradeTable from "@/components/TradeTable";
import PnlBarChart from "@/components/PnlBarChart";
import LiveMarketGrid from "@/components/LiveMarketGrid";
import MultiTierStrategyBoard from "@/components/MultiTierStrategyBoard";
import { fetchJSON, type BacktestResults, type LiveState, type EquityCurvePoint, type TierPlan } from "@/lib/api";
import { RefreshCw } from "lucide-react";

const pnlFmt = (v: number) =>
  `₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Home() {
  const [live, setLive] = useState<LiveState | null>(null);
  const [brokerStatus, setBrokerStatus] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResults>({});
  const [curves, setCurves] = useState<Record<string, EquityCurvePoint[]>>({});
  const [activeRisk, setActiveRisk] = useState<"low" | "medium" | "high">("high");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("--");

  const load = useCallback(async () => {
    try {
      const [liveData, brokerData, backtestData, curveData] = await Promise.all([
        fetchJSON<LiveState>("/api/state").catch(() => null),
        fetchJSON<any>("/api/broker/status").catch(() => null),
        fetchJSON<BacktestResults>("/api/backtest/results").catch(() => ({})),
        fetchJSON<Record<string, EquityCurvePoint[]>>("/api/equity/curve").catch(() => ({})),
      ]);
      if (liveData) setLive(liveData);
      if (brokerData) setBrokerStatus(brokerData);
      setResults(backtestData);
      setCurves(curveData);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirmSignal = async (index: number, sig: any) => {
    try {
      const res = await fetch("/api/broker/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await res.json();
      load();

      // Copy Pine Script / strategy plan to clipboard
      if (data.pine_script) {
        try {
          await navigator.clipboard.writeText(data.pine_script);
        } catch { /* ignore clipboard permission */ }
      }

      // Automatically redirect to TradingView
      const tvUrl = data.tradingview_url || `https://in.tradingview.com/chart/?symbol=${sig.symbol}`;
      window.open(tvUrl, "_blank");

      setToastMsg(`✓ TRADE APPROVED! Executed on Alpaca Paper. Redirected to TradingView. Strategy code copied to clipboard.`);
      setTimeout(() => setToastMsg(null), 10000);
    } catch (e: any) {
      setToastMsg(`Execution failed: ${e.message}`);
    }
  };

  const handleExecutePlan = async (plan: TierPlan) => {
    try {
      const res = await fetch("/api/broker/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      load();
      setToastMsg(`✓ [${plan.risk_tier}] TRADE EXECUTED on Alpaca Paper! Order ID: ${data.order_id || 'Active'}. TradingView chart launched.`);
      setTimeout(() => setToastMsg(null), 8000);
      return data;
    } catch (e: any) {
      setToastMsg(`Execution failed: ${e.message}`);
      throw e;
    }
  };

  const handleRejectSignal = async (index: number) => {
    await fetch("/api/broker/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    });
    load();
    setToastMsg("✕ Trade rejected by user.");
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const p = results[activeRisk];

  const riskColors: Record<string, string> = { low: "#4da6ff", medium: "#e8c300", high: "#00e87b" };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* ── Ticker Bar (top) ─────────────────────────────────── */}
        <div className="ticker-bar flex items-center gap-6 px-5 py-2">
          <div className="flex items-center gap-2">
            <span className={`w-[6px] h-[6px] ${live?.status === "scanning" ? "bg-[#00e87b] t-pulse" : live?.status === "idle" ? "bg-[#4da6ff]" : "bg-[#3d4450]"}`} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: '#5a6270' }}>
              {live?.status ?? "..."}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase" style={{ color: '#3d4450' }}>NIFTY</span>
            <span className="text-[12px] font-bold" style={{ color: '#00e87b' }}>
              {live?.last_price ? `₹${live.last_price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}` : "--"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase" style={{ color: '#3d4450' }}>Regime</span>
            <span className="text-[12px] font-semibold" style={{
              color: live?.regime?.includes("BULL") ? '#00e87b' : live?.regime?.includes("BEAR") ? '#ff3e3e' : '#e8c300'
            }}>
              {live?.regime ?? "--"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase" style={{ color: '#3d4450' }}>Scans</span>
            <span className="text-[12px]">{live?.scan_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase" style={{ color: '#3d4450' }}>Signals</span>
            <span className="text-[12px]">{live?.signals_checked ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase" style={{ color: '#3d4450' }}>Trades</span>
            <span className="text-[12px] font-bold" style={{ color: '#00e87b' }}>{live?.trades_today ?? 0}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px]" style={{ color: '#3d4450' }}>{lastRefresh}</span>
            <button onClick={load} className="t-btn flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> REFRESH
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 p-5 overflow-y-auto">

          {/* ── Live Continuous Market Data Stream ───────────────── */}
          <LiveMarketGrid
            marketData={live?.market_data}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
          />

          {/* ── Multi-Tier Risk Strategy Predictions (Low / Med / High) ── */}
          <MultiTierStrategyBoard
            riskSections={live?.risk_sections}
            onExecutePlan={handleExecutePlan}
          />

          {/* ── Trade Approval Prompt (Alpaca + TradingView) ──── */}
          {(brokerStatus?.pending_signals?.length ?? 0) > 0 && (
            <div className="mb-6 p-4 rounded-none" style={{ background: '#121915', border: '1px solid #00e87b' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#00e87b] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e87b] animate-ping" />
                  Trade Strategy Approval Required ({brokerStatus!.pending_signals!.length} Pending)
                </span>
                <span className="text-[10px] text-[#8e9aa8]">
                  Click YES to execute on Alpaca Paper and redirect to TradingView
                </span>
              </div>
              {brokerStatus!.pending_signals!.map((sig: any, i: number) => (
                <div key={i} className="p-3 mb-2 bg-[#0c1017] border border-[#252a33] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                        background: sig.direction === 'CALL' ? '#00e87b22' : '#ff3e3e22',
                        color: sig.direction === 'CALL' ? '#00e87b' : '#ff3e3e',
                        border: `1px solid ${sig.direction === 'CALL' ? '#00e87b' : '#ff3e3e'}`
                      }}>
                        {sig.direction === 'CALL' ? 'BUY / LONG' : 'SELL / SHORT'}
                      </span>
                      <span className="text-[15px] font-bold text-white tracking-wider">
                        {sig.symbol}
                      </span>
                      <span className="text-[11px] text-[#4da6ff] font-mono">
                        {sig.strategy}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] text-[#8e9aa8] font-mono mt-1">
                      <span>Entry: <strong className="text-white">${sig.entry_premium || sig.entry_price || 'MKT'}</strong></span>
                      <span>Target: <strong className="text-[#00e87b]">${sig.target_price || 'N/A'}</strong></span>
                      <span>Stop Loss: <strong className="text-[#ff3e3e]">${sig.sl_price || 'N/A'}</strong></span>
                      <span>Model Score: <strong className="text-[#e8c300]">{Math.round((sig.final_score || 0.75) * 100)}%</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirmSignal(i, sig)}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                      style={{ background: '#00e87b', color: '#000', border: '1px solid #00e87b' }}
                    >
                      ✓ YES: APPROVE & EXECUTE
                    </button>
                    <button
                      onClick={() => handleRejectSignal(i)}
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-[#5c1a1a]"
                      style={{ background: '#2a0a0a', color: '#ff3e3e', border: '1px solid #ff3e3e' }}
                    >
                      ✕ NO: REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk profile tabs */}
          <div className="flex gap-[1px] mb-5">
            {(["low", "medium", "high"] as const).map(r => (
              <button
                key={r}
                onClick={() => setActiveRisk(r)}
                className="px-4 py-[6px] text-[10px] font-semibold tracking-wider uppercase transition-all"
                style={{
                  background: activeRisk === r ? riskColors[r] : '#181c24',
                  color: activeRisk === r ? '#000' : '#5a6270',
                  border: `1px solid ${activeRisk === r ? riskColors[r] : '#252a33'}`,
                }}
              >
                {r} Risk
              </button>
            ))}
          </div>

          {/* KPI cards */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] mb-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="t-panel p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : p ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] mb-5">
              <StatCard label="Total P&L" value={pnlFmt(p.pnl)} color={p.pnl >= 0 ? "green" : "red"} />
              <StatCard label="Win Rate" value={`${p.win_rate}%`} color={p.win_rate >= 55 ? "green" : p.win_rate >= 45 ? "yellow" : "red"} />
              <StatCard label="Total Trades" value={p.trades} sub={`${(p.pnl / Math.max(p.trades, 1)).toFixed(0)} avg/trade`} />
              <StatCard label="Risk-Reward" value={`${p.rr}×`} color={p.rr >= 1.5 ? "green" : p.rr >= 1.0 ? "yellow" : "red"} />
              <StatCard label="Avg Winner" value={pnlFmt(p.avg_win)} color="green" />
              <StatCard label="Avg Loser" value={pnlFmt(p.avg_loss)} color="red" />
              <StatCard label="Max Drawdown" value={pnlFmt(p.max_dd)} color="red" />
              <StatCard label="Profit Factor" value={p.avg_loss !== 0 ? (p.avg_win / Math.abs(p.avg_loss)).toFixed(2) : "∞"} color="blue" />
            </div>
          ) : (
            <div className="t-panel p-5 mb-5 text-center text-[11px]" style={{ color: '#3d4450' }}>
              NO BACKTEST DATA FOR <span style={{ color: riskColors[activeRisk] }}>{activeRisk.toUpperCase()}</span> RISK.
              RUN <code style={{ color: '#4da6ff' }}>python scripts/tick_replay_backtest.py --risk {activeRisk}</code>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] mb-5">
            <div className="t-panel p-4">
              <h3 className="text-[11px] font-semibold mb-3 uppercase tracking-wider" style={{ color: '#5a6270' }}>
                Equity Curves
              </h3>
              <EquityChart curves={curves} selected="all" />
            </div>
            <div className="t-panel p-4">
              <h3 className="text-[11px] font-semibold mb-3 uppercase tracking-wider" style={{ color: '#5a6270' }}>
                Per-Trade P&L — <span style={{ color: riskColors[activeRisk] }}>{activeRisk}</span>
              </h3>
              {p?.trade_list ? <PnlBarChart trades={p.trade_list} /> : (
                <div className="h-48 flex items-center justify-center text-[11px]" style={{ color: '#3d4450' }}>NO DATA</div>
              )}
            </div>
          </div>

          {/* Risk profile comparison */}
          <div className="t-panel p-4 mb-5">
            <h3 className="text-[11px] font-semibold mb-3 uppercase tracking-wider" style={{ color: '#5a6270' }}>
              Risk Profile Comparison
            </h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {["Profile", "Trades", "Total P&L", "Win Rate", "R:R", "Avg/Trade", "Max DD"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["low", "medium", "high"] as const).map(r => {
                    const rp = results[r];
                    if (!rp) return null;
                    return (
                      <tr key={r} style={{ background: activeRisk === r ? '#1e222c' : undefined }}>
                        <td>
                          <span className="font-semibold uppercase" style={{ color: riskColors[r] }}>{r}</span>
                        </td>
                        <td>{rp.trades}</td>
                        <td style={{ color: rp.pnl >= 0 ? '#00e87b' : '#ff3e3e', fontWeight: 600 }}>{pnlFmt(rp.pnl)}</td>
                        <td>{rp.win_rate}%</td>
                        <td>{rp.rr}×</td>
                        <td>{pnlFmt(rp.pnl / Math.max(rp.trades, 1))}</td>
                        <td style={{ color: '#ff3e3e' }}>{pnlFmt(rp.max_dd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent trades */}
          <div className="t-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5a6270' }}>
                Recent Trades — <span style={{ color: riskColors[activeRisk] }}>{activeRisk}</span>
              </h3>
              <a href="/trades" className="text-[10px] uppercase tracking-wider" style={{ color: '#4da6ff' }}>View all →</a>
            </div>
            {p?.trade_list ? (
              <TradeTable trades={p.trade_list} maxRows={10} />
            ) : (
              <p className="text-[11px] text-center py-6" style={{ color: '#3d4450' }}>NO TRADES</p>
            )}
          </div>
          {/* Toast / Notification */}
          {toastMsg && (
            <div className="fixed bottom-6 right-6 z-50 p-4 max-w-md bg-[#0c1410] border border-[#00e87b] text-[#00e87b] text-xs font-mono shadow-2xl flex flex-col gap-2">
              <div className="font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00e87b]" />
                {toastMsg}
              </div>
              <div className="flex gap-3 text-[10px] mt-1 pt-2 border-t border-[#1a3a2a]">
                <a href="https://in.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline text-[#4da6ff] hover:text-white">
                  ↗ Open TradingView
                </a>
                <a href="https://app.alpaca.markets/dashboard/overview" target="_blank" rel="noopener noreferrer" className="underline text-[#e8c300] hover:text-white">
                  ↗ Alpaca Dashboard
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
