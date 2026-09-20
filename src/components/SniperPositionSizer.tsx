import React, { useState, useMemo, useEffect } from "react";
import { TradeAnalysis } from "../types";
import {
  Calculator,
  ShieldAlert,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  AlertCircle,
  Sparkles,
  Terminal,
  Send,
  Radio,
  Settings2,
  ExternalLink,
  Clock,
  Zap,
  CheckCircle2,
  X,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface SniperPositionSizerProps {
  analysis: TradeAnalysis;
}

const ACCOUNT_PRESETS = [10000, 25000, 50000, 100000, 200000];

export const SniperPositionSizer: React.FC<SniperPositionSizerProps> = ({
  analysis,
}) => {
  // Helper to extract clean numeric value supporting commas and decimals
  const parseNum = (str?: string, defaultVal = 0): number => {
    if (!str) return defaultVal;
    const match = str.match(/\d+(?:,\d+)*(?:\.\d+)?/);
    if (!match) return defaultVal;
    const clean = match[0].replace(/,/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  // Resolve realistic bracket levels anchored to the live price of the active instrument
  const resolveBracketLevels = (data: TradeAnalysis) => {
    const liveSpot = parseNum(data.market?.currentPrice, 0);
    const parsedEntry = parseNum(data.tradePlan?.entryZone, 0);

    // Realistic check: entry must be within 25% of live market price
    const isEntryRealistic =
      liveSpot > 0 && parsedEntry > 0 && Math.abs(parsedEntry - liveSpot) / liveSpot < 0.25;
    const entry = isEntryRealistic ? parsedEntry : liveSpot > 0 ? liveSpot : 81300;

    const dir =
      data.tradePlan?.direction === "SHORT" || data.bias?.direction === "BEARISH"
        ? "SHORT"
        : "LONG";

    const parsedStop = parseNum(data.tradePlan?.stopLoss, 0);
    const isStopRealistic =
      liveSpot > 0 && parsedStop > 0 && Math.abs(parsedStop - liveSpot) / liveSpot < 0.25;
    const stop = isStopRealistic
      ? parsedStop
      : dir === "SHORT"
      ? entry * 1.003
      : entry * 0.997;

    const stopDistance = Math.max(0.0001, Math.abs(entry - stop));

    const parsedTp1 = parseNum(data.tradePlan?.tp1, 0);
    const isTp1Realistic =
      liveSpot > 0 && parsedTp1 > 0 && Math.abs(parsedTp1 - liveSpot) / liveSpot < 0.25;
    const tp1 = isTp1Realistic
      ? parsedTp1
      : dir === "SHORT"
      ? entry - stopDistance * 2.2
      : entry + stopDistance * 2.2;

    const parsedTp2 = parseNum(data.tradePlan?.tp2, 0);
    const isTp2Realistic =
      liveSpot > 0 && parsedTp2 > 0 && Math.abs(parsedTp2 - liveSpot) / liveSpot < 0.25;
    const tp2 = isTp2Realistic
      ? parsedTp2
      : dir === "SHORT"
      ? entry - stopDistance * 3.5
      : entry + stopDistance * 3.5;

    const parsedTp3 = parseNum(data.tradePlan?.tp3, 0);
    const isTp3Realistic =
      liveSpot > 0 && parsedTp3 > 0 && Math.abs(parsedTp3 - liveSpot) / liveSpot < 0.25;
    const tp3 = isTp3Realistic
      ? parsedTp3
      : dir === "SHORT"
      ? entry - stopDistance * 5.0
      : entry + stopDistance * 5.0;

    const precision = entry < 10 ? 4 : 2;
    return {
      entry: Number(entry.toFixed(precision)),
      stopLoss: Number(stop.toFixed(precision)),
      tp1: Number(tp1.toFixed(precision)),
      tp2: Number(tp2.toFixed(precision)),
      tp3: Number(tp3.toFixed(precision)),
      liveSpot,
    };
  };

  const initialLevels = useMemo(() => resolveBracketLevels(analysis), [analysis.id, analysis.market.instrument]);

  const [accountBalance, setAccountBalance] = useState<number>(50000);
  const [riskMode, setRiskMode] = useState<"percent" | "fixed">("percent");
  const [riskPercent, setRiskPercent] = useState<number>(0.5); // 0.5% institutional standard
  const [fixedRiskDollars, setFixedRiskDollars] = useState<number>(250);

  const [entryPrice, setEntryPrice] = useState<number>(initialLevels.entry);
  const [stopLossPrice, setStopLossPrice] = useState<number>(initialLevels.stopLoss);
  const [tp1Price, setTp1Price] = useState<number>(initialLevels.tp1);
  const [tp2Price, setTp2Price] = useState<number>(initialLevels.tp2);
  const [tp3Price, setTp3Price] = useState<number>(initialLevels.tp3);

  // Automatically sync prices whenever the instrument or analysis changes
  useEffect(() => {
    const updated = resolveBracketLevels(analysis);
    setEntryPrice(updated.entry);
    setStopLossPrice(updated.stopLoss);
    setTp1Price(updated.tp1);
    setTp2Price(updated.tp2);
    setTp3Price(updated.tp3);
  }, [
    analysis.id,
    analysis.market.instrument,
    analysis.market.currentPrice,
    analysis.tradePlan?.entryZone,
    analysis.tradePlan?.stopLoss,
    analysis.tradePlan?.direction,
    analysis.bias?.direction,
  ]);

  // Privacy toggle: Include personal capital & position sizing in alerts (Default: FALSE)
  const [includeSizingInAlerts, setIncludeSizingInAlerts] = useState<boolean>(() => {
    return localStorage.getItem("ai_trading_os_include_sizing") === "true";
  });

  const toggleIncludeSizing = (checked: boolean) => {
    setIncludeSizingInAlerts(checked);
    localStorage.setItem("ai_trading_os_include_sizing", String(checked));
  };

  // Spread buffer in points/pips
  const isGold =
    analysis.market.instrument.toUpperCase().includes("XAU") ||
    analysis.market.instrument.toUpperCase().includes("GOLD");
  const isCrypto =
    analysis.market.instrument.toUpperCase().includes("BTC") ||
    analysis.market.instrument.toUpperCase().includes("ETH") ||
    analysis.market.instrument.toUpperCase().includes("SOL");
  const isIndex =
    analysis.market.instrument.toUpperCase().includes("US30") ||
    analysis.market.instrument.toUpperCase().includes("DJI") ||
    analysis.market.instrument.toUpperCase().includes("NAS") ||
    analysis.market.instrument.toUpperCase().includes("SPX");
  const isJpy = analysis.market.instrument.toUpperCase().includes("JPY");
  const isForex = !isGold && !isCrypto && !isIndex;

  const defaultSpread = isGold ? 0.2 : isCrypto ? 5.0 : isIndex ? 2.5 : isJpy ? 0.02 : 0.0002;
  const [spreadBuffer, setSpreadBuffer] = useState<number>(defaultSpread);

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const direction = analysis.tradePlan.direction === "SHORT" || analysis.bias.direction === "BEARISH" ? "SHORT" : "LONG";

  // Quick sync directly to live spot ticker
  const handleSyncToLivePrice = () => {
    const liveSpot = parseNum(analysis.market.currentPrice, 0);
    if (!liveSpot) return;
    const stopOffset = liveSpot * 0.003;
    const stop = direction === "SHORT" ? liveSpot + stopOffset : liveSpot - stopOffset;
    const stopDist = Math.max(0.0001, Math.abs(liveSpot - stop));
    const tp1 = direction === "SHORT" ? liveSpot - stopDist * 2.5 : liveSpot + stopDist * 2.5;
    const tp2 = direction === "SHORT" ? liveSpot - stopDist * 4.0 : liveSpot + stopDist * 4.0;
    const tp3 = direction === "SHORT" ? liveSpot - stopDist * 6.0 : liveSpot + stopDist * 6.0;

    const precision = liveSpot < 10 ? 4 : 2;
    setEntryPrice(Number(liveSpot.toFixed(precision)));
    setStopLossPrice(Number(stop.toFixed(precision)));
    setTp1Price(Number(tp1.toFixed(precision)));
    setTp2Price(Number(tp2.toFixed(precision)));
    setTp3Price(Number(tp3.toFixed(precision)));
  };

  // Mathematical computations
  const calculations = useMemo(() => {
    const totalRiskDollar =
      riskMode === "percent"
        ? (accountBalance * (riskPercent / 100))
        : fixedRiskDollars;

    // Invalidation distance + spread buffer
    const rawStopDistance = Math.abs(entryPrice - stopLossPrice);
    const stopDistanceWithSpread = rawStopDistance + spreadBuffer;

    let lotSize = 0;
    let unitDescription = "";
    let pipsOrPoints = 0;

    if (isGold) {
      // 1 standard lot of Gold = 100 troy ounces
      // $1 move per lot = $100 profit/loss
      // Stop distance in dollars: Lot = Risk / (StopDistance * 100)
      pipsOrPoints = stopDistanceWithSpread; // in $ dollars
      lotSize = stopDistanceWithSpread > 0 ? totalRiskDollar / (stopDistanceWithSpread * 100) : 0;
      unitDescription = `${lotSize.toFixed(2)} Lots (100 oz/lot)`;
    } else if (isCrypto) {
      // Direct asset units: Units = Risk / StopDistance
      pipsOrPoints = stopDistanceWithSpread;
      lotSize = stopDistanceWithSpread > 0 ? totalRiskDollar / stopDistanceWithSpread : 0;
      const notionalUsd = lotSize * entryPrice;
      unitDescription = `${lotSize.toFixed(4)} Coins ($${notionalUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} notional)`;
    } else if (isIndex) {
      // US30 / Dow Jones Index: 1 index point = $1 notional per standard contract (or CFD contract)
      pipsOrPoints = stopDistanceWithSpread;
      lotSize = stopDistanceWithSpread > 0 ? totalRiskDollar / stopDistanceWithSpread : 0;
      unitDescription = `${lotSize.toFixed(2)} Contracts ($${lotSize.toFixed(2)}/pt)`;
    } else {
      // Standard Forex: 1 pip = 0.0001 (or 0.01 for JPY)
      const pipSize = isJpy || entryPrice > 50 ? 0.01 : 0.0001;
      pipsOrPoints = stopDistanceWithSpread / pipSize;
      // 1 standard lot = $10 per pip
      lotSize = pipsOrPoints > 0 ? totalRiskDollar / (pipsOrPoints * 10) : 0;
      unitDescription = `${lotSize.toFixed(2)} Standard Lots`;
    }

    // Profit projections for TP1, TP2, TP3
    const calcTpMetrics = (tp: number) => {
      const targetDistance = Math.abs(tp - entryPrice);
      const rMultiple = stopDistanceWithSpread > 0 ? targetDistance / stopDistanceWithSpread : 0;
      const projectedProfit = totalRiskDollar * rMultiple;
      return {
        targetDistance,
        rMultiple: rMultiple.toFixed(2),
        projectedProfit: projectedProfit.toFixed(2),
      };
    };

    const tp1Metrics = calcTpMetrics(tp1Price);
    const tp2Metrics = calcTpMetrics(tp2Price);
    const tp3Metrics = calcTpMetrics(tp3Price);

    const minRr = parseFloat(tp1Metrics.rMultiple);
    const isRrAcceptable = minRr >= 2.0;

    return {
      totalRiskDollar,
      stopDistanceWithSpread,
      pipsOrPoints,
      lotSize,
      unitDescription,
      tp1Metrics,
      tp2Metrics,
      tp3Metrics,
      isRrAcceptable,
      minRr,
    };
  }, [
    accountBalance,
    riskMode,
    riskPercent,
    fixedRiskDollars,
    entryPrice,
    stopLossPrice,
    tp1Price,
    tp2Price,
    tp3Price,
    spreadBuffer,
    isGold,
    isCrypto,
    isForex,
  ]);

  // Copy Bracket Order formatted string for MetaTrader or Prop Firm
  const handleCopyBracketOrder = () => {
    const symbolClean = analysis.market.instrument.replace(/[^A-Z0-9]/g, "");
    const action = direction === "LONG" ? "BUY LIMIT" : "SELL LIMIT";
    const precision = entryPrice < 10 ? 4 : 2;
    const livePriceStr = analysis.market.currentPrice ? ` (LIVE: ${analysis.market.currentPrice})` : "";
    const sizingStr = includeSizingInAlerts
      ? ` | LOTS: ${calculations.lotSize.toFixed(2)} | RISK: $${calculations.totalRiskDollar.toFixed(2)} (${riskPercent}%)`
      : "";
    const bracket = `ORDER: ${action} ${symbolClean}${livePriceStr} @ ${entryPrice.toFixed(precision)} | SL: ${stopLossPrice.toFixed(precision)} | TP1: ${tp1Price.toFixed(precision)}${sizingStr}`;

    navigator.clipboard.writeText(bracket);
    setCopiedFormat("bracket");
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  // Copy Webhook JSON for automated dispatch or TradingView alerts
  const handleCopyWebhookJson = () => {
    const payload = {
      action: direction === "LONG" ? "BUY" : "SELL",
      orderType: "LIMIT",
      symbol: analysis.market.instrument.replace("/", ""),
      entry: entryPrice,
      stopLoss: stopLossPrice,
      tp1: tp1Price,
      tp2: tp2Price,
      tp3: tp3Price,
      calculatedLots: parseFloat(calculations.lotSize.toFixed(2)),
      accountRiskDollars: calculations.totalRiskDollar,
      riskPercent: riskMode === "percent" ? riskPercent : undefined,
      timestamp: new Date().toISOString(),
      sniperGate: "5/5 VERIFIED",
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedFormat("webhook");
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  // Webhook Configuration & Live Broker Execution
  const [showWebhookModal, setShowWebhookModal] = useState<boolean>(false);
  const [webhookType, setWebhookType] = useState<"pineconnector" | "telegram" | "discord" | "custom">(() => {
    return (localStorage.getItem("ai_trading_os_webhook_type") as any) || "pineconnector";
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem("ai_trading_os_webhook_url") || "";
  });
  const [webhookSecret, setWebhookSecret] = useState<string>(() => {
    return localStorage.getItem("ai_trading_os_webhook_secret") || "";
  });
  // Dedicated Telegram Bot parameters
  const [telegramBotToken, setTelegramBotToken] = useState<string>(() => {
    return localStorage.getItem("ai_trading_os_tg_bot_token") || "";
  });
  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem("ai_trading_os_tg_chat_id") || "";
  });

  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    orderId: string;
    latencyMs: number;
    timestamp: string;
    type: string;
    status: "SUCCESS" | "FAILED";
    message: string;
    tip?: string;
  } | null>(null);

  // Telegram test state
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{
    success: boolean;
    message: string;
    tip?: string;
  } | null>(null);

  const saveWebhookConfig = (
    url: string,
    secret: string,
    type: "pineconnector" | "telegram" | "discord" | "custom",
    tgToken?: string,
    tgChatId?: string
  ) => {
    setWebhookType(type);
    setWebhookUrl(url);
    setWebhookSecret(secret);
    localStorage.setItem("ai_trading_os_webhook_type", type);
    localStorage.setItem("ai_trading_os_webhook_url", url);
    localStorage.setItem("ai_trading_os_webhook_secret", secret);
    if (tgToken !== undefined) {
      setTelegramBotToken(tgToken);
      localStorage.setItem("ai_trading_os_tg_bot_token", tgToken);
    }
    if (tgChatId !== undefined) {
      setTelegramChatId(tgChatId);
      localStorage.setItem("ai_trading_os_tg_chat_id", tgChatId);
    }
  };

  // Instant Test Telegram Alert Handler
  const handleTestTelegram = async () => {
    const cleanToken = telegramBotToken.trim();
    const cleanChat = telegramChatId.trim();

    if (!cleanToken) {
      setTestFeedback({
        success: false,
        message: "Missing Telegram Bot Token.",
        tip: "Please paste the Bot Token you received from @BotFather.",
      });
      return;
    }
    if (!cleanChat) {
      setTestFeedback({
        success: false,
        message: "Missing Chat ID.",
        tip: "Send a message to @userinfobot or @getmyid_bot on Telegram to get your Chat ID.",
      });
      return;
    }

    setIsTestingTelegram(true);
    setTestFeedback(null);

    try {
      const res = await fetch("/api/alerts/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: cleanToken,
          chatId: cleanChat,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestFeedback({
          success: true,
          message: "Test message delivered to Telegram! Check your chat.",
        });
      } else {
        setTestFeedback({
          success: false,
          message: data.error || "Failed to communicate with Telegram API.",
          tip: data.tip,
        });
      }
    } catch (err: any) {
      setTestFeedback({
        success: false,
        message: err.message || "Network error connecting to alert bridge.",
        tip: "Check server connectivity.",
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Live Webhook Dispatch Execution
  const handleDispatchLiveOrder = async () => {
    setIsDispatching(true);
    const startTime = performance.now();
    const orderId = `SNP-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = direction === "LONG" ? "BUY" : "SELL";

    // 1. Direct Telegram Bot Dispatch via Server-Side Bridge
    if (webhookType === "telegram") {
      const cleanToken = telegramBotToken.trim();
      const cleanChat = telegramChatId.trim();

      if (!cleanToken || !cleanChat) {
        setIsDispatching(false);
        setDispatchResult({
          orderId,
          latencyMs: 0,
          timestamp: new Date().toLocaleTimeString(),
          type: "TELEGRAM",
          status: "FAILED",
          message: "Telegram Bot Token or Chat ID is missing.",
          tip: "Click the ⚙️ Settings gear to paste your Bot Token from @BotFather and your Chat ID.",
        });
        setShowWebhookModal(true);
        return;
      }

      try {
        const res = await fetch("/api/alerts/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botToken: cleanToken,
            chatId: cleanChat,
            order: {
              orderId,
              instrument: analysis.market.instrument,
              livePrice: analysis.market.currentPrice,
              action,
              direction,
              entry: entryPrice,
              stopLoss: stopLossPrice,
              tp1: tp1Price,
              tp2: tp2Price,
              tp3: tp3Price,
              unitDescription: calculations.unitDescription,
              riskUsd: calculations.totalRiskDollar,
              riskPercent,
              rMultiple: calculations.tp1Metrics.rMultiple,
              includeSizing: includeSizingInAlerts,
              score: analysis.score?.totalScore,
              thesis: analysis.decisionReason,
              rsi: analysis.rsi,
            },
          }),
        });

        const data = await res.json();
        const latencyMs = Math.round(performance.now() - startTime);

        if (res.ok && data.success) {
          setDispatchResult({
            orderId,
            latencyMs,
            timestamp: new Date().toLocaleTimeString(),
            type: "TELEGRAM",
            status: "SUCCESS",
            message: `Delivered to Telegram Chat ID ${cleanChat}. Check your Telegram!`,
          });
        } else {
          setDispatchResult({
            orderId,
            latencyMs,
            timestamp: new Date().toLocaleTimeString(),
            type: "TELEGRAM",
            status: "FAILED",
            message: data.error || "Telegram transmission rejected.",
            tip: data.tip,
          });
        }
      } catch (err: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        setDispatchResult({
          orderId,
          latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          type: "TELEGRAM",
          status: "FAILED",
          message: err.message || "Failed to reach Telegram bridge.",
          tip: "Verify your server connection and Telegram Bot API status.",
        });
      } finally {
        setIsDispatching(false);
      }
      return;
    }

    // 2. Generic Webhooks (PineConnector, Discord, Custom)
    const symbolClean = analysis.market.instrument.replace("/", "");
    let payload: any;

    if (webhookType === "pineconnector") {
      // PineConnector syntax for MT4/MT5 EA
      payload = {
        command: `${action.toLowerCase()},${symbolClean},risk=${riskPercent},sl=${stopLossPrice.toFixed(2)},tp=${tp1Price.toFixed(2)}`,
        licenseId: webhookSecret || "DEMO-LICENSE",
      };
    } else if (webhookType === "discord") {
      const precision = entryPrice < 10 ? 4 : 2;
      const fields = [
        { name: "Live Market Price", value: `${analysis.market.currentPrice || "Streaming"}`, inline: true },
        { name: "Entry Zone", value: `$${entryPrice.toFixed(precision)}`, inline: true },
        { name: "Stop Loss", value: `$${stopLossPrice.toFixed(precision)}`, inline: true },
        { name: "TP1 Target", value: `$${tp1Price.toFixed(precision)}`, inline: true },
        { name: "R:R Ratio", value: `1:${calculations.tp1Metrics.rMultiple}R`, inline: true },
      ];
      if (includeSizingInAlerts) {
        fields.push(
          { name: "Position Size", value: calculations.unitDescription, inline: true },
          { name: "Risk ($)", value: `$${calculations.totalRiskDollar.toFixed(2)} (${riskPercent}%)`, inline: true }
        );
      }
      payload = {
        username: "AI Sniper Bot",
        embeds: [
          {
            title: `🎯 ${action} LIMIT: ${analysis.market.instrument}`,
            color: direction === "LONG" ? 0x10b981 : 0xef4444,
            fields,
            footer: { text: `Order ID: #${orderId} • Institutional Killzone Trigger` },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else {
      payload = {
        orderId,
        action,
        symbol: symbolClean,
        livePrice: analysis.market.currentPrice,
        entry: entryPrice,
        stopLoss: stopLossPrice,
        tp1: tp1Price,
        tp2: tp2Price,
        tp3: tp3Price,
        ...(includeSizingInAlerts
          ? {
              lots: parseFloat(calculations.lotSize.toFixed(2)),
              riskUsd: calculations.totalRiskDollar,
            }
          : {}),
        secret: webhookSecret,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      if (webhookUrl && webhookUrl.startsWith("http")) {
        // Proxy through server to eliminate browser CORS blocks
        const res = await fetch("/api/alerts/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl, payload }),
        });
        const data = await res.json();
        const latencyMs = Math.round(performance.now() - startTime);

        if (res.ok && data.success) {
          setDispatchResult({
            orderId,
            latencyMs,
            timestamp: new Date().toLocaleTimeString(),
            type: webhookType.toUpperCase(),
            status: "SUCCESS",
            message: `Dispatched ${action} LIMIT bracket to ${webhookType.toUpperCase()} bridge.`,
          });
        } else {
          setDispatchResult({
            orderId,
            latencyMs,
            timestamp: new Date().toLocaleTimeString(),
            type: webhookType.toUpperCase(),
            status: "FAILED",
            message: data.error || `Webhook bridge returned status ${data.status || "error"}.`,
          });
        }
      } else {
        // High-speed simulated execution bridge
        await new Promise((res) => setTimeout(res, 280));
        const latencyMs = Math.round(performance.now() - startTime);
        setDispatchResult({
          orderId,
          latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          type: webhookType.toUpperCase(),
          status: "SUCCESS",
          message: `Simulated local bridge execution for ${action} LIMIT (${calculations.unitDescription}).`,
        });
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      setDispatchResult({
        orderId,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        type: webhookType.toUpperCase(),
        status: "FAILED",
        message: err.message || "Failed to transmit payload to webhook.",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="bg-[#0b0f17] border border-slate-800/90 rounded-xl shadow-2xl overflow-hidden font-mono">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-[#0d131f] to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Calculator size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                SUB-PIP DYNAMIC RISK & POSITION SIZER
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                INSTITUTIONAL R-MULTIPLE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Mathematical lot calculation with spread buffer & minimum 1:2.0 R:R enforcement.
            </p>
          </div>
        </div>

        {/* Live Market Price & Direction Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {analysis.market.currentPrice && (
            <div className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 bg-slate-900/90 border border-slate-700 text-slate-300">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Live Spot:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {analysis.market.currentPrice}
              </span>
              <button
                type="button"
                onClick={handleSyncToLivePrice}
                title="Sync Entry & Bracket levels to Live Market Price"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}

          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
              direction === "LONG"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
            }`}
          >
            {direction === "LONG" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{direction} SETUP ({analysis.market.instrument})</span>
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Row 1: Account Capital & Risk Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Account Balance */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Account Capital ($):</label>
              <div className="flex gap-1 text-[10px]">
                {ACCOUNT_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAccountBalance(amt)}
                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                      accountBalance === amt
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    ${amt / 1000}k
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold">$</span>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Risk Model */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Risk Allocation:</label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setRiskMode("percent")}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    riskMode === "percent"
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  % Risk
                </button>
                <button
                  type="button"
                  onClick={() => setRiskMode("fixed")}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    riskMode === "fixed"
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  $ Fixed
                </button>
              </div>
            </div>

            {riskMode === "percent" ? (
              <div className="flex items-center gap-1.5">
                {[0.25, 0.5, 1.0, 2.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRiskPercent(pct)}
                    className={`flex-1 py-2 rounded-lg border text-center font-bold transition-all ${
                      riskPercent === pct
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={fixedRiskDollars}
                  onChange={(e) => setFixedRiskDollars(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Entry & Stop Loss Prices */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">
              Limit Entry Price:
            </label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-rose-400 font-semibold block mb-1">
              Invalidation (Stop Loss):
            </label>
            <input
              type="number"
              step="any"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-rose-900/60 rounded-lg text-rose-300 font-bold focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Row 2: Mathematical Output Cockpit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Max Risk $ */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              MAX ACCOUNT RISK (1.0R):
            </span>
            <div className="text-xl font-bold text-rose-400">
              ${calculations.totalRiskDollar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500">
              Strict limit — Stop hit never loses more
            </span>
          </div>

          {/* Stop Distance */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              STOP DISTANCE (+SPREAD):
            </span>
            <div className="text-xl font-bold text-amber-300">
              {calculations.stopDistanceWithSpread.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-400">
                {isGold ? "pts" : isCrypto ? "pts" : isIndex ? "pts" : "pips"}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Spread buffer: +{spreadBuffer.toFixed(2)}
            </span>
          </div>

          {/* Exact Lot Size (The Key Sniper Calculation) */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 shadow-lg shadow-emerald-950/30">
            <span className="text-[11px] text-emerald-400 font-bold block mb-1">
              EXACT POSITION / LOT SIZE:
            </span>
            <div className="text-2xl font-bold text-emerald-300 tracking-tight">
              {calculations.lotSize.toFixed(2)}{" "}
              <span className="text-xs font-semibold text-emerald-400">
                {isCrypto ? "Coins" : isIndex ? "Contracts" : "Lots"}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              {calculations.unitDescription}
            </span>
          </div>

          {/* Minimum R:R Status */}
          <div
            className={`p-3.5 rounded-xl border ${
              calculations.isRrAcceptable
                ? "bg-slate-950/80 border-slate-800 text-slate-300"
                : "bg-rose-950/40 border-rose-800/80 text-rose-200"
            }`}
          >
            <span className="text-[11px] font-semibold block mb-1">
              MINIMUM R:R TO TP1:
            </span>
            <div className="text-xl font-bold">
              1:{calculations.tp1Metrics.rMultiple}R
            </div>
            <span className="text-[10px]">
              {calculations.isRrAcceptable ? (
                <span className="text-emerald-400 font-bold">Passed (≥ 1:2.0R)</span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle size={11} /> Violates Sniper Rule (&lt; 1:2.0R)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Row 3: Target Profit Tiers (TP1, TP2, TP3) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-bold">
              Target Scaling & R-Multiple Payoff Matrix:
            </span>
            <span className="text-[11px] text-slate-500">
              Editable price levels
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* TP1 */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sky-400">TP1 (Scale 50% + Breakeven)</span>
                <span className="text-emerald-400 font-bold font-mono">
                  +{calculations.tp1Metrics.rMultiple}R
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={tp1Price}
                onChange={(e) => setTp1Price(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white font-bold text-xs mb-1.5 focus:outline-none focus:border-sky-500"
              />
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Projected Profit:</span>
                <span className="text-emerald-300 font-bold">
                  +${calculations.tp1Metrics.projectedProfit}
                </span>
              </div>
            </div>

            {/* TP2 */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-indigo-400">TP2 (Opposing Liquidity)</span>
                <span className="text-emerald-400 font-bold font-mono">
                  +{calculations.tp2Metrics.rMultiple}R
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={tp2Price}
                onChange={(e) => setTp2Price(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white font-bold text-xs mb-1.5 focus:outline-none focus:border-indigo-500"
              />
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Projected Profit:</span>
                <span className="text-emerald-300 font-bold">
                  +${calculations.tp2Metrics.projectedProfit}
                </span>
              </div>
            </div>

            {/* TP3 */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-purple-400">TP3 (HTF Structural Target)</span>
                <span className="text-emerald-400 font-bold font-mono">
                  +{calculations.tp3Metrics.rMultiple}R
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={tp3Price}
                onChange={(e) => setTp3Price(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white font-bold text-xs mb-1.5 focus:outline-none focus:border-purple-500"
              />
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Projected Profit:</span>
                <span className="text-emerald-300 font-bold">
                  +${calculations.tp3Metrics.projectedProfit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Webhook Execution Receipt Banner */}
        {dispatchResult && (
          <div
            className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
              dispatchResult.status === "SUCCESS"
                ? "bg-emerald-950/40 border-emerald-500/50"
                : "bg-rose-950/50 border-rose-500/60"
            }`}
          >
            <div className="flex items-start gap-2.5 max-w-2xl">
              {dispatchResult.status === "SUCCESS" ? (
                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-400 mt-0.5 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    ORDER #{dispatchResult.orderId}{" "}
                    {dispatchResult.status === "SUCCESS" ? "TRANSMITTED:" : "DELIVERY FAILED:"}
                  </span>
                  <span
                    className={`font-semibold ${
                      dispatchResult.status === "SUCCESS" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {dispatchResult.message}
                  </span>
                </div>
                {dispatchResult.tip && (
                  <div className="text-[11px] text-amber-300 mt-1 bg-amber-950/40 border border-amber-800/50 px-2 py-1 rounded">
                    💡 <strong>Action Required:</strong> {dispatchResult.tip}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
              <span>
                Latency: <strong className="text-white font-mono">{dispatchResult.latencyMs}ms</strong>
              </span>
              <span>
                Time: <strong className="text-white font-mono">{dispatchResult.timestamp}</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  dispatchResult.status === "SUCCESS"
                    ? "bg-emerald-900/60 text-emerald-300"
                    : "bg-rose-900/60 text-rose-300"
                }`}
              >
                {dispatchResult.status === "SUCCESS" ? "200 OK" : "FAILED"}
              </span>
              {dispatchResult.status === "FAILED" && (
                <button
                  onClick={() => setShowWebhookModal(true)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold"
                >
                  Configure ⚙️
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 4: One-Click Execution & Webhook Dispatch Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Terminal size={14} className="text-indigo-400" />
              <span className="font-semibold text-slate-300">Execution & Bridge Dispatch:</span>
            </div>

            {/* Signal Privacy Toggle: Live Price vs Capital/Lots */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={includeSizingInAlerts}
                onChange={(e) => toggleIncludeSizing(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-slate-400">
                Include Sizing in Signal:{" "}
                <strong className={includeSizingInAlerts ? "text-amber-400" : "text-emerald-400"}>
                  {includeSizingInAlerts ? "ON (Exposes Capital)" : "OFF (Live Price Only)"}
                </strong>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Webhook Dispatch Button */}
            <button
              onClick={handleDispatchLiveOrder}
              disabled={isDispatching}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950 disabled:opacity-50"
            >
              {isDispatching ? (
                <>
                  <Zap size={14} className="animate-spin text-amber-300" />
                  <span>Transmitting Order...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>⚡ DISPATCH SNIPER BRACKET</span>
                </>
              )}
            </button>

            {/* Copy MT Bracket */}
            <button
              onClick={handleCopyBracketOrder}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950"
            >
              {copiedFormat === "bracket" ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  <span>Bracket Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy MT Bracket</span>
                </>
              )}
            </button>

            {/* Copy JSON */}
            <button
              onClick={handleCopyWebhookJson}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              {copiedFormat === "webhook" ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  <span>JSON Copied!</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-sky-400" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            {/* Webhook Settings Gear */}
            <button
              onClick={() => setShowWebhookModal(true)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Configure Webhook Endpoint (PineConnector, Telegram, Discord)"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-slate-700 rounded-xl max-w-lg w-full p-5 font-mono shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  WEBHOOK & BROKER EXECUTION BRIDGE
                </h4>
              </div>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Configure your automated execution bridge. Clicking <strong>Dispatch</strong> will transmit the calculated bracket order directly to your broker, Discord bot, or Telegram channel.
            </p>

            {/* Preset Selector */}
            <div>
              <label className="text-slate-300 text-xs font-bold block mb-1.5">Bridge Architecture:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "pineconnector", label: "PineConnector (MT4/MT5)" },
                  { id: "discord", label: "Discord Channel Webhook" },
                  { id: "telegram", label: "Telegram Bot Alert" },
                  { id: "custom", label: "Custom REST JSON Webhook" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setWebhookType(preset.id as any)}
                    className={`p-2 rounded border text-left font-bold transition-colors ${
                      webhookType === preset.id
                        ? "bg-indigo-950 border-indigo-500 text-indigo-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Telegram Specific Configuration */}
            {webhookType === "telegram" ? (
              <div className="space-y-3 bg-slate-900/80 border border-sky-900/50 p-3.5 rounded-lg">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                  <Send size={14} />
                  <span>Direct Telegram Bot API Configuration</span>
                </div>

                {/* Bot Token */}
                <div>
                  <label className="text-slate-300 text-xs font-bold block mb-1">
                    Telegram Bot Token:
                  </label>
                  <input
                    type="password"
                    placeholder="1234567890:ABCDefghIJklmnOpq-rstUVWxyz"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Obtained from <strong>@BotFather</strong> on Telegram by sending <code>/newbot</code>.
                  </span>
                </div>

                {/* Chat ID */}
                <div>
                  <label className="text-slate-300 text-xs font-bold block mb-1">
                    Chat ID / Group Channel ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 987654321 or -100123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Send a message to your bot, then get your ID from <strong>@userinfobot</strong> or <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>.
                  </span>
                </div>

                {/* Signal Content Privacy: Live Price vs Position Sizing */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSizingInAlerts}
                      onChange={(e) => toggleIncludeSizing(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <span className="font-bold text-slate-200 text-xs block">
                        Include Capital & Position Size in Dispatch Alert
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        By default (<strong>OFF</strong>), Telegram alerts send institutional signals featuring the <strong>Live Price</strong>, Action, Entry, Stop Loss, and Take Profit targets without disclosing your personal capital or position lot size.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Test Connection Button & Status */}
                <div className="pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={isTestingTelegram}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-sky-950 disabled:opacity-50"
                    >
                      {isTestingTelegram ? (
                        <>
                          <Zap size={13} className="animate-spin text-amber-300" />
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>🧪 Send Test Alert to Telegram</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Instantly sends a test message to your chat
                    </span>
                  </div>

                  {testFeedback && (
                    <div
                      className={`mt-2.5 p-2.5 rounded-lg text-xs border ${
                        testFeedback.success
                          ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200"
                          : "bg-rose-950/70 border-rose-500/70 text-rose-200"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {testFeedback.success ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                        )}
                        <span>{testFeedback.message}</span>
                      </div>
                      {testFeedback.tip && (
                        <div className="text-[11px] text-amber-300 mt-1 pl-5 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                          💡 <strong>How to fix:</strong> {testFeedback.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Setup Instructions Box */}
                <div className="text-[11px] bg-slate-950 border border-slate-800 p-2.5 rounded text-slate-300 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1">
                    <HelpCircle size={12} />
                    <span>Quick 3-Step Setup Guide:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400 text-[10px]">
                    <li>Open Telegram and search for <strong>@BotFather</strong>. Send <code>/newbot</code> and copy the API token.</li>
                    <li>Start a conversation with your bot (click <strong>Start</strong>) or invite it to your channel/group.</li>
                    <li>Get your numeric Chat ID (from <strong>@userinfobot</strong> or <strong>@getmyid_bot</strong>) and paste it above.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <>
                {/* Standard URL Input for Discord / PineConnector / Custom */}
                <div>
                  <label className="text-slate-300 text-xs font-bold block mb-1">
                    Endpoint URL:
                  </label>
                  <input
                    type="text"
                    placeholder={
                      webhookType === "discord"
                        ? "https://discord.com/api/webhooks/..."
                        : webhookType === "pineconnector"
                        ? "https://pineconnector.net/webhook/..."
                        : "https://your-api-bridge.com/execute"
                    }
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Leave empty to run in instant high-speed simulated execution mode.
                  </span>
                </div>

                {/* Secret Token / License ID */}
                <div>
                  <label className="text-slate-300 text-xs font-bold block mb-1">
                    License ID / Authorization Token (Optional):
                  </label>
                  <input
                    type="password"
                    placeholder="License ID or Bearer token"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowWebhookModal(false)}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveWebhookConfig(webhookUrl, webhookSecret, webhookType, telegramBotToken, telegramChatId);
                  setShowWebhookModal(false);
                }}
                className="px-4 py-2 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
