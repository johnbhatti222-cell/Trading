import React from "react";
import { ScoreBreakdown, DecisionType } from "../types";
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface ScoreGaugeBreakdownProps {
  score: ScoreBreakdown;
  decision: DecisionType;
  decisionReason: string;
}

export const ScoreGaugeBreakdown: React.FC<ScoreGaugeBreakdownProps> = ({
  score,
  decision,
  decisionReason,
}) => {
  const total = score.totalScore;

  // Decision badge styling
  const getDecisionConfig = () => {
    switch (decision) {
      case "TRADE":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          label: "🟢 TRADE (A+ Candidate)",
          barColor: "bg-emerald-500",
        };
      case "WAIT":
        return {
          bg: "bg-amber-500/10 border-amber-500/40 text-amber-400",
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          label: "🟡 WAIT (Pending Confirmation)",
          barColor: "bg-amber-500",
        };
      case "NO TRADE":
      default:
        return {
          bg: "bg-rose-500/10 border-rose-500/40 text-rose-400",
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
          label: "🔴 NO TRADE (Edge / Risk Violated)",
          barColor: "bg-rose-500",
        };
    }
  };

  const decisionConfig = getDecisionConfig();

  const factors: { label: string; max: number; value: number; weightDesc: string }[] = [
    { label: "HTF Structure Alignment", max: 20, value: score.htfStructure, weightDesc: "Daily/4H Trend, Dominant Flow" },
    { label: "Liquidity Alignment & Raid", max: 20, value: score.liquidityAlignment, weightDesc: "PDH/PDL, Swept vs Resting" },
    { label: "Market Structure Confirmation", max: 15, value: score.marketStructureConfirmation, weightDesc: "15M/5M BOS & CHOCH" },
    { label: "Displacement / Momentum", max: 10, value: score.displacementMomentum, weightDesc: "Impulse Candle Expansion" },
    { label: "Volume & Order Flow", max: 10, value: score.volumeOrderFlow, weightDesc: "Absorption, CVD, Funding" },
    { label: "Macro & News Filter", max: 10, value: score.macroEnvironment, weightDesc: "DXY, Yields, Economic Events" },
    { label: "Session / Timing Killzone", max: 5, value: score.sessionTiming, weightDesc: "London, NY Open, Overlap" },
    { label: "Risk to Reward Ratio", max: 5, value: score.riskReward, weightDesc: "Minimum 1:2 R:R Ratio" },
    { label: "Market Regime Alignment", max: 5, value: score.regimeAlignment, weightDesc: "Trending vs Range vs Event" },
  ];

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Decision Banner */}
      <div className={`p-4 rounded-lg border ${decisionConfig.bg} flex items-start justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{decisionConfig.icon}</div>
          <div>
            <h3 className="font-mono font-bold text-sm tracking-wide uppercase">
              {decisionConfig.label}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {decisionReason}
            </p>
          </div>
        </div>

        {/* Big Score Gauge */}
        <div className="text-right flex-shrink-0">
          <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {total}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">
            Institutional Score
          </span>
        </div>
      </div>

      {/* Threshold Reference Indicator */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3 text-xs font-mono">
        <div className="flex justify-between items-center text-slate-400 mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Decision Thresholds</span>
          <span className="text-slate-300 font-semibold">Active: {total} pts</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="w-[65%] h-full bg-rose-500/40" title="<65: NO TRADE" />
          <div className="w-[10%] h-full bg-amber-500/40" title="65-74: Watchlist (B)" />
          <div className="w-[10%] h-full bg-amber-400/60" title="75-84: Wait (A)" />
          <div className="w-[15%] h-full bg-emerald-500/80" title="85-100: TRADE (A+)" />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
          <span>0 (NO TRADE)</span>
          <span className="text-rose-400">65</span>
          <span className="text-amber-400">75</span>
          <span className="text-emerald-400">85 (A+ TRADE)</span>
          <span>100</span>
        </div>
      </div>

      {/* 9-Factor Breakdown Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {factors.map((f, i) => {
          const pct = Math.round((f.value / f.max) * 100);
          const isHigh = pct >= 80;
          const isLow = pct < 60;

          return (
            <div
              key={i}
              className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-slate-300 font-mono truncate">
                  {f.label}
                </span>
                <span className="text-xs font-bold font-mono text-white flex-shrink-0">
                  {f.value}
                  <span className="text-[10px] text-slate-500 font-normal">/{f.max}</span>
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden my-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    isHigh ? "bg-emerald-400" : isLow ? "bg-rose-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {f.weightDesc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
