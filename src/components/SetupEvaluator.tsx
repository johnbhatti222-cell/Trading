import React, { useState, useEffect } from "react";
import { TradeAnalysis, MarketRegime } from "../types";
import { PRESET_SCENARIOS } from "../data/mockScenarios";
import { LiveChartVisualizer } from "./LiveChartVisualizer";
import { ScoreGaugeBreakdown } from "./ScoreGaugeBreakdown";
import { TradePlanCard } from "./TradePlanCard";
import { SniperConfluenceRadar } from "./SniperConfluenceRadar";
import { MultiTimeframeAlignmentMatrix } from "./MultiTimeframeAlignmentMatrix";
import { LiquidityProximityRadar } from "./LiquidityProximityRadar";
import {
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  HelpCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Radio,
  Clock,
  TrendingUp,
  TrendingDown,
  Lock,
} from "lucide-react";

interface SetupEvaluatorProps {
  currentAnalysis: TradeAnalysis;
  onAnalysisChange: (analysis: TradeAnalysis) => void;
  onOpenConsult: () => void;
  onNavigateToChecklist: () => void;
  onNavigateToReplay?: () => void;
}

const LIVE_INSTRUMENTS = [
  { symbol: "XAU/USD", name: "Gold Spot", icon: "🪙", category: "METALS" },
  { symbol: "BTC/USD", name: "Bitcoin Spot", icon: "₿", category: "CRYPTO" },
  { symbol: "ETH/USD", name: "Ethereum Spot", icon: "Ξ", category: "CRYPTO" },
  { symbol: "SOL/USD", name: "Solana Spot", icon: "◎", category: "CRYPTO" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "€", category: "FOREX" },
  { symbol: "USD/JPY", name: "US Dollar / Yen", icon: "¥", category: "FOREX" },
  { symbol: "US30", name: "Dow Jones 30", icon: "🏛️", category: "INDEX" },
];

