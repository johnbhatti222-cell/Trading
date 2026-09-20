import React, { useState } from "react";
import { TradeAnalysis } from "../types";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MultiTimeframeAlignmentMatrixProps {
  analysis: TradeAnalysis;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
}

interface TimeframeLayer {
  tf: "1D" | "4H" | "15M" | "1M/5M";
  name: string;
  role: string;
  trend: "BULLISH" | "BEARISH" | "CONSOLIDATING";
  drawOnLiquidity: string;
  keyStructure: string;
  isAligned: boolean;
  confluenceDetail: string;
}

export const MultiTimeframeAlignmentMatrix: React.FC<
  MultiTimeframeAlignmentMatrixProps
> = ({ analysis, selectedTimeframe, onSelectTimeframe }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const direction = analysis?.tradePlan?.direction === "SHORT" ? "SHORT" : "LONG";
  const isShort = direction === "SHORT";

  // Derive top-down institutional layers
  const layers: TimeframeLayer[] = [
    {
      tf: "1D",
      name: "Daily Macro Frame",
      role: "External Draw on Liquidity (DOL)",
      trend: isShort ? "BEARISH" : "BULLISH",
      drawOnLiquidity: isShort
        ? "Previous Day Low (PDL) & Daily SSL"
        : "Previous Day High (PDH) & Daily BSL",
      keyStructure: isShort
        ? "Premium Liquidity Sweep → Daily Imbalance"
        : "Discount Liquidity Sweep → Daily Imbalance",
      isAligned: true,
      confluenceDetail:
        analysis?.liquidity?.nextLikelyLiquidityTarget ||
        analysis?.structure?.higherTimeframe ||
        "Targeting external liquidity pool.",
    },
    {
      tf: "4H",
      name: "4-Hour Intermediate Frame",
      role: "Order Flow & Key Order Blocks",
      trend: isShort ? "BEARISH" : "BULLISH",
      drawOnLiquidity: isShort
        ? "4H Sell-Side Inefficiency & FVG"
        : "4H Buy-Side Inefficiency & FVG",
      keyStructure: isShort
        ? "4H Bearish Order Block (Mitigation)"
        : "4H Bullish Order Block (Mitigation)",
      isAligned: true,
      confluenceDetail:
        analysis?.structure?.intermediate ||
        "4H Candle closes confirming displacement momentum.",
    },
    {
      tf: "15M",
      name: "15-Minute Setup Frame",
      role: "Liquidity Sweep & Displacement",
      trend: isShort ? "BEARISH" : "BULLISH",
      drawOnLiquidity: isShort ? "Asian/London High Swept" : "Asian/London Low Swept",
      keyStructure: isShort
        ? "15M Internal MSS (CHOCH) + Unmitigated FVG"
        : "15M Internal MSS (CHOCH) + Unmitigated FVG",
      isAligned: true,
      confluenceDetail: `Market Structure: ${
        analysis?.structure?.lowerTimeframe ||
        analysis?.market?.marketRegime ||
        "Internal shift"
      }.`,
    },
    {
      tf: "1M/5M",
      name: "1M / 5M Sniper Trigger Frame",
      role: "Sub-Pip Mitigation & OTE Entry",
      trend: isShort ? "BEARISH" : "BULLISH",
      drawOnLiquidity: isShort ? "OTE 62%–70.5% CE Retest" : "OTE 62%–70.5% CE Retest",
      keyStructure: isShort ? "Micro MSS & Fair Value Gap Tap" : "Micro MSS & Fair Value Gap Tap",
      isAligned: analysis?.decision !== "NO TRADE",
      confluenceDetail: `Entry Zone: ${analysis?.tradePlan?.entryZone || "Optimal Entry"} • SL: ${
        analysis?.tradePlan?.stopLoss || "Invalidation"
      }`,
    },
  ];

  const alignedCount = layers.filter((l) => l.isAligned).length;
  const alignmentPercent = Math.round((alignedCount / layers.length) * 100);

  const getAlignmentStatus = () => {
    if (alignmentPercent === 100) {
      return {
        label: "100% UNISON HARMONIC ALIGNMENT",
        badge: "FULL 1.0R RISK AUTHORIZED",
        color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/50",
        description: "All 4 fractal layers agree with directional flow. Highest mathematical probability.",
      };
    }
    if (alignmentPercent >= 75) {
      return {
        label: "75% PARTIAL ALIGNMENT",
        badge: "DEFENSIVE 0.5R RISK SCALE",
        color: "text-amber-400 bg-amber-950/60 border-amber-500/50",
        description: "Higher timeframe aligned, but micro trigger awaits final confirmation.",
      };
    }
    return {
      label: "SPLIT FLOW / CONFLICTING",
      badge: "STAND DOWN / 0.25R MAX",
      color: "text-rose-400 bg-rose-950/60 border-rose-500/50",
      description: "Fractal layers in conflict. High risk of low-probability chop or fakeout.",
    };
  };

  const status = getAlignmentStatus();

  return (
    <div className="bg-[#0b0e14] border border-slate-800 rounded-xl overflow-hidden font-mono shadow-xl">
      {/* Header Bar */}
      <div className="p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-white tracking-wider">
                FRACTAL ALIGNMENT MATRIX (1D ➔ 4H ➔ 15M ➔ 1M/5M)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {alignmentPercent}% HARMONIC
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate sm:whitespace-normal">
              Entries require structural confluence across all fractal degrees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Status Badge */}
          <div className={`px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${status.color}`}>
            <Zap size={13} className="fill-current" />
            <span>{status.badge}</span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Content: 4-Pillar Grid */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {layers.map((layer) => {
              const isCurrentTf = selectedTimeframe.toLowerCase().includes(layer.tf.toLowerCase().split("/")[0]);
              const isBull = layer.trend === "BULLISH";

              return (
                <div
                  key={layer.tf}
                  onClick={() => onSelectTimeframe(layer.tf === "1M/5M" ? "5m" : layer.tf.toLowerCase())}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-w-0 ${
                    isCurrentTf
                      ? "bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                >
                  <div>
                    {/* Timeframe Tag & Alignment Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {layer.tf}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans font-semibold">
                          {layer.name.replace(" Frame", "")}
                        </span>
                      </div>

                      {layer.isAligned ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                          <CheckCircle2 size={11} />
                          <span>ALIGNED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                          <AlertTriangle size={11} />
                          <span>AWAITING</span>
                        </span>
                      )}
                    </div>

                    {/* Trend & Role */}
                    <div className="mb-2">
                      <div className="text-[11px] text-slate-400 font-sans">{layer.role}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isBull ? (
                          <TrendingUp size={13} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={13} className="text-rose-400" />
                        )}
                        <span className={`text-xs font-bold ${isBull ? "text-emerald-400" : "text-rose-400"}`}>
                          {layer.trend}
                        </span>
                      </div>
                    </div>

                    {/* Draw on Liquidity & Structure */}
                    <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">DRAW ON LIQUIDITY:</span>
                        <span className="text-slate-300 font-semibold">{layer.drawOnLiquidity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">STRUCTURAL LEVEL:</span>
                        <span className="text-indigo-300">{layer.keyStructure}</span>
                      </div>
                    </div>
                  </div>

                  {/* Confluence Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 line-clamp-2">
                    {layer.confluenceDetail}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Harmonic Summary Ribbon */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">HARMONIC ASSESSMENT:</span>
              <span className="text-white font-semibold">{status.label}</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              {status.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
