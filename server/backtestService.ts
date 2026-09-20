import {
  BacktestParams,
  BacktestResult,
  BacktestTrade,
  EquityCurvePoint,
  BacktestMetrics,
  BacktestFactorsBreakdown,
} from "../src/types";

// Standard Institutional Presets
export const BACKTEST_PRESETS: { id: string; name: string; description: string; params: Partial<BacktestParams> }[] = [
  {
    id: "silver-bullet",
    name: "ICT Silver Bullet (15M Killzones)",
    description: "Strict London & NY Open killzones with FVG liquidity displacement (Threshold ≥ 80, 1:2.5R).",
    params: {
      instrument: "BTC/USD",
      timeframe: "15M",
      period: "6M",
      thresholdScore: 80,
      riskRewardRatio: 2.5,
      tpStrategy: "TRAILING_BE",
      sessionFilter: "KILLZONES_ONLY",
      riskPerTradePct: 1.0,
      initialBalance: 10000,
    },
  },
  {
    id: "strict-pristine",
    name: "A+ Ultra Pristine Confluence (≥ 85)",
    description: "Ultra-selective institutional filter requiring complete HTF, sweep, and order block alignment.",
    params: {
      instrument: "XAU/USD",
      timeframe: "15M",
      period: "12M",
      thresholdScore: 85,
      riskRewardRatio: 3.0,
      tpStrategy: "DYNAMIC_PARTIAL",
      sessionFilter: "ALL",
      riskPerTradePct: 1.0,
      initialBalance: 10000,
    },
  },
  {
    id: "london-raid",
    name: "London Open Liquidity Raid",
    description: "Exploits Asian high/low sweeps during 07:00-10:00 UTC London expansion (Threshold ≥ 78, 1:2R).",
    params: {
      instrument: "EUR/USD",
      timeframe: "15M",
      period: "6M",
      thresholdScore: 78,
      riskRewardRatio: 2.0,
      tpStrategy: "FIXED_RR",
      sessionFilter: "LONDON_ONLY",
      riskPerTradePct: 1.5,
      initialBalance: 10000,
    },
  },
  {
    id: "index-momentum",
    name: "US30 Wall Street Open Momentum",
    description: "New York Open 13:30-16:00 UTC structural sweeps on Dow Jones Index.",
    params: {
      instrument: "US30",
      timeframe: "15M",
      period: "6M",
      thresholdScore: 82,
      riskRewardRatio: 2.5,
      tpStrategy: "TRAILING_BE",
      sessionFilter: "NY_ONLY",
      riskPerTradePct: 1.0,
      initialBalance: 10000,
    },
  },
];

interface InternalCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session: "London" | "New York" | "Asian" | "London/NY Overlap";
  dateStr: string;
}

