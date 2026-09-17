import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  ShieldAlert,
  Target,
  Crosshair,
  ArrowDown,
  ArrowUp,
  RotateCw,
  Activity,
  Zap,
} from "lucide-react";
import { TradeAnalysis, LiveCandle, LiveCandlesResponse } from "../types";

interface LiveChartVisualizerProps {
  analysis: TradeAnalysis;
  selectedTimeframe?: string;
  onTimeframeChange?: (tf: string) => void;
}

export const LiveChartVisualizer: React.FC<LiveChartVisualizerProps> = ({
  analysis,
  selectedTimeframe = "15m",
  onTimeframeChange,
}) => {
  const [showLiquidity, setShowLiquidity] = useState(true);
  const [showFvg, setShowFvg] = useState(true);
  const [showTradePlan, setShowTradePlan] = useState(true);
  const [showStructure, setShowStructure] = useState(true);

  // Real live candle state
  const [liveCandles, setLiveCandles] = useState<LiveCandle[]>([]);
  const [liveData, setLiveData] = useState<LiveCandlesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<LiveCandle | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const instrument = analysis.market.instrument || "BTC/USD";
  const timeframe = (selectedTimeframe || "15m").toLowerCase();

  // Fetch real candles from the backend
  const fetchCandles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/live-candles?symbol=${encodeURIComponent(instrument)}&interval=${timeframe}&limit=28`
      );
      if (res.ok) {
        const data: LiveCandlesResponse = await res.json();
        if (data && Array.isArray(data.candles) && data.candles.length > 0) {
          setLiveCandles(data.candles);
          setLiveData(data);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.warn("Failed to load live candles, will display visual model:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles();
  }, [instrument, timeframe]);

  // Auto-refresh interval every 6 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchCandles, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, instrument, timeframe]);

  // Fallback synthetic candles if API is unreachable
  const fallbackCandles: LiveCandle[] = [
    { timestamp: 1, timeStr: "08:00", open: 45, close: 52, high: 55, low: 42, volume: 100 },
    { timestamp: 2, timeStr: "08:15", open: 52, close: 48, high: 54, low: 46, volume: 110 },
    { timestamp: 3, timeStr: "08:30", open: 48, close: 58, high: 62, low: 47, volume: 140 },
    { timestamp: 4, timeStr: "08:45", open: 58, close: 65, high: 68, low: 56, volume: 160 },
    { timestamp: 5, timeStr: "09:00", open: 65, close: 62, high: 67, low: 60, volume: 120 },
    { timestamp: 6, timeStr: "09:15", open: 62, close: 74, high: 76, low: 61, volume: 180 },
    { timestamp: 7, timeStr: "09:30", open: 74, close: 85, high: 96, low: 73, volume: 320, isSweep: true },
    { timestamp: 8, timeStr: "09:45", open: 85, close: 66, high: 87, low: 64, volume: 290, isDisplacement: true },
    { timestamp: 9, timeStr: "10:00", open: 66, close: 54, high: 68, low: 51, volume: 250, isDisplacement: true },
    { timestamp: 10, timeStr: "10:15", open: 54, close: 46, high: 56, low: 42, volume: 190, isBOS: true },
    { timestamp: 11, timeStr: "10:30", open: 46, close: 43, high: 48, low: 39, volume: 140 },
    { timestamp: 12, timeStr: "10:45", open: 43, close: 50, high: 53, low: 42, volume: 160 },
    { timestamp: 13, timeStr: "11:00", open: 50, close: 58, high: 62, low: 49, volume: 210, isRetest: true },
    { timestamp: 14, timeStr: "11:15", open: 58, close: 56, high: 61, low: 54, volume: 130 },
    { timestamp: 15, timeStr: "11:30", open: 56, close: 51, high: 57, low: 48, volume: 150, isCurrent: true },
  ];

  const activeCandles = liveCandles.length > 0 ? liveCandles : fallbackCandles;
  const isRealData = liveCandles.length > 0;

  // Chart Dimensions
  const width = 860;
  const height = 350;
  const paddingLeft = 45;
  const paddingRight = 75; // for price axis
  const paddingTop = 35;
  const paddingBottom = 40;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Calculate Price Range
  const allHighs = activeCandles.map((c) => c.high);
  const allLows = activeCandles.map((c) => c.low);
  const rawMin = Math.min(...allLows);
  const rawMax = Math.max(...allHighs);
  const priceMargin = (rawMax - rawMin) * 0.12 || 1;
  const chartMin = rawMin - priceMargin;
  const chartMax = rawMax + priceMargin;

  const mapY = (price: number) => {
    return height - paddingBottom - ((price - chartMin) / (chartMax - chartMin)) * chartH;
  };

  const candleSpacing = chartW / activeCandles.length;

  // Price formatting helper
  const formatP = (num: number) => {
    if (num > 1000) {
      return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(num < 10 ? 4 : 2);
  };

  // Y-axis tick values (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
    const val = chartMin + pct * (chartMax - chartMin);
    return { val, y: mapY(val) };
  });

  // Current Price & SMC Liquidity Levels
  const currentCandle = activeCandles[activeCandles.length - 1];
  const livePriceDisplay = isRealData
    ? `$${formatP(currentCandle.close)}`
    : analysis.market.currentPrice;

  const bslPrice = liveData?.bsl || rawMax;
  const sslPrice = liveData?.ssl || rawMin;

  const isShort = analysis.tradePlan.direction === "SHORT";
  const isLong = analysis.tradePlan.direction === "LONG";
  const isNoTrade = analysis.decision === "NO TRADE" || (!isShort && !isLong);

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-base tracking-wide">
              {instrument}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/50 uppercase">
              {timeframe} Candle Feed
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Live Spot:</span>
              <strong className="text-white text-sm">{livePriceDisplay}</strong>
            </span>

            {isRealData && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                Binance {liveData?.binanceSymbol}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Overlays */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Timeframe Selector */}
          {onTimeframeChange && (
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              {["5m", "15m", "1h", "4h"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2 py-1 rounded text-[11px] font-mono uppercase font-bold transition-all ${
                    timeframe === tf
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* Toggle Overlays */}
          <button
            onClick={() => setShowLiquidity(!showLiquidity)}
            className={`px-2 py-1 rounded font-mono transition-colors flex items-center gap-1 ${
              showLiquidity
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:text-slate-300"
            }`}
          >
            {showLiquidity ? <Eye size={12} /> : <EyeOff size={12} />}
            BSL/SSL
          </button>

          <button
            onClick={() => setShowFvg(!showFvg)}
            className={`px-2 py-1 rounded font-mono transition-colors flex items-center gap-1 ${
              showFvg
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:text-slate-300"
            }`}
          >
            {showFvg ? <Eye size={12} /> : <EyeOff size={12} />}
            FVG
          </button>

          <button
            onClick={() => setShowStructure(!showStructure)}
            className={`px-2 py-1 rounded font-mono transition-colors flex items-center gap-1 ${
              showStructure
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:text-slate-300"
            }`}
          >
            {showStructure ? <Eye size={12} /> : <EyeOff size={12} />}
            BOS/CHOCH
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchCandles}
            disabled={isLoading}
            title="Refresh candles"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
          >
            <RotateCw size={13} className={isLoading ? "animate-spin text-sky-400" : ""} />
          </button>
        </div>
      </div>

      {/* SVG Stage */}
      <div className="relative p-2 overflow-x-auto bg-[#0b0e14] no-scrollbar">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[760px] select-none"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          onMouseLeave={() => {
            setHoveredCandle(null);
            setHoverPos(null);
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#172030" strokeWidth="0.75" />
            </pattern>
            {/* Gradients */}
            <linearGradient id="bullishGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="bearishGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="fvgGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width={width} height={height} fill="#0b0e14" />
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Horizontal Grid lines & Price Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={t.y}
                x2={width - paddingRight}
                y2={t.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <text
                x={width - paddingRight + 8}
                y={t.y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                ${formatP(t.val)}
              </text>
            </g>
          ))}

          {/* Buy-Side Liquidity (BSL) line */}
          {showLiquidity && (
            <g>
              <line
                x1={paddingLeft}
                y1={mapY(bslPrice)}
                x2={width - paddingRight}
                y2={mapY(bslPrice)}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <rect
                x={paddingLeft}
                y={mapY(bslPrice) - 17}
                width={195}
                height={16}
                fill="#78350f"
                rx={3}
                opacity={0.9}
              />
              <text
                x={paddingLeft + 6}
                y={mapY(bslPrice) - 5}
                fill="#fde68a"
                fontSize="10"
                fontWeight="bold"
              >
                BSL / Swing High (${formatP(bslPrice)})
              </text>
            </g>
          )}

          {/* Sell-Side Liquidity (SSL) line */}
          {showLiquidity && (
            <g>
              <line
                x1={paddingLeft}
                y1={mapY(sslPrice)}
                x2={width - paddingRight}
                y2={mapY(sslPrice)}
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <rect
                x={paddingLeft}
                y={mapY(sslPrice) + 2}
                width={195}
                height={16}
                fill="#581c87"
                rx={3}
                opacity={0.9}
              />
              <text
                x={paddingLeft + 6}
                y={mapY(sslPrice) + 14}
                fill="#f3e8ff"
                fontSize="10"
                fontWeight="bold"
              >
                SSL / Swing Low (${formatP(sslPrice)})
              </text>
            </g>
          )}

          {/* Active FVG Zones */}
          {showFvg &&
            liveData?.activeFvgs?.map((fvg, idx) => {
              const yTop = mapY(Math.max(fvg.top, fvg.bottom));
              const yBottom = mapY(Math.min(fvg.top, fvg.bottom));
              const fvgHeight = Math.max(4, yBottom - yTop);

              return (
                <g key={`fvg-${idx}`}>
                  <rect
                    x={paddingLeft + chartW * 0.4}
                    y={yTop}
                    width={chartW * 0.6}
                    height={fvgHeight}
                    fill="url(#fvgGradient)"
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={paddingLeft + chartW * 0.4 + 8}
                    y={yTop + Math.min(12, fvgHeight / 2 + 3)}
                    fill="#38bdf8"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {fvg.type === "BEARISH" ? "Bearish FVG" : "Bullish FVG"} [${formatP(fvg.bottom)}–${formatP(fvg.top)}]
                  </text>
                </g>
              );
            })}

          {/* Render Real Candlesticks */}
          {activeCandles.map((c, i) => {
            const x = paddingLeft + (i + 0.5) * candleSpacing;
            const isGreen = c.close >= c.open;
            const bodyTop = mapY(Math.max(c.open, c.close));
            const bodyHeight = Math.max(2, Math.abs(mapY(c.open) - mapY(c.close)));
            const wickTop = mapY(c.high);
            const wickBottom = mapY(c.low);
            const candleWidth = Math.max(3, candleSpacing * 0.62);

            return (
              <g
                key={c.timestamp || i}
                className="cursor-crosshair transition-opacity"
                onMouseEnter={() => {
                  setHoveredCandle(c);
                  setHoverPos({ x, y: bodyTop });
                }}
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={wickTop}
                  x2={x}
                  y2={wickBottom}
                  stroke={isGreen ? "#10b981" : "#ef4444"}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isGreen ? "url(#bullishGradient)" : "url(#bearishGradient)"}
                  stroke={isGreen ? "#059669" : "#dc2626"}
                  strokeWidth="0.8"
                  rx="1"
                />

                {/* Liquidity Sweep Annotation */}
                {c.isSweep && showLiquidity && (
                  <g>
                    <circle cx={x} cy={wickTop} r="3.5" fill="#f59e0b" />
                    <line x1={x} y1={wickTop - 3} x2={x} y2={wickTop - 18} stroke="#f59e0b" strokeWidth="1" />
                    <rect x={x - 45} y={wickTop - 32} width="90" height="15" rx="3" fill="#78350f" />
                    <text x={x} y={wickTop - 21} fill="#fde68a" fontSize="9" fontWeight="bold" textAnchor="middle">
                      ⚡ SWEEP
                    </text>
                  </g>
                )}

                {/* Displacement badge */}
                {c.isDisplacement && showStructure && (
                  <circle cx={x} cy={wickBottom + 6} r="2.5" fill="#38bdf8" />
                )}

                {/* Time Axis Labels */}
                {i % 4 === 0 && (
                  <text
                    x={x}
                    y={height - paddingBottom + 16}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {c.timeStr}
                  </text>
                )}
              </g>
            );
          })}

          {/* Current Live Price Line & Tracker Tag */}
          <line
            x1={paddingLeft}
            y1={mapY(currentCandle.close)}
            x2={width - paddingRight}
            y2={mapY(currentCandle.close)}
            stroke="#10b981"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <rect
            x={width - paddingRight}
            y={mapY(currentCandle.close) - 10}
            width={72}
            height={20}
            fill="#065f46"
            rx={2}
          />
          <text
            x={width - paddingRight + 6}
            y={mapY(currentCandle.close) + 4}
            fill="#ecfdf5"
            fontSize="10"
            fontWeight="bold"
          >
            ${formatP(currentCandle.close)}
          </text>
        </svg>

        {/* Hover Candlestick Inspection Overlay */}
        {hoveredCandle && (
          <div className="absolute top-4 left-6 bg-slate-900/95 border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-3 shadow-xl backdrop-blur-sm z-30">
            <span className="text-slate-400">Time: <strong className="text-slate-200">{hoveredCandle.timeStr}</strong></span>
            <span className="text-slate-400">O: <strong className="text-slate-200">${formatP(hoveredCandle.open)}</strong></span>
            <span className="text-slate-400">H: <strong className="text-emerald-400">${formatP(hoveredCandle.high)}</strong></span>
            <span className="text-slate-400">L: <strong className="text-rose-400">${formatP(hoveredCandle.low)}</strong></span>
            <span className="text-slate-400">C: <strong className={hoveredCandle.close >= hoveredCandle.open ? "text-emerald-400" : "text-rose-400"}>${formatP(hoveredCandle.close)}</strong></span>
            {hoveredCandle.volume > 0 && (
              <span className="text-slate-400">Vol: <strong className="text-slate-200">{hoveredCandle.volume.toFixed(2)}</strong></span>
            )}
            {hoveredCandle.isSweep && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">SWEEP CANDLE</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span>
            24h Range:{" "}
            <strong className="text-slate-200">
              ${formatP(rawMin)} – ${formatP(rawMax)}
            </strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Calculated BSL: <strong className="text-amber-300">${formatP(bslPrice)}</strong>
          </span>
          <span>
            Calculated SSL: <strong className="text-purple-300">${formatP(sslPrice)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-500"
            />
            <span>Auto-refresh (6s)</span>
          </label>
          <span>•</span>
          <span>Updated: {lastRefreshed.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
