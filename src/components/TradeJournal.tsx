import React, { useState } from "react";
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
      aiThesis: activeAnalysis?.setup.whyExists || "Institutional setup logged.",
      status: "CLOSED",
    };
    onAddRecord(record);
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
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
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
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
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
