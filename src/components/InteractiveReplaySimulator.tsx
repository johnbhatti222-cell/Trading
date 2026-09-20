import React, { useState, useEffect, useMemo, useRef } from "react";
import { TradeAnalysis, LiveCandle } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  FastForward,
  Layers,
  Zap,
  Target,
  ShieldAlert,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Clock,
  Sparkles,
  Info,
  Activity,
  Volume2,
  VolumeX,
  BellRing,
  BarChart2,
} from "lucide-react";
import { calculateRSI } from "../utils/technicalIndicators";

interface InteractiveReplaySimulatorProps {
  analysis: TradeAnalysis;
  onLogTradeToJournal?: (result: any) => void;
}

interface SimulatedTrade {
  id: string;
  orderType: "LONG_LIMIT" | "SHORT_LIMIT";
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  status: "PENDING" | "ACTIVE" | "FILLED_TP" | "FILLED_SL" | "CANCELLED";
  fillIndex?: number;
  exitIndex?: number;
  exitPrice?: number;
  realizedR?: number;
  maxFavorableR?: number;
  maxAdverseR?: number;
}

// Generate realistic 40-candle replay sequence based on instrument price and setup
function generateReplayCandleStream(
  basePrice: number,
  isGold: boolean,
  isCrypto: boolean,
  direction: "LONG" | "SHORT"
): LiveCandle[] {
  const candles: LiveCandle[] = [];
  const candleCount = 42;
  const spread = isGold ? 1.8 : isCrypto ? 120 : 0.0012;
  const pipMultiplier = isGold ? 1 : isCrypto ? 1 : 10000;

  let current = direction === "SHORT" ? basePrice - spread * 3 : basePrice + spread * 3;
  const now = Date.now() - candleCount * 15 * 60 * 1000;

  for (let i = 0; i < candleCount; i++) {
    const time = new Date(now + i * 15 * 60 * 1000);
    const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Phase 1: Setup creation & liquidity sweep (candles 0-14)
    // Phase 2: Violent displacement & FVG formation (candles 15-20)
    // Phase 3: Mitigation into OTE 62%-70.5% (candles 21-28)
    // Phase 4: Expansion towards target (candles 29-41)
    let move = (Math.random() - 0.48) * spread * 0.8;
    let isSweep = false;
    let isDisplacement = false;
    let isBOS = false;
    let isRetest = false;

    if (direction === "SHORT") {
      if (i >= 8 && i <= 13) {
        // Run stops above PDH
        move = Math.random() * spread * 0.9;
        if (i === 12) isSweep = true;
      } else if (i >= 14 && i <= 18) {
        // Violent displacement downward
        move = -(Math.random() * spread * 1.6 + spread * 0.8);
        isDisplacement = true;
        if (i === 16) isBOS = true;
      } else if (i >= 20 && i <= 25) {
        // Corrective retracement into OTE / FVG
        move = Math.random() * spread * 0.7;
        if (i === 24) isRetest = true;
      } else if (i > 25) {
        // Trend continuation downward
        move = -(Math.random() * spread * 1.1 + spread * 0.2);
      }
    } else {
      // LONG Setup
      if (i >= 8 && i <= 13) {
        // Run stops below PDL
        move = -(Math.random() * spread * 0.9);
        if (i === 12) isSweep = true;
      } else if (i >= 14 && i <= 18) {
        // Violent displacement upward
        move = Math.random() * spread * 1.6 + spread * 0.8;
        isDisplacement = true;
        if (i === 16) isBOS = true;
      } else if (i >= 20 && i <= 25) {
        // Corrective retracement downward into OTE / FVG
        move = -(Math.random() * spread * 0.7);
        if (i === 24) isRetest = true;
      } else if (i > 25) {
        // Trend continuation upward
        move = Math.random() * spread * 1.1 + spread * 0.2;
      }
    }

    const open = current;
    const close = current + move;
    const wickHigh = Math.max(open, close) + Math.random() * spread * 0.4;
    const wickLow = Math.min(open, close) - Math.random() * spread * 0.4;
    current = close;

    candles.push({
      timestamp: time.getTime(),
      timeStr,
      open,
      high: wickHigh,
      low: wickLow,
      close,
      volume: Math.floor(250 + Math.random() * 850 + (isDisplacement ? 1200 : 0)),
      isSweep,
      isDisplacement,
      isBOS,
      isRetest,
    });
  }

  return candles;
}

