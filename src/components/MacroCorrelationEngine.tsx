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
  ArrowRightLeft,
  Info,
} from "lucide-react";
import { MarketSentimentData, InstrumentSentiment, SectorCorrelationItem } from "../types";

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
  sentiment?: MarketSentimentData;
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
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 sm:gap-5">
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

      {/* Real-Time Market Sentiment & Sector Correlation Matrix (BTC/USD, US30, USD/JPY, XAU/USD) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame size={14} className="text-amber-400 animate-pulse" />
              Real-Time Market Sentiment & Fear/Greed Engine
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Live feeds from Alternative.me Crypto API, CBOE VIX, FX Yield Spread, and Bullion Reserve Demand
            </span>
          </div>

          {data.sentiment && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-mono font-bold uppercase ${
                data.sentiment.overallRegime === "RISK_ON"
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                  : data.sentiment.overallRegime === "RISK_OFF"
                  ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              Macro Regime: {data.sentiment.globalFearGreedLabel}
            </span>
          )}
        </div>

        {/* 4 Instruments Sentiment Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          {/* BTC */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="text-amber-400">₿</span>
                  <span>BTC/USD</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800 text-amber-300 font-bold">
                  {data.sentiment?.instruments.btc.classification.replace("_", " ") || "GREED"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {data.sentiment?.instruments.btc.score ?? 71}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
                <span className="text-[10px] text-emerald-400 ml-auto">Risk-On Asset</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                  style={{ width: `${data.sentiment?.instruments.btc.score ?? 71}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {data.sentiment?.instruments.btc.summary ||
                  "Crypto Fear & Greed index reflects steady accumulation with low retail over-leverage."}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
              Source: Alternative.me Public API
            </span>
          </div>

          {/* US30 */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="text-sky-400">🏛️</span>
                  <span>US30 (Dow 30)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/40 border border-sky-800 text-sky-300 font-bold">
                  {data.sentiment?.instruments.us30.classification.replace("_", " ") || "GREED"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {data.sentiment?.instruments.us30.score ?? 64}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
                <span className="text-[10px] text-sky-400 ml-auto">
                  {data.sentiment?.instruments.us30.primaryMetric.value || "VIX 14.81"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                  style={{ width: `${data.sentiment?.instruments.us30.score ?? 64}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {data.sentiment?.instruments.us30.summary ||
                  "CBOE VIX signals suppressed volatility and persistent institutional bid across blue-chip equities."}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
              Source: CBOE Volatility via Yahoo Finance
            </span>
          </div>

          {/* USD/JPY */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="text-emerald-400">¥</span>
                  <span>USD/JPY</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-bold">
                  {data.sentiment?.instruments.usdJpy.classification.replace("_", " ") || "GREED"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {data.sentiment?.instruments.usdJpy.score ?? 67}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
                <span className="text-[10px] text-emerald-400 ml-auto">Carry Appetite</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                  style={{ width: `${data.sentiment?.instruments.usdJpy.score ?? 67}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {data.sentiment?.instruments.usdJpy.summary ||
                  "Wide US-Japan yield differentials (+3.32%) maintain active carry trade liquidity."}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
              Source: Global FX Yield Spread Matrix
            </span>
          </div>

          {/* XAU/USD */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="text-amber-300">🪙</span>
                  <span>XAU/USD (Gold)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800 text-amber-300 font-bold">
                  HEDGE ACCUMULATION
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {data.sentiment?.instruments.xau.score ?? 78}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
                <span className="text-[10px] text-amber-300 ml-auto">Safe-Haven Hedge</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-amber-300"
                  style={{ width: `${data.sentiment?.instruments.xau.score ?? 78}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {data.sentiment?.instruments.xau.summary ||
                  "Central bank sovereign reserve buying and fiat debasement hedging keep Gold accumulation elevated."}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
              Source: Spot Bullion & Real Yield Matrix
            </span>
          </div>
        </div>

        {/* Cross-Asset Sector Correlation Breakdown */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ArrowRightLeft size={13} className="text-sky-400" />
              <span>Cross-Asset Sector Correlation Matrix</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Correlations: -1.00 (Inverse) to +1.00 (Co-movement)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(data.sentiment?.correlations || [
              {
                id: "btc-us30",
                pair: "BTC/USD vs US30",
                coefficient: 0.68,
                interpretation: "High beta risk-on alignment. Equities and digital assets expanding synchronously.",
                flowDriver: "Global Liquidity & Macro Growth Consensus",
              },
              {
                id: "xau-usdjpy",
                pair: "XAU/USD vs USD/JPY",
                coefficient: -0.54,
                interpretation: "Safe-haven divergence: Gold bids on hedge demand while USD/JPY expands on carry trades.",
                flowDriver: "US-Japan Rate Spread vs Sovereign Debt Hedging",
              },
              {
                id: "btc-xau",
                pair: "BTC/USD vs XAU/USD",
                coefficient: 0.42,
                interpretation: "Parallel monetary debasement and fiat expansion hedging.",
                flowDriver: "Global M2 Money Supply Growth & Fiat Devaluation",
              },
              {
                id: "us30-usdjpy",
                pair: "US30 vs USD/JPY",
                coefficient: 0.61,
                interpretation: "Yen carry trade liquidity financing equity expansion and risk appetite.",
                flowDriver: "Global FX Carry Trade Stability",
              },
              {
                id: "xau-us30",
                pair: "XAU/USD vs US30",
                coefficient: -0.24,
                interpretation: "Portfolio barbell allocation: Institutional defensive positioning balancing equity risk.",
                flowDriver: "Institutional Barbell Allocation & Hedging",
              },
              {
                id: "usdjpy-us10y",
                pair: "USD/JPY vs US10Y Yield",
                coefficient: 0.82,
                interpretation: "Direct yield spread transmission: Treasury yields dictate Dollar/Yen direction.",
                flowDriver: "Fed vs BoJ Policy Spread",
              },
            ]).map((c: any) => {
              const isPos = c.coefficient >= 0;
              const absCoeff = Math.abs(c.coefficient);
              return (
                <div
                  key={c.id}
                  className="p-2 rounded bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{c.pair}</span>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 ${
                        c.coefficient >= 0.5
                          ? "text-emerald-400"
                          : c.coefficient >= 0.2
                          ? "text-emerald-300"
                          : c.coefficient <= -0.5
                          ? "text-rose-400"
                          : c.coefficient <= -0.2
                          ? "text-amber-300"
                          : "text-slate-400"
                      }`}
                    >
                      {isPos ? "+" : ""}
                      {c.coefficient.toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 h-1.5 rounded-full relative my-1 overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700 z-10" />
                    {isPos ? (
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-400 left-1/2 rounded-r-full"
                        style={{ width: `${(absCoeff / 1.0) * 50}%` }}
                      />
                    ) : (
                      <div
                        className="absolute top-0 bottom-0 bg-rose-400 right-1/2 rounded-l-full"
                        style={{ width: `${(absCoeff / 1.0) * 50}%` }}
                      />
                    )}
                  </div>

                  <p className="text-[10px] text-slate-300 leading-snug">{c.interpretation}</p>
                  <span className="text-[9px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Info size={9} className="text-sky-400" />
                    <span>{c.flowDriver}</span>
                  </span>
                </div>
              );
            })}
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
