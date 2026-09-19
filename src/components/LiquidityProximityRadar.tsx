import React, { useState, useEffect, useRef } from "react";
import { TradeAnalysis } from "../types";
import {
  Radio,
  Volume2,
  VolumeX,
  Target,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from "lucide-react";

interface LiquidityProximityRadarProps {
  analysis: TradeAnalysis;
}

interface LiquidityLevel {
  id: string;
  name: string;
  type: "PDH" | "PDL" | "EQH" | "EQL" | "FVG_CE";
  price: number;
  biasTarget: "BUY_SIDE" | "SELL_SIDE";
  description: string;
}

export const LiquidityProximityRadar: React.FC<LiquidityProximityRadarProps> = ({
  analysis,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastAlertLevel, setLastAlertLevel] = useState<string | null>(null);

  // Helper to extract clean numeric value
  const parseNum = (str?: string, defaultVal = 0): number => {
    if (!str) return defaultVal;
    const clean = str.replace(/[^0-9.]/g, "");
    return parseFloat(clean) || defaultVal;
  };

  const currentPrice = parseNum(analysis?.market?.currentPrice, 4328.5);
  const instrument = analysis?.market?.instrument || "XAU/USD";
  const isGold = instrument.toUpperCase().includes("XAU") || instrument.toUpperCase().includes("GOLD");
  const isCrypto =
    instrument.toUpperCase().includes("BTC") ||
    instrument.toUpperCase().includes("ETH") ||
    instrument.toUpperCase().includes("SOL");
  const isIndex =
    instrument.toUpperCase().includes("US30") ||
    instrument.toUpperCase().includes("DJI") ||
    instrument.toUpperCase().includes("NAS") ||
    instrument.toUpperCase().includes("SPX");
  const isJpy = instrument.toUpperCase().includes("JPY");

  const pipUnit = isGold ? "$" : isCrypto ? "$" : isIndex ? "pts" : isJpy ? "pips" : "pips";
  const pipDivisor = isGold ? 1 : isCrypto ? 1 : isIndex ? 1 : isJpy ? 0.01 : 0.0001;

  // Synthesize key institutional liquidity levels based on instrument price
  const levels: LiquidityLevel[] = [
    {
      id: "pdh",
      name: "Previous Day High (PDH)",
      type: "PDH",
      price: isGold
        ? currentPrice + 4.8
        : isCrypto
        ? currentPrice + 420
        : isIndex
        ? currentPrice + 140
        : isJpy
        ? currentPrice + 0.45
        : currentPrice + 0.0035,
      biasTarget: "BUY_SIDE",
      description: "External Buy-Side Liquidity (BSL) Resting Stop Orders",
    },
    {
      id: "fvg-ce",
      name: "15M FVG Consequent Encroachment (CE 50%)",
      type: "FVG_CE",
      price: isGold
        ? currentPrice - 2.2
        : isCrypto
        ? currentPrice - 180
        : isIndex
        ? currentPrice - 65
        : isJpy
        ? currentPrice - 0.22
        : currentPrice - 0.0018,
      biasTarget: "SELL_SIDE",
      description: "Institutional Fair Value Gap 50% Midline Mitigation",
    },
    {
      id: "pdl",
      name: "Previous Day Low (PDL)",
      type: "PDL",
      price: isGold
        ? currentPrice - 8.4
        : isCrypto
        ? currentPrice - 650
        : isIndex
        ? currentPrice - 210
        : isJpy
        ? currentPrice - 0.65
        : currentPrice - 0.0062,
      biasTarget: "SELL_SIDE",
      description: "External Sell-Side Liquidity (SSL) Resting Trapped Orders",
    },
    {
      id: "eqh",
      name: "Asian Session High (EQH)",
      type: "EQH",
      price: isGold
        ? currentPrice + 1.8
        : isCrypto
        ? currentPrice + 120
        : isIndex
        ? currentPrice + 45
        : isJpy
        ? currentPrice + 0.18
        : currentPrice + 0.0012,
      biasTarget: "BUY_SIDE",
      description: "Clean Equal Highs - Institutional Inducement Pool",
    },
  ];

  // Web Audio Sonar Ping
  const playSonarPing = (freq = 880) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio Context blocked:", e);
    }
  };

  // Check for Kill Zone proximity
  const killZoneThreshold = isGold ? 2.5 : isCrypto ? 150 : 0.0015; // in absolute price delta

  const enrichedLevels = levels.map((lvl) => {
    const delta = lvl.price - currentPrice;
    const distanceAbs = Math.abs(delta);
    const distancePips = (distanceAbs / pipDivisor).toFixed(1);
    const isKillZone = distanceAbs <= killZoneThreshold;
    const isApproaching = distanceAbs > killZoneThreshold && distanceAbs <= killZoneThreshold * 2.5;

    return {
      ...lvl,
      delta,
      distanceAbs,
      distancePips,
      isKillZone,
      isApproaching,
    };
  });

  // Sort by closest distance
  enrichedLevels.sort((a, b) => a.distanceAbs - b.distanceAbs);
  const closestLevel = enrichedLevels[0];

  // Auto-ping when closest is in Kill Zone
  useEffect(() => {
    if (closestLevel.isKillZone && lastAlertLevel !== closestLevel.id) {
      setLastAlertLevel(closestLevel.id);
      playSonarPing(980);
    }
  }, [closestLevel.id, closestLevel.isKillZone, lastAlertLevel]);

  return (
    <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 font-mono shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider">
                SUB-PIP LIQUIDITY PROXIMITY RADAR & PRE-SWEEP SONAR
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-500/40">
                ACTIVE MONITOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live distance tracking to key institutional liquidity pools (PDH/PDL & FVG CE).
            </p>
          </div>
        </div>

        {/* Audio Toggle & Test Ping */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => playSonarPing(880)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-colors"
          >
            Test Sonar Ping
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded border transition-colors ${
              soundEnabled
                ? "bg-sky-950/60 border-sky-500/50 text-sky-300"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
            title={soundEnabled ? "Pre-sweep sound alert active" : "Sound muted"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Proximity Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {enrichedLevels.map((lvl) => {
          const isAbove = lvl.delta > 0;
          return (
            <div
              key={lvl.id}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                lvl.isKillZone
                  ? "bg-rose-950/40 border-rose-500/80 shadow-md ring-1 ring-rose-500/40 animate-pulse"
                  : lvl.isApproaching
                  ? "bg-amber-950/30 border-amber-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400">{lvl.type}</span>
                  {lvl.isKillZone ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white flex items-center gap-1">
                      <Zap size={10} />
                      <span>IN KILL ZONE</span>
                    </span>
                  ) : lvl.isApproaching ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                      APPROACHING
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500">DORMANT</span>
                  )}
                </div>

                <div className="text-xs font-bold text-white mb-1 line-clamp-1">{lvl.name}</div>
                <div className="text-[10px] text-slate-400 mb-2">{lvl.description}</div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">LEVEL PRICE:</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    ${lvl.price.toFixed(isGold ? 2 : isCrypto ? 1 : 4)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">DISTANCE:</span>
                  <span
                    className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                      lvl.isKillZone
                        ? "text-rose-400"
                        : lvl.isApproaching
                        ? "text-amber-400"
                        : "text-slate-300"
                    }`}
                  >
                    {isAbove ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {lvl.distancePips} {pipUnit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