export const InteractiveReplaySimulator: React.FC<InteractiveReplaySimulatorProps> = ({
  analysis,
  onLogTradeToJournal,
}) => {
  const parseNum = (str?: string, defaultVal = 0): number => {
    if (!str) return defaultVal;
    const clean = str.replace(/[^0-9.]/g, "");
    return parseFloat(clean) || defaultVal;
  };

  const instrument = analysis?.market?.instrument || "XAU/USD";
  const isGold = instrument.toUpperCase().includes("XAU");
  const isCrypto =
    instrument.toUpperCase().includes("BTC") || instrument.toUpperCase().includes("ETH");
  const direction = analysis?.tradePlan?.direction === "SHORT" ? "SHORT" : "LONG";
  const defaultEntry = parseNum(analysis?.tradePlan?.entryZone, 2684.5);
  const defaultStop = parseNum(analysis?.tradePlan?.stopLoss, 2689.8);
  const defaultTp = parseNum(analysis?.tradePlan?.tp1, 2676.0);

  // Full Candle Dataset
  const [fullCandles, setFullCandles] = useState<LiveCandle[]>(() =>
    generateReplayCandleStream(defaultEntry, isGold, isCrypto, direction)
  );

  // Replay playback states
  const [playbackIndex, setPlaybackIndex] = useState<number>(14); // start right at sweep/displacement
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per candle

  // Simulated active & history orders
  const [orderEntry, setOrderEntry] = useState<number>(defaultEntry);
  const [orderStop, setOrderStop] = useState<number>(defaultStop);
  const [orderTp, setOrderTp] = useState<number>(defaultTp);
  const [activeTrade, setActiveTrade] = useState<SimulatedTrade | null>(null);
  const [tradeLogs, setTradeLogs] = useState<SimulatedTrade[]>([]);

  // RSI & Momentum Oscillator States
  const [showReplayRsi, setShowReplayRsi] = useState<boolean>(true);
  const [showReplayVolume, setShowReplayVolume] = useState<boolean>(true);
  const [rsiSoundEnabled, setRsiSoundEnabled] = useState<boolean>(true);
  const [lastReplayRsiAlert, setLastReplayRsiAlert] = useState<string | null>(null);

  // Web Audio Alert for RSI Overbought / Oversold trigger
  const playReplayRsiSound = (type: "OVERBOUGHT" | "OVERSOLD") => {
    if (!rsiSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "OVERBOUGHT") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(840, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.28);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(360, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.28);
      }

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

  // Reset or regenerate sequence on scenario change
  const handleRegenerateSequence = () => {
    setIsPlaying(false);
    const newCandles = generateReplayCandleStream(defaultEntry, isGold, isCrypto, direction);
    setFullCandles(newCandles);
    setPlaybackIndex(14);
    setActiveTrade(null);
  };

  // Visible candles up to current scrubber index
  const visibleCandles = useMemo(() => {
    return fullCandles.slice(0, playbackIndex + 1);
  }, [fullCandles, playbackIndex]);

  const currentCandle = visibleCandles[visibleCandles.length - 1];

  // Dynamic FVG & Liquidity Level Detection on visible slice
  const detectedLevels = useMemo(() => {
    if (visibleCandles.length < 5) return null;

    let highestWick = -Infinity;
    let lowestWick = Infinity;
    let fvgCe: number | null = null;
    let fvgTop: number | null = null;
    let fvgBottom: number | null = null;

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      if (c.high > highestWick) highestWick = c.high;
      if (c.low < lowestWick) lowestWick = c.low;

      // Detect 3-bar Fair Value Gap
      if (i >= 2) {
        const c1 = visibleCandles[i - 2];
        const c2 = visibleCandles[i - 1];
        const c3 = visibleCandles[i];

        if (direction === "SHORT" && c1.low > c3.high) {
          // Bearish FVG
          fvgTop = c1.low;
          fvgBottom = c3.high;
          fvgCe = (fvgTop + fvgBottom) / 2;
        } else if (direction === "LONG" && c3.low > c1.high) {
          // Bullish FVG
          fvgBottom = c1.high;
          fvgTop = c3.low;
          fvgCe = (fvgTop + fvgBottom) / 2;
        }
      }
    }

    return {
      highestWick,
      lowestWick,
      fvgCe,
      fvgTop,
      fvgBottom,
    };
  }, [visibleCandles, direction]);

  // Compute Dynamic RSI on visible candles during tape replay
  const replayRsi = useMemo(() => {
    const closes = visibleCandles.map((c) => c.close);
    return calculateRSI(closes, 14, 70, 30);
  }, [visibleCandles]);

  // Dynamic Volume metrics for replay tape
  const replayVolumeData = useMemo(() => {
    const vols = visibleCandles.map((c) => c.volume || 0);
    const maxVol = Math.max(...vols, 1);
    const avgVol = vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1);
    const curVol = vols[vols.length - 1] || 0;
    const isVolSpike = curVol > avgVol * 1.5;
    return { maxVol, avgVol, curVol, isVolSpike };
  }, [visibleCandles]);

  // Replay RSI Sound & Alert Trigger
  useEffect(() => {
    if (!replayRsi) return;
    const condition = replayRsi.condition;

    if (condition !== "NEUTRAL" && condition !== lastReplayRsiAlert) {
      setLastReplayRsiAlert(condition);
      playReplayRsiSound(condition);
    } else if (condition === "NEUTRAL" && lastReplayRsiAlert !== null) {
      setLastReplayRsiAlert(null);
    }
  }, [replayRsi?.condition, lastReplayRsiAlert, rsiSoundEnabled]);

  // Order Matching Engine during Replay
  useEffect(() => {
    if (!activeTrade || !currentCandle) return;

    if (activeTrade.status === "PENDING") {
      // Check if price touched limit entry
      const touched =
        direction === "SHORT"
          ? currentCandle.high >= activeTrade.entryPrice
          : currentCandle.low <= activeTrade.entryPrice;

      if (touched) {
        setActiveTrade({
          ...activeTrade,
          status: "ACTIVE",
          fillIndex: playbackIndex,
          maxFavorableR: 0,
          maxAdverseR: 0,
        });
      }
    } else if (activeTrade.status === "ACTIVE") {
      const riskDist = Math.abs(activeTrade.entryPrice - activeTrade.stopLossPrice);
      const isShort = direction === "SHORT";

      // Check Stop Loss hit
      const slHit = isShort
        ? currentCandle.high >= activeTrade.stopLossPrice
        : currentCandle.low <= activeTrade.stopLossPrice;

      // Check Take Profit hit
      const tpHit = isShort
        ? currentCandle.low <= activeTrade.takeProfitPrice
        : currentCandle.high >= activeTrade.takeProfitPrice;

      if (slHit) {
        const finishedTrade: SimulatedTrade = {
          ...activeTrade,
          status: "FILLED_SL",
          exitIndex: playbackIndex,
          exitPrice: activeTrade.stopLossPrice,
          realizedR: -1.0,
        };
        setActiveTrade(null);
        setTradeLogs((prev) => [finishedTrade, ...prev]);
      } else if (tpHit) {
        const rewardDist = Math.abs(activeTrade.takeProfitPrice - activeTrade.entryPrice);
        const rMultiple = riskDist > 0 ? Number((rewardDist / riskDist).toFixed(2)) : 2.5;

        const finishedTrade: SimulatedTrade = {
          ...activeTrade,
          status: "FILLED_TP",
          exitIndex: playbackIndex,
          exitPrice: activeTrade.takeProfitPrice,
          realizedR: rMultiple,
        };
        setActiveTrade(null);
        setTradeLogs((prev) => [finishedTrade, ...prev]);
      } else {
        // Track excursion
        const curExcursion = isShort
          ? (activeTrade.entryPrice - currentCandle.close) / (riskDist || 1)
          : (currentCandle.close - activeTrade.entryPrice) / (riskDist || 1);

        setActiveTrade((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            maxFavorableR: Math.max(prev.maxFavorableR || 0, curExcursion),
            maxAdverseR: Math.min(prev.maxAdverseR || 0, curExcursion),
          };
        });
      }
    }
  }, [playbackIndex, activeTrade, currentCandle, direction]);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && playbackIndex < fullCandles.length - 1) {
      timer = setTimeout(() => {
        setPlaybackIndex((prev) => prev + 1);
      }, playbackSpeed);
    } else if (playbackIndex >= fullCandles.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, playbackIndex, fullCandles.length, playbackSpeed]);

  // Chart Canvas Dimensions & Scaling
  const chartHeight = 360;
  const chartWidth = 720;
  const padding = { top: 25, bottom: 35, left: 15, right: 65 };

  const { minPrice, maxPrice } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100 };
    let min = Math.min(...visibleCandles.map((c) => c.low));
    let max = Math.max(...visibleCandles.map((c) => c.high));

    // Include entry/SL in scale if trade active or pending
    if (activeTrade) {
      min = Math.min(min, activeTrade.stopLossPrice, activeTrade.takeProfitPrice);
      max = Math.max(max, activeTrade.stopLossPrice, activeTrade.takeProfitPrice);
    } else {
      min = Math.min(min, orderStop, orderTp);
      max = Math.max(max, orderStop, orderTp);
    }

    const margin = (max - min) * 0.1 || 1;
    return { minPrice: min - margin, maxPrice: max + margin };
  }, [visibleCandles, activeTrade, orderStop, orderTp]);

  const getY = (price: number) => {
    const range = maxPrice - minPrice;
    if (range === 0) return chartHeight / 2;
    const innerH = chartHeight - padding.top - padding.bottom;
    return padding.top + innerH * (1 - (price - minPrice) / range);
  };

  const candleW = Math.max(
    6,
    Math.min(18, (chartWidth - padding.left - padding.right) / Math.max(visibleCandles.length, 18))
  );

  // Place Simulated Limit Order
  const handlePlaceSimulatedOrder = () => {
    const newTrade: SimulatedTrade = {
      id: `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
      orderType: direction === "SHORT" ? "SHORT_LIMIT" : "LONG_LIMIT",
      entryPrice: orderEntry,
      stopLossPrice: orderStop,
      takeProfitPrice: orderTp,
      status: "PENDING",
    };
    setActiveTrade(newTrade);
  };

  const handleCancelSimulatedOrder = () => {
    if (!activeTrade) return;
    setTradeLogs((prev) => [{ ...activeTrade, status: "CANCELLED" }, ...prev]);
    setActiveTrade(null);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="p-4 bg-[#0b0e14] border border-slate-800 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
            <RotateCcw size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider">
                INTERACTIVE REPLAY & TAPE SIMULATOR (BAR-BY-BAR BACKTESTER)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-500/40">
                OFFLINE ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scrub backward in time, hide future price delivery, and execute simulated limit orders at the institutional OTE zone.
            </p>
          </div>
        </div>

        {/* Speed Controls & Regenerate */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <span className="text-slate-500 text-[10px] px-1">SPEED:</span>
            {[
              { label: "1x", val: 1200 },
              { label: "2x", val: 600 },
              { label: "5x", val: 200 },
            ].map((spd) => (
              <button
                key={spd.label}
                onClick={() => setPlaybackSpeed(spd.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  playbackSpeed === spd.val
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRegenerateSequence}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Generate a fresh price sequence"
          >
            <Sparkles size={13} className="text-sky-400" />
            <span>New Tape</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Replay Canvas (8 cols) + Execution Tape & Performance (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Interactive Canvas & Transport HUD (8 cols) */}
        <div className="lg:col-span-8 bg-[#0b0f17] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          {/* Sub-header: Current Candle HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock size={13} className="text-indigo-400" />
                <span>CANDLE #{playbackIndex + 1} OF {fullCandles.length}</span>
              </span>
              <span className="text-slate-400">Time: <strong className="text-slate-200">{currentCandle?.timeStr}</strong></span>
              <span className="text-slate-400">Close: <strong className="text-emerald-400">${currentCandle?.close.toFixed(2)}</strong></span>
            </div>

            {/* Event Flag, Volume & RSI Alert Status */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReplayVolume(!showReplayVolume)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                  showReplayVolume
                    ? replayVolumeData.isVolSpike
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/60 animate-pulse"
                      : "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
                title="Toggle Volume Profile in Replay"
              >
                <BarChart2 size={11} />
                <span>Vol: {replayVolumeData.curVol >= 1000 ? `${(replayVolumeData.curVol / 1000).toFixed(1)}k` : replayVolumeData.curVol.toFixed(0)}</span>
                {replayVolumeData.isVolSpike && <span className="text-amber-300 font-bold">(SPIKE)</span>}
              </button>

              <button
                onClick={() => setShowReplayRsi(!showReplayRsi)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                  showReplayRsi
                    ? replayRsi.isOverbought
                      ? "bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse"
                      : replayRsi.isOversold
                      ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/60 animate-pulse"
                      : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                <Activity size={11} />
                <span>RSI: {replayRsi.currentRsi}</span>
                {replayRsi.isOverbought && <span className="text-rose-300 font-bold">(OB 70)</span>}
                {replayRsi.isOversold && <span className="text-emerald-300 font-bold">(OS 30)</span>}
              </button>

              <button
                onClick={() => setRsiSoundEnabled(!rsiSoundEnabled)}
                title={rsiSoundEnabled ? "RSI alert audio chime active" : "RSI alert audio muted"}
                className={`p-1 rounded border text-[10px] ${
                  rsiSoundEnabled
                    ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                {rsiSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>

              {currentCandle?.isSweep ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                  <Flame size={11} />
                  <span>LIQUIDITY SWEEP</span>
                </span>
              ) : currentCandle?.isDisplacement ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/70 text-sky-300 border border-sky-500/50 flex items-center gap-1">
                  <Zap size={11} />
                  <span>DISPLACEMENT</span>
                </span>
              ) : currentCandle?.isRetest ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                  <Target size={11} />
                  <span>OTE RETEST</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 hidden sm:inline">CONSOLIDATION</span>
              )}
            </div>
          </div>

          {/* Real-time Replay Overbought / Oversold Alert Banner */}
          {showReplayRsi && (replayRsi.isOverbought || replayRsi.isOversold || replayRsi.divergence) && (
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
                replayRsi.isOverbought
                  ? "bg-rose-950/70 border-rose-800/80 text-rose-200"
                  : replayRsi.isOversold
                  ? "bg-emerald-950/70 border-emerald-800/80 text-emerald-200"
                  : "bg-amber-950/70 border-amber-800/80 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <BellRing size={13} className="animate-bounce text-rose-400 flex-shrink-0" />
                <span>
                  <strong>
                    {replayRsi.isOverbought && "OVERBOUGHT (RSI ≥ 70): "}
                    {replayRsi.isOversold && "OVERSOLD (RSI ≤ 30): "}
                    {replayRsi.divergence && "MOMENTUM DIVERGENCE: "}
                  </strong>
                  Current RSI {replayRsi.currentRsi}.
                  {replayRsi.isOverbought && " Price is in extreme premium exhaustion territory."}
                  {replayRsi.isOversold && " Price is in extreme discount seller climax territory."}
                  {replayRsi.divergence === "BEARISH_DIVERGENCE" && " Bearish momentum divergence printed."}
                  {replayRsi.divergence === "BULLISH_DIVERGENCE" && " Bullish momentum divergence printed."}
                </span>
              </div>
              <button
                onClick={() => playReplayRsiSound(replayRsi.isOverbought ? "OVERBOUGHT" : "OVERSOLD")}
                className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 text-[10px] flex items-center gap-1 hover:bg-black/60"
              >
                <Volume2 size={10} />
                <span>Chime</span>
              </button>
            </div>
          )}

          {/* SVG Canvas */}
          <div className="relative overflow-hidden bg-[#070a0f] rounded-lg border border-slate-800">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-[320px] sm:h-[360px] select-none"
            >
              {/* Horizontal Price Grids */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                const y = padding.top + (chartHeight - padding.top - padding.bottom) * ratio;
                const p = maxPrice - (maxPrice - minPrice) * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={chartWidth - padding.right + 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      ${p.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Detected FVG Consequent Encroachment Zone */}
              {detectedLevels?.fvgCe && detectedLevels.fvgTop && detectedLevels.fvgBottom && (
                <g>
                  <rect
                    x={padding.left}
                    y={getY(Math.max(detectedLevels.fvgTop, detectedLevels.fvgBottom))}
                    width={chartWidth - padding.left - padding.right}
                    height={Math.abs(getY(detectedLevels.fvgTop) - getY(detectedLevels.fvgBottom))}
                    fill={direction === "SHORT" ? "rgba(244, 63, 94, 0.08)" : "rgba(16, 185, 129, 0.08)"}
                    stroke={direction === "SHORT" ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={padding.left}
                    y1={getY(detectedLevels.fvgCe)}
                    x2={chartWidth - padding.right}
                    y2={getY(detectedLevels.fvgCe)}
                    stroke={direction === "SHORT" ? "#f43f5e" : "#10b981"}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left + 8}
                    y={getY(detectedLevels.fvgCe) - 4}
                    fill={direction === "SHORT" ? "#f43f5e" : "#10b981"}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    15M FVG CE 50% (${detectedLevels.fvgCe.toFixed(2)})
                  </text>
                </g>
              )}

              {/* Active/Pending Order Lines */}
              {activeTrade && (
                <g>
                  {/* Entry Line */}
                  <line
                    x1={padding.left}
                    y1={getY(activeTrade.entryPrice)}
                    x2={chartWidth - padding.right}
                    y2={getY(activeTrade.entryPrice)}
                    stroke="#6366f1"
                    strokeWidth="1.8"
                  />
                  <text
                    x={padding.left + 8}
                    y={getY(activeTrade.entryPrice) - 4}
                    fill="#818cf8"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {activeTrade.status === "ACTIVE" ? "ACTIVE ENTRY" : "PENDING LIMIT"} ($
                    {activeTrade.entryPrice.toFixed(2)})
                  </text>

                  {/* Stop Loss */}
                  <line
                    x1={padding.left}
                    y1={getY(activeTrade.stopLossPrice)}
                    x2={chartWidth - padding.right}
                    y2={getY(activeTrade.stopLossPrice)}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left + 8}
                    y={getY(activeTrade.stopLossPrice) - 4}
                    fill="#f87171"
                    fontSize="9"
                  >
                    STOP LOSS (${activeTrade.stopLossPrice.toFixed(2)})
                  </text>

                  {/* Take Profit */}
                  <line
                    x1={padding.left}
                    y1={getY(activeTrade.takeProfitPrice)}
                    x2={chartWidth - padding.right}
                    y2={getY(activeTrade.takeProfitPrice)}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left + 8}
                    y={getY(activeTrade.takeProfitPrice) - 4}
                    fill="#34d399"
                    fontSize="9"
                  >
                    TAKE PROFIT (${activeTrade.takeProfitPrice.toFixed(2)})
                  </text>
                </g>
              )}

              {/* Volume Profile Bars */}
              {showReplayVolume && (
                <g className="replay-volume-layer">
                  {visibleCandles.map((c, i) => {
                    const x = padding.left + i * (candleW + 3) + candleW / 2;
                    const isBull = c.close >= c.open;
                    const vol = c.volume || 0;
                    const maxBarH = 50;
                    const barH = Math.max(2, (vol / replayVolumeData.maxVol) * maxBarH);
                    const baseY = chartHeight - padding.bottom;
                    const barY = baseY - barH;

                    return (
                      <rect
                        key={`replay-vol-${c.timestamp || i}`}
                        x={x - candleW / 2}
                        y={barY}
                        width={candleW}
                        height={barH}
                        fill={isBull ? "#10b981" : "#ef4444"}
                        fillOpacity="0.26"
                        rx="0.5"
                      />
                    );
                  })}
                  <text
                    x={padding.left + 4}
                    y={chartHeight - padding.bottom - 42}
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    VOL (Max: {replayVolumeData.maxVol >= 1000 ? `${(replayVolumeData.maxVol / 1000).toFixed(1)}k` : replayVolumeData.maxVol.toFixed(0)})
                  </text>
                </g>
              )}

              {/* Candles */}
              {visibleCandles.map((c, i) => {
                const x = padding.left + i * (candleW + 3) + candleW / 2;
                const isBull = c.close >= c.open;
                const bodyTop = getY(Math.max(c.open, c.close));
                const bodyBottom = getY(Math.min(c.open, c.close));
                const bodyH = Math.max(1.5, bodyBottom - bodyTop);
                const wickHighY = getY(c.high);
                const wickLowY = getY(c.low);
                const isLatest = i === visibleCandles.length - 1;

                const candleColor = isBull ? "#10b981" : "#ef4444";

                return (
                  <g key={c.timestamp} opacity={isLatest ? 1 : 0.88}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={wickHighY}
                      x2={x}
                      y2={wickLowY}
                      stroke={candleColor}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x - candleW / 2}
                      y={bodyTop}
                      width={candleW}
                      height={bodyH}
                      fill={isBull ? "#10b981" : "#ef4444"}
                      rx="1"
                    />
                    {/* Sweep Marker */}
                    {c.isSweep && (
                      <circle cx={x} cy={wickHighY - 6} r="3" fill="#f59e0b" />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Replay RSI Oscillator Mini-Subchart */}
            {showReplayRsi && (
              <div className="border-t border-slate-800/80 bg-[#05070c] px-3 py-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Activity size={11} className="text-indigo-400" />
                      <span>RSI(14)</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        replayRsi.isOverbought
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                          : replayRsi.isOversold
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {replayRsi.currentRsi}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-rose-400">70 Overbought</span>
                    <span className="text-slate-500">50 Neutral</span>
                    <span className="text-emerald-400">30 Oversold</span>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${chartWidth} 60`}
                  className="w-full h-[52px] select-none"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {/* Bands */}
                  <rect
                    x={padding.left}
                    y={60 - 10 - (100 / 100) * 40}
                    width={chartWidth - padding.left - padding.right}
                    height={(30 / 100) * 40}
                    fill="#f43f5e"
                    fillOpacity="0.08"
                  />
                  <rect
                    x={padding.left}
                    y={60 - 10 - (30 / 100) * 40}
                    width={chartWidth - padding.left - padding.right}
                    height={(30 / 100) * 40}
                    fill="#10b981"
                    fillOpacity="0.08"
                  />

                  {/* 70 line */}
                  <line
                    x1={padding.left}
                    y1={60 - 10 - (70 / 100) * 40}
                    x2={chartWidth - padding.right}
                    y2={60 - 10 - (70 / 100) * 40}
                    stroke="#f43f5e"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  {/* 30 line */}
                  <line
                    x1={padding.left}
                    y1={60 - 10 - (30 / 100) * 40}
                    x2={chartWidth - padding.right}
                    y2={60 - 10 - (30 / 100) * 40}
                    stroke="#10b981"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />

                  {/* RSI Polyline */}
                  {(() => {
                    const rsiPoints = replayRsi.values.map((v, idx) => {
                      const x = padding.left + idx * (candleW + 3) + candleW / 2;
                      const rsiVal = v !== null ? v : 50;
                      const y = 60 - 10 - (rsiVal / 100) * 40;
                      return `${x},${y}`;
                    });

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke={
                            replayRsi.isOverbought
                              ? "#f43f5e"
                              : replayRsi.isOversold
                              ? "#10b981"
                              : "#818cf8"
                          }
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={rsiPoints.join(" ")}
                        />
                        {replayRsi.values.length > 0 && (
                          <circle
                            cx={
                              padding.left +
                              (replayRsi.values.length - 1) * (candleW + 3) +
                              candleW / 2
                            }
                            cy={60 - 10 - (replayRsi.currentRsi / 100) * 40}
                            r="3"
                            fill={
                              replayRsi.isOverbought
                                ? "#f43f5e"
                                : replayRsi.isOversold
                                ? "#10b981"
                                : "#818cf8"
                            }
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Transport Controls (Timeline Scrubber) */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackIndex(0);
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Reset to Start"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Step Backward (1 Bar)"
                >
                  <SkipBack size={12} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 transition-colors ${
                    isPlaying
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? "Pause" : "Play Tape"}</span>
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackIndex((prev) => Math.min(fullCandles.length - 1, prev + 1));
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Step Forward (1 Bar)"
                >
                  <SkipForward size={12} />
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackIndex(fullCandles.length - 1);
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Fast-forward to End"
                >
                  <FastForward size={14} />
                </button>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">
                  Scrub timeline:
                </span>
              </div>
            </div>

            {/* Range Scrubber */}
            <input
              type="range"
              min="0"
              max={fullCandles.length - 1}
              value={playbackIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setPlaybackIndex(parseInt(e.target.value, 10));
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Right: Simulated Order Desk & Tape Records (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Simulated Execution Desk */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-white">SIMULATED SNIPER DESK</h3>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                {direction} LIMIT
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">LIMIT ENTRY PRICE:</label>
                <input
                  type="number"
                  step="0.1"
                  value={orderEntry}
                  onChange={(e) => setOrderEntry(parseFloat(e.target.value) || 0)}
                  disabled={activeTrade !== null}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-rose-400 block mb-0.5">STOP LOSS:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={orderStop}
                    onChange={(e) => setOrderStop(parseFloat(e.target.value) || 0)}
                    disabled={activeTrade !== null}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-rose-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-emerald-400 block mb-0.5">TAKE PROFIT:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={orderTp}
                    onChange={(e) => setOrderTp(parseFloat(e.target.value) || 0)}
                    disabled={activeTrade !== null}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* R:R Ratio Metric */}
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">PLANNED RISK/REWARD:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  1 :{" "}
                  {Math.abs(orderStop - orderEntry) > 0
                    ? (Math.abs(orderTp - orderEntry) / Math.abs(orderStop - orderEntry)).toFixed(2)
                    : "0.0"}
                  R
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {activeTrade ? (
              <div className="space-y-2 pt-1">
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    activeTrade.status === "ACTIVE"
                      ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                      : "bg-indigo-950/40 border-indigo-500/60 text-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Zap size={14} className="animate-pulse" />
                    <span>{activeTrade.status === "ACTIVE" ? "POSITION FILLED (LIVE)" : "LIMIT PENDING FILL"}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ID: {activeTrade.id}</span>
                </div>

                <button
                  onClick={handleCancelSimulatedOrder}
                  className="w-full py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 text-xs font-bold transition-colors"
                >
                  Cancel / Flat Position
                </button>
              </div>
            ) : (
              <button
                onClick={handlePlaceSimulatedOrder}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Target size={14} />
                <span>PLACE SIMULATED {direction} LIMIT</span>
              </button>
            )}
          </div>

          {/* Realized Tape Performance History */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Zap size={15} className="text-indigo-400" />
                <h4 className="text-xs font-bold text-white">REPLAY PERFORMANCE LOG</h4>
              </div>
              <span className="text-[10px] text-slate-400">
                {tradeLogs.length} EXECUTIONS
              </span>
            </div>

            {tradeLogs.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3 text-center">
                No simulated trades closed yet. Place a limit order and scrub forward to backtest the trigger.
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                {tradeLogs.map((log) => {
                  const isWin = (log.realizedR || 0) > 0;
                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{log.id}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isWin
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                : log.status === "CANCELLED"
                                ? "bg-slate-800 text-slate-400"
                                : "bg-rose-950 text-rose-300 border border-rose-500/40"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Entry: ${log.entryPrice.toFixed(1)} • Exit: ${log.exitPrice?.toFixed(1) || "—"}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`font-bold ${
                            isWin ? "text-emerald-400" : log.status === "CANCELLED" ? "text-slate-400" : "text-rose-400"
                          }`}
                        >
                          {isWin ? `+${log.realizedR}R` : log.status === "CANCELLED" ? "0.0R" : `${log.realizedR}R`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
