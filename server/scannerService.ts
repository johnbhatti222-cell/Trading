import { GoogleGenAI } from "@google/genai";
import {
  ScannerConfig,
  ScannerStatus,
  DetectedAlert,
  TradeAnalysis,
} from "../src/types";
import {
  evaluateLiveMarketSetup,
  getCachedTickerPrice,
  isMarketOpen,
  fetchLiveCandles,
  calculateRSI,
} from "./liveDataService";

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
// Constraint: Keep emoji ONLY for Confluence Score and Institutional Thesis; remove for all others
function formatScannerAlertMessage(alert: DetectedAlert): string {
  const isLong = alert.direction === "BULLISH";
  const actionBadge = isLong ? "🟢 <b>BUY LIMIT</b>" : "🔴 <b>SELL LIMIT</b>";

  const rawRsi = alert.rsi?.value !== undefined ? alert.rsi.value : 53.84;
  const rsiVal = typeof rawRsi === "number" ? rawRsi.toFixed(2) : rawRsi;
  const rsiCondition = alert.rsi?.condition ? ` — <i>${alert.rsi.condition}</i>` : "";
  const rsiLine = `\n• RSI(14): <b>${rsiVal}</b>${rsiCondition}`;

  return (
    `<b>INSTITUTIONAL RADAR ALERT: ${alert.instrument}</b>\n` +
    `Action: ${actionBadge}\n` +
    `🎯 <b>Confluence Score:</b> <b>${alert.score}/100</b> (${alert.decision})\n\n` +
    `Current Price: <code>${alert.currentPrice}</code>\n` +
    `Execution Level: <code>${alert.entry}</code>\n` +
    `Invalidation / Stop Loss: <code>${alert.stopLoss}</code>\n` +
    `Target (TP1): <code>${alert.tp1}</code>\n` +
    (alert.tp2 ? `Target (TP2): <code>${alert.tp2}</code>\n` : "") +
    `Risk:Reward: <code>${alert.riskReward}</code>\n\n` +
    `⚡ <b>Institutional Thesis:</b>\n` +
    `<i>${alert.reason}</i>` +
    `${rsiLine}\n\n` +
    `Session: ${alert.session} • <i>${new Date().toUTCString()}</i>\n` +
    `<i>Auto-Dispatched by Multi-Instrument Scanner (Threshold ≥ ${scannerConfig.thresholdScore})</i>`
  );
}

// Run scan on a single instrument
async function scanInstrument(
  symbol: string,
  ai: GoogleGenAI | null
): Promise<DetectedAlert | null> {
  try {
    const marketStatus = isMarketOpen(symbol);

    // If market is closed for this instrument, do not evaluate or dispatch alerts
    if (!marketStatus.isOpen) {
      latestEvaluations[symbol] = {
        instrument: symbol,
        score: 0,
        decision: "MARKET CLOSED",
        direction: "NEUTRAL",
        currentPrice: `$${getCachedTickerPrice(symbol) || "Closed"}`,
        lastUpdated: new Date().toISOString(),
        recentSweep: "Market Closed",
        isMarketOpen: false,
        marketStatusText: marketStatus.reason,
      };
      console.log(`[Scanner] ${symbol} market is closed (${marketStatus.reason}) — skipping alert.`);
      return null;
    }

    const [analysis, candleData] = await Promise.all([
      evaluateLiveMarketSetup(symbol, "15M", ai),
      fetchLiveCandles(symbol, "15m", 30).catch(() => null),
    ]);

    const score = analysis.score?.totalScore ?? 0;
    const direction = analysis.bias?.direction || "NEUTRAL";
    const decision = analysis.decision || "WAIT";
    const currentPrice = analysis.market?.currentPrice || `$${getCachedTickerPrice(symbol)}`;
    const nowMs = Date.now();

    // Determine 14-period RSI
    const rsi =
      candleData?.rsi ||
      (candleData?.candles
        ? calculateRSI(candleData.candles.map((c) => c.close), 14)
        : { rsi: 50.0, condition: "Neutral Equilibrium (50.0)" });

    // Store latest evaluation state for HUD
    latestEvaluations[symbol] = {
      instrument: symbol,
      score,
      decision,
      direction,
      currentPrice,
      lastUpdated: new Date().toISOString(),
      recentSweep: analysis.liquidity?.liquidityAlreadySwept || "NONE",
      rsi: {
        value: rsi.rsi ?? (rsi as any).value ?? 50.0,
        condition: rsi.condition,
      },
      isMarketOpen: true,
      marketStatusText: "Market Open",
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
      rsi: {
        value: rsi.rsi ?? (rsi as any).value ?? 50.0,
        condition: rsi.condition,
      },
      isMarketOpen: true,
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
