import React, { useState, useEffect } from "react";
import { DEFAULT_TICKERS } from "../data/mockScenarios";
import { MarketTicker } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Camera,
  BookOpen,
  CheckSquare,
  Globe,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  RotateCw,
  RotateCcw,
  Radar,
} from "lucide-react";

interface NavbarProps {
  activeTab: "evaluator" | "journal" | "checklist" | "macro" | "replay";
  setActiveTab: (tab: "evaluator" | "journal" | "checklist" | "macro" | "replay") => void;
  onOpenScreenshotModal: () => void;
  onOpenScannerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScreenshotModal,
  onOpenScannerModal,
}) => {
  const [timeUtc, setTimeUtc] = useState("");
  const [tickers, setTickers] = useState<MarketTicker[]>(DEFAULT_TICKERS);
  const [isLive, setIsLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTickers = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/live-tickers");
      if (res.ok) {
        const data: MarketTicker[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTickers(data);
          setIsLive(true);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.warn("Live tickers fetch failed, keeping current data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickers();
    const tickerInterval = setInterval(fetchTickers, 6000);
    return () => clearInterval(tickerInterval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#090d14] sticky top-0 z-40">
      {/* Top Bar with Live Institutional Tickers */}
      <div className="px-4 py-1.5 bg-[#06090e] border-b border-slate-800/80 flex items-center justify-between gap-4 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold uppercase tracking-wider flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isLive ? "LIVE DATA FEED:" : "MARKET FEED:"}</span>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {tickers.map((t) => {
              const isPositive = t.change24h.startsWith("+");
              return (
                <div
                  key={t.symbol}
                  title={`24h Range: ${t.low24h} - ${t.high24h}`}
                  className="flex items-center gap-1.5 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800/60"
                >
                  <span className="text-slate-400 font-medium">{t.symbol}</span>
                  <span className="text-white font-bold">{t.price}</span>
                  <span
                    className={`text-[10px] font-semibold flex items-center ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPositive ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                    {t.change24h}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 flex-shrink-0 text-[10px]">
          <button
            onClick={fetchTickers}
            disabled={isRefreshing}
            title="Force refresh live market rates"
            className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors"
          >
            <RotateCw size={11} className={isRefreshing ? "animate-spin text-sky-400" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="text-slate-700">•</span>
          <span className="text-slate-300 font-semibold">{timeUtc || "Loading UTC..."}</span>
        </div>
      </div>

      {/* Main Header with Branding and Nav Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-mono tracking-tight text-white">
                AI TRADING OS
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                MASTER ANALYST
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Institutional Multi-Market Structure • Liquidity • 100-Pt AI Score
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("evaluator")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "evaluator"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Setup Evaluator</span>
          </button>

          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "checklist"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <CheckSquare size={13} />
            <span>Sec 20 Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "journal"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BookOpen size={13} />
            <span>Sec 21 Journal</span>
          </button>

          <button
            onClick={() => setActiveTab("macro")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "macro"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Globe size={13} />
            <span>Macro Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("replay")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "replay"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <RotateCcw size={13} />
            <span>Tape Replay</span>
          </button>
        </div>

        {/* Action Triggers: Radar Scanner & Screenshot Mode */}
        <div className="flex items-center gap-2">
          {onOpenScannerModal && (
            <button
              onClick={onOpenScannerModal}
              title="Automated Multi-Instrument Radar (BTC/USD, US30, USD/JPY, XAU/USD)"
              className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-sm group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radar size={14} className="text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Radar Alerts (All Pairs)</span>
            </button>
          )}

          <button
            onClick={onOpenScreenshotModal}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Camera size={14} className="text-sky-400" />
            <span>Upload Chart (Sec 19)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
