export type MarketRegime =
  | "TRENDING BULLISH"
  | "TRENDING BEARISH"
  | "RANGE"
  | "BREAKOUT"
  | "ACCUMULATION"
  | "DISTRIBUTION"
  | "HIGH-VOLATILITY/EVENT"
  | "UNCLEAR";

export type DecisionType = "TRADE" | "WAIT" | "NO TRADE";

export interface ScoreBreakdown {
  htfStructure: number; // 20
  liquidityAlignment: number; // 20
  marketStructureConfirmation: number; // 15
  displacementMomentum: number; // 10
  volumeOrderFlow: number; // 10
  macroEnvironment: number; // 10
  sessionTiming: number; // 5
  riskReward: number; // 5
  regimeAlignment: number; // 5
  totalScore: number; // 100
}

export interface TradeAnalysis {
  id?: string;
  timestamp?: string;
  market: {
    instrument: string;
    currentPrice: string;
    session: string;
    marketRegime: MarketRegime | string;
  };
  bias: {
    direction: "BULLISH" | "BEARISH" | "NEUTRAL";
    confidence: number;
  };
  structure: {
    higherTimeframe: string;
    intermediate: string;
    lowerTimeframe: string;
  };
  liquidity: {
    buySideLiquidity: string;
    sellSideLiquidity: string;
    liquidityAlreadySwept: string;
    nextLikelyLiquidityTarget: string;
  };
  setup: {
    setupType: string;
    whyExists: string;
    confirmationRequired: string;
  };
  tradePlan: {
    direction: "LONG" | "SHORT" | "NONE";
    entryZone: string;
    stopLoss: string;
    tp1: string;
    tp2: string;
    tp3: string;
    riskReward: string;
  };
  score: ScoreBreakdown;
  decision: DecisionType;
  decisionReason: string;
  invalidation: string;
  keyRisk: string;
  executionChecklist?: {
    thesisClear: boolean;
    liquidityIdentified: boolean;
    confirmationPresent: boolean;
    invalidationDefined: boolean;
    acceptableRR: boolean;
    noImminentEventRisk: boolean;
    notExtended: boolean;
    noFomo: boolean;
  };
  screenshotAudit?: {
    clarity: string;
    unreadableOrMissingElements: string;
    manipulationFlags: string;
  };
  rsi?: {
    value: number;
    condition: string;
  };
  masterPromptAnalysisMarkdown?: string;
}

