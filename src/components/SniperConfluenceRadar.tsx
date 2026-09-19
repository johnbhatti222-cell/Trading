import React, { useState, useEffect, useMemo } from "react";
import { TradeAnalysis } from "../types";
import {
  Crosshair,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Clock,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
} from "lucide-react";

interface SniperConfluenceRadarProps {
  analysis: TradeAnalysis;
  onOpenSizer?: () => void;
}

export const SniperConfluenceRadar: React.FC<SniperConfluenceRadarProps> = ({
  analysis,
  onOpenSizer,
}) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Manual override gates state initialized from analysis
  const [overrideGate1, setOverrideGate1] = useState<boolean | null>(null);
  const [overrideGate2, setOverrideGate2] = useState<boolean | null>(null);
  const [overrideGate3, setOverrideGate3] = useState<boolean | null>(null);
  const [overrideGate4, setOverrideGate4] = useState<boolean | null>(null);
  const [overrideGate5, setOverrideGate5] = useState<boolean | null>(null);

  // Reset overrides when analysis changes
  useEffect(() => {
    setOverrideGate1(null);
    setOverrideGate2(null);
    setOverrideGate3(null);
    setOverrideGate4(null);
    setOverrideGate5(null);
  }, [analysis.id, analysis.market.instrument]);

  // Evaluate Killzone from current UTC time
  const [sessionInfo, setSessionInfo] = useState<{
    inKillzone: boolean;
    activeKillzone: string;
    nextKillzone: string;
  }>({
    inKillzone: false,
    activeKillzone: "Outside Killzone",
    nextKillzone: "London Open (07:00 UTC)",
  });

  useEffect(() => {
    const checkSessions = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();
      const timeVal = utcHour + utcMin / 60;

      // London Open: 07:00 - 10:00 UTC
      // NY AM (Silver Bullet): 12:00 - 15:00 UTC
      // London Close: 15:00 - 17:00 UTC
      // Asian Range: 00:00 - 06:00 UTC
      let inKillzone = false;
      let activeKillzone = "Asian / Off-Peak Hours";
      let nextKillzone = "London Open (07:00 UTC)";

      if (timeVal >= 7 && timeVal < 10) {
        inKillzone = true;
        activeKillzone = "London Open Killzone (07:00–10:00 UTC)";
        nextKillzone = "NY AM Open (12:00 UTC)";
      } else if (timeVal >= 12 && timeVal < 15) {
        inKillzone = true;
        activeKillzone = "New York AM Killzone / Silver Bullet (12:00–15:00 UTC)";
        nextKillzone = "London Close (15:00 UTC)";
      } else if (timeVal >= 15 && timeVal < 17) {
        inKillzone = true;
        activeKillzone = "London Close Mitigation (15:00–17:00 UTC)";
        nextKillzone = "Asian Accumulation (00:00 UTC)";
      } else if (timeVal < 7) {
        inKillzone = false;
        activeKillzone = "Asian Range Accumulation (Pre-London)";
        nextKillzone = "London Open (07:00 UTC)";
      } else if (timeVal >= 10 && timeVal < 12) {
        inKillzone = false;
        activeKillzone = "London Lunch / NY Pre-Market Void";
        nextKillzone = "New York AM Open (12:00 UTC)";
      } else {
        inKillzone = false;
        activeKillzone = "NY Afternoon Thin Session";
        nextKillzone = "Asian Open (00:00 UTC)";
      }

      setSessionInfo({ inKillzone, activeKillzone, nextKillzone });
    };

    checkSessions();
    const interval = setInterval(checkSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  // Parse numeric prices from strings
  const parsedNumbers = useMemo(() => {
    const extractNum = (str?: string): number => {
      if (!str) return 0;
      const clean = str.replace(/[^0-9.]/g, "");
      return parseFloat(clean) || 0;
    };

    const entry = extractNum(analysis.tradePlan.entryZone);
    const stop = extractNum(analysis.tradePlan.stopLoss);
    const current = extractNum(analysis.market.currentPrice);

    const isLong = analysis.tradePlan.direction === "LONG";
    const isShort = analysis.tradePlan.direction === "SHORT";

    // Approximate displacement range (from stop/invalidation to entry)
    const range = Math.abs(entry - stop) || (current * 0.005);
    const base = isLong ? Math.min(entry, stop) : Math.max(entry, stop);

    // ICT Optimal Trade Entry (OTE) Fib Levels
    // 0.50 = Consequent Encroachment (CE)
    // 0.618 = OTE Entry Tier 1
    // 0.705 = OTE Sweet Spot
    // 0.786 = OTE Deep Retest
    let ce50 = 0;
    let ote62 = 0;
    let ote70 = 0;
    let ote79 = 0;

    if (isLong) {
      const low = Math.min(entry, stop);
      const high = Math.max(entry, stop) + range * 0.5;
      const diff = high - low;
      ce50 = high - diff * 0.5;
      ote62 = high - diff * 0.618;
      ote70 = high - diff * 0.705;
      ote79 = high - diff * 0.786;
    } else if (isShort) {
      const high = Math.max(entry, stop);
      const low = Math.min(entry, stop) - range * 0.5;
      const diff = high - low;
      ce50 = low + diff * 0.5;
      ote62 = low + diff * 0.618;
      ote70 = low + diff * 0.705;
      ote79 = low + diff * 0.786;
    } else {
      ce50 = current;
      ote62 = current * 0.998;
      ote70 = current * 0.996;
      ote79 = current * 0.994;
    }

    return {
      entry,
      stop,
      current,
      ce50,
      ote62,
      ote70,
      ote79,
      isLong,
      isShort,
    };
  }, [analysis]);

  // Evaluate 5 Gates
  // Gate 1: Liquidity Purged
  const gate1LiquidityPurged = useMemo(() => {
    if (overrideGate1 !== null) return overrideGate1;
    const swept = (analysis.liquidity.liquidityAlreadySwept || "").toLowerCase();
    const obs = (analysis.masterPromptAnalysisMarkdown || "").toLowerCase();
    return (
      swept.includes("sweep") ||
      swept.includes("raided") ||
      swept.includes("purged") ||
      swept.includes("taken") ||
      swept.includes("pdh") ||
      swept.includes("pdl") ||
      obs.includes("liquidity sweep") ||
      obs.includes("purged") ||
      analysis.score.liquidityAlignment >= 15
    );
  }, [analysis, overrideGate1]);

  // Gate 2: Imbalance Displacement (FVG)
  const gate2DisplacementFvg = useMemo(() => {
    if (overrideGate2 !== null) return overrideGate2;
    const desc = (analysis.structure.intermediate + " " + analysis.setup.whyExists).toLowerCase();
    return (
      desc.includes("displacement") ||
      desc.includes("fvg") ||
      desc.includes("fair value") ||
      desc.includes("imbalance") ||
      analysis.score.displacementMomentum >= 7
    );
  }, [analysis, overrideGate2]);

  // Gate 3: Internal Market Structure Shift (iMSS / CHOCH)
  const gate3StructureShift = useMemo(() => {
    if (overrideGate3 !== null) return overrideGate3;
    const lower = (analysis.structure.lowerTimeframe + " " + analysis.setup.setupType).toLowerCase();
    return (
      lower.includes("choch") ||
      lower.includes("bos") ||
      lower.includes("structure shift") ||
      lower.includes("reversal") ||
      analysis.score.marketStructureConfirmation >= 11
    );
  }, [analysis, overrideGate3]);

  // Gate 4: OTE 62%-79% Retest / Mitigation
  const gate4OteMitigation = useMemo(() => {
    if (overrideGate4 !== null) return overrideGate4;
    const setupType = (analysis.setup.setupType + " " + analysis.setup.whyExists).toLowerCase();
    return (
      setupType.includes("retest") ||
      setupType.includes("mitigation") ||
      setupType.includes("ote") ||
      setupType.includes("fvg") ||
      analysis.decision === "TRADE" ||
      analysis.score.totalScore >= 75
    );
  }, [analysis, overrideGate4]);

  // Gate 5: Active Killzone Timing
  const gate5KillzoneTiming = useMemo(() => {
    if (overrideGate5 !== null) return overrideGate5;
    return sessionInfo.inKillzone || analysis.score.sessionTiming >= 4;
  }, [sessionInfo, analysis, overrideGate5]);

  // Calculate total passed gates
  const gatesPassed = [
    gate1LiquidityPurged,
    gate2DisplacementFvg,
    gate3StructureShift,
    gate4OteMitigation,
    gate5KillzoneTiming,
  ].filter(Boolean).length;

  const radarState: "FIRE" | "ARMED" | "STANDBY" = useMemo(() => {
    if (gatesPassed === 5 && analysis.tradePlan.direction !== "NONE") return "FIRE";
    if (gatesPassed >= 3) return "ARMED";
    return "STANDBY";
  }, [gatesPassed, analysis.tradePlan.direction]);

  // Sound Synthesizer function using Web Audio API
  const playSniperTone = (type: "armed" | "fire") => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "armed") {
        // High-tech dual pulse blip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Crisp sniper lock chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + 0.6);
        });
      }
    } catch (err) {
      console.warn("Audio synthesis unavailable:", err);
    }
  };

  // Play tone when radar reaches FIRE or ARMED
  useEffect(() => {
    if (audioEnabled) {
      if (radarState === "FIRE") {
        playSniperTone("fire");
      } else if (radarState === "ARMED") {
        playSniperTone("armed");
      }
    }
  }, [radarState, audioEnabled]);

  return (
    <div className="bg-[#0b0f17] border border-slate-800/90 rounded-xl shadow-2xl overflow-hidden font-mono">
      {/* Top Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-[#0d131f] to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              radarState === "FIRE"
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/30 animate-pulse"
                : radarState === "ARMED"
                ? "bg-amber-500/20 border-amber-400 text-amber-400 shadow-md shadow-amber-500/20"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            <Crosshair size={22} className={radarState === "FIRE" ? "animate-spin" : ""} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>SNIPER CONFLUENCE GATEKEEPER</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${
                  radarState === "FIRE"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 animate-pulse"
                    : radarState === "ARMED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/60"
                    : "bg-slate-800/80 text-slate-400 border-slate-700"
                }`}
              >
                {radarState === "FIRE"
                  ? "TRIGGER PULL (5/5 GATES GREEN)"
                  : radarState === "ARMED"
                  ? `ARMED (${gatesPassed}/5 CONFLUENCE)`
                  : `STANDBY (${gatesPassed}/5 GATES)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Binary Kill Box verification: Zero entry allowed without all 5 confluence conditions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playSniperTone("armed");
            }}
            title={audioEnabled ? "Sniper Audio Alerts Active" : "Enable Sniper Audio Alerts"}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              audioEnabled
                ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline text-[11px]">
              {audioEnabled ? "Audio Armed" : "Muted"}
            </span>
          </button>

          {onOpenSizer && (
            <button
              onClick={onOpenSizer}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Target size={13} />
              <span>Position Sizer</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Sniper Status Radar HUD Panel */}
          <div
            className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
              radarState === "FIRE"
                ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                : radarState === "ARMED"
                ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
                : "bg-slate-900/60 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border ${
                  radarState === "FIRE"
                    ? "border-emerald-400 bg-emerald-500/20"
                    : radarState === "ARMED"
                    ? "border-amber-400 bg-amber-500/20"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                {radarState === "FIRE" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                )}
                <span className="font-bold text-xs">
                  {gatesPassed}/5
                </span>
              </div>

              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>
                    {radarState === "FIRE"
                      ? "A+ SNIPER EXECUTION AUTHORIZED"
                      : radarState === "ARMED"
                      ? "SETUP ARMED — AWAITING FINAL GATE TRIGGER"
                      : "ENTRY BLOCKED — INSUFFICIENT CONFLUENCE"}
                  </span>
                </div>
                <p className="text-[11px] opacity-80">
                  {radarState === "FIRE"
                    ? `Direction: ${analysis.tradePlan.direction} | Limit Entry at OTE retest zone. Minimum slippage expected.`
                    : radarState === "ARMED"
                    ? "Liquidity sweep and displacement identified. Wait for price to pull back into OTE Fibonacci zone."
                    : "Do not anticipate. Institutional money has not yet harvested counter-trend stops."}
                </p>
              </div>
            </div>

            {/* Quick Session Tag */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px]">
              <Clock size={12} className={sessionInfo.inKillzone ? "text-emerald-400" : "text-slate-400"} />
              <span className="text-slate-400">{sessionInfo.activeKillzone}</span>
            </div>
          </div>

          {/* The 5 Sniper Confluence Gates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {/* Gate 1 */}
            <div
              onClick={() => setOverrideGate1(overrideGate1 === null ? !gate1LiquidityPurged : !overrideGate1)}
              title="Click to toggle gate status manually"
              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between ${
                gate1LiquidityPurged
                  ? "bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Gate 1
                </span>
                {gate1LiquidityPurged ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
              <p className="font-bold text-white text-[11px] mb-1">Liquidity Purged</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {gate1LiquidityPurged
                  ? "BSL/SSL or PDH/PDL purged by wick"
                  : "Stops unharvested; potential trap"}
              </p>
            </div>

            {/* Gate 2 */}
            <div
              onClick={() => setOverrideGate2(overrideGate2 === null ? !gate2DisplacementFvg : !overrideGate2)}
              title="Click to toggle gate status manually"
              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between ${
                gate2DisplacementFvg
                  ? "bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Gate 2
                </span>
                {gate2DisplacementFvg ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
              <p className="font-bold text-white text-[11px] mb-1">FVG Displacement</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {gate2DisplacementFvg
                  ? "High-volume imbalance candle printed"
                  : "Slow grind; no aggressive impulse"}
              </p>
            </div>

            {/* Gate 3 */}
            <div
              onClick={() => setOverrideGate3(overrideGate3 === null ? !gate3StructureShift : !overrideGate3)}
              title="Click to toggle gate status manually"
              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between ${
                gate3StructureShift
                  ? "bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Gate 3
                </span>
                {gate3StructureShift ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
              <p className="font-bold text-white text-[11px] mb-1">iMSS / CHOCH</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {gate3StructureShift
                  ? "Internal structure broken with body close"
                  : "Awaiting candle close beyond pivot"}
              </p>
            </div>

            {/* Gate 4 */}
            <div
              onClick={() => setOverrideGate4(overrideGate4 === null ? !gate4OteMitigation : !overrideGate4)}
              title="Click to toggle gate status manually"
              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between ${
                gate4OteMitigation
                  ? "bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Gate 4
                </span>
                {gate4OteMitigation ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
              <p className="font-bold text-white text-[11px] mb-1">OTE 62%-79% Retest</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {gate4OteMitigation
                  ? "Price mitigated FVG / Fibonacci OTE"
                  : "Price extended; chasing is forbidden"}
              </p>
            </div>

            {/* Gate 5 */}
            <div
              onClick={() => setOverrideGate5(overrideGate5 === null ? !gate5KillzoneTiming : !overrideGate5)}
              title="Click to toggle gate status manually"
              className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between ${
                gate5KillzoneTiming
                  ? "bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Gate 5
                </span>
                {gate5KillzoneTiming ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
              <p className="font-bold text-white text-[11px] mb-1">Killzone Timing</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {gate5KillzoneTiming
                  ? "Active London / NY high volume session"
                  : "Off-session; low liquidity spreads"}
              </p>
            </div>
          </div>

          {/* Precision OTE Fibonacci Calculator Sub-Bar */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-amber-400" />
              <span className="text-slate-300 font-bold">
                ICT Optimal Trade Entry (OTE) Fib Inflection Levels:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">CE (50%):</span>
                <span className="text-white font-bold">
                  {parsedNumbers.ce50.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-amber-400">61.8% OTE:</span>
                <span className="text-amber-300 font-bold">
                  {parsedNumbers.ote62.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-500/50">
                <span className="text-emerald-400 font-bold">70.5% Sweet Spot:</span>
                <span className="text-emerald-300 font-bold">
                  {parsedNumbers.ote70.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-sky-400">78.6% Deep:</span>
                <span className="text-sky-300 font-bold">
                  {parsedNumbers.ote79.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