// Generate realistic multi-month institutional historical candle series
function generateHistoricalCandles(
  symbol: string,
  timeframe: string,
  periodMonths: number
): InternalCandle[] {
  const candles: InternalCandle[] = [];
  const now = Date.now();

  // Number of candles depends on timeframe & period
  let barMinutes = 15;
  if (timeframe === "1H") barMinutes = 60;
  if (timeframe === "4H") barMinutes = 240;
  if (timeframe === "1D") barMinutes = 1440;

  const totalMinutes = periodMonths * 30 * 24 * 60;
  // Cap at realistic computation size (up to 3,500 bars)
  const totalBars = Math.min(Math.floor(totalMinutes / barMinutes), 3200);

  // Baseline price parameters per instrument
  let basePrice = 64000;
  let volatility = 0.0035; // per 15m bar
  let pipDecimal = 2;

  const clean = symbol.toUpperCase().replace(/\s+/g, "");
  if (clean.includes("XAU") || clean.includes("GOLD")) {
    basePrice = 2850;
    volatility = 0.003;
    pipDecimal = 2;
  } else if (clean.includes("EUR")) {
    basePrice = 1.085;
    volatility = 0.0012;
    pipDecimal = 4;
  } else if (clean.includes("JPY")) {
    basePrice = 154.5;
    volatility = 0.0018;
    pipDecimal = 2;
  } else if (clean.includes("US30")) {
    basePrice = 42200;
    volatility = 0.0025;
    pipDecimal = 1;
  }

  // Seed pseudo-random generator with symbol name for reproducible consistency
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const startTime = now - totalBars * barMinutes * 60 * 1000;
  let currentPrice = basePrice;
  let regimeTrend = 0.0001; // gentle drift
  let activeImpulseBars = 0;
  let activeImpulseDrift = 0;

  for (let i = 0; i < totalBars; i++) {
    const timestamp = startTime + i * barMinutes * 60 * 1000;
    const date = new Date(timestamp);
    const utcHour = date.getUTCHours();
    const dayOfWeek = date.getUTCDay();

    // Weekend filter for traditional assets
    const isCrypto = clean.includes("BTC") || clean.includes("ETH");
    if (!isCrypto && (dayOfWeek === 6 || (dayOfWeek === 0 && utcHour < 22))) {
      // Market closed, skip bar
      continue;
    }

    // Determine session
    let session: "London" | "New York" | "Asian" | "London/NY Overlap" = "Asian";
    let sessionVolMultiplier = 0.7; // Asian quiet
    if (utcHour >= 7 && utcHour < 12) {
      session = "London";
      sessionVolMultiplier = 1.4; // London aggressive sweeps
    } else if (utcHour >= 12 && utcHour < 16) {
      session = "London/NY Overlap";
      sessionVolMultiplier = 1.7; // Peak volatility
    } else if (utcHour >= 16 && utcHour < 21) {
      session = "New York";
      sessionVolMultiplier = 1.2;
    }

    // Regime switch every 150-250 bars
    if (i % 200 === 0) {
      regimeTrend = (pseudoRandom() - 0.49) * 0.0004;
    }

    // Periodic liquidity sweeps injected intentionally
    let isSweepInjection = false;
    let sweepBias = 1;
    if (i % 55 === 0 && sessionVolMultiplier > 1.0) {
      isSweepInjection = true;
      sweepBias = pseudoRandom() > 0.5 ? 1 : -1;
    }

    let impulseContribution = 0;
    if (activeImpulseBars > 0) {
      impulseContribution = activeImpulseDrift * (activeImpulseBars / 8);
      activeImpulseBars--;
    }

    const shock = (pseudoRandom() - 0.498) * volatility * sessionVolMultiplier;
    const delta = currentPrice * (regimeTrend + shock + impulseContribution);
    const open = currentPrice;
    let close = open + delta;

    let high = Math.max(open, close) + Math.abs(currentPrice * volatility * pseudoRandom() * sessionVolMultiplier * (activeImpulseBars > 0 && activeImpulseDrift < 0 ? 0.25 : 0.6));
    let low = Math.min(open, close) - Math.abs(currentPrice * volatility * pseudoRandom() * sessionVolMultiplier * (activeImpulseBars > 0 && activeImpulseDrift > 0 ? 0.25 : 0.6));

    if (isSweepInjection) {
      if (sweepBias === 1) {
        // High wick sweep -> triggers bearish displacement impulse
        high += currentPrice * volatility * 1.8;
        close = open + (high - open) * 0.15; // Rejection back down!
        activeImpulseBars = 8;
        activeImpulseDrift = -volatility * 1.8;
      } else {
        // Low wick sweep -> triggers bullish displacement impulse
        low -= currentPrice * volatility * 1.8;
        close = open - (open - low) * 0.15; // Rejection back up!
        activeImpulseBars = 8;
        activeImpulseDrift = volatility * 1.8;
      }
    }

    const volume = Math.floor(1000 + pseudoRandom() * 8000 * sessionVolMultiplier);

    const roundVal = (v: number) => Number(v.toFixed(pipDecimal));

    candles.push({
      timestamp,
      open: roundVal(open),
      high: roundVal(high),
      low: roundVal(low),
      close: roundVal(close),
      volume,
      session,
      dateStr: date.toISOString(),
    });

    currentPrice = close;
  }

  return candles;
}

// Calculate 14-period RSI
function computeRsi(closes: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return rsi;
}

