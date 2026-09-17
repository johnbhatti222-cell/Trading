import React, { useState } from "react";
import { TradeAnalysis } from "../types";
import {
  Target,
  Shield,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface TradePlanCardProps {
  analysis: TradeAnalysis;
  onOpenConsult?: () => void;
}

export const TradePlanCard: React.FC<TradePlanCardProps> = ({ analysis, onOpenConsult }) => {
  const [copied, setCopied] = useState(false);
  const isShort = analysis.tradePlan.direction === "SHORT";
  const isLong = analysis.tradePlan.direction === "LONG";
  const isNone = analysis.tradePlan.direction === "NONE" || analysis.decision === "NO TRADE";

  const handleCopyPlan = () => {
    const text = `
=== MASTER TRADING ANALYST PLAN ===
INSTRUMENT: ${analysis.market.instrument}
CURRENT PRICE: ${analysis.market.currentPrice}
REGIME: ${analysis.market.marketRegime}
DECISION: ${analysis.decision} (Score: ${analysis.score.totalScore}/100)
DIRECTION: ${analysis.tradePlan.direction}
ENTRY: ${analysis.tradePlan.entryZone}
STOP LOSS: ${analysis.tradePlan.stopLoss}
TP1: ${analysis.tradePlan.tp1}
TP2: ${analysis.tradePlan.tp2}
TP3: ${analysis.tradePlan.tp3}
R:R: ${analysis.tradePlan.riskReward}
INVALIDATION: ${analysis.invalidation}
KEY RISK: ${analysis.keyRisk}
===================================
`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header with Bias & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-md font-mono font-bold text-xs flex items-center gap-1.5 ${
              analysis.bias.direction === "BULLISH"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : analysis.bias.direction === "BEARISH"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-slate-700/50 text-slate-300 border border-slate-600"
            }`}
          >
            {analysis.bias.direction === "BULLISH" && <TrendingUp size={14} />}
            {analysis.bias.direction === "BEARISH" && <TrendingDown size={14} />}
            {analysis.bias.direction === "NEUTRAL" && <Minus size={14} />}
            {analysis.bias.direction} BIAS ({analysis.bias.confidence}% Confidence)
          </div>

          <span className="text-xs font-mono text-slate-400">
            Regime: <strong className="text-slate-200">{analysis.market.marketRegime}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConsult && (
            <button
              onClick={onOpenConsult}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-mono text-xs flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare size={13} />
              Challenge Thesis
            </button>
          )}

          <button
            onClick={handleCopyPlan}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Copy institutional trade plan to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy Plan"}
          </button>
        </div>
      </div>

      {/* Trade Execution Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Direction & Action */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Order Direction
          </span>
          <div className="text-base font-mono font-bold flex items-center gap-2">
            {isLong && <span className="text-emerald-400">🟢 BUY / LONG</span>}
            {isShort && <span className="text-rose-400">🔴 SELL / SHORT</span>}
            {isNone && <span className="text-slate-400">⚪ NO EXECUTION</span>}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Setup: {analysis.setup.setupType}
          </span>
        </div>

        {/* Entry Zone */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Entry Zone
          </span>
          <div className="text-base font-mono font-bold text-sky-300 truncate">
            {analysis.tradePlan.entryZone}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Confirmation: {analysis.setup.confirmationRequired}
          </span>
        </div>

        {/* Stop Loss & Invalidation */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Stop Loss (Invalidation)
          </span>
          <div className="text-base font-mono font-bold text-rose-400 truncate">
            {analysis.tradePlan.stopLoss}
          </div>
          <span className="text-[11px] text-rose-300/80 font-mono mt-1 block truncate">
            Logical Swing Invalidation
          </span>
        </div>

        {/* Risk / Reward */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Risk / Reward Ratio
          </span>
          <div className="text-base font-mono font-bold text-emerald-400">
            {analysis.tradePlan.riskReward}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Institutional minimum: 1:2.0
          </span>
        </div>
      </div>

      {/* Structured Take Profit Targets */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4">
        <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          Structured Liquidity Targets (Take Profit Hierarchy)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-md">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-emerald-400 font-bold">TP1 (Nearest Opposing)</span>
              <span className="text-[10px] text-slate-400">50% Scale-out</span>
            </div>
            <p className="text-sm font-mono font-semibold text-white">{analysis.tradePlan.tp1}</p>
            <p className="text-[11px] text-slate-400 mt-1">Take partials & move stop to breakeven</p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-md">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-sky-400 font-bold">TP2 (Structural Target)</span>
              <span className="text-[10px] text-slate-400">30% Scale-out</span>
            </div>
            <p className="text-sm font-mono font-semibold text-white">{analysis.tradePlan.tp2}</p>
            <p className="text-[11px] text-slate-400 mt-1">Major intermediate swing boundary</p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-md">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-purple-400 font-bold">TP3 (HTF Liquidity Pool)</span>
              <span className="text-[10px] text-slate-400">20% Runner</span>
            </div>
            <p className="text-sm font-mono font-semibold text-white">{analysis.tradePlan.tp3}</p>
            <p className="text-[11px] text-slate-400 mt-1">Daily / 4H opposing liquidity extreme</p>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Structure & Liquidity Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Structure Analysis */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3.5 flex flex-col gap-2.5">
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Multi-Timeframe Structure
          </span>
          <div className="text-xs font-mono space-y-1.5">
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-slate-400 block mb-0.5">Higher-Timeframe (Daily/4H):</strong>
              <span className="text-slate-200">{analysis.structure.higherTimeframe}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-slate-400 block mb-0.5">Intermediate (1H):</strong>
              <span className="text-slate-200">{analysis.structure.intermediate}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-slate-400 block mb-0.5">Lower-Timeframe (15M/5M):</strong>
              <span className="text-slate-200">{analysis.structure.lowerTimeframe}</span>
            </div>
          </div>
        </div>

        {/* Liquidity Model */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3.5 flex flex-col gap-2.5">
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Liquidity Model & Order Flow
          </span>
          <div className="text-xs font-mono space-y-1.5">
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-amber-400 block mb-0.5">Buy-Side Liquidity (BSL):</strong>
              <span className="text-slate-200">{analysis.liquidity.buySideLiquidity}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-purple-400 block mb-0.5">Sell-Side Liquidity (SSL):</strong>
              <span className="text-slate-200">{analysis.liquidity.sellSideLiquidity}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
              <strong className="text-emerald-400 block mb-0.5">Next Liquidity Magnet:</strong>
              <span className="text-slate-200">{analysis.liquidity.nextLikelyLiquidityTarget}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Invalidation & Key Risk Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invalidation Alert */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3.5 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wide">
              Thesis Invalidation Level
            </h5>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed font-mono">
              {analysis.invalidation}
            </p>
          </div>
        </div>

        {/* Key Risk Alert */}
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
              Primary Hazard / Event Risk
            </h5>
            <p className="text-xs text-amber-200 mt-1 leading-relaxed font-mono">
              {analysis.keyRisk}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
