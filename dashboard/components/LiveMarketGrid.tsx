"use client";

import { MarketQuote } from "@/lib/api";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

interface LiveMarketGridProps {
  marketData?: Record<string, MarketQuote>;
  onSelectSymbol?: (symbol: string) => void;
  selectedSymbol?: string;
}

export default function LiveMarketGrid({
  marketData = {},
  onSelectSymbol,
  selectedSymbol,
}: LiveMarketGridProps) {
  const symbols = Object.keys(marketData);

  if (symbols.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-[#0d1117] border border-[#21262d] text-center text-xs text-[#8b949e]">
        Fetching continuous live market quotes from Alpaca & Live Market Data feeds...
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00e87b] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#00e87b]">
            Continuous Live Market Stream (US Equities & ETFs)
          </span>
        </div>
        <span className="text-[10px] text-[#5a6270]">Real-time Feed: IEX / Live REST</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {symbols.map((sym) => {
          const item = marketData[sym];
          const isSelected = selectedSymbol === sym;
          const isPositive = item.change >= 0;

          const prefix = ["AAPL", "TSLA", "NVDA", "QQQ", "MSFT"].includes(sym) ? "NASDAQ" : sym === "SPY" ? "AMEX" : "";
          const tvUrl = `https://in.tradingview.com/chart/?symbol=${prefix ? prefix + ":" + sym : sym}&interval=1`;

          return (
            <div
              key={sym}
              onClick={() => onSelectSymbol && onSelectSymbol(sym)}
              className={`p-3 rounded-md transition-all cursor-pointer relative group ${
                isSelected
                  ? "bg-[#161f30] border-2 border-[#00f0ff]"
                  : "bg-[#0d131f] border border-[#1e2738] hover:border-[#3d4d68]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white tracking-wide">{sym}</span>
                <a
                  href={tvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={`Open ${sym} in TradingView`}
                  className="opacity-0 group-hover:opacity-100 text-[#4da6ff] hover:text-[#00f0ff] transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="text-[9px] text-[#5a6270] truncate mb-1.5">{item.name}</div>

              <div className="text-base font-extrabold text-white tracking-tight">
                ${item.price.toFixed(2)}
              </div>

              <div
                className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${
                  isPositive ? "text-[#00e87b]" : "text-[#ff3e3e]"
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {isPositive ? "+" : ""}
                  {item.change.toFixed(2)} ({isPositive ? "+" : ""}
                  {item.change_pct.toFixed(2)}%)
                </span>
              </div>

              <div className="flex justify-between items-center text-[9px] text-[#4d5666] mt-2 pt-1.5 border-t border-[#1a2233]">
                <span>H: ${item.high.toFixed(1)}</span>
                <span>L: ${item.low.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