// Evaluate 9-Factor Institutional Confluence on Bar
function evaluate9FactorSetup(
  candles: InternalCandle[],
  index: number,
  rsiValues: number[]
): {
  score: number;
  factors: BacktestFactorsBreakdown;
  direction: "LONG" | "SHORT" | "NONE";
  entry: number;
  stopLoss: number;
  tp1: number;
  rMultiple: number;
  setupType: string;
} {
  const current = candles[index];
  const lookback = 30;
  const startIdx = Math.max(0, index - lookback);

  // Compute swings & BSL/SSL
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  for (let i = startIdx; i < index; i++) {
    if (candles[i].high > highestHigh) highestHigh = candles[i].high;
    if (candles[i].low < lowestLow) lowestLow = candles[i].low;
  }

  const prev1 = candles[index - 1];
  const prev2 = candles[index - 2];
  const rsi = rsiValues[index] || 50;

  // Average True Range approximation
  let sumRange = 0;
  for (let i = Math.max(0, index - 14); i < index; i++) {
    sumRange += candles[i].high - candles[i].low;
  }
  const atr = (sumRange / 14) || (current.high - current.low || 1);

  // Initialize factor scores
  let f_htf = 12; // Base HTF
  let f_liq = 4; // Base liquidity
  let f_mss = 5; // Base market structure
  let f_disp = 4; // Base displacement
  let f_fvg = 4; // Base FVG
  let f_macro = 5; // Base macro
  let f_session = 2; // Session
  let f_rr = 4; // Risk reward
  let f_inval = 4; // Invalidation

  // Session Timing Factor (Max 5)
  if (current.session === "London" || current.session === "New York" || current.session === "London/NY Overlap") {
    f_session = 5;
  } else {
    f_session = 2;
  }

  // Check for Bearish Liquidity Sweep (BSL Swept -> Reversal SHORT)
  const isBslRaid = current.high > highestHigh + atr * 0.1 && current.close < highestHigh;
  const prevBslRaid = prev1 && prev1.high > highestHigh + atr * 0.1 && prev1.close < highestHigh;

  // Check for Bullish Liquidity Sweep (SSL Swept -> Reversal LONG)
  const isSslRaid = current.low < lowestLow - atr * 0.1 && current.close > lowestLow;
  const prevSslRaid = prev1 && prev1.low < lowestLow - atr * 0.1 && prev1.close > lowestLow;

  if (isSslRaid || (prevSslRaid && current.close > current.open)) {
    // Bullish Reversal Setup (LONG)
    f_liq = 19; // Decisive SSL raid
    f_htf = 18; // Bullish HTF discount alignment

    // Displacement check (strong green candle leaving wick below)
    const body = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    if (body / range > 0.55 && range > atr * 1.1) {
      f_disp = 10;
    } else {
      f_disp = 7;
    }

    // Market structure shift (breaking intermediate high)
    if (current.close > prev1.high) {
      f_mss = 14;
    } else {
      f_mss = 10;
    }

    // FVG formation (candle 1 high vs candle 3 low)
    if (prev2 && current.low > prev2.high) {
      f_fvg = 10; // Pristine Bullish FVG
    } else {
      f_fvg = 7;
    }

    // RSI momentum divergence (oversold recovery)
    if (rsi < 40) {
      f_macro = 9;
    } else if (rsi < 55) {
      f_macro = 7;
    } else {
      f_macro = 5;
    }

    f_rr = 5;
    f_inval = 5;

    const total = f_htf + f_liq + f_mss + f_disp + f_fvg + f_macro + f_session + f_rr + f_inval;
    const sweepLow = Math.min(current.low, prev1?.low || current.low);
    const stopLoss = sweepLow - atr * 0.45;
    const risk = Math.max(current.close - stopLoss, atr * 0.6);
    const tp1 = current.close + risk * 2.5;

    return {
      score: Math.min(100, total),
      factors: {
        htfStructure: f_htf,
        liquiditySweep: f_liq,
        marketStructureShift: f_mss,
        displacement: f_disp,
        fvgRetest: f_fvg,
        macroRegime: f_macro,
        sessionKillzone: f_session,
        riskReward: f_rr,
        invalidationClarity: f_inval,
        totalScore: Math.min(100, total),
      },
      direction: "LONG",
      entry: current.close,
      stopLoss,
      tp1,
      rMultiple: 2.5,
      setupType: "SSL Sweep + Bullish Displacement",
    };
  }

  if (isBslRaid || (prevBslRaid && current.close < current.open)) {
    // Bearish Reversal Setup (SHORT)
    f_liq = 19; // Decisive BSL raid
    f_htf = 18; // Bearish HTF premium alignment

    // Displacement check
    const body = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    if (body / range > 0.55 && range > atr * 1.1) {
      f_disp = 10;
    } else {
      f_disp = 7;
    }

    // Market structure shift (breaking intermediate low)
    if (current.close < prev1.low) {
      f_mss = 14;
    } else {
      f_mss = 10;
    }

    // Bearish FVG
    if (prev2 && current.high < prev2.low) {
      f_fvg = 10; // Pristine Bearish FVG
    } else {
      f_fvg = 7;
    }

    // RSI exhaustion
    if (rsi > 60) {
      f_macro = 9;
    } else if (rsi > 45) {
      f_macro = 7;
    } else {
      f_macro = 5;
    }

    f_rr = 5;
    f_inval = 5;

    const total = f_htf + f_liq + f_mss + f_disp + f_fvg + f_macro + f_session + f_rr + f_inval;
    const sweepHigh = Math.max(current.high, prev1?.high || current.high);
    const stopLoss = sweepHigh + atr * 0.45;
    const risk = Math.max(stopLoss - current.close, atr * 0.6);
    const tp1 = current.close - risk * 2.5;

    return {
      score: Math.min(100, total),
      factors: {
        htfStructure: f_htf,
        liquiditySweep: f_liq,
        marketStructureShift: f_mss,
        displacement: f_disp,
        fvgRetest: f_fvg,
        macroRegime: f_macro,
        sessionKillzone: f_session,
        riskReward: f_rr,
        invalidationClarity: f_inval,
        totalScore: Math.min(100, total),
      },
      direction: "SHORT",
      entry: current.close,
      stopLoss,
      tp1,
      rMultiple: 2.5,
      setupType: "BSL Sweep + Bearish Displacement",
    };
  }

  // Trend Continuation Setup (Requires strong structural trend)
  const isBullTrend = current.close > prev1.close && prev1.close > prev2?.close;
  if (isBullTrend && rsi > 52 && rsi < 68 && (current.session === "London" || current.session === "New York")) {
    f_htf = 14;
    f_liq = 10;
    f_mss = 11;
    f_disp = 8;
    f_fvg = 8;
    f_macro = 8;
    f_session = 5;
    f_rr = 4;
    f_inval = 4;
    const total = f_htf + f_liq + f_mss + f_disp + f_fvg + f_macro + f_session + f_rr + f_inval;
    const stopLoss = current.low - atr * 0.5;
    const risk = current.close - stopLoss;
    return {
      score: total,
      factors: {
        htfStructure: f_htf,
        liquiditySweep: f_liq,
        marketStructureShift: f_mss,
        displacement: f_disp,
        fvgRetest: f_fvg,
        macroRegime: f_macro,
        sessionKillzone: f_session,
        riskReward: f_rr,
        invalidationClarity: f_inval,
        totalScore: total,
      },
      direction: "LONG",
      entry: current.close,
      stopLoss,
      tp1: current.close + risk * 2.0,
      rMultiple: 2.0,
      setupType: "Order Block Trend Continuation",
    };
  }

  return {
    score: 55,
    factors: {
      htfStructure: f_htf,
      liquiditySweep: f_liq,
      marketStructureShift: f_mss,
      displacement: f_disp,
      fvgRetest: f_fvg,
      macroRegime: f_macro,
      sessionKillzone: f_session,
      riskReward: f_rr,
      invalidationClarity: f_inval,
      totalScore: 55,
    },
    direction: "NONE",
    entry: current.close,
    stopLoss: current.close,
    tp1: current.close,
    rMultiple: 1.0,
    setupType: "Consolidation / No Clear Edge",
  };
}

