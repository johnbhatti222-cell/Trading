/**
 * Institutional Technical Indicator Engine: RSI (Relative Strength Index)
 * Implements standard Wilder's RSI smoothing with configurable period (default: 14)
 */

export interface RsiResult {
  values: (number | null)[];
  currentRsi: number;
  condition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
  isOverbought: boolean;
  isOversold: boolean;
  overboughtThreshold: number;
  oversoldThreshold: number;
  divergence?: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | null;
}

/**
 * Calculates Wilder's RSI from an array of numeric close prices.
 * Returns null for bars prior to the initial period.
 */
export function calculateRSI(
  closes: number[],
  period: number = 14,
  overboughtThreshold: number = 70,
  oversoldThreshold: number = 30
): RsiResult {
  if (!closes || closes.length === 0) {
    return {
      values: [],
      currentRsi: 50,
      condition: "NEUTRAL",
      isOverbought: false,
      isOversold: false,
      overboughtThreshold,
      oversoldThreshold,
    };
  }

  if (closes.length <= 1) {
    return {
      values: [50],
      currentRsi: 50,
      condition: "NEUTRAL",
      isOverbought: false,
      isOversold: false,
      overboughtThreshold,
      oversoldThreshold,
    };
  }

  const values: (number | null)[] = new Array(closes.length).fill(null);

  // If we have fewer candles than period, adapt period so user always gets accurate dynamic RSI
  const effectivePeriod = Math.min(period, Math.max(3, Math.floor(closes.length / 2)));

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Calculate initial average gain and loss
  let initialGain = 0;
  let initialLoss = 0;

  for (let i = 0; i < effectivePeriod && i < changes.length; i++) {
    const diff = changes[i];
    if (diff > 0) initialGain += diff;
    else initialLoss += Math.abs(diff);
  }

  let avgGain = initialGain / effectivePeriod;
  let avgLoss = initialLoss / effectivePeriod;

  if (avgLoss === 0) {
    values[effectivePeriod] = 100;
  } else {
    const rs = avgGain / avgLoss;
    values[effectivePeriod] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  // Wilder's Exponential Smoothing for subsequent bars
  for (let i = effectivePeriod; i < changes.length; i++) {
    const diff = changes[i];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (effectivePeriod - 1) + gain) / effectivePeriod;
    avgLoss = (avgLoss * (effectivePeriod - 1) + loss) / effectivePeriod;

    if (avgLoss === 0) {
      values[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      values[i + 1] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  // Backfill early bars with smooth ramp to first valid value so line is visually continuous
  const firstValidIndex = values.findIndex((v) => v !== null);
  const baseline = firstValidIndex !== -1 ? (values[firstValidIndex] as number) : 50;

  for (let i = 0; i < closes.length; i++) {
    if (values[i] === null) {
      // Estimate baseline around 50 based on initial momentum
      const progress = (i + 1) / (firstValidIndex + 1 || 1);
      values[i] = Number((50 + (baseline - 50) * progress).toFixed(2));
    }
  }

  const currentRsi = values[values.length - 1] ?? 50;
  const isOverbought = currentRsi >= overboughtThreshold;
  const isOversold = currentRsi <= oversoldThreshold;

  let condition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
  if (isOverbought) condition = "OVERBOUGHT";
  else if (isOversold) condition = "OVERSOLD";

  // Check for simple RSI Divergence in last 10 bars
  let divergence: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | null = null;
  if (closes.length >= 8) {
    const len = closes.length;
    const priceNow = closes[len - 1];
    const pricePrev = closes[len - 5];
    const rsiNow = values[len - 1] ?? 50;
    const rsiPrev = values[len - 5] ?? 50;

    // Bearish Divergence: Price higher high, RSI lower high (in overbought zone)
    if (priceNow > pricePrev && rsiNow < rsiPrev && rsiNow > 58) {
      divergence = "BEARISH_DIVERGENCE";
    }
    // Bullish Divergence: Price lower low, RSI higher low (in oversold zone)
    else if (priceNow < pricePrev && rsiNow > rsiPrev && rsiNow < 42) {
      divergence = "BULLISH_DIVERGENCE";
    }
  }

  return {
    values,
    currentRsi,
    condition,
    isOverbought,
    isOversold,
    overboughtThreshold,
    oversoldThreshold,
    divergence,
  };
}
