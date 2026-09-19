import { GoogleGenAI } from "@google/genai";
import {
  ScannerConfig,
  ScannerStatus,
  DetectedAlert,
  TradeAnalysis,
} from "../src/types";
import { evaluateLiveMarketSetup, getCachedTickerPrice } from "./liveDataService";

// Default instruments monitored across asset classes
export const MONITORED_INSTRUMENTS = ["XAU/USD", "BTC/USD", "USD/JPY", "US30"];

// In-memory scanner state
let scannerConfig: ScannerConfig = {
  enabled: true,
  thresholdScore: 80,
  instruments: [...MONITORED_INSTRUMENTS],
  telegramEnabled: true,
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  chatId: process.env.TELEGRAM_CHAT_ID || "",
  cooldownMinutes: 15,
  soundEnabled: true,
};

let isScannerRunning = true;
let lastScanTimestamp: string | null = null;
let nextScanTimestamp: string | null = null;
let recentAlerts: DetectedAlert[] = [];
const latestEvaluations: ScannerStatus["latestEvaluations"] = {};

// Cooldown tracking per instrument: instrument -> last alert timestamp (ms)
const instrumentAlertCooldowns = new Map<string, number>();

// Callback reference for sending Telegram messages
type TelegramSender = (token: string, chat: string, text: string, mode?: string) => Promise<any>;
let telegramSenderFn: TelegramSender | null = null;

export function registerTelegramSender(sender: TelegramSender) {
  telegramSenderFn = sender;
}

// Get current scanner status
export function getScannerStatus(): ScannerStatus {
  return {
    isRunning: isScannerRunning && scannerConfig.enabled,
    config: {
      ...scannerConfig,
      // Mask token slightly for privacy if returned in public JSON
      botToken: scannerConfig.botToken
        ? `${scannerConfig.botToken.slice(0, 4)}...${scannerConfig.botToken.slice(-4)}`
        : "",
    },
    lastScanTime: lastScanTimestamp,
    nextScanTime: nextScanTimestamp,
    activeInstrumentCount: scannerConfig.instruments.length,
    recentAlerts: recentAlerts.slice(0, 20),
    latestEvaluations,
  };
}

// Update scanner config
export function updateScannerConfig(newConfig: Partial<ScannerConfig>): ScannerConfig {
  scannerConfig = {
    ...scannerConfig,
    ...newConfig,
    // Preserve bot token if empty in update but existing in state
    botToken: newConfig.botToken !== undefined && newConfig.botToken !== ""
      ? newConfig.botToken
      : scannerConfig.botToken,
    chatId: newConfig.chatId !== undefined && newConfig.chatId !== ""
      ? newConfig.chatId
      : scannerConfig.chatId,
  };
  return scannerConfig;
}

// Format Telegram Alert for Scanner
function formatScannerAlertMessage(alert: DetectedAlert): string {
  const isLong = alert.direction === "BULLISH";
  const actionBadge = isLong ? "🟢 <b>BUY / LONG SETUP</b>" : "🔴 <b>SELL / SHORT SETUP</b>";

  return (
    `🚨 <b>INSTITUTIONAL RADAR ALERT: ${alert.instrument}</b>\n` +
    `${actionBadge} • Confluence Score: <b>${alert.score}/100</b> (${alert.decision})\n\n` +
    `📈 <b>Current Price:</b> <code>${alert.currentPrice}</code>\n` +
    `🎯 <b>Execution Level:</b> <code>${alert.entry}</code>\n` +
    `🛡️ <b>Invalidation / Stop Loss:</b> <code>${alert.stopLoss}</code>\n` +
    `🏁 <b>Target (TP1):</b> <code>${alert.tp1}</code>\n` +
    (alert.tp2 ? `🏆 <b>Target (TP2):</b> <code>${alert.tp2}</code>\n` : "") +
    `⚖️ <b>Risk:Reward:</b> <code>${alert.riskReward}</code>\n\n` +
    `⚡ <b>Institutional Thesis:</b>\n` +
    `<i>${alert.reason}</i>\n\n` +
    `⏱ <b>Session:</b> ${alert.session} • <i>${new Date().toUTCString()}</i>\n` +
    `🤖 <i>Auto-Dispatched by Multi-Instrument Scanner (Threshold ≥ ${scannerConfig.thresholdScore})</i>`
  );
}

