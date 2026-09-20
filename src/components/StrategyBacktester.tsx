import React, { useState, useEffect, useMemo } from "react";
import {
  BacktestParams,
  BacktestResult,
  BacktestTrade,
  EquityCurvePoint,
} from "../types";
import {
  LineChart,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Sliders,
  Play,
  RotateCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Target,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";

export const StrategyBacktester: React.FC = () => {
  const [params, setParams] = useState<BacktestParams>({
    instrument: "BTC/USD",
    timeframe: "15M",
    period: "6M",
    thresholdScore: 80,
    riskRewardRatio: 2.5,
    tpStrategy: "TRAILING_BE",
    sessionFilter: "KILLZONES_ONLY",
    riskPerTradePct: 1.0,
    initialBalance: 10000,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Display toggles
  const [curveMode, setCurveMode] = useState<"R" | "USD">("R");
  const [hoveredPoint, setHoveredPoint] = useState<EquityCurvePoint | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<BacktestTrade | null>(null);

  // Trade log filter
  const [logFilter, setLogFilter] = useState<"ALL" | "WINS" | "LOSSES" | "LONGS" | "SHORTS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Presets
  const [presets, setPresets] = useState<{ id: string; name: string; description: string; params: Partial<BacktestParams> }[]>([]);

  // Fetch presets on mount
  useEffect(() => {
    fetch("/api/backtest/presets")
      .then((res) => res.json())
      .then((data) => {
        if (data.presets) setPresets(data.presets);
      })
      .catch((err) => console.warn("Could not fetch backtest presets:", err));
  }, []);

  // Run backtest
  const runSimulation = async (customParams?: BacktestParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const requestParams = customParams || params;

      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestParams),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || "Simulation run failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute backtest request");
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial simulation on mount
  useEffect(() => {
    runSimulation();
  }, []);

  const handleApplyPreset = (presetParams: Partial<BacktestParams>) => {
    const updated: BacktestParams = {
      ...params,
      ...presetParams,
    };
    setParams(updated);
    runSimulation(updated);
  };

  // Filtered trades for table
  const filteredTrades = useMemo(() => {
    if (!result?.trades) return [];
    return result.trades.filter((t) => {
      if (logFilter === "WINS" && t.returnR <= 0) return false;
      if (logFilter === "LOSSES" && t.returnR >= 0) return false;
      if (logFilter === "LONGS" && t.direction !== "LONG") return false;
      if (logFilter === "SHORTS" && t.direction !== "SHORT") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.setupType.toLowerCase().includes(q) ||
          t.session.toLowerCase().includes(q) ||
          t.exitReason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [result?.trades, logFilter, searchQuery]);

  // CSV Export
  const handleExportCsv = () => {
    if (!result?.trades || result.trades.length === 0) return;
    const headers = [
      "TradeNumber",
      "EntryDate",
      "ExitDate",
      "Instrument",
      "Direction",
      "EntryPrice",
      "StopLoss",
      "TakeProfit",
      "ExitPrice",
      "ExitReason",
      "BarsHeld",
      "ConfluenceScore",
      "Session",
      "ReturnR",
      "PnL_USD",
      "RunningBalance",
      "DrawdownPct",
      "SetupType",
    ];

    const rows = result.trades.map((t) => [
      t.tradeNumber,
      `"${t.entryDate}"`,
      `"${t.exitDate}"`,
      t.instrument,
      t.direction,
      t.entryPrice,
      t.stopLoss,
      t.takeProfit,
      t.exitPrice,
      t.exitReason,
      t.barsHeld,
      t.confluenceScore,
      `"${t.session}"`,
      t.returnR,
      t.pnlUsd,
      t.runningBalance,
      t.drawdownPct,
      `"${t.setupType}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Strategy_Backtest_${params.instrument.replace("/", "_")}_${params.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Dimensions & Math
  const curveData = result?.equityCurve || [];
  const chartWidth = 900;
  const chartHeight = 280;
  const padding = { top: 25, right: 30, bottom: 35, left: 60 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  const { points, minVal, maxVal, zeroY } = useMemo(() => {
    if (curveData.length === 0) {
      return { points: [], minVal: 0, maxVal: 100, zeroY: chartHeight / 2 };
    }

    const values = curveData.map((d) => (curveMode === "R" ? d.cumulativeR : d.equity));
    let min = Math.min(...values);
    let max = Math.max(...values);

    // Padding to ensure zero line is nicely positioned
    if (curveMode === "R") {
      min = Math.min(min, -2);
      max = Math.max(max, 10);
    } else {
      min = Math.min(min, params.initialBalance * 0.9);
      max = Math.max(max, params.initialBalance * 1.1);
    }

    const range = max - min || 1;

    const pts = curveData.map((d, idx) => {
      const val = curveMode === "R" ? d.cumulativeR : d.equity;
      const x = padding.left + (idx / (curveData.length - 1 || 1)) * usableWidth;
      const y = padding.top + usableHeight - ((val - min) / range) * usableHeight;
      return { x, y, data: d, val };
    });

    const zeroVal = curveMode === "R" ? 0 : params.initialBalance;
    const zeroYPos = padding.top + usableHeight - ((zeroVal - min) / range) * usableHeight;

    return { points: pts, minVal: min, maxVal: max, zeroY: zeroYPos };
  }, [curveData, curveMode, params.initialBalance, usableHeight, usableWidth]);

  // Path generator
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, "");
  }, [points]);

  // Area path for gradient fill
  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x},${zeroY} L ${first.x},${zeroY} Z`;
  }, [pathD, points, zeroY]);

  // Drawdown Underwater Path
  const ddHeight = 90;
  const ddUsableHeight = ddHeight - 20;
  const maxDd = result?.metrics.maxDrawdownPct || 10;
  const ddPoints = useMemo(() => {
    if (curveData.length === 0) return [];
    return curveData.map((d, idx) => {
      const x = padding.left + (idx / (curveData.length - 1 || 1)) * usableWidth;
      const y = 10 + (d.drawdownPct / (maxDd || 1)) * ddUsableHeight;
      return { x, y, dd: d.drawdownPct };
    });
  }, [curveData, maxDd, usableWidth, ddUsableHeight]);

  const ddPathD = useMemo(() => {
    if (ddPoints.length === 0) return "";
    return ddPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, "");
  }, [ddPoints]);

  const ddAreaD = useMemo(() => {
    if (ddPoints.length === 0) return "";
    const first = ddPoints[0];
    const last = ddPoints[ddPoints.length - 1];
    return `M ${first.x},10 L ${ddPoints.map((p) => `${p.x},${p.y}`).join(" ")} L ${last.x},10 Z`;
  }, [ddPoints]);

  return (
    <div className="space-y-6">
      {/* Header Banner & Preset Bar */}
      <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <LineChart size={20} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
                <span>STRATEGY BACKTESTING ENGINE</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  9-FACTOR SMC EXPECTANCY
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Quantitative multi-month simulation across authentic liquidity raids, killzones, and structural displacement.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runSimulation()}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-mono font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50"
            >
              <Play size={14} className={isLoading ? "animate-spin" : "fill-current"} />
              <span>{isLoading ? "Simulating..." : "Run 9-Factor Backtest"}</span>
            </button>

            {result && result.trades.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Export detailed trade log to CSV"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Benchmark Presets */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-2">
            <Sparkles size={13} className="text-amber-400" />
            <span>Institutional Benchmark Presets:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.params)}
                className="text-left p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 transition-all group hover:border-indigo-500/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {p.params.period}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation Controls Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090d16] border border-slate-800/90 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-indigo-400" />
            <span className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Simulation Parameters
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Candles Analyzed: <strong className="text-indigo-400">{result?.candlesAnalyzed?.toLocaleString() || 0}</strong> in{" "}
            <strong className="text-slate-300">{result?.simulationTimeMs || 0}ms</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          {/* Instrument */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Instrument</label>
            <select
              value={params.instrument}
              onChange={(e) => setParams({ ...params, instrument: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            >
              <option value="BTC/USD">BTC/USD (Crypto)</option>
              <option value="XAU/USD">XAU/USD (Gold Spot)</option>
              <option value="EUR/USD">EUR/USD (Forex Major)</option>
              <option value="USD/JPY">USD/JPY (Carry Pair)</option>
              <option value="US30">US30 (Dow Jones)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Timeframe</label>
            <select
              value={params.timeframe}
              onChange={(e) => setParams({ ...params, timeframe: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            >
              <option value="15M">15-Minute (Sniper)</option>
              <option value="1H">1-Hour (Swing)</option>
              <option value="4H">4-Hour (HTF Trend)</option>
            </select>
          </div>

          {/* Historical Period */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Historical Span</label>
            <select
              value={params.period}
              onChange={(e) => setParams({ ...params, period: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            >
              <option value="1M">Last 1 Month</option>
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="12M">Last 12 Months (1 Year)</option>
            </select>
          </div>

          {/* Confluence Threshold */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Confluence Threshold</label>
            <select
              value={params.thresholdScore}
              onChange={(e) => setParams({ ...params, thresholdScore: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 font-bold"
            >
              <option value={75}>≥ 75 (Moderate Confluence)</option>
              <option value={78}>≥ 78 (Recommended Entry)</option>
              <option value={80}>≥ 80 (Institutional Qualified)</option>
              <option value={85}>≥ 85 (A+ Strict Pristine)</option>
              <option value={90}>≥ 90 (Ultra Rare Setup)</option>
            </select>
          </div>

          {/* Take Profit Strategy */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Bracket Management</label>
            <select
              value={params.tpStrategy}
              onChange={(e) => setParams({ ...params, tpStrategy: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            >
              <option value="TRAILING_BE">Trailing BE (+0.45R Move)</option>
              <option value="FIXED_RR">Fixed R:R Target</option>
              <option value="DYNAMIC_PARTIAL">Dynamic Partials (50% at 2R)</option>
            </select>
          </div>

          {/* Session Timing Filter */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Session Killzones</label>
            <select
              value={params.sessionFilter}
              onChange={(e) => setParams({ ...params, sessionFilter: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            >
              <option value="KILLZONES_ONLY">Killzones (London & NY)</option>
              <option value="ALL">All Global Sessions</option>
              <option value="LONDON_ONLY">London Open Only</option>
              <option value="NY_ONLY">New York Open Only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Target R:R:</span>
              <div className="flex items-center gap-1">
                {[2.0, 2.5, 3.0, 3.5].map((rr) => (
                  <button
                    key={rr}
                    type="button"
                    onClick={() => setParams({ ...params, riskRewardRatio: rr })}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      params.riskRewardRatio === rr
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    1:{rr}R
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Risk / Trade:</span>
              <div className="flex items-center gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => setParams({ ...params, riskPerTradePct: risk })}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      params.riskPerTradePct === risk
                        ? "bg-sky-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {risk}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => runSimulation()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Re-calculate Model</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Expectancy & Statistical Scorecard Bento Grid */}
      {result && result.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          {/* Mathematical Expectancy (E) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/90 border border-indigo-500/30">
            <span className="text-[10px] text-indigo-300 block mb-1 uppercase tracking-wider flex items-center justify-between">
              <span>Expectancy (E)</span>
              <Award size={12} className="text-indigo-400" />
            </span>
            <div className="text-xl sm:text-2xl font-bold text-white flex items-baseline gap-1">
              <span>{result.metrics.mathematicalExpectancyR >= 0 ? `+${result.metrics.mathematicalExpectancyR}` : result.metrics.mathematicalExpectancyR}</span>
              <span className="text-xs text-indigo-400 font-normal">R / trade</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {result.metrics.mathematicalExpectancyR >= 0.5 ? "Institutional Positive Edge" : "Marginal Edge"}
            </span>
          </div>

          {/* Win Rate */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
              Win Rate %
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">
              {result.metrics.winRate}%
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {result.metrics.winningTrades}W • {result.metrics.losingTrades}L • {result.metrics.breakevenTrades}BE
            </span>
          </div>

          {/* Profit Factor */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
              Profit Factor
            </span>
            <div className="text-xl sm:text-2xl font-bold text-sky-400">
              {result.metrics.profitFactor}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Gross Win R / Gross Loss R
            </span>
          </div>

          {/* Total Net Return */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
              Net Cumulative Return
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
              <span>{result.metrics.netReturnR >= 0 ? `+${result.metrics.netReturnR}` : result.metrics.netReturnR} R</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {result.metrics.netProfitUsd >= 0 ? `+$${result.metrics.netProfitUsd.toLocaleString()}` : `-$${Math.abs(result.metrics.netProfitUsd).toLocaleString()}`} ({result.metrics.netReturnPct}%)
            </span>
          </div>

          {/* Max Drawdown */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
              Max Drawdown
            </span>
            <div className="text-xl sm:text-2xl font-bold text-rose-400">
              -{result.metrics.maxDrawdownPct}%
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Max Trough: -{result.metrics.maxDrawdownR} R
            </span>
          </div>

          {/* Sharpe / Calmar Ratio */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
              Sharpe / Calmar
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-300 flex items-baseline gap-1">
              <span>{result.metrics.sharpeRatio}</span>
              <span className="text-xs text-slate-500 font-normal">/ {result.metrics.calmarRatio}</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Max Streak: {result.metrics.maxConsecutiveWins}W / {result.metrics.maxConsecutiveLosses}L
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Statistical Expectancy & Equity Curves */}
      <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span>STATISTICAL EXPECTANCY CURVE</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Sample size: <strong className="text-white">{result?.trades?.length || 0} trades</strong> over {params.period}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center">
              <button
                type="button"
                onClick={() => setCurveMode("R")}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  curveMode === "R"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Cumulative R
              </button>
              <button
                type="button"
                onClick={() => setCurveMode("USD")}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  curveMode === "USD"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Portfolio Equity ($)
              </button>
            </div>
          </div>
        </div>

        {/* SVG Equity Curve */}
        <div className="relative overflow-x-auto no-scrollbar touch-pan-x">
          <div className="min-w-[700px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto select-none"
              style={{ maxHeight: "300px" }}
            >
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + ratio * usableHeight;
                const val = maxVal - ratio * (maxVal - minVal);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {curveMode === "R" ? `${val >= 0 ? "+" : ""}${val.toFixed(1)}R` : `$${Math.round(val).toLocaleString()}`}
                    </text>
                  </g>
                );
              })}

              {/* Zero / Breakeven Baseline */}
              {zeroY >= padding.top && zeroY <= chartHeight - padding.bottom && (
                <line
                  x1={padding.left}
                  y1={zeroY}
                  x2={chartWidth - padding.right}
                  y2={zeroY}
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Shaded Area */}
              {areaD && <path d={areaD} fill="url(#curveGradient)" />}

              {/* Main Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Trade Points */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPoint?.tradeNumber === pt.data.tradeNumber;
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5 : pt.data.isWin ? 2.5 : 2}
                    fill={pt.data.tradeNumber === 0 ? "#94a3b8" : pt.data.isWin ? "#34d399" : "#f87171"}
                    stroke="#0b0f19"
                    strokeWidth={1.5}
                    onMouseEnter={() => setHoveredPoint(pt.data)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer transition-all"
                  />
                );
              })}

              {/* Hover Indicator Crosshair */}
              {hoveredPoint && (
                (() => {
                  const targetPt = points.find((p) => p.data.tradeNumber === hoveredPoint.tradeNumber);
                  if (!targetPt) return null;
                  return (
                    <g>
                      <line
                        x1={targetPt.x}
                        y1={padding.top}
                        x2={targetPt.x}
                        y2={chartHeight - padding.bottom}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={targetPt.x}
                        cy={targetPt.y}
                        r="6"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })()
              )}
            </svg>
          </div>
        </div>

        {/* Hovered Trade Tooltip */}
        {hoveredPoint && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                Trade #{hoveredPoint.tradeNumber}
              </span>
              <span className="text-slate-400">
                {new Date(hoveredPoint.date).toLocaleDateString()} {new Date(hoveredPoint.date).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Trade Result:{" "}
                <strong className={hoveredPoint.tradeReturnR > 0 ? "text-emerald-400" : hoveredPoint.tradeReturnR < 0 ? "text-rose-400" : "text-slate-400"}>
                  {hoveredPoint.tradeReturnR >= 0 ? `+${hoveredPoint.tradeReturnR}` : hoveredPoint.tradeReturnR}R
                </strong>
              </span>
              <span>
                Cumulative R:{" "}
                <strong className="text-white">
                  {hoveredPoint.cumulativeR >= 0 ? `+${hoveredPoint.cumulativeR}` : hoveredPoint.cumulativeR}R
                </strong>
              </span>
              <span>
                Balance: <strong className="text-white">${hoveredPoint.equity.toLocaleString()}</strong>
              </span>
              <span>
                Drawdown: <strong className="text-rose-400">-{hoveredPoint.drawdownPct}%</strong>
              </span>
            </div>
          </div>
        )}

        {/* Underwater Drawdown Chart */}
        <div className="pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <ShieldAlert size={13} className="text-rose-400" />
              <span>Underwater Drawdown Profile (% from peak equity)</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              Max Drawdown: <strong className="text-rose-400">-{result?.metrics.maxDrawdownPct || 0}%</strong>
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar touch-pan-x">
            <div className="min-w-[700px]">
              <svg viewBox={`0 0 ${chartWidth} ${ddHeight}`} className="w-full h-auto select-none">
                <defs>
                  <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Zero line */}
                <line
                  x1={padding.left}
                  y1={10}
                  x2={chartWidth - padding.right}
                  y2={10}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Drawdown Area */}
                {ddAreaD && <path d={ddAreaD} fill="url(#ddGradient)" />}

                {/* Drawdown Path */}
                {ddPathD && (
                  <path
                    d={ddPathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Attribution & Breakdown Grid */}
      {result && result.metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono">
          {/* Session Timing Breakdown */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              <span>Session Killzone Attribution</span>
            </span>
            <div className="space-y-2">
              {result.metrics.sessionAttribution.map((sess) => (
                <div
                  key={sess.session}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{sess.session}</span>
                    <span className="text-[10px] text-slate-400">
                      {sess.trades} trades • PF: {sess.profitFactor}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 block">{sess.winRate}% WR</span>
                    <span className="text-[10px] text-slate-300">
                      {sess.netR >= 0 ? `+${sess.netR}` : sess.netR} R
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confluence Score Attributions */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Target size={14} className="text-indigo-400" />
              <span>Score Tier Expectancy</span>
            </span>
            <div className="space-y-2">
              {result.metrics.scoreAttribution.map((scoreTier) => (
                <div
                  key={scoreTier.bracket}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{scoreTier.bracket}</span>
                    <span className="text-[10px] text-slate-400">{scoreTier.trades} setups triggered</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 block">{scoreTier.winRate}% WR</span>
                    <span className="text-[10px] text-indigo-300">
                      {scoreTier.netR >= 0 ? `+${scoreTier.netR}` : scoreTier.netR} R
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direction & Execution Stats */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-sky-400" />
              <span>Directional Balance</span>
            </span>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-400 block">LONG (Bullish Expansions)</span>
                  <span className="text-[10px] text-slate-400">
                    {result.metrics.directionAttribution.longs.trades} trades
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block">
                    {result.metrics.directionAttribution.longs.winRate}% WR
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    +{result.metrics.directionAttribution.longs.netR} R
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-rose-400 block">SHORT (Liquidity Raids)</span>
                  <span className="text-[10px] text-slate-400">
                    {result.metrics.directionAttribution.shorts.trades} trades
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block">
                    {result.metrics.directionAttribution.shorts.winRate}% WR
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    +{result.metrics.directionAttribution.shorts.netR} R
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Average holding time per trade: <strong className="text-white">{result.metrics.averageBarsHeld * 15} minutes</strong> ({result.metrics.averageBarsHeld} bars).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Trade Log Explorer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={15} className="text-indigo-400" />
              <span>SIMULATED TRADE AUDIT LOG ({filteredTrades.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Click any trade to inspect full 9-factor institutional score breakdown
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search setup / session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              {(["ALL", "WINS", "LOSSES", "LONGS", "SHORTS"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    logFilter === filter
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar touch-pan-x">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-2 font-medium">#</th>
                <th className="py-2 px-2 font-medium">Date & Session</th>
                <th className="py-2 px-2 font-medium">Action</th>
                <th className="py-2 px-2 font-medium">Score</th>
                <th className="py-2 px-2 font-medium">Entry</th>
                <th className="py-2 px-2 font-medium">Stop Loss</th>
                <th className="py-2 px-2 font-medium">Exit / Reason</th>
                <th className="py-2 px-2 font-medium">R Return</th>
                <th className="py-2 px-2 font-medium">PnL ($)</th>
                <th className="py-2 px-2 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.slice(0, 50).map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTrade(t)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-2 text-slate-400 font-bold">#{t.tradeNumber}</td>
                  <td className="py-2.5 px-2">
                    <span className="text-white block">
                      {new Date(t.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-slate-500">{t.session}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === "LONG"
                          ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                          : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-bold">
                      {t.confluenceScore}/100
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-slate-200">${t.entryPrice.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-slate-400">${t.stopLoss.toLocaleString()}</td>
                  <td className="py-2.5 px-2">
                    <span className="text-white block">${t.exitPrice.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">{t.exitReason}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`font-bold ${
                        t.returnR > 0
                          ? "text-emerald-400"
                          : t.returnR < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {t.returnR >= 0 ? `+${t.returnR}` : t.returnR}R
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={
                        t.pnlUsd > 0
                          ? "text-emerald-400 font-semibold"
                          : t.pnlUsd < 0
                          ? "text-rose-400 font-semibold"
                          : "text-slate-400"
                      }
                    >
                      {t.pnlUsd >= 0 ? `+$${t.pnlUsd.toFixed(2)}` : `-$${Math.abs(t.pnlUsd).toFixed(2)}`}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-slate-300 font-bold">
                    ${t.runningBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTrades.length > 50 && (
          <p className="text-center text-xs text-slate-500 pt-2">
            Showing first 50 of {filteredTrades.length} trades. Export CSV to inspect full dataset.
          </p>
        )}
      </div>

      {/* Selected Trade 9-Factor Audit Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 shadow-2xl font-mono space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  Trade #{selectedTrade.tradeNumber}
                </span>
                <h4 className="text-sm font-bold text-white">9-Factor Confluence Audit</h4>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Setup:</span>
                <span className="text-white font-bold">{selectedTrade.setupType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direction & Session:</span>
                <span className="text-indigo-300">
                  {selectedTrade.direction} • {selectedTrade.session}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outcome:</span>
                <span
                  className={`font-bold ${
                    selectedTrade.returnR > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {selectedTrade.returnR >= 0 ? `+${selectedTrade.returnR}` : selectedTrade.returnR}R (
                  {selectedTrade.exitReason})
                </span>
              </div>
            </div>

            {/* Factor Scores */}
            <div className="space-y-2 text-xs">
              <span className="text-slate-400 font-bold block mb-1">Score Breakdown (Total: {selectedTrade.confluenceScore}/100):</span>

              {[
                { label: "1. HTF Structure Alignment", score: selectedTrade.factors.htfStructure, max: 20 },
                { label: "2. Liquidity Sweep Detection", score: selectedTrade.factors.liquiditySweep, max: 20 },
                { label: "3. Market Structure Shift (MSS)", score: selectedTrade.factors.marketStructureShift, max: 15 },
                { label: "4. Displacement & Expansion", score: selectedTrade.factors.displacement, max: 10 },
                { label: "5. FVG Imbalance Retest", score: selectedTrade.factors.fvgRetest, max: 10 },
                { label: "6. Macro & Momentum Regime", score: selectedTrade.factors.macroRegime, max: 10 },
                { label: "7. Session Killzone Timing", score: selectedTrade.factors.sessionKillzone, max: 5 },
                { label: "8. Risk:Reward Geometry", score: selectedTrade.factors.riskReward, max: 5 },
                { label: "9. Invalidation Clarity", score: selectedTrade.factors.invalidationClarity, max: 5 },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-900">
                  <span className="text-slate-300">{f.label}</span>
                  <span className="text-indigo-400 font-bold">
                    {f.score} / {f.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