export const SetupEvaluator: React.FC<SetupEvaluatorProps> = ({
  currentAnalysis,
  onAnalysisChange,
  onOpenConsult,
  onNavigateToChecklist,
  onNavigateToReplay,
}) => {
  // Mode selection: "live" | "presets" | "custom"
  const [activeMode, setActiveMode] = useState<"live" | "presets" | "custom">("live");

  // Live stream controls
  const [selectedInstrument, setSelectedInstrument] = useState<string>(
    currentAnalysis.market?.instrument || "XAU/USD"
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15m");
  const [isEvaluatingLive, setIsEvaluatingLive] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Auto-Refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(10);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [liveTickers, setLiveTickers] = useState<
    Record<
      string,
      {
        price: string;
        change24h: string;
        bias?: string;
        isAuthorized?: boolean;
        executionStatus?: "AUTHORIZED" | "NOT AUTHORIZED" | "MARKET CLOSED";
        statusText?: string;
        score?: number;
        decision?: "TRADE" | "WAIT" | "NO TRADE" | "MARKET CLOSED";
        setupType?: string;
      }
    >
  >({});

  // Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>("gold-ny-sweep");

  // Custom Form state
  const [customInstrument, setCustomInstrument] = useState("XAU/USD");
  const [customTimeframe, setCustomTimeframe] = useState("15M / 1H");
  const [customPrice, setCustomPrice] = useState("4,328.50");
  const [marketRegime, setMarketRegime] = useState<MarketRegime>("DISTRIBUTION");
  const [observations, setObservations] = useState(
    "Price swept Previous Day High at 4,340 with a strong rejection wick. 5M displacement broke structure lower (CHOCH). Retracing into 15M Bearish FVG."
  );
  const [macroOverride, setMacroOverride] = useState(
    "DXY testing resistance; US 10Y yields stable at 4.28%. No high-impact news in next 2 hours."
  );
  const [isCustomAuditing, setIsCustomAuditing] = useState(false);
  const [customAuditError, setCustomAuditError] = useState<string | null>(null);

  // Synchronize selected instrument if external analysis changes
  useEffect(() => {
    if (currentAnalysis?.market?.instrument && currentAnalysis.market.instrument !== selectedInstrument) {
      setSelectedInstrument(currentAnalysis.market.instrument);
    }
  }, [currentAnalysis?.market?.instrument]);

  // Fetch quick live tickers for all active market cards
  const fetchLiveTickers = async () => {
    try {
      const res = await fetch("/api/live-tickers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: Record<
            string,
            {
              price: string;
              change24h: string;
              bias?: string;
              isAuthorized?: boolean;
              executionStatus?: "AUTHORIZED" | "NOT AUTHORIZED" | "MARKET CLOSED";
              statusText?: string;
              score?: number;
              decision?: "TRADE" | "WAIT" | "NO TRADE" | "MARKET CLOSED";
              setupType?: string;
            }
          > = {};
          data.forEach((t: any) => {
            map[t.symbol] = {
              price: t.price,
              change24h: t.change24h,
              bias: t.bias,
              isAuthorized: t.isAuthorized,
              executionStatus: t.executionStatus,
              statusText: t.statusText,
              score: t.score,
              decision: t.decision,
              setupType: t.setupType,
            };
          });
          setLiveTickers(map);
        }
      }
    } catch (err) {
      console.warn("Live tickers fetch notice:", err);
    }
  };

  // Fetch tickers on mount
  useEffect(() => {
    fetchLiveTickers();
  }, []);

  // Evaluate Live Market Function
  const handleEvaluateLiveMarket = async (
    symbolToAudit?: string,
    tfToAudit?: string,
    isBackground: boolean = false
  ) => {
    const symbol = symbolToAudit || selectedInstrument;
    const tf = tfToAudit || selectedTimeframe;

    if (!isBackground) {
      setIsEvaluatingLive(true);
    } else {
      setIsAutoRefreshing(true);
    }
    setLiveError(null);

    try {
      const res = await fetch("/api/analyze-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          timeframe: tf.toUpperCase(),
          forceRefresh: isBackground,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: TradeAnalysis = await res.json();
      onAnalysisChange(data);
      setLastRefreshed(new Date());

      // Also refresh live tickers for all instrument cards
      fetchLiveTickers();
    } catch (err: any) {
      console.error("Live market audit failed:", err);
      if (!isBackground) {
        setLiveError(err.message || "Failed to evaluate live market. Ensure server is connected.");
      }
    } finally {
      setIsEvaluatingLive(false);
      setIsAutoRefreshing(false);
    }
  };

  // Auto-refresh countdown interval effect (runs in live mode)
  useEffect(() => {
    if (activeMode !== "live" || !autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Trigger background auto-refresh of live setup & candles
          handleEvaluateLiveMarket(selectedInstrument, selectedTimeframe, true);
          fetchLiveTickers();
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode, autoRefreshEnabled, refreshIntervalSec, selectedInstrument, selectedTimeframe]);

  // Switch Instrument in Live Mode
  const handleSelectLiveInstrument = (symbol: string) => {
    setSelectedInstrument(symbol);
    setSecondsRemaining(refreshIntervalSec);
    handleEvaluateLiveMarket(symbol, selectedTimeframe, false);
  };

  // Switch Timeframe in Live Mode
  const handleSelectTimeframe = (tf: string) => {
    setSelectedTimeframe(tf);
    setSecondsRemaining(refreshIntervalSec);
    handleEvaluateLiveMarket(selectedInstrument, tf, false);
  };

  // Select Preset Scenario
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setActiveMode("presets");
    const found = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (found) {
      onAnalysisChange(found.analysis);
      setSelectedInstrument(found.analysis.market.instrument);
    }
  };

  const handleQuickAddSmcPill = (pill: string) => {
    setObservations((prev) => (prev ? `${prev} ${pill}` : pill));
  };

  const handleRunCustomAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCustomAuditing(true);
    setCustomAuditError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrument: customInstrument,
          timeframe: customTimeframe,
          currentPrice: customPrice,
          marketRegime,
          observations,
          macroOverride,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: TradeAnalysis = await res.json();
      onAnalysisChange(data);
    } catch (err: any) {
      console.error("Analysis request failed:", err);
      setCustomAuditError(
        err.message || "Failed to contact Master Analyst service. Make sure GEMINI_API_KEY is configured."
      );
    } finally {
      setIsCustomAuditing(false);
    }
  };

  // Compute number of markets currently authorized for snipe execution
  const authorizedCount = LIVE_INSTRUMENTS.filter((inst) => {
    const isSelected = selectedInstrument === inst.symbol;
    if (isSelected) return currentAnalysis.decision === "TRADE";
    const ticker = liveTickers[inst.symbol];
    return ticker?.isAuthorized ?? (ticker?.executionStatus === "AUTHORIZED");
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Evaluation Mode Switcher */}
      <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
            Analysis Source:
          </span>
          <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => {
                setActiveMode("live");
                handleEvaluateLiveMarket(selectedInstrument, selectedTimeframe);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                activeMode === "live"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
              </span>
              <span>Live Market Stream</span>
            </button>

            <button
              onClick={() => setActiveMode("presets")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === "presets"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>Historical Presets</span>
            </button>

            <button
              onClick={() => setActiveMode("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === "custom"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders size={13} />
              <span>Custom Setup Form</span>
            </button>
          </div>
        </div>

        {activeMode === "live" && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Pause auto-refresh" : "Resume auto-refresh"}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                autoRefreshEnabled
                  ? "bg-slate-900/80 border-emerald-800/60 text-emerald-300 hover:bg-slate-800"
                  : "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {autoRefreshEnabled ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                  </span>
                  <Pause size={12} />
                  <span>Auto-Refresh: {secondsRemaining}s</span>
                </>
              ) : (
                <>
                  <Play size={12} className="text-amber-400" />
                  <span className="text-amber-300">Paused</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleEvaluateLiveMarket(selectedInstrument, selectedTimeframe, false)}
              disabled={isEvaluatingLive || isAutoRefreshing}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all"
            >
              {isEvaluatingLive ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Auditing Live Market...</span>
                </>
              ) : (
                <>
                  <Zap size={13} className="fill-current" />
                  <span>Audit Live Market Now</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Live Market Controller */}
      {activeMode === "live" && (
        <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 shadow-xl">
          {/* Header with Title & Comprehensive Auto-Refresh HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                {isAutoRefreshing && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Active Live Markets (Institutional Feeds • Crypto, Gold, Forex & Indices)
                  </h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    REAL-TIME
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-slate-400">Execution Status:</span>
                    <span className={authorizedCount > 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                      {authorizedCount} Authorized
                    </span>
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Select an instrument to stream real candlesticks & evaluate institutional structure
                </p>
              </div>
            </div>

            {/* Auto-Refresh Control HUD */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/80">
              {/* Cadence Pills */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                <span className="px-1 text-slate-500 font-semibold">Every:</span>
                {[5, 10, 15, 30].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      setRefreshIntervalSec(sec);
                      setSecondsRemaining(sec);
                    }}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      refreshIntervalSec === sec
                        ? "bg-emerald-600 text-white font-bold"
                        : "hover:text-slate-200 text-slate-400"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Status & Countdown Pill */}
              <div
                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border transition-all ${
                  autoRefreshEnabled
                    ? "bg-slate-900 border-emerald-900/60 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {autoRefreshEnabled ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>Next sync: </span>
                    <span className="font-bold text-white tabular-nums">{secondsRemaining}s</span>
                  </>
                ) : (
                  <span>Auto-Refresh Paused</span>
                )}
              </div>

              {/* Pause / Resume Button */}
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                title={autoRefreshEnabled ? "Pause Auto-Refresh" : "Resume Auto-Refresh"}
                className={`p-1.5 rounded border text-xs transition-colors ${
                  autoRefreshEnabled
                    ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                    : "bg-amber-950/80 hover:bg-amber-900 border-amber-800 text-amber-300"
                }`}
              >
                {autoRefreshEnabled ? <Pause size={13} /> : <Play size={13} />}
              </button>

              {/* Instant Manual Refresh */}
              <button
                onClick={() => handleEvaluateLiveMarket(selectedInstrument, selectedTimeframe, true)}
                disabled={isEvaluatingLive || isAutoRefreshing}
                title="Force refresh live markets & candles"
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCw
                  size={12}
                  className={isEvaluatingLive || isAutoRefreshing ? "animate-spin text-emerald-400" : "text-slate-400"}
                />
                <span>Sync Now</span>
              </button>

              {/* Timestamp */}
              <span className="text-[10px] font-mono text-slate-500 hidden md:inline px-1">
                {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* 7 Live Market Cards with real-time prices & execution status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {LIVE_INSTRUMENTS.map((inst) => {
              const isSelected = selectedInstrument === inst.symbol;
              const ticker = liveTickers[inst.symbol];
              const displayPrice =
                ticker?.price ||
                (isSelected && currentAnalysis.market?.currentPrice ? currentAnalysis.market.currentPrice : "---");
              const change24h = ticker?.change24h;
              const isPositiveChange = change24h ? !change24h.startsWith("-") : true;

              // Compute Sniper Execution Authorization status
              const isMarketClosed = ticker?.executionStatus === "MARKET CLOSED";
              const isAuthorized = isSelected
                ? currentAnalysis.decision === "TRADE"
                : (ticker?.isAuthorized ?? (ticker?.executionStatus === "AUTHORIZED"));

              const subDetail = isSelected
                ? (currentAnalysis.decision === "TRADE"
                    ? (currentAnalysis.setup?.setupType || "A+ Setup Active")
                    : currentAnalysis.decision === "WAIT"
                    ? "Awaiting Sweep / BOS"
                    : "Stand Down / In Range")
                : isMarketClosed
                ? "Market Closed"
                : (ticker?.setupType || (isAuthorized ? "A+ Setup Active" : "Awaiting Sweep / BOS"));

              return (
                <button
                  key={inst.symbol}
                  onClick={() => handleSelectLiveInstrument(inst.symbol)}
                  className={`p-3 rounded-xl border text-left font-mono text-xs transition-all flex flex-col justify-between relative overflow-hidden group ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50"
                      : isAuthorized
                      ? "bg-gradient-to-b from-emerald-950/25 to-slate-900/90 border-emerald-600/50 hover:border-emerald-400/80 hover:bg-slate-800/70 shadow-sm"
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
                  )}

                  <div>
                    {/* Top Row: Icon, Symbol, and Category */}
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="text-sm">{inst.icon}</span>
                        <span className="group-hover:text-emerald-300 transition-colors">{inst.symbol}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                            LIVE
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {inst.category}
                        </span>
                      </div>
                    </div>

                    {/* Live Real-Time Price & 24h Change */}
                    <div className="my-1">
                      <div className="text-sm font-bold text-white font-mono tracking-tight flex items-center justify-between">
                        <span>{displayPrice}</span>
                        {isSelected && isAutoRefreshing && (
                          <RotateCw size={10} className="animate-spin text-emerald-400" />
                        )}
                      </div>
                      {change24h && (
                        <div
                          className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 font-medium ${
                            isPositiveChange ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isPositiveChange ? (
                            <TrendingUp size={11} className="inline" />
                          ) : (
                            <TrendingDown size={11} className="inline" />
                          )}
                          <span>{change24h}</span>
                          {ticker?.bias && (
                            <span className="text-slate-500 ml-1 text-[9px]">• {ticker.bias}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Execution Status Badge & Details */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 w-full">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                        Execution
                      </span>
                      {isAuthorized ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Authorized
                        </span>
                      ) : isMarketClosed ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-amber-400/90 border border-amber-900/40">
                          <Lock size={9} className="text-amber-400/80" />
                          Not Authorized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Not Authorized
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] font-mono truncate leading-tight ${
                        isAuthorized
                          ? "text-emerald-300/80 font-semibold"
                          : isMarketClosed
                          ? "text-amber-500/70"
                          : "text-slate-400"
                      }`}
                      title={subDetail}
                    >
                      {subDetail}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {liveError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{liveError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Historical Case Studies / Presets */}
      {activeMode === "presets" && (
        <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Archived Institutional Scenarios & Case Studies
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Click any scenario to load its historical SMC setup and 100-pt score
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {PRESET_SCENARIOS.map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3 rounded-lg border text-left font-mono text-xs transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-white text-xs">{p.instrument}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          p.badge === "TRADE"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : p.badge === "WAIT"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {p.badge} ({p.score})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: Custom Setup Builder Form */}
      {activeMode === "custom" && (
        <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Custom Setup Builder & Auditor
            </h3>
          </div>

          <form onSubmit={handleRunCustomAudit} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Target Instrument:</label>
                <select
                  value={customInstrument}
                  onChange={(e) => setCustomInstrument(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="XAU/USD">XAU/USD (Spot Gold)</option>
                  <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                  <option value="ETH/USD">ETH/USD (Ethereum)</option>
                  <option value="EUR/USD">EUR/USD</option>
                  <option value="GBP/USD">GBP/USD</option>
                  <option value="USD/JPY">USD/JPY</option>
                  <option value="US30">US30 (Dow Jones 30 Index)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Primary Timeframe:</label>
                <select
                  value={customTimeframe}
                  onChange={(e) => setCustomTimeframe(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="15M / 1H">15M / 1H (Intraday)</option>
                  <option value="5M / 15M">5M / 15M (Scalp)</option>
                  <option value="1H / 4H">1H / 4H (Swing)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Current Market Price:</label>
                <input
                  type="text"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                  placeholder="e.g. 4,328.50"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Market Regime (Sec 3):</label>
                <select
                  value={marketRegime}
                  onChange={(e) => setMarketRegime(e.target.value as MarketRegime)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="DISTRIBUTION">DISTRIBUTION</option>
                  <option value="ACCUMULATION">ACCUMULATION</option>
                  <option value="TRENDING BULLISH">TRENDING BULLISH</option>
                  <option value="TRENDING BEARISH">TRENDING BEARISH</option>
                  <option value="RANGE">RANGE</option>
                  <option value="BREAKOUT">BREAKOUT</option>
                  <option value="UNCLEAR">UNCLEAR</option>
                </select>
              </div>
            </div>

            {/* Observations */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400">
                  Price Action, Liquidity Sweep & Displacement Observations:
                </label>
                <span className="text-[11px] text-slate-500">Quick tags to append:</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  "Swept PDH with rejection wick",
                  "Swept PDL and recovered value",
                  "Confirmed 5M CHOCH with displacement",
                  "Retesting 15M Fair Value Gap (FVG)",
                  "Equal highs resting un-swept",
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickAddSmcPill(pill)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-colors"
                  >
                    + {pill}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>

            {/* Macro */}
            <div>
              <label className="text-slate-400 block mb-1">Macro / News Context:</label>
              <input
                type="text"
                value={macroOverride}
                onChange={(e) => setMacroOverride(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>

            {customAuditError && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{customAuditError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isCustomAuditing || !observations.trim()}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-950"
              >
                {isCustomAuditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Master Analyst Scoring Engine...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Institutional AI Audit (100-Pt Score)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Section: Sniper Confluence Radar HUD (Binary 5-Gate Kill Box) */}
      <SniperConfluenceRadar
        analysis={currentAnalysis}
      />

      {/* Section: Multi-Timeframe Fractal Alignment Matrix (1D -> 4H -> 15M -> 1M/5M) */}
      <MultiTimeframeAlignmentMatrix
        analysis={currentAnalysis}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={handleSelectTimeframe}
      />

      {/* Section: Sub-Pip Liquidity Proximity Radar & Pre-Sweep Sonar */}
      <LiquidityProximityRadar analysis={currentAnalysis} />

      {/* Main Results Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column: Live Chart & Trade Plan Card (7 cols on desktop, full width on mobile/tablet) */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full min-w-0">
          <LiveChartVisualizer
            analysis={currentAnalysis}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={handleSelectTimeframe}
            onRefreshAnalysis={() => handleEvaluateLiveMarket(selectedInstrument, selectedTimeframe, true)}
            isAutoRefreshing={isAutoRefreshing}
          />
          <TradePlanCard analysis={currentAnalysis} onOpenConsult={onOpenConsult} />
        </div>

        {/* Right Column: 100-Point Score Gauge & Factor Breakdown (5 cols on desktop, full width on mobile/tablet) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full min-w-0">
          <ScoreGaugeBreakdown
            score={currentAnalysis.score}
            decision={currentAnalysis.decision}
            decisionReason={currentAnalysis.decisionReason}
          />

          {/* Quick Pre-Flight Action Card */}
          <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl font-mono text-xs flex flex-col gap-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Pre-Flight Execution Gateway
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Before risking capital on this {currentAnalysis.market.instrument} setup, verify the 8 mandatory institutional pre-flight discipline gates or backtest the trigger on the replay tape.
            </p>
            <button
              onClick={onNavigateToChecklist}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <span>Review Section 20 Pre-Flight Checklist</span>
              <ChevronRight size={14} />
            </button>

            {onNavigateToReplay && (
              <button
                onClick={onNavigateToReplay}
                className="w-full py-2.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 font-semibold flex items-center justify-center gap-2 border border-sky-600/40 transition-colors"
              >
                <RotateCcw size={14} className="text-sky-400" />
                <span>Simulate Setup on Tape Replay</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