// Run scan on a single instrument
async function scanInstrument(
  symbol: string,
  ai: GoogleGenAI | null
): Promise<DetectedAlert | null> {
  try {
    const analysis: TradeAnalysis = await evaluateLiveMarketSetup(symbol, "15M", ai);
    const score = analysis.score?.totalScore ?? 0;
    const direction = analysis.bias?.direction || "NEUTRAL";
    const decision = analysis.decision || "WAIT";
    const currentPrice = analysis.market?.currentPrice || `$${getCachedTickerPrice(symbol)}`;
    const nowMs = Date.now();

    // Store latest evaluation state for HUD
    latestEvaluations[symbol] = {
      instrument: symbol,
      score,
      decision,
      direction,
      currentPrice,
      lastUpdated: new Date().toISOString(),
      recentSweep: analysis.liquidity?.liquidityAlreadySwept || "NONE",
    };

    // Check qualification threshold
    const qualifies = score >= scannerConfig.thresholdScore && decision === "TRADE";
    if (!qualifies) {
      return null;
    }

    // Check cooldown to avoid spamming the same setup repeatedly
    const lastAlertTime = instrumentAlertCooldowns.get(symbol) || 0;
    const cooldownMs = (scannerConfig.cooldownMinutes || 15) * 60 * 1000;
    if (nowMs - lastAlertTime < cooldownMs) {
      console.log(`[Scanner] ${symbol} qualifies (${score}/100) but is in cooldown for ${Math.round((cooldownMs - (nowMs - lastAlertTime)) / 1000)}s`);
      return null;
    }

    // Create detected alert record
    const detectedAlert: DetectedAlert = {
      id: `radar-${Date.now()}-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`,
      timestamp: new Date().toISOString(),
      instrument: symbol,
      score,
      direction,
      decision,
      currentPrice,
      entry: analysis.tradePlan?.entryZone || "Current Market Execution",
      stopLoss: analysis.tradePlan?.stopLoss || "Beyond Sweep Wick",
      tp1: analysis.tradePlan?.tp1 || "Internal Liquidity (1:2R)",
      tp2: analysis.tradePlan?.tp2,
      riskReward: analysis.tradePlan?.riskReward || "1:2.5",
      reason: analysis.decisionReason || "Confirmed Liquidity Sweep with Structural Displacement.",
      session: analysis.market?.session || "Active Killzone",
      telegramSent: false,
      analysis,
    };

    // Dispatch Telegram alert if enabled and configured
    const token = scannerConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chat = scannerConfig.chatId || process.env.TELEGRAM_CHAT_ID;

    if (scannerConfig.telegramEnabled && token && chat && telegramSenderFn) {
      try {
        const text = formatScannerAlertMessage(detectedAlert);
        await telegramSenderFn(token, chat, text, "HTML");
        detectedAlert.telegramSent = true;
        instrumentAlertCooldowns.set(symbol, nowMs);
        console.log(`[Scanner] Telegram alert successfully sent for ${symbol} (Score: ${score}/100)`);
      } catch (tgErr: any) {
        console.error(`[Scanner] Failed to send Telegram alert for ${symbol}:`, tgErr);
        detectedAlert.telegramError = tgErr.message || "Telegram dispatch failed";
      }
    } else if (scannerConfig.telegramEnabled && (!token || !chat)) {
      detectedAlert.telegramError = "Telegram credentials not set (enter Bot Token & Chat ID in settings)";
    }

    // Add to alerts history (keep max 30)
    recentAlerts = [detectedAlert, ...recentAlerts.slice(0, 29)];
    return detectedAlert;
  } catch (err) {
    console.warn(`[Scanner] Error scanning ${symbol}:`, err);
    return null;
  }
}

// Run complete scan cycle across all configured instruments
export async function executeScannerCycle(ai: GoogleGenAI | null): Promise<DetectedAlert[]> {
  if (!scannerConfig.enabled) {
    return [];
  }

  lastScanTimestamp = new Date().toISOString();
  const nextTime = new Date(Date.now() + 35000);
  nextScanTimestamp = nextTime.toISOString();

  const activeInstruments = scannerConfig.instruments.length > 0
    ? scannerConfig.instruments
    : MONITORED_INSTRUMENTS;

  const triggeredAlerts: DetectedAlert[] = [];

  // Scan sequentially with slight pause to be gentle on external rate limits
  for (const symbol of activeInstruments) {
    const alert = await scanInstrument(symbol, ai);
    if (alert) {
      triggeredAlerts.push(alert);
    }
    // 250ms pause between instrument evaluations
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return triggeredAlerts;
}

// Start continuous background scanning loop
let scannerIntervalId: NodeJS.Timeout | null = null;

export function startBackgroundScanner(
  ai: GoogleGenAI | null,
  getAiClient: () => GoogleGenAI | null,
  intervalSeconds: number = 35
) {
  if (scannerIntervalId) {
    clearInterval(scannerIntervalId);
  }

  isScannerRunning = true;
  console.log(`[Scanner] Multi-Instrument Radar Scanner started (Interval: ${intervalSeconds}s, Instruments: ${scannerConfig.instruments.join(", ")})`);

  // Initial trigger after 4 seconds to let server boot cleanly
  setTimeout(() => {
    executeScannerCycle(getAiClient()).catch((err) =>
      console.warn("[Scanner] Initial scan failed:", err)
    );
  }, 4000);

  scannerIntervalId = setInterval(() => {
    if (scannerConfig.enabled) {
      executeScannerCycle(getAiClient()).catch((err) =>
        console.warn("[Scanner] Interval scan failed:", err)
      );
    }
  }, intervalSeconds * 1000);
}

export function stopBackgroundScanner() {
  if (scannerIntervalId) {
    clearInterval(scannerIntervalId);
    scannerIntervalId = null;
  }
  isScannerRunning = false;
  console.log("[Scanner] Multi-Instrument Radar Scanner stopped.");
}
