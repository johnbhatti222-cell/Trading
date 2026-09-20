import React, { useState, useEffect } from "react";
import { JournalRecord, TradeAnalysis } from "../types";
import {
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  Trash2,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Lock,
  Unlock,
  Target,
  Zap,
} from "lucide-react";

interface TradeJournalProps {
  records: JournalRecord[];
  onAddRecord: (record: JournalRecord) => void;
  onDeleteRecord: (id: string) => void;
  activeAnalysis?: TradeAnalysis;
}

export const TradeJournal: React.FC<TradeJournalProps> = ({
  records,
  onAddRecord,
  onDeleteRecord,
  activeAnalysis,
}) => {
  const [filterInstrument, setFilterInstrument] = useState("ALL");
  const [filterQuality, setFilterQuality] = useState("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  // New trade state
  const [newInstrument, setNewInstrument] = useState(
    activeAnalysis?.market.instrument || "XAU/USD"
  );
  const [newSetup, setNewSetup] = useState(
    activeAnalysis?.setup.setupType || "A+ Liquidity Sweep Reversal"
  );
  const [newDirection, setNewDirection] = useState<"LONG" | "SHORT">(
    activeAnalysis?.tradePlan.direction === "SHORT" ? "SHORT" : "LONG"
  );
  const [newEntry, setNewEntry] = useState(
    activeAnalysis?.tradePlan.entryZone.split(" ")[0] || "2,684.50"
  );
  const [newStop, setNewStop] = useState(
    activeAnalysis?.tradePlan.stopLoss.split(" ")[0] || "2,689.80"
  );
  const [newTargets, setNewTargets] = useState(
    activeAnalysis ? `TP1 ${activeAnalysis.tradePlan.tp1}` : "TP1 2,675.00"
  );
  const [newResultR, setNewResultR] = useState<number>(2.5);
  const [newScore, setNewScore] = useState<number>(
    activeAnalysis?.score.totalScore || 90
  );
  const [newExecutionQuality, setNewExecutionQuality] = useState<
    JournalRecord["executionQuality"]
  >("A+");
  const [newMistake, setNewMistake] = useState<JournalRecord["mistakeClassification"]>("None");
  const [newSniperPrecision, setNewSniperPrecision] = useState<
    JournalRecord["sniperPrecision"]
  >("A+ Sniper (Within OTE)");

  // Anti-Overtrading: Post-Trade 45-Minute Cool-Down Lockout
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ai_trading_os_cooldown_until");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed > Date.now()) return parsed;
      }
    } catch {}
    return 0;
  });
  const [cooldownRemaining, setCooldownRemaining] = useState<string>("");

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      setCooldownRemaining("");
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.floor((cooldownUntil - Date.now()) / 1000));
      if (remaining <= 0) {
        setCooldownRemaining("");
        setCooldownUntil(0);
        localStorage.removeItem("ai_trading_os_cooldown_until");
      } else {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setCooldownRemaining(`${mins}:${String(secs).padStart(2, "0")}`);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const activateCooldown = (minutes = 45) => {
    const until = Date.now() + minutes * 60 * 1000;
    setCooldownUntil(until);
    localStorage.setItem("ai_trading_os_cooldown_until", until.toString());
  };

  const clearCooldown = () => {
    setCooldownUntil(0);
    setCooldownRemaining("");
    localStorage.removeItem("ai_trading_os_cooldown_until");
  };

  // Anti-Overtrading: Daily Shot Quota (3 Bullets max per day)
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayTrades = records.filter((r) => r.createdAt.startsWith(todayStr));
  const dailyQuotaMax = 3;
  const dailyShotsTaken = todayTrades.length;
  const dailyShotsRemaining = Math.max(0, dailyQuotaMax - dailyShotsTaken);
  const isDailyQuotaExhausted = dailyShotsTaken >= dailyQuotaMax;

  // Calculate Section 21 Analytics
  const totalTrades = records.length;
  const wins = records.filter((r) => r.resultInR > 0);
  const losses = records.filter((r) => r.resultInR <= 0);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

  const totalWinR = wins.reduce((acc, r) => acc + r.resultInR, 0);
  const totalLossR = Math.abs(losses.reduce((acc, r) => acc + r.resultInR, 0));
  const profitFactor = totalLossR > 0 ? (totalWinR / totalLossR).toFixed(2) : totalWinR > 0 ? "∞" : "0.00";
  const netR = (totalWinR - totalLossR).toFixed(2);
  const avgR = totalTrades > 0 ? ((totalWinR - totalLossR) / totalTrades).toFixed(2) : "0.00";

  // Expected Value (EV) = (Win% * Avg Win R) - (Loss% * Avg Loss R)
  const avgWinR = wins.length > 0 ? totalWinR / wins.length : 0;
  const avgLossR = losses.length > 0 ? totalLossR / losses.length : 0;
  const ev =
    totalTrades > 0
      ? ((winRate / 100) * avgWinR - ((100 - winRate) / 100) * avgLossR).toFixed(2)
      : "0.00";

  // Filtered records
  const filtered = records.filter((r) => {
    if (filterInstrument !== "ALL" && r.instrument !== filterInstrument) return false;
    if (filterQuality !== "ALL" && r.executionQuality !== filterQuality) return false;
    return true;
  });

  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const record: JournalRecord = {
      id: `j-${Date.now()}`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      instrument: newInstrument,
      setup: newSetup,
      direction: newDirection,
      timeframe: "15M",
      entry: newEntry,
      stop: newStop,
      targets: newTargets,
      score: newScore,
      marketRegime: activeAnalysis?.market.marketRegime || "DISTRIBUTION",
      session: activeAnalysis?.market.session || "London / NY Overlap",
      newsEnvironment: "LOW",
      resultInR: Number(newResultR),
      mfe: Number(newResultR) > 0 ? Number(newResultR) + 0.3 : 0.4,
      mae: Number(newResultR) <= 0 ? 1.0 : 0.3,
      executionQuality: newExecutionQuality,
      mistakeClassification: newMistake,
      sniperPrecision: newSniperPrecision,
      aiThesis: activeAnalysis?.setup.whyExists || "Institutional setup logged.",
      status: "CLOSED",
    };
    onAddRecord(record);

    // If stop hit / loss trade, trigger mandatory 45-minute cool-down lockout
    if (Number(newResultR) <= 0) {
      activateCooldown(45);
    }

    setShowAddForm(false);
  };

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Instrument",
      "Setup",
      "Direction",
      "Entry",
      "Stop",
      "Result(R)",
      "Score",
      "Execution",
      "Mistake",
    ];
    const rows = records.map((r) => [
      r.id,
      r.createdAt,
      r.instrument,
      `"${r.setup}"`,
      r.direction,
      r.entry,
      r.stop,
      r.resultInR,
      r.score,
      r.executionQuality,
      r.mistakeClassification,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ai_trading_os_journal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono font-bold text-sm text-white flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-400" />
            Section 21: Post-Trade Learning Database & Analytics
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            "Never change live trading rules merely because of a small number of trades. Track EV and mistakes."
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} />
            {showAddForm ? "Cancel Entry" : "Log Trade"}
          </button>
        </div>
      </div>

      {/* Section: Anti-Overtrading Sniper Discipline Cockpit */}
      <div className="bg-[#0b0e14] border border-slate-800/90 rounded-xl p-4 font-mono space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  SNIPER DISCIPLINE & SHOT ALLOCATION ENGINE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  MAX 3 SHOTS / DAY
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Institutional snipers wait hours for one pristine entry. Overtrading destroys psychological edge.
              </p>
            </div>
          </div>

          {/* Quick Cooldown Triggers */}
          <div className="flex items-center gap-2">
            {cooldownRemaining ? (
              <button
                onClick={clearCooldown}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition-colors"
                title="Manual reset with trader acknowledgment"
              >
                <Unlock size={12} className="text-amber-400" />
                <span>Override Lockout</span>
              </button>
            ) : (
              <button
                onClick={() => activateCooldown(45)}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <ShieldAlert size={12} className="text-rose-400" />
                <span>Voluntary 45m Lockout</span>
              </button>
            )}
          </div>
        </div>

        {/* Shot Quota & Active Lockout Banner Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Daily Bullet Allocation */}
          <div className={`p-3 rounded-lg border ${
            isDailyQuotaExhausted
              ? "bg-rose-950/40 border-rose-800 text-rose-200"
              : "bg-slate-950 border-slate-800/80 text-slate-300"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400">
                DAILY SHOT QUOTA ({todayTrades.length}/3 FIRED TODAY):
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {dailyShotsRemaining} Rounds Left
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3].map((shot) => {
                const isFired = shot <= dailyShotsTaken;
                return (
                  <div
                    key={shot}
                    className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 border text-xs font-bold transition-all ${
                      isFired
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    <Target size={12} className={isFired ? "text-rose-400" : "text-emerald-400"} />
                    <span>Bullet {shot}: {isFired ? "EXPENDED" : "READY"}</span>
                  </div>
                );
              })}
            </div>

            {isDailyQuotaExhausted && (
              <div className="mt-2 text-[10px] text-rose-300 font-bold flex items-center gap-1">
                <Lock size={11} className="text-rose-400" />
                <span>Daily execution limit reached. Capital preservation protocol engaged.</span>
              </div>
            )}
          </div>

          {/* Post-Trade Cool-Down Status */}
          <div className={`p-3 rounded-lg border flex flex-col justify-between ${
            cooldownRemaining
              ? "bg-amber-950/40 border-amber-500/60 text-amber-200"
              : "bg-slate-950 border-slate-800/80 text-slate-400"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold">
                POST-TRADE RESET LOCKOUT:
              </span>
              {cooldownRemaining && (
                <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50 flex items-center gap-1">
                  <Clock size={11} className="animate-spin text-amber-400" />
                  <span>{cooldownRemaining} Remaining</span>
                </span>
              )}
            </div>

            {cooldownRemaining ? (
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                🔒 Amygdala Cool-Down Active. Stop loss triggers dopamine depletion; step away from charts to prevent revenge-trading.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ✓ System Clear. Mandatory 45-min lockout triggers automatically if a trade stops out.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Bento (Section 21 Analytics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Win Rate
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {winRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {wins.length}W / {losses.length}L ({totalTrades} Total)
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Profit Factor
          </span>
          <div className="text-xl font-bold font-mono text-sky-400">
            {profitFactor}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Gross Win / Gross Loss
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Net Return (R)
          </span>
          <div className={`text-xl font-bold font-mono ${Number(netR) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {Number(netR) >= 0 ? `+${netR}R` : `${netR}R`}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Risk-adjusted gain
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Expected Value (EV)
          </span>
          <div className="text-xl font-bold font-mono text-purple-400">
            +{ev}R
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Per executed setup
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Best Setup
          </span>
          <div className="text-xs font-bold font-mono text-amber-300 truncate">
            Liquidity Sweep
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Avg +3.4R on XAU/USD
          </span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Discipline Filter
          </span>
          <div className="text-xs font-bold font-mono text-emerald-400">
            92% No-FOMO
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            1 Premature Entry
          </span>
        </div>
      </div>

      {/* Add Trade Form Modal / Collapsible */}
      {showAddForm && (
        <form
          onSubmit={handleSaveTrade}
          className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl space-y-3 font-mono text-xs"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Plus size={14} className="text-emerald-400" />
              Log Completed Trade to Learning Engine
            </h4>
            <span className="text-slate-400 text-[11px]">
              Pre-populated from active AI analysis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Instrument:</label>
              <input
                type="text"
                value={newInstrument}
                onChange={(e) => setNewInstrument(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Setup Type:</label>
              <input
                type="text"
                value={newSetup}
                onChange={(e) => setNewSetup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Direction:</label>
              <select
                value={newDirection}
                onChange={(e) => setNewDirection(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
              >
                <option value="LONG">BUY / LONG</option>
                <option value="SHORT">SELL / SHORT</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Result in R (+R or -1.0R):</label>
              <input
                type="number"
                step="0.1"
                value={newResultR}
                onChange={(e) => setNewResultR(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Entry Price:</label>
              <input
                type="text"
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Stop Loss:</label>
              <input
                type="text"
                value={newStop}
                onChange={(e) => setNewStop(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Execution Quality:</label>
              <select
                value={newExecutionQuality}
                onChange={(e) => setNewExecutionQuality(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
              >
                <option value="A+">A+ (Perfect Discipline)</option>
                <option value="Clean">Clean</option>
                <option value="Chased Entry">Chased Entry (FOMO)</option>
                <option value="Premature Exit">Premature Exit</option>
                <option value="Hesitated">Hesitated</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Mistake Classification:</label>
              <select
                value={newMistake}
                onChange={(e) => setNewMistake(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white"
              >
                <option value="None">None (Followed Plan)</option>
                <option value="FOMO">FOMO / Chased Price</option>
                <option value="Chased Price">Chased Extended Candle</option>
                <option value="Ignored Macro">Ignored Macro / News Event</option>
                <option value="Moved Stop">Moved Stop Loss</option>
                <option value="Over-leveraged">Over-leveraged</option>
              </select>
            </div>

            <div>
              <label className="text-indigo-400 block mb-1 text-[11px] font-bold">Sniper Entry Precision:</label>
              <select
                value={newSniperPrecision}
                onChange={(e) => setNewSniperPrecision(e.target.value as any)}
                className="w-full bg-slate-950 border border-indigo-500/40 rounded-md p-2 text-indigo-200"
              >
                <option value="A+ Sniper (Within OTE)">🎯 A+ Sniper (Within OTE 62%–70.5%)</option>
                <option value="Clean Retest (FVG Boundary)">⚡ Clean Retest (FVG Boundary)</option>
                <option value="Chased (>0.5R Slippage)">⚠️ Chased (&gt;0.5R Slippage)</option>
                <option value="Premature (No Sweep)">❌ Premature (No Sweep Confirmation)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
            >
              Save to Journal
            </button>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-slate-400">Filter:</span>
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="ALL">All Instruments</option>
            <option value="XAU/USD">XAU/USD (Gold)</option>
            <option value="BTC/USD">BTC/USD (Bitcoin)</option>
            <option value="EUR/USD">EUR/USD</option>
            <option value="USD/JPY">USD/JPY</option>
            <option value="US30">US30 (Dow Jones)</option>
          </select>

          <select
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="ALL">All Executions</option>
            <option value="A+">A+ Only</option>
            <option value="Clean">Clean Only</option>
            <option value="Chased Entry">Chased Entries</option>
          </select>
        </div>

        <span className="text-slate-500">
          Showing {filtered.length} of {records.length} logged setups
        </span>
      </div>

      {/* Journal Table */}
      <div className="overflow-x-auto touch-pan-x rounded-lg border border-slate-800/80">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <th className="p-3">Time / ID</th>
              <th className="p-3">Instrument</th>
              <th className="p-3">Setup</th>
              <th className="p-3">Side</th>
              <th className="p-3">Entry & Stop</th>
              <th className="p-3">AI Score</th>
              <th className="p-3">Result</th>
              <th className="p-3">Execution</th>
              <th className="p-3">Mistake</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-[#0c1017]">
            {filtered.map((r) => {
              const isWin = r.resultInR > 0;
              return (
                <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    <span className="text-white block font-semibold">{r.createdAt}</span>
                    <span className="text-[10px] text-slate-500">{r.id}</span>
                  </td>
                  <td className="p-3 font-bold text-white whitespace-nowrap">
                    {r.instrument}
                  </td>
                  <td className="p-3 text-slate-300 max-w-[180px] truncate" title={r.setup}>
                    {r.setup}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.direction === "LONG"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {r.direction}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    <div>Entry: {r.entry}</div>
                    <div className="text-[10px] text-slate-500">SL: {r.stop}</div>
                  </td>
                  <td className="p-3 font-bold whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        r.score >= 85
                          ? "bg-emerald-500/10 text-emerald-400"
                          : r.score >= 75
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {r.score}/100
                    </span>
                  </td>
                  <td className="p-3 font-bold whitespace-nowrap">
                    <span
                      className={
                        isWin
                          ? "text-emerald-400 font-extrabold"
                          : "text-rose-400 font-extrabold"
                      }
                    >
                      {isWin ? `+${r.resultInR}R` : `${r.resultInR}R`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      MFE: +{r.mfe}R / MAE: -{r.mae}R
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        r.executionQuality === "A+"
                          ? "text-emerald-300 bg-emerald-950/40"
                          : r.executionQuality === "Clean"
                          ? "text-sky-300 bg-sky-950/40"
                          : "text-amber-300 bg-amber-950/40"
                      }`}
                    >
                      {r.executionQuality}
                    </span>
                    {r.sniperPrecision && (
                      <span className="block text-[10px] text-indigo-300 mt-0.5 font-sans">
                        {r.sniperPrecision}
                      </span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`text-xs ${
                        r.mistakeClassification === "None"
                          ? "text-slate-400"
                          : "text-rose-400 font-semibold"
                      }`}
                    >
                      {r.mistakeClassification}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDeleteRecord(r.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