export interface JournalRecord {
  id: string;
  createdAt: string;
  instrument: string;
  setup: string;
  direction: "LONG" | "SHORT";
  timeframe: string;
  entry: string;
  stop: string;
  targets: string;
  score: number;
  marketRegime: string;
  session: string;
  newsEnvironment: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  resultInR: number; // e.g. +2.4R, -1.0R
  mfe: number; // Max Favorable Excursion (R)
  mae: number; // Max Adverse Excursion (R)
  executionQuality: "A+" | "Clean" | "Chased Entry" | "Premature Exit" | "Hesitated";
  mistakeClassification: "None" | "FOMO" | "Chased Price" | "Ignored Macro" | "Moved Stop" | "Over-leveraged";
  sniperPrecision?: "A+ Sniper (Within OTE)" | "Clean Retest (FVG Boundary)" | "Chased (>0.5R Slippage)" | "Premature (No Sweep)";
  screenshot?: string;
  aiThesis: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

export interface MarketTicker {
  symbol: string;
  name: string;
  category: "GOLD" | "CRYPTO" | "FOREX" | "MACRO" | "INDEX";
  price: string;
  change24h: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  high24h: string;
  low24h: string;
  keyLiquidity: string;
  pdh: string;
  pdl: string;
  rawPrice?: number;
  rawChange24h?: number;
  // Snipe Execution Authorization fields
  isAuthorized?: boolean;
  executionStatus?: "AUTHORIZED" | "NOT AUTHORIZED" | "MARKET CLOSED";
  statusText?: string;
  score?: number;
  decision?: "TRADE" | "WAIT" | "NO TRADE" | "MARKET CLOSED";
  setupType?: string;
}

export interface LiveCandle {
  timestamp: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isSweep?: boolean;
  isDisplacement?: boolean;
  isBOS?: boolean;
  isRetest?: boolean;
  isCurrent?: boolean;
}

export interface LiveMarketPulse {
  timestamp: string;
  session: string;
  activeSessions: string[];
  tickers: MarketTicker[];
  macro: {
    dxy: { value: string; trend: string; impactOnGold: string; impactOnCrypto: string; rawValue: number };
    us10y: { value: string; trend: string; realYield: string };
    btcFundingRate?: { value: string; rawRate: number; sentiment: string };
    btcOpenInterest?: { value: string; rawBtc: number; usdValue: string };
    riskSentiment: string;
  };
  upcomingEvents: {
    event: string;
    timeIn: string;
    impact: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    warning: string;
  }[];
  sentiment?: MarketSentimentData;
}

export interface InstrumentSentiment {
  symbol: string; // "BTC/USD" | "USD/JPY" | "US30" | "XAU/USD"
  name: string;
  score: number; // 0 - 100
  classification: "EXTREME_FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME_GREED";
  label: string; // e.g. "Greed (71/100)"
  signal: "RISK_ON" | "RISK_OFF" | "NEUTRAL" | "HEDGE_ACCUMULATION";
  summary: string;
  primaryMetric: {
    label: string;
    value: string;
    source: string;
  };
  change24h?: string;
  historicalScores?: { date: string; score: number }[];
}

export interface SectorCorrelationItem {
  id: string;
  pair: string; // e.g. "BTC/USD vs US30"
  coefficient: number; // -1.00 to +1.00
  regime: "STRONG_POSITIVE" | "MODERATE_POSITIVE" | "UNCORRELATED" | "MODERATE_NEGATIVE" | "STRONG_INVERSE";
  interpretation: string;
  flowDriver: string;
}

export interface MarketSentimentData {
  timestamp: string;
  overallRegime: "RISK_ON" | "RISK_OFF" | "SELECTIVE_ROTATION" | "NEUTRAL";
  globalFearGreedScore: number;
  globalFearGreedLabel: string;
  instruments: {
    btc: InstrumentSentiment;
    us30: InstrumentSentiment;
    usdJpy: InstrumentSentiment;
    xau: InstrumentSentiment;
  };
  correlations: SectorCorrelationItem[];
  apiSources: {
    crypto: string;
    equities: string;
    forex: string;
    gold: string;
  };
}

export interface LiveCandlesResponse {
  symbol: string;
  binanceSymbol: string;
  interval: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  pdh: number;
  pdl: number;
  bsl: number;
  ssl: number;
  recentSweep: "BSL_SWEPT" | "SSL_SWEPT" | "BULLISH_BOS" | "BEARISH_BOS" | "NONE";
  sweepDetail?: string;
  isBreakout?: boolean;
  breakoutLevel?: number;
  breakoutType?: "BULLISH_BOS" | "BEARISH_BOS";
  rsi?: {
    value: number;
    condition: string;
  };
  activeFvgs: {
    type: "BULLISH" | "BEARISH";
    top: number;
    bottom: number;
  }[];
  candles: LiveCandle[];
}

export interface ScannerConfig {
  enabled: boolean;
  thresholdScore: number;
  instruments: string[];
  telegramEnabled: boolean;
  botToken?: string;
  chatId?: string;
  cooldownMinutes: number;
  soundEnabled: boolean;
}

export interface DetectedAlert {
  id: string;
  timestamp: string;
  instrument: string;
  score: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  decision: "TRADE" | "WAIT";
  currentPrice: string;
  entry: string;
  stopLoss: string;
  tp1: string;
  tp2?: string;
  riskReward: string;
  reason: string;
  session: string;
  rsi?: {
    value: number;
    condition: string;
  };
  isMarketOpen?: boolean;
  telegramSent: boolean;
  telegramError?: string;
  analysis?: TradeAnalysis;
}

export interface ScannerStatus {
  isRunning: boolean;
  config: ScannerConfig;
  lastScanTime: string | null;
  nextScanTime: string | null;
  activeInstrumentCount: number;
  recentAlerts: DetectedAlert[];
  latestEvaluations: Record<
    string,
    {
      instrument: string;
      score: number;
      decision: string;
      direction: string;
      currentPrice: string;
      lastUpdated: string;
      recentSweep?: string;
      rsi?: {
        value: number;
        condition: string;
      };
      isMarketOpen?: boolean;
      marketStatusText?: string;
    }
  >;
}

export interface BacktestParams {
  instrument: string;
  timeframe: string;
  period: "1M" | "3M" | "6M" | "12M";
  thresholdScore: number;
  riskRewardRatio: number; // e.g. 2.0, 2.5, 3.0
  tpStrategy: "FIXED_RR" | "TRAILING_BE" | "DYNAMIC_PARTIAL";
  sessionFilter: "ALL" | "KILLZONES_ONLY" | "LONDON_ONLY" | "NY_ONLY";
  riskPerTradePct: number; // e.g. 1.0%
  initialBalance: number; // e.g. $10,000
}

export interface BacktestFactorsBreakdown {
  htfStructure: number; // Max 20
  liquiditySweep: number; // Max 20
  marketStructureShift: number; // Max 15
  displacement: number; // Max 10
  fvgRetest: number; // Max 10
  macroRegime: number; // Max 10
  sessionKillzone: number; // Max 5
  riskReward: number; // Max 5
  invalidationClarity: number; // Max 5
  totalScore: number;
}

export interface BacktestTrade {
  id: string;
  tradeNumber: number;
  entryDate: string;
  exitDate: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  exitReason: "TP_HIT" | "SL_HIT" | "BREAKEVEN" | "TIME_EXPIRED";
  barsHeld: number;
  confluenceScore: number;
  factors: BacktestFactorsBreakdown;
  session: string;
  returnR: number;
  pnlUsd: number;
  pnlPct: number;
  runningBalance: number;
  drawdownPct: number;
  setupType: string;
  isWin: boolean;
}

export interface EquityCurvePoint {
  tradeNumber: number;
  date: string;
  equity: number;
  cumulativeR: number;
  drawdownPct: number;
  tradeReturnR: number;
  isWin: boolean;
  peakEquity: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // percentage
  lossRate: number;
  profitFactor: number;
  mathematicalExpectancyR: number; // E = (Win% * AvgWin) - (Loss% * AvgLoss) in R
  netReturnR: number;
  netReturnPct: number;
  netProfitUsd: number;
  maxDrawdownPct: number;
  maxDrawdownR: number;
  averageWinR: number;
  averageLossR: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageBarsHeld: number;
  sharpeRatio: number;
  calmarRatio: number;
  sessionAttribution: {
    session: string;
    trades: number;
    winRate: number;
    netR: number;
    profitFactor: number;
  }[];
  scoreAttribution: {
    bracket: string;
    trades: number;
    winRate: number;
    netR: number;
  }[];
  directionAttribution: {
    longs: { trades: number; winRate: number; netR: number };
    shorts: { trades: number; winRate: number; netR: number };
  };
}

export interface BacktestResult {
  params: BacktestParams;
  metrics: BacktestMetrics;
  equityCurve: EquityCurvePoint[];
  trades: BacktestTrade[];
  candlesAnalyzed: number;
  simulationTimeMs: number;
}


