import React, { useState, useEffect } from "react";
import {
  Radar,
  Radio,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Pause,
  RotateCw,
  Send,
  Sliders,
  Shield,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { ScannerStatus, DetectedAlert, TradeAnalysis } from "../types";

interface MultiInstrumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInstrument?: (symbol: string) => void;
}

// Audio chime generator using Web Audio API
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // High subtle two-tone chime (587.33Hz D5 -> 880Hz A5)
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // Audio contexts may require user gesture on first call
  }
}

export const MultiInstrumentScannerModal: React.FC<MultiInstrumentScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectInstrument,
}) => {
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanningNow, setIsScanningNow] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Local config form state
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [thresholdScore, setThresholdScore] = useState(80);
  const [cooldownMinutes, setCooldownMinutes] = useState(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    "XAU/USD",
    "BTC/USD",
    "USD/JPY",
    "US30",
  ]);

  // Telegram credentials state
  const [botToken, setBotToken] = useState(() => localStorage.getItem("ai_trading_os_tg_bot_token") || "");
  const [chatId, setChatId] = useState(() => localStorage.getItem("ai_trading_os_tg_chat_id") || "");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [lastAlertCount, setLastAlertCount] = useState(0);

  // Fetch status from server
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/scanner/status");
      if (res.ok) {
        const data: ScannerStatus = await res.json();
        setScannerStatus(data);
        if (data.config) {
          setScannerEnabled(data.config.enabled);
          setTelegramEnabled(data.config.telegramEnabled);
          setThresholdScore(data.config.thresholdScore);
          setCooldownMinutes(data.config.cooldownMinutes || 15);
          setSoundEnabled(data.config.soundEnabled !== false);
          if (Array.isArray(data.config.instruments) && data.config.instruments.length > 0) {
            setSelectedInstruments(data.config.instruments);
          }
        }

        // Play chime if new alert was detected
        if (data.recentAlerts && data.recentAlerts.length > lastAlertCount && lastAlertCount > 0) {
          if (soundEnabled) playAlertChime();
        }
        if (data.recentAlerts) {
          setLastAlertCount(data.recentAlerts.length);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch scanner status:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000); // 8s poll when modal is open
    return () => clearInterval(interval);
  }, [isOpen]);

  // Save scanner configuration to server and localStorage
  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      localStorage.setItem("ai_trading_os_tg_bot_token", botToken.trim());
      localStorage.setItem("ai_trading_os_tg_chat_id", chatId.trim());

      const res = await fetch("/api/scanner/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: scannerEnabled,
          thresholdScore,
          instruments: selectedInstruments,
          telegramEnabled,
          botToken: botToken.trim(),
          chatId: chatId.trim(),
          cooldownMinutes,
          soundEnabled,
        }),
      });

      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.warn("Failed to update scanner config:", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Trigger manual immediate scan
  const handleScanNow = async () => {
    try {
      setIsScanningNow(true);
      const res = await fetch("/api/scanner/scan-now", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setScannerStatus(data.status);
        }
        if (data.alertsTriggered > 0 && soundEnabled) {
          playAlertChime();
        }
      }
    } catch (err) {
      console.warn("Failed to execute instant scan:", err);
    } finally {
      setIsScanningNow(false);
    }
  };

  // Test Telegram connection
  const handleTestTelegram = async () => {
    try {
      setIsTestingTelegram(true);
      setTestResult(null);

      const res = await fetch("/api/alerts/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: botToken.trim(),
          chatId: chatId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: "Test message delivered to Telegram successfully!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.tip || "Failed to reach Telegram bot.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error communicating with Telegram API.",
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const toggleInstrument = (sym: string) => {
    if (selectedInstruments.includes(sym)) {
      if (selectedInstruments.length > 1) {
        setSelectedInstruments(selectedInstruments.filter((s) => s !== sym));
      }
    } else {
      setSelectedInstruments([...selectedInstruments, sym]);
    }
  };

  if (!isOpen) return null;

  const evaluations = scannerStatus?.latestEvaluations || {};
  const allAvailableInstruments = ["XAU/USD", "BTC/USD", "USD/JPY", "US30"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Modal Header */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#080c14]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-700/50 text-indigo-400 flex-shrink-0">
              <Radar size={20} className="animate-spin text-indigo-400" style={{ animationDuration: "12s" }} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Multi-Instrument Alert Radar</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    scannerStatus?.isRunning
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                      : "bg-slate-900 border-slate-700 text-slate-400"
                  }`}
                >
                  {scannerStatus?.isRunning ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate sm:whitespace-normal">
                Monitors BTC/USD, US30, USD/JPY, XAU/USD. Auto-dispatches Telegram alerts when score ≥ {thresholdScore}/100.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanNow}
              disabled={isScanningNow}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 text-[11px] sm:text-xs"
            >
              <RotateCw size={13} className={isScanningNow ? "animate-spin" : ""} />
              <span>{isScanningNow ? "Scanning..." : "Scan All Now"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5 no-scrollbar">
          {/* Real-Time Live Status Grid Across Monitored Pairs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-400 animate-pulse" />
                Live Setup Radar Status (All Monitored Pairs)
              </span>
              <span className="text-[10px] text-slate-400">
                Last Scan: {scannerStatus?.lastScanTime ? new Date(scannerStatus.lastScanTime).toLocaleTimeString() : "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {allAvailableInstruments.map((sym) => {
                const evalData = evaluations[sym];
                const score = evalData?.score ?? "--";
                const isTrade = evalData?.decision === "TRADE";
                const direction = evalData?.direction || "NEUTRAL";
                const isBullish = direction === "BULLISH";
                const isMonitored = selectedInstruments.includes(sym);

                return (
                  <div
                    key={sym}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      !isMonitored
                        ? "opacity-50 bg-slate-950/40 border-slate-900"
                        : isTrade && Number(score) >= thresholdScore
                        ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20"
                        : "bg-slate-950/70 border-slate-800/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-xs">{sym}</span>
                        <div className="flex items-center gap-1">
                          {evalData?.isMarketOpen === false && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-950/80 border-rose-700 text-rose-300">
                              CLOSED
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isTrade
                                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                                : "bg-slate-900 border-slate-700 text-slate-400"
                            }`}
                          >
                            {evalData?.decision || "WAIT"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-2xl font-bold text-white">{score}</span>
                        <span className="text-xs text-slate-500">/ 100</span>
                        <span
                          className={`text-[10px] font-bold ml-auto flex items-center gap-0.5 ${
                            isBullish ? "text-emerald-400" : direction === "BEARISH" ? "text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {isBullish ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {direction}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Price:</span>
                        <span className="text-slate-200 font-bold">{evalData?.currentPrice || "--"}</span>
                      </div>

                      {evalData?.rsi && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                          <span>RSI (14):</span>
                          <span
                            className={`font-bold ${
                              evalData.rsi.value >= 70
                                ? "text-amber-400"
                                : evalData.rsi.value <= 30
                                ? "text-cyan-400"
                                : "text-slate-300"
                            }`}
                          >
                            {evalData.rsi.value} ({evalData.rsi.condition?.split(" ")[0] || "Neutral"})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-slate-500">
                        {evalData?.recentSweep && evalData.recentSweep !== "NONE"
                          ? `⚡ ${evalData.recentSweep}`
                          : "Scanning sweeps"}
                      </span>

                      {onSelectInstrument && (
                        <button
                          onClick={() => {
                            onSelectInstrument(sym);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <span>Inspect</span>
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scanner Configuration & Telegram Setup */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders size={14} className="text-indigo-400" />
                <span>Multi-Instrument Automated Alert Settings</span>
              </span>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                {isSavingConfig ? "Saving..." : "Apply & Save"}
              </button>
            </div>

            {/* Monitored Instruments Selection Checkboxes */}
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1.5">
                Active Monitored Instruments:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allAvailableInstruments.map((sym) => {
                  const active = selectedInstruments.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleInstrument(sym)}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-between transition-all ${
                        active
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-300"
                          : "bg-slate-900/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <span>{sym}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          active ? "bg-indigo-400" : "bg-slate-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threshold & Notification Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Threshold Score */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <label className="text-[11px] text-slate-400 block mb-1">
                  Trigger Threshold Score:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={thresholdScore}
                    onChange={(e) => setThresholdScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs font-bold"
                  >
                    <option value={70}>≥ 70 / 100 (Moderate Confluence)</option>
                    <option value={75}>≥ 75 / 100 (High Confluence)</option>
                    <option value={80}>≥ 80 / 100 (Institutional Qualified - Recommended)</option>
                    <option value={85}>≥ 85 / 100 (Strict High-Prob Sniper)</option>
                    <option value={90}>≥ 90 / 100 (A+ Ultra Pristine Only)</option>
                  </select>
                </div>
              </div>

              {/* Cooldown Period */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <label className="text-[11px] text-slate-400 block mb-1">
                  Anti-Spam Cooldown (per instrument):
                </label>
                <select
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs font-bold"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes (Recommended)</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              {/* In-App Sound Toggle */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <label className="text-[11px] text-slate-400 block mb-1">
                  In-App Audio Chime:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    if (!soundEnabled) playAlertChime();
                  }}
                  className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    soundEnabled
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>{soundEnabled ? "Audio Alerts Enabled" : "Muted"}</span>
                </button>
              </div>
            </div>

            {/* Telegram Destination Settings */}
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Send size={13} />
                  <span>Telegram Bot Alert Dispatch</span>
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={telegramEnabled}
                      onChange={(e) => setTelegramEnabled(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                    />
                    <span>Auto-Dispatch Enabled</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Telegram Bot Token (@BotFather):
                  </label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Telegram Chat ID (@userinfobot):
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 123456789 or @channelname"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">
                  Sends automated institutional setup cards for any monitored instrument to your Telegram.
                </span>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !botToken.trim() || !chatId.trim()}
                  className="px-2.5 py-1 rounded bg-sky-950 border border-sky-800 hover:bg-sky-900 text-sky-300 text-[11px] font-bold disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Send size={11} className={isTestingTelegram ? "animate-pulse" : ""} />
                  <span>{isTestingTelegram ? "Testing..." : "Test Telegram Dispatch"}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2 rounded border text-[11px] flex items-center gap-2 ${
                    testResult.success
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/50 text-rose-300"
                  }`}
                >
                  {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Triggered Alerts History Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                <span>Recent Radar Alerts Log ({scannerStatus?.recentAlerts?.length || 0})</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Auto-saved setup detections across all pairs
              </span>
            </div>

            {(!scannerStatus?.recentAlerts || scannerStatus.recentAlerts.length === 0) ? (
              <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-900 text-center text-slate-500">
                <Radar size={24} className="mx-auto mb-2 text-slate-600 animate-pulse" />
                <p>No alerts triggered yet.</p>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  The scanner is actively evaluating all instruments. When a setup scores ≥ {thresholdScore}/100, it will log here and dispatch to Telegram.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {scannerStatus.recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          alert.direction === "BULLISH"
                            ? "bg-emerald-950 border border-emerald-700 text-emerald-400"
                            : "bg-rose-950 border border-rose-700 text-rose-400"
                        }`}
                      >
                        {alert.instrument}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white block">
                            Score: {alert.score}/100 • {alert.direction} ({alert.decision})
                          </span>
                          {alert.rsi && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-300 font-bold">
                              RSI {alert.rsi.value}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{alert.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <div>
                        <span className="text-white font-bold block">{alert.currentPrice}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {alert.telegramSent ? (
                        <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 size={12} />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          {alert.telegramError ? "No TG" : "Logged"}
                        </span>
                      )}

                      {onSelectInstrument && (
                        <button
                          onClick={() => {
                            onSelectInstrument(alert.instrument);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 text-[10px] font-bold"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#080c14] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Scanning every 35 seconds across BTC/USD, US30, USD/JPY, and XAU/USD</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
