import React, { useState, useEffect, useRef } from "react";
import { TradeAnalysis, MarketRegime } from "../types";
import { PRESET_SCENARIOS } from "../data/mockScenarios";
import { LiveChartVisualizer } from "./LiveChartVisualizer";
import { ScoreGaugeBreakdown } from "./ScoreGaugeBreakdown";
import { TradePlanCard } from "./TradePlanCard";
import { SniperConfluenceRadar } from "./SniperConfluenceRadar";
import { SniperPositionSizer } from "./SniperPositionSizer";
import { MultiTimeframeAlignmentMatrix } from "./MultiTimeframeAlignmentMatrix";
import { LiquidityProximityRadar } from "./LiquidityProximityRadar";
import {
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
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
  const [selectedInstrument, setSelectedInstrument] = useState<string>("XAU/USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15m");
  const [isEvaluatingLive, setIsEvaluatingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

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

  // Scroll anchor for position sizer
  const sizerRef = useRef<HTMLDivElement>(null);
  const handleScrollToSizer = () => {
    sizerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Evaluate Live Market Function
  const handleEvaluateLiveMarket = async (symbolToAudit?: string, tfToAudit?: string) => {
    const symbol = symbolToAudit || selectedInstrument;
    const tf = tfToAudit || selectedTimeframe;

    setIsEvaluatingLive(true);
    setLiveError(null);

    try {
      const res = await fetch("/api/analyze-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe: tf.toUpperCase() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: TradeAnalysis = await res.json();
      onAnalysisChange(data);
    } catch (err: any) {
      console.error("Live market audit failed:", err);
      setLiveError(err.message || "Failed to evaluate live market. Ensure server is connected.");
    } finally {
      setIsEvaluatingLive(false);
    }
  };

  // Switch Instrument in Live Mode
  const handleSelectLiveInstrument = (symbol: string) => {
    setSelectedInstrument(symbol);
    handleEvaluateLiveMarket(symbol, selectedTimeframe);
  };

  // Switch Timeframe in Live Mode
  const handleSelectTimeframe = (tf: string) => {
    setSelectedTimeframe(tf);
    handleEvaluateLiveMarket(selectedInstrument, tf);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Top Evaluation Mode Switcher */}
      <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
            Analysis Source:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEvaluateLiveMarket()}
              disabled={isEvaluatingLive}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Active Live Markets (Institutional Feeds • Crypto, Gold, Forex & Indices)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Select an instrument to stream real candlesticks & evaluate institutional structure
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {LIVE_INSTRUMENTS.map((inst) => {
              const isSelected = selectedInstrument === inst.symbol;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => handleSelectLiveInstrument(inst.symbol)}
                  className={`p-3 rounded-xl border text-left font-mono text-xs transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{inst.icon}</span>
                      <span>{inst.symbol}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {inst.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{inst.name}</p>
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
        onOpenSizer={handleScrollToSizer}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Chart, Trade Plan Card & Position Sizer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <LiveChartVisualizer
            analysis={currentAnalysis}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={handleSelectTimeframe}
          />
          <TradePlanCard analysis={currentAnalysis} onOpenConsult={onOpenConsult} />

          {/* Sub-Pip Precision Risk & Position Sizer */}
          <div ref={sizerRef}>
            <SniperPositionSizer analysis={currentAnalysis} />
          </div>
        </div>

        {/* Right Column: 100-Point Score Gauge & Factor Breakdown (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
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
