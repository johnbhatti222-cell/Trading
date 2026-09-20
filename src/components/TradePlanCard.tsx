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

  // Helper to parse price & descriptive note from strings like "$80,771.56 (Structural Invalidation above sweep wick)"
  const parsePriceAndNote = (rawStr: string | undefined) => {
    if (!rawStr) return { price: "---", note: "" };
    const match = rawStr.match(/^([^()]+)(?:\s*\((.*?)\))?$/);
    if (match) {
      return {
        price: match[1].trim(),
        note: match[2]?.trim() || "",
      };
    }
    return { price: rawStr, note: "" };
  };

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

  const stopLossParsed = parsePriceAndNote(analysis.tradePlan.stopLoss);
  const tp1Parsed = parsePriceAndNote(analysis.tradePlan.tp1);
  const tp2Parsed = parsePriceAndNote(analysis.tradePlan.tp2);
  const tp3Parsed = parsePriceAndNote(analysis.tradePlan.tp3);

  // Helper to render entry zone cleanly without truncation
  const renderEntryZone = () => {
    const zone = analysis.tradePlan.entryZone;
    if (!zone) return <span className="text-slate-400">---</span>;

    // Check if zone is a range like "$80,532.56 – $80,610.00" or "$80,532.56 - $80,610.00"
    const parts = zone.split(/\s*[-–—]\s*/);
    if (parts.length === 2 && parts[0].startsWith("$") && parts[1].startsWith("$")) {
      return (
        <div className="flex items-baseline gap-1.5 flex-wrap font-mono">
          <span className="text-base sm:text-lg font-bold text-sky-300 tracking-tight">{parts[0]}</span>
          <span className="text-xs text-sky-400 font-semibold uppercase px-1 py-0.5 rounded bg-sky-950/60 border border-sky-900/60">
            to
          </span>
          <span className="text-base sm:text-lg font-bold text-sky-300 tracking-tight">{parts[1]}</span>
        </div>
      );
    }

    return (
      <div className="text-sm sm:text-base font-mono font-bold text-sky-300 break-words leading-snug">
        {zone}
      </div>
    );
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 sm:gap-5">
      {/* Header with Bias & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
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

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Trade Execution Matrix - 4 Cards, with zero truncation and spacious padding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Direction & Action */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Order Direction
            </span>
            <div className="inline-block">
              {isLong && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-sm tracking-wide shadow-sm whitespace-nowrap">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                  </span>
                  BUY / LONG
                </span>
              )}
              {isShort && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-bold text-sm tracking-wide shadow-sm whitespace-nowrap">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400"></span>
                  </span>
                  SELL / SHORT
                </span>
              )}
              {isNone && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono font-bold text-sm tracking-wide shadow-sm whitespace-nowrap">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  NO EXECUTION
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-mono block leading-relaxed break-words">
              <span className="text-slate-500 font-medium">Setup: </span>
              <span className="text-slate-200 font-semibold">{analysis.setup.setupType}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Entry Zone */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Entry Zone
            </span>
            {renderEntryZone()}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-mono block leading-relaxed break-words">
              <span className="text-slate-500 font-medium">Confirmation: </span>
              <span className="text-slate-300">{analysis.setup.confirmationRequired}</span>
            </span>
          </div>
        </div>

        {/* Card 3: Stop Loss & Invalidation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Stop Loss (Invalidation)
            </span>
            <div className="text-base sm:text-lg font-mono font-bold text-rose-400 tracking-tight break-words">
              {stopLossParsed.price}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <span className="text-[11px] text-rose-300/90 font-mono block leading-relaxed break-words">
              <span className="text-rose-400/70 font-medium">Condition: </span>
              <span>{stopLossParsed.note || "Strict invalidation at key swing boundary"}</span>
            </span>
          </div>
        </div>

        {/* Card 4: Risk / Reward */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Risk / Reward Ratio
            </span>
            <div className="text-base sm:text-lg font-mono font-bold text-emerald-400 tracking-tight">
              {analysis.tradePlan.riskReward}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 leading-snug">
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              <span>
                Institutional threshold:{" "}
                <strong className="text-slate-300 font-semibold">1:2.0 min</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Take Profit Targets */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
        <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          Structured Liquidity Targets (Take Profit Hierarchy)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* TP1 */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-emerald-400 font-bold">TP1 (Nearest Opposing)</span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                  50% Scale-out
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white tracking-tight break-words">
                {tp1Parsed.price}
              </p>
              {tp1Parsed.note && (
                <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5 break-words">
                  {tp1Parsed.note}
                </p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-900 font-mono">
              Take partials & move stop to breakeven
            </p>
          </div>

          {/* TP2 */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-sky-400 font-bold">TP2 (Structural Target)</span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                  30% Scale-out
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white tracking-tight break-words">
                {tp2Parsed.price}
              </p>
              {tp2Parsed.note && (
                <p className="text-[11px] text-sky-300/80 font-mono mt-0.5 break-words">
                  {tp2Parsed.note}
                </p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-900 font-mono">
              Major intermediate swing boundary
            </p>
          </div>

          {/* TP3 */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-purple-400 font-bold">TP3 (HTF Liquidity Pool)</span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                  20% Runner
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white tracking-tight break-words">
                {tp3Parsed.price}
              </p>
              {tp3Parsed.note && (
                <p className="text-[11px] text-purple-300/80 font-mono mt-0.5 break-words">
                  {tp3Parsed.note}
                </p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-900 font-mono">
              Daily / 4H opposing liquidity extreme
            </p>
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
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3.5 flex items-start gap-3 min-w-0">
          <AlertOctagon className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h5 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wide">
              Thesis Invalidation Level
            </h5>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed font-mono">
              {analysis.invalidation}
            </p>
          </div>
        </div>

        {/* Key Risk Alert */}
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 flex items-start gap-3 min-w-0">
          <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
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
