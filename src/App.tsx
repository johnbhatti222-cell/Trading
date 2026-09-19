import React, { useState, useEffect } from "react";
import { TradeAnalysis, JournalRecord } from "./types";
import { DEFAULT_ANALYSIS_GOLD, DEFAULT_JOURNAL_RECORDS } from "./data/mockScenarios";
import { Navbar } from "./components/Navbar";
import { SetupEvaluator } from "./components/SetupEvaluator";
import { ExecutionChecklist } from "./components/ExecutionChecklist";
import { TradeJournal } from "./components/TradeJournal";
import { MacroCorrelationEngine } from "./components/MacroCorrelationEngine";
import { InteractiveReplaySimulator } from "./components/InteractiveReplaySimulator";
import { ConsultationModal } from "./components/ConsultationModal";
import { ScreenshotAnalysisModal } from "./components/ScreenshotAnalysisModal";
import { KillzoneClocksHUD } from "./components/KillzoneClocksHUD";
import { MarketSentimentTicker } from "./components/MarketSentimentTicker";
import { MultiInstrumentScannerModal } from "./components/MultiInstrumentScannerModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<"evaluator" | "journal" | "checklist" | "macro" | "replay">("evaluator");
  const [currentAnalysis, setCurrentAnalysis] = useState<TradeAnalysis>(DEFAULT_ANALYSIS_GOLD);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Persistent Trade Journal
  const [journalRecords, setJournalRecords] = useState<JournalRecord[]>(() => {
    try {
      const saved = localStorage.getItem("ai_trading_os_journal");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_JOURNAL_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("ai_trading_os_journal", JSON.stringify(journalRecords));
    } catch {}
  }, [journalRecords]);

  // Initial live market evaluation on mount
  useEffect(() => {
    fetch("/api/analyze-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "XAU/USD", timeframe: "15M" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.score && data.market) {
          setCurrentAnalysis(data);
        }
      })
      .catch((err) => {
        console.warn("Initial live analysis fallback:", err);
      });
  }, []);

  const handleAddJournalRecord = (newRecord: JournalRecord) => {
    setJournalRecords((prev) => [newRecord, ...prev]);
    setActiveTab("journal");
  };

  const handleDeleteJournalRecord = (id: string) => {
    setJournalRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleScreenshotAnalysisComplete = (analysis: TradeAnalysis) => {
    setCurrentAnalysis(analysis);
    setActiveTab("evaluator");
  };

  const handleSelectInstrumentFromRadar = async (symbol: string) => {
    try {
      const res = await fetch("/api/analyze-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe: "15M" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.score && data.market) {
          setCurrentAnalysis(data);
        }
      }
    } catch (err) {
      console.warn("Failed to inspect instrument from radar:", err);
    }
    setActiveTab("evaluator");
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation & Live Tickers */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScreenshotModal={() => setIsScreenshotModalOpen(true)}
        onOpenScannerModal={() => setIsScannerModalOpen(true)}
      />

      {/* Real-Time Market Sentiment & Sector Correlation Ribbon */}
      <MarketSentimentTicker
        onNavigateToMacro={() => setActiveTab("macro")}
        onOpenScanner={() => setIsScannerModalOpen(true)}
      />

      {/* Institutional Timing Clocks & Silver Bullet HUD */}
      <KillzoneClocksHUD />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "evaluator" && (
          <SetupEvaluator
            currentAnalysis={currentAnalysis}
            onAnalysisChange={setCurrentAnalysis}
            onOpenConsult={() => setIsConsultOpen(true)}
            onNavigateToChecklist={() => setActiveTab("checklist")}
            onNavigateToReplay={() => setActiveTab("replay")}
          />
        )}

        {activeTab === "checklist" && (
          <div className="space-y-6">
            <ExecutionChecklist
              analysis={currentAnalysis}
              onLogTrade={() => setActiveTab("journal")}
            />
          </div>
        )}

        {activeTab === "journal" && (
          <TradeJournal
            records={journalRecords}
            onAddRecord={handleAddJournalRecord}
            onDeleteRecord={handleDeleteJournalRecord}
            activeAnalysis={currentAnalysis}
          />
        )}

        {activeTab === "macro" && (
          <MacroCorrelationEngine />
        )}

        {activeTab === "replay" && (
          <div className="space-y-6">
            <InteractiveReplaySimulator
              analysis={currentAnalysis}
              onLogTradeToJournal={handleAddJournalRecord}
            />
          </div>
        )}
      </main>

      {/* Footer with Institutional Risk Disclaimer */}
      <footer className="border-t border-slate-900 bg-[#06090e] py-4 px-6 text-center text-xs font-mono text-slate-500">
        <p>
          AI Trading OS — Master Trading Analyst Core Philosophy:{" "}
          <strong className="text-slate-400">
            Higher-Timeframe Structure → Liquidity → Market Regime → Displacement → Lower-Timeframe Structure → Entry → Risk
          </strong>
          . The best trade is sometimes: <span className="text-rose-400 font-bold">NO TRADE</span>.
        </p>
      </footer>

      {/* Consultation Modal (Challenge the Analyst) */}
      <ConsultationModal
        analysis={currentAnalysis}
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
      />

      {/* Screenshot Analysis Mode Modal (Section 19) */}
      <ScreenshotAnalysisModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        onAnalysisComplete={handleScreenshotAnalysisComplete}
      />

      {/* Multi-Instrument Automated Alert Radar Modal */}
      <MultiInstrumentScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSelectInstrument={handleSelectInstrumentFromRadar}
      />
    </div>
  );
}
