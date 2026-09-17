import React, { useEffect, useState } from "react";
import {
  Globe,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Flame,
  ShieldAlert,
  Clock,
  Zap,
} from "lucide-react";

interface MacroData {
  timestamp: string;
  session: string;
  activeSessions: string[];
  macro: {
    dxy: { value: string; trend: string; impactOnGold: string; impactOnCrypto: string };
    us10y: { value: string; trend: string; realYield: string };
    riskSentiment: string;
  };
  cryptoDerivatives?: {
    openInterest?: string;
    fundingRate?: string;
    fundingBias?: string;
    liquidationWarning?: string;
  };
  upcomingEvents: {
    event: string;
    timeIn: string;
    impact: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    warning: string;
  }[];
}

export const MacroCorrelationEngine: React.FC = () => {
  const [data, setData] = useState<MacroData>({
    timestamp: new Date().toISOString(),
    session: "London / NY Overlap",
    activeSessions: ["London", "New York"],
    macro: {
      dxy: {
        value: "99.97",
        trend: "Weakening Dollar below 100.30 resistance",
        impactOnGold: "Bullish Tailwinds for Gold",
        impactOnCrypto: "Positive / Risk-On Expansion",
      },
      us10y: {
        value: "4.28%",
        trend: "Slight pullback from 4.35%",
        realYield: "+1.92%",
      },
      riskSentiment: "Cautious / Balanced",
    },
    cryptoDerivatives: {
      openInterest: "108,400 BTC ($8.28B)",
      fundingRate: "+0.0033% (Neutral)",
      fundingBias: "Balanced Long/Short perpetual leverage",
      liquidationWarning: "CME futures gap filled. Spot CVD confirms healthy absorption without retail over-leverage.",
    },
    upcomingEvents: [
      {
        event: "US Core CPI MoM / YoY",
        timeIn: "2h 45m",
        impact: "EXTREME",
        warning: "Avoid fresh execution 30m prior; extreme slippage risk",
      },
      {
        event: "FOMC Minutes Release",
        timeIn: "18h 00m",
        impact: "HIGH",
        warning: "Elevated spread risk and whipsaw hazard",
      },
      {
        event: "ECB President Speech",
        timeIn: "Tomorrow 09:00 UTC",
        impact: "MEDIUM",
        warning: "EUR volatility likely across European open",
      },
    ],
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMacro = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/market-pulse");
      if (res.ok) {
        const d = await res.json();
        if (d && d.macro) setData(d);
      }
    } catch (err) {
      console.warn("Failed to fetch live macro pulse:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMacro();
    const interval = setInterval(fetchMacro, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono font-bold text-sm text-white flex items-center gap-2">
            <Globe size={16} className="text-sky-400" />
            Institutional Macro, Correlation & News Engine (Sections 13–17)
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cross-market alignment matrix: XAU/USD ↔ DXY ↔ US Yields ↔ Crypto Order Flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
            <Clock size={13} className="text-emerald-400" />
            Active: <strong className="text-white">{data.session}</strong>
          </span>
        </div>
      </div>

      {/* 3 Pillar Grids: Gold Macro, Crypto Order Flow, Forex Strength */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gold & Yields Pillar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} />
                Gold (XAU/USD) Macro Matrix
              </span>
              <span className="text-[10px] font-mono text-slate-500">Sec 13</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              Real yields & Dollar strength are primary fundamental drivers of Gold.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">US Dollar Index (DXY):</span>
                <div className="text-right">
                  <span className="font-bold text-white">{data.macro.dxy.value}</span>
                  <span className="text-[10px] text-slate-500 block">Under 104.20 Res</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">US 10-Year Yield:</span>
                <div className="text-right">
                  <span className="font-bold text-white">{data.macro.us10y.value}</span>
                  <span className="text-[10px] text-slate-500 block">Real: {data.macro.us10y.realYield}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-0.5">Correlation Warning:</span>
                <span className="text-amber-300 text-[11px]">
                  {data.macro.dxy.impactOnGold} — If Gold prints bullish structure while yields surge, treat as potential fakeout.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Order Flow Pillar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} />
                Crypto (BTC/ETH) Order Flow
              </span>
              <span className="text-[10px] font-mono text-slate-500">Sec 14</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              "Rising price + rising OI does not automatically mean bullish continuation."
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Perpetual Funding (8h):</span>
                <div className="text-right">
                  <span className="font-bold text-emerald-400">
                    {data.cryptoDerivatives?.fundingRate || "+0.0033% (Neutral)"}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {data.cryptoDerivatives?.fundingBias || "No excessive leverage"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Open Interest (OI):</span>
                <div className="text-right">
                  <span className="font-bold text-white">
                    {data.cryptoDerivatives?.openInterest || "108,400 BTC ($8.28B)"}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Binance BTCUSDT Live</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-0.5">Liquidity Trap Alert:</span>
                <span className="text-slate-300 text-[11px]">
                  {data.cryptoDerivatives?.liquidationWarning ||
                    "CME futures gap filled. Spot CVD leading perp CVD confirms healthy accumulation."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Forex Strength Differential Pillar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} />
                Forex Currency Differential
              </span>
              <span className="text-[10px] font-mono text-slate-500">Sec 15</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              Evaluate currency strength differential: Central banks & yield spreads.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300 font-semibold">USD Strength:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  STRONG (7.8/10)
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300 font-semibold">EUR Strength:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                  WEAK (3.4/10)
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-0.5">EUR/USD Structural Implication:</span>
                <span className="text-slate-300 text-[11px]">
                  ECB dovish rate cut expectations vs Fed high-for-longer yields creates persistent downward pressure on rallies into FVG.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Economic News Calendar (Section 17: News Filter) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            Section 17: Economic News Filter (LOW / MEDIUM / HIGH / EXTREME)
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            Rule: Do not enter fresh positions immediately before HIGH/EXTREME releases.
          </span>
        </div>

        <div className="space-y-2.5">
          {data.upcomingEvents.map((evt, idx) => {
            const isExtreme = evt.impact === "EXTREME";
            const isHigh = evt.impact === "HIGH";
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 font-mono text-xs ${
                  isExtreme
                    ? "bg-rose-950/20 border-rose-900/50"
                    : isHigh
                    ? "bg-amber-950/20 border-amber-900/50"
                    : "bg-slate-950/50 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isExtreme
                        ? "bg-rose-500 text-white"
                        : isHigh
                        ? "bg-amber-500 text-black"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {evt.impact}
                  </span>
                  <div>
                    <span className="font-bold text-white block">{evt.event}</span>
                    <span className="text-[11px] text-slate-400">{evt.warning}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                    ⏱ in {evt.timeIn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
