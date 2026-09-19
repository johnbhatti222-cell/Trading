import React, { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Flame,
  Shield,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Info,
  Sparkles,
  Radar,
} from "lucide-react";
import { MarketSentimentData, InstrumentSentiment, SectorCorrelationItem } from "../types";

interface MarketSentimentTickerProps {
  onOpenDetailedPanel?: () => void;
  onNavigateToMacro?: () => void;
  onOpenScanner?: () => void;
}

export const MarketSentimentTicker: React.FC<MarketSentimentTickerProps> = ({
  onOpenDetailedPanel,
  onNavigateToMacro,
  onOpenScanner,
}) => {
  const [sentimentData, setSentimentData] = useState<MarketSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<"btc" | "us30" | "usdJpy" | "xau">("btc");

  const fetchSentiment = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/market-sentiment");
      if (res.ok) {
        const data: MarketSentimentData = await res.json();
        setSentimentData(data);
      }
    } catch (err) {
      console.warn("Failed to fetch market sentiment:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 20000); // 20s live update
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (classification?: InstrumentSentiment["classification"]) => {
    switch (classification) {
      case "EXTREME_GREED":
        return "text-emerald-400 border-emerald-500/40 bg-emerald-950/40";
      case "GREED":
        return "text-emerald-300 border-emerald-500/30 bg-emerald-950/30";
      case "FEAR":
        return "text-amber-300 border-amber-500/30 bg-amber-950/30";
      case "EXTREME_FEAR":
        return "text-rose-400 border-rose-500/40 bg-rose-950/40";
      case "NEUTRAL":
      default:
        return "text-slate-300 border-slate-700 bg-slate-900/50";
    }
  };

  const getSentimentBadge = (score: number) => {
    if (score >= 75) return { label: "EXTREME GREED", color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/50" };
    if (score >= 55) return { label: "GREED", color: "text-emerald-300 bg-emerald-950/40 border-emerald-600/40" };
    if (score >= 45) return { label: "NEUTRAL", color: "text-slate-300 bg-slate-900 border-slate-700" };
    if (score >= 25) return { label: "FEAR", color: "text-amber-300 bg-amber-950/40 border-amber-600/40" };
    return { label: "EXTREME FEAR", color: "text-rose-400 bg-rose-950/60 border-rose-500/50" };
  };

  const getCorrelationColor = (coeff: number) => {
    if (coeff >= 0.5) return "text-emerald-400";
    if (coeff >= 0.2) return "text-emerald-300";
    if (coeff <= -0.5) return "text-rose-400";
    if (coeff <= -0.2) return "text-amber-300";
    return "text-slate-400";
  };

  if (loading && !sentimentData) {
    return (
      <div className="bg-[#0b0f19] border-b border-slate-800/80 px-4 py-2 text-[11px] font-mono flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <Activity size={12} className="animate-spin text-sky-400" />
          <span>Streaming live market sentiment & fear/greed feeds...</span>
        </div>
      </div>
    );
  }

  const inst = sentimentData?.instruments;

  return (
    <div className="bg-[#0b0f19] border-b border-slate-800/80 text-xs font-mono select-none">
      {/* Horizontal Ticker Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Label & Global Regime */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/50 border border-sky-800/60 text-sky-300 text-[10px] font-bold uppercase tracking-wider">
            <Flame size={12} className="text-amber-400 animate-pulse" />
            <span>SENTIMENT & CORRELATION:</span>
          </div>

          {sentimentData && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                sentimentData.overallRegime === "RISK_ON"
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                  : sentimentData.overallRegime === "RISK_OFF"
                  ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              {sentimentData.globalFearGreedLabel}
            </span>
          )}
        </div>

        {/* 4 Primary Instruments Fear/Greed Ticker Pills */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* BTC/USD */}
          {inst?.btc && (
            <button
              onClick={() => {
                setSelectedInstrument("btc");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] ${getSentimentColor(
                inst.btc.classification
              )} hover:border-sky-500`}
            >
              <span className="font-bold text-white">BTC:</span>
              <span className="font-semibold">{inst.btc.score}</span>
              <span className="text-[10px] opacity-80">({inst.btc.classification.replace("_", " ")})</span>
            </button>
          )}

          {/* US30 */}
          {inst?.us30 && (
            <button
              onClick={() => {
                setSelectedInstrument("us30");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] ${getSentimentColor(
                inst.us30.classification
              )} hover:border-sky-500`}
            >
              <span className="font-bold text-white">US30:</span>
              <span className="font-semibold">{inst.us30.primaryMetric.value}</span>
              <span className="text-[10px] opacity-80">({inst.us30.classification.replace("_", " ")})</span>
            </button>
          )}

          {/* USD/JPY */}
          {inst?.usdJpy && (
            <button
              onClick={() => {
                setSelectedInstrument("usdJpy");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] ${getSentimentColor(
                inst.usdJpy.classification
              )} hover:border-sky-500`}
            >
              <span className="font-bold text-white">USD/JPY:</span>
              <span className="font-semibold">{inst.usdJpy.score}/100</span>
              <span className="text-[10px] opacity-80">Carry</span>
            </button>
          )}

          {/* XAU/USD */}
          {inst?.xau && (
            <button
              onClick={() => {
                setSelectedInstrument("xau");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] ${getSentimentColor(
                inst.xau.classification
              )} hover:border-sky-500`}
            >
              <span className="font-bold text-white">XAU:</span>
              <span className="font-semibold">{inst.xau.score}/100</span>
              <span className="text-[10px] opacity-80">Hedge</span>
            </button>
          )}
        </div>

        {/* Right Controls: Radar Scanner, Expand Drawer, Refresh */}
        <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              title="Open Multi-Instrument Automated Alert Radar"
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 hover:text-white hover:border-indigo-500 transition-colors"
            >
              <Radar size={12} className="text-indigo-400" />
              <span className="hidden sm:inline">Radar Scanner</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Layers size={12} className="text-sky-400" />
            <span className="hidden sm:inline">Sector Correlations</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            onClick={fetchSentiment}
            disabled={isRefreshing}
            title="Refresh sentiment & correlation metrics"
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCw size={12} className={isRefreshing ? "animate-spin text-sky-400" : ""} />
          </button>
        </div>
      </div>

      {/* Expanded Sentiment & Sector Correlation Panel */}
      {isExpanded && sentimentData && (
        <div className="border-t border-slate-800 bg-[#070b13] p-4 transition-all animate-in fade-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header / Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Cross-Asset Market Sentiment & Sector Correlation Matrix</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300">
                    Live Public APIs
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synchronizing Alternative.me Crypto Fear & Greed, CBOE VIX Volatility, US-JP Rate Spread, and Gold Reserve Flows
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {onNavigateToMacro && (
                  <button
                    onClick={onNavigateToMacro}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    <span>Macro Engine</span>
                    <ExternalLink size={10} />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  Close Panel
                </button>
              </div>
            </div>

            {/* Instrument Sentiment Cards (4 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* BTC */}
              {inst?.btc && (
                <div
                  onClick={() => setSelectedInstrument("btc")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedInstrument === "btc"
                      ? "bg-slate-900/90 border-sky-500 shadow-md ring-1 ring-sky-500/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-amber-400">₿</span>
                      <span>BTC/USD</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        getSentimentBadge(inst.btc.score).color
                      }`}
                    >
                      {getSentimentBadge(inst.btc.score).label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-white">{inst.btc.score}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    <span className="text-[10px] text-emerald-400 ml-auto font-medium">Risk-On Asset</span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${inst.btc.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {inst.btc.summary}
                  </p>
                  <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
                    Source: {inst.btc.primaryMetric.source}
                  </span>
                </div>
              )}

              {/* US30 */}
              {inst?.us30 && (
                <div
                  onClick={() => setSelectedInstrument("us30")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedInstrument === "us30"
                      ? "bg-slate-900/90 border-sky-500 shadow-md ring-1 ring-sky-500/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-sky-400">🏛️</span>
                      <span>US30 (Dow 30)</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        getSentimentBadge(inst.us30.score).color
                      }`}
                    >
                      {getSentimentBadge(inst.us30.score).label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-white">{inst.us30.score}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    <span className="text-[10px] text-sky-400 ml-auto font-medium">
                      {inst.us30.primaryMetric.value}
                    </span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${inst.us30.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {inst.us30.summary}
                  </p>
                  <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
                    Source: {inst.us30.primaryMetric.source}
                  </span>
                </div>
              )}

              {/* USD/JPY */}
              {inst?.usdJpy && (
                <div
                  onClick={() => setSelectedInstrument("usdJpy")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedInstrument === "usdJpy"
                      ? "bg-slate-900/90 border-sky-500 shadow-md ring-1 ring-sky-500/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-emerald-400">¥</span>
                      <span>USD/JPY</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        getSentimentBadge(inst.usdJpy.score).color
                      }`}
                    >
                      {getSentimentBadge(inst.usdJpy.score).label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-white">{inst.usdJpy.score}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    <span className="text-[10px] text-emerald-400 ml-auto font-medium">Carry Trade</span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${inst.usdJpy.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {inst.usdJpy.summary}
                  </p>
                  <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
                    Source: {inst.usdJpy.primaryMetric.source}
                  </span>
                </div>
              )}

              {/* XAU/USD */}
              {inst?.xau && (
                <div
                  onClick={() => setSelectedInstrument("xau")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedInstrument === "xau"
                      ? "bg-slate-900/90 border-sky-500 shadow-md ring-1 ring-sky-500/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-amber-300">🪙</span>
                      <span>XAU/USD (Gold)</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        getSentimentBadge(inst.xau.score).color
                      }`}
                    >
                      {getSentimentBadge(inst.xau.score).label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-white">{inst.xau.score}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    <span className="text-[10px] text-amber-300 ml-auto font-medium">Safe Haven</span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-amber-300 transition-all duration-500"
                      style={{ width: `${inst.xau.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {inst.xau.summary}
                  </p>
                  <span className="text-[9px] text-slate-500 mt-2 block border-t border-slate-900 pt-1.5">
                    Source: {inst.xau.primaryMetric.source}
                  </span>
                </div>
              )}
            </div>

            {/* Sector Correlation Matrix Section */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <ArrowRightLeft size={13} className="text-sky-400" />
                  <span>Cross-Asset Sector Correlation Breakdown</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Scale: -1.00 (Pure Inversion) to +1.00 (Lockstep Beta)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {sentimentData.correlations.map((item) => {
                  const isPositive = item.coefficient >= 0;
                  const absCoeff = Math.abs(item.coefficient);
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white text-xs">{item.pair}</span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 ${getCorrelationColor(
                            item.coefficient
                          )}`}
                        >
                          {isPositive ? "+" : ""}
                          {item.coefficient.toFixed(2)}
                        </span>
                      </div>

                      {/* Visual Centered Balance Bar */}
                      <div className="w-full bg-slate-950 h-2 rounded-full relative my-1 overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700 z-10" />
                        {isPositive ? (
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

                      <p className="text-[10px] text-slate-300 mt-1 leading-snug">{item.interpretation}</p>
                      <span className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1 font-mono">
                        <Info size={9} className="text-sky-400" />
                        <span>Driver: {item.flowDriver}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