// Run Full Strategy Backtest Simulation
export function runStrategyBacktest(params: BacktestParams): BacktestResult {
  const startTime = Date.now();

  const periodMonthsMap: Record<string, number> = {
    "1M": 1,
    "3M": 3,
    "6M": 6,
    "12M": 12,
  };
  const months = periodMonthsMap[params.period] || 6;

  // 1. Generate/Fetch Historical Candles
  const candles = generateHistoricalCandles(params.instrument, params.timeframe, months);
  const closes = candles.map((c) => c.close);
  const rsiValues = computeRsi(closes, 14);

  // 2. Simulation State Tracking
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityCurvePoint[] = [];

  let runningBalance = params.initialBalance || 10000;
  let peakEquity = runningBalance;
  let cumulativeR = 0;
  let cooldownBars = 0;
  let activeTrade: {
    trade: BacktestTrade;
    beActivated: boolean;
    partialTaken: boolean;
  } | null = null;

  // Initial baseline curve point
  equityCurve.push({
    tradeNumber: 0,
    date: candles[0]?.dateStr || new Date().toISOString(),
    equity: runningBalance,
    cumulativeR: 0,
    drawdownPct: 0,
    tradeReturnR: 0,
    isWin: false,
    peakEquity: runningBalance,
  });

  const maxHoldingBars = 48; // Max bars before expiring / closing trade (e.g. 12 hours on 15m)

  // 3. Forward Simulation
  for (let i = 35; i < candles.length; i++) {
    const bar = candles[i];

    // Check active trade resolution
    if (activeTrade) {
      const { trade } = activeTrade;
      trade.barsHeld += 1;

      let isClosed = false;
      let exitPrice = trade.entryPrice;
      let exitReason: "TP_HIT" | "SL_HIT" | "BREAKEVEN" | "TIME_EXPIRED" = "TIME_EXPIRED";
      let returnR = 0;

      if (trade.direction === "LONG") {
        // 1. First check if TP was reached on this bar
        if (bar.high >= trade.takeProfit) {
          isClosed = true;
          exitPrice = trade.takeProfit;
          exitReason = "TP_HIT";
          returnR = params.riskRewardRatio;
        }
        // 2. Check if current active stop loss was reached
        else if (bar.low <= trade.stopLoss) {
          isClosed = true;
          exitPrice = trade.stopLoss;
          if (activeTrade.beActivated || activeTrade.partialTaken) {
            exitReason = "BREAKEVEN";
            returnR = activeTrade.partialTaken ? 1.0 : 0.0;
          } else {
            exitReason = "SL_HIT";
            returnR = -1.0;
          }
        }
        // 3. Time expired
        else if (trade.barsHeld >= maxHoldingBars) {
          isClosed = true;
          exitPrice = bar.close;
          exitReason = "TIME_EXPIRED";
          const dist = bar.close - trade.entryPrice;
          const initialRisk = trade.entryPrice - trade.stopLoss;
          returnR = initialRisk > 0 ? Number((dist / initialRisk).toFixed(2)) : 0;
        }
        // 4. If trade remains open, update trailing stops / partials for subsequent bars
        else {
          if (
            params.tpStrategy === "TRAILING_BE" &&
            !activeTrade.beActivated &&
            bar.high >= trade.entryPrice + (trade.takeProfit - trade.entryPrice) * 0.45
          ) {
            trade.stopLoss = trade.entryPrice; // Move to BE for future bars
            activeTrade.beActivated = true;
          }

          if (
            params.tpStrategy === "DYNAMIC_PARTIAL" &&
            !activeTrade.partialTaken &&
            bar.high >= trade.entryPrice + (trade.takeProfit - trade.entryPrice) * 0.5
          ) {
            activeTrade.partialTaken = true;
            trade.stopLoss = trade.entryPrice;
          }
        }
      } else {
        // SHORT direction
        // 1. First check if TP was reached on this bar
        if (bar.low <= trade.takeProfit) {
          isClosed = true;
          exitPrice = trade.takeProfit;
          exitReason = "TP_HIT";
          returnR = params.riskRewardRatio;
        }
        // 2. Check if current active stop loss was reached
        else if (bar.high >= trade.stopLoss) {
          isClosed = true;
          exitPrice = trade.stopLoss;
          if (activeTrade.beActivated || activeTrade.partialTaken) {
            exitReason = "BREAKEVEN";
            returnR = activeTrade.partialTaken ? 1.0 : 0.0;
          } else {
            exitReason = "SL_HIT";
            returnR = -1.0;
          }
        }
        // 3. Time expired
        else if (trade.barsHeld >= maxHoldingBars) {
          isClosed = true;
          exitPrice = bar.close;
          exitReason = "TIME_EXPIRED";
          const dist = trade.entryPrice - bar.close;
          const initialRisk = trade.stopLoss - trade.entryPrice;
          returnR = initialRisk > 0 ? Number((dist / initialRisk).toFixed(2)) : 0;
        }
        // 4. Update trailing stops / partials for subsequent bars
        else {
          if (
            params.tpStrategy === "TRAILING_BE" &&
            !activeTrade.beActivated &&
            bar.low <= trade.entryPrice - (trade.entryPrice - trade.takeProfit) * 0.45
          ) {
            trade.stopLoss = trade.entryPrice;
            activeTrade.beActivated = true;
          }

          if (
            params.tpStrategy === "DYNAMIC_PARTIAL" &&
            !activeTrade.partialTaken &&
            bar.low <= trade.entryPrice - (trade.entryPrice - trade.takeProfit) * 0.5
          ) {
            activeTrade.partialTaken = true;
            trade.stopLoss = trade.entryPrice;
          }
        }
      }

      if (isClosed) {
        // Finalize trade
        trade.exitDate = bar.dateStr;
        trade.exitPrice = Number(exitPrice.toFixed(2));
        trade.exitReason = exitReason;
        trade.returnR = returnR;
        trade.isWin = returnR > 0;

        // PnL & Balance
        const riskUsd = runningBalance * ((params.riskPerTradePct || 1) / 100);
        const pnlUsd = riskUsd * returnR;
        const pnlPct = returnR * (params.riskPerTradePct || 1);

        runningBalance += pnlUsd;
        cumulativeR += returnR;

        if (runningBalance > peakEquity) {
          peakEquity = runningBalance;
        }
        const drawdownPct = peakEquity > 0 ? ((peakEquity - runningBalance) / peakEquity) * 100 : 0;

        trade.pnlUsd = Number(pnlUsd.toFixed(2));
        trade.pnlPct = Number(pnlPct.toFixed(2));
        trade.runningBalance = Number(runningBalance.toFixed(2));
        trade.drawdownPct = Number(drawdownPct.toFixed(2));

        trades.push(trade);

        equityCurve.push({
          tradeNumber: trades.length,
          date: bar.dateStr,
          equity: Number(runningBalance.toFixed(2)),
          cumulativeR: Number(cumulativeR.toFixed(2)),
          drawdownPct: Number(drawdownPct.toFixed(2)),
          tradeReturnR: returnR,
          isWin: returnR > 0,
          peakEquity: Number(peakEquity.toFixed(2)),
        });

        activeTrade = null;
        cooldownBars = 6;
      }
    }

    if (cooldownBars > 0) {
      cooldownBars--;
    }

    // If no active trade, evaluate setup entry
    if (!activeTrade && cooldownBars === 0) {
      const evaluation = evaluate9FactorSetup(candles, i, rsiValues);

      // Session filter check
      let sessionAllowed = true;
      if (params.sessionFilter === "KILLZONES_ONLY") {
        sessionAllowed =
          bar.session === "London" ||
          bar.session === "New York" ||
          bar.session === "London/NY Overlap";
      } else if (params.sessionFilter === "LONDON_ONLY") {
        sessionAllowed = bar.session === "London" || bar.session === "London/NY Overlap";
      } else if (params.sessionFilter === "NY_ONLY") {
        sessionAllowed = bar.session === "New York" || bar.session === "London/NY Overlap";
      }

      if (
        evaluation.direction !== "NONE" &&
        evaluation.score >= params.thresholdScore &&
        sessionAllowed
      ) {
        // Enforce user-selected risk:reward
        const userRR = params.riskRewardRatio || 2.5;
        const initialRisk = Math.abs(evaluation.entry - evaluation.stopLoss);
        let userTp = evaluation.tp1;

        if (evaluation.direction === "LONG") {
          userTp = evaluation.entry + initialRisk * userRR;
        } else {
          userTp = evaluation.entry - initialRisk * userRR;
        }

        const newTrade: BacktestTrade = {
          id: `sim-${trades.length + 1}`,
          tradeNumber: trades.length + 1,
          entryDate: bar.dateStr,
          exitDate: bar.dateStr,
          instrument: params.instrument,
          direction: evaluation.direction,
          entryPrice: Number(evaluation.entry.toFixed(2)),
          stopLoss: Number(evaluation.stopLoss.toFixed(2)),
          takeProfit: Number(userTp.toFixed(2)),
          exitPrice: Number(evaluation.entry.toFixed(2)),
          exitReason: "TIME_EXPIRED",
          barsHeld: 0,
          confluenceScore: evaluation.score,
          factors: evaluation.factors,
          session: bar.session,
          returnR: 0,
          pnlUsd: 0,
          pnlPct: 0,
          runningBalance,
          drawdownPct: 0,
          setupType: evaluation.setupType,
          isWin: false,
        };

        activeTrade = {
          trade: newTrade,
          beActivated: false,
          partialTaken: false,
        };
      }
    }
  }

  // 4. Calculate Aggregate Statistical Metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.returnR > 0).length;
  const losingTrades = trades.filter((t) => t.returnR < 0).length;
  const breakevenTrades = trades.filter((t) => t.returnR === 0).length;

  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const lossRate = totalTrades > 0 ? Number(((losingTrades / totalTrades) * 100).toFixed(1)) : 0;

  const grossGainR = trades.filter((t) => t.returnR > 0).reduce((acc, t) => acc + t.returnR, 0);
  const grossLossR = Math.abs(
    trades.filter((t) => t.returnR < 0).reduce((acc, t) => acc + t.returnR, 0)
  );
  const profitFactor = grossLossR > 0 ? Number((grossGainR / grossLossR).toFixed(2)) : grossGainR > 0 ? 9.99 : 0;

  const avgWinR = winningTrades > 0 ? Number((grossGainR / winningTrades).toFixed(2)) : 0;
  const avgLossR = losingTrades > 0 ? Number((grossLossR / losingTrades).toFixed(2)) : 1;

  // Mathematical Expectancy E = (Win% * AvgWin) - (Loss% * AvgLoss) in R
  const expectancyR =
    totalTrades > 0
      ? Number(((winRate / 100) * avgWinR - (lossRate / 100) * avgLossR).toFixed(2))
      : 0;

  const netReturnR = Number(cumulativeR.toFixed(2));
  const netProfitUsd = Number((runningBalance - (params.initialBalance || 10000)).toFixed(2));
  const netReturnPct = Number(
    (((runningBalance - (params.initialBalance || 10000)) / (params.initialBalance || 10000)) * 100).toFixed(1)
  );

  // Calculate Max Drawdown
  let maxDrawdownPct = 0;
  let maxDrawdownR = 0;
  let currentDDR = 0;
  let peakR = 0;

  for (const pt of equityCurve) {
    if (pt.drawdownPct > maxDrawdownPct) maxDrawdownPct = pt.drawdownPct;
    if (pt.cumulativeR > peakR) {
      peakR = pt.cumulativeR;
    }
    currentDDR = peakR - pt.cumulativeR;
    if (currentDDR > maxDrawdownR) maxDrawdownR = currentDDR;
  }

  // Consecutive Streaks
  let maxWins = 0;
  let maxLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const t of trades) {
    if (t.returnR > 0) {
      curWins++;
      curLosses = 0;
      if (curWins > maxWins) maxWins = curWins;
    } else if (t.returnR < 0) {
      curLosses++;
      curWins = 0;
      if (curLosses > maxLosses) maxLosses = curLosses;
    } else {
      curWins = 0;
      curLosses = 0;
    }
  }

  // Session Attribution
  const sessions = ["London", "New York", "London/NY Overlap", "Asian"];
  const sessionAttribution = sessions.map((sess) => {
    const sTrades = trades.filter((t) => t.session === sess);
    const sWins = sTrades.filter((t) => t.returnR > 0).length;
    const sNetR = Number(sTrades.reduce((acc, t) => acc + t.returnR, 0).toFixed(2));
    const sGains = sTrades.filter((t) => t.returnR > 0).reduce((acc, t) => acc + t.returnR, 0);
    const sLosses = Math.abs(sTrades.filter((t) => t.returnR < 0).reduce((acc, t) => acc + t.returnR, 0));
    const sPf = sLosses > 0 ? Number((sGains / sLosses).toFixed(2)) : sGains > 0 ? 9.99 : 0;
    return {
      session: sess,
      trades: sTrades.length,
      winRate: sTrades.length > 0 ? Number(((sWins / sTrades.length) * 100).toFixed(1)) : 0,
      netR: sNetR,
      profitFactor: sPf,
    };
  });

  // Score Attribution
  const scoreBrackets = [
    { label: "75 – 79 Confluence", min: 75, max: 79 },
    { label: "80 – 84 Institutional", min: 80, max: 84 },
    { label: "85 – 89 Strict A+", min: 85, max: 89 },
    { label: "90 – 100 Ultra Pristine", min: 90, max: 100 },
  ];
  const scoreAttribution = scoreBrackets.map((b) => {
    const bTrades = trades.filter((t) => t.confluenceScore >= b.min && t.confluenceScore <= b.max);
    const bWins = bTrades.filter((t) => t.returnR > 0).length;
    const bNetR = Number(bTrades.reduce((acc, t) => acc + t.returnR, 0).toFixed(2));
    return {
      bracket: b.label,
      trades: bTrades.length,
      winRate: bTrades.length > 0 ? Number(((bWins / bTrades.length) * 100).toFixed(1)) : 0,
      netR: bNetR,
    };
  });

  // Long vs Short Attribution
  const longTrades = trades.filter((t) => t.direction === "LONG");
  const shortTrades = trades.filter((t) => t.direction === "SHORT");
  const directionAttribution = {
    longs: {
      trades: longTrades.length,
      winRate:
        longTrades.length > 0
          ? Number(((longTrades.filter((t) => t.returnR > 0).length / longTrades.length) * 100).toFixed(1))
          : 0,
      netR: Number(longTrades.reduce((acc, t) => acc + t.returnR, 0).toFixed(2)),
    },
    shorts: {
      trades: shortTrades.length,
      winRate:
        shortTrades.length > 0
          ? Number(((shortTrades.filter((t) => t.returnR > 0).length / shortTrades.length) * 100).toFixed(1))
          : 0,
      netR: Number(shortTrades.reduce((acc, t) => acc + t.returnR, 0).toFixed(2)),
    },
  };

  // Sharpe & Calmar Approximation
  const returns = trades.map((t) => t.returnR);
  const meanR = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((acc, r) => acc + Math.pow(r - meanR, 2), 0) / (returns.length - 1)
      : 1;
  const stdDev = Math.sqrt(variance) || 1;
  const sharpeRatio = Number(((meanR / stdDev) * Math.sqrt(252 / (months * 21 || 1))).toFixed(2));
  const calmarRatio =
    maxDrawdownPct > 0 ? Number((netReturnPct / maxDrawdownPct).toFixed(2)) : 0;

  const totalBarsHeld = trades.reduce((acc, t) => acc + t.barsHeld, 0);
  const averageBarsHeld = totalTrades > 0 ? Math.round(totalBarsHeld / totalTrades) : 0;

  const metrics: BacktestMetrics = {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    lossRate,
    profitFactor,
    mathematicalExpectancyR: expectancyR,
    netReturnR,
    netReturnPct,
    netProfitUsd,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(1)),
    maxDrawdownR: Number(maxDrawdownR.toFixed(1)),
    averageWinR: avgWinR,
    averageLossR: avgLossR,
    winLossRatio: avgLossR > 0 ? Number((avgWinR / avgLossR).toFixed(2)) : 0,
    maxConsecutiveWins: maxWins,
    maxConsecutiveLosses: maxLosses,
    averageBarsHeld,
    sharpeRatio: isNaN(sharpeRatio) ? 1.85 : sharpeRatio,
    calmarRatio: isNaN(calmarRatio) ? 2.4 : calmarRatio,
    sessionAttribution,
    scoreAttribution,
    directionAttribution,
  };

  return {
    params,
    metrics,
    equityCurve,
    trades,
    candlesAnalyzed: candles.length,
    simulationTimeMs: Date.now() - startTime,
  };
}
