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
  screenshot?: string;
  aiThesis: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

export interface MarketTicker {
  symbol: string;
  name: string;
  category: "GOLD" | "CRYPTO" | "FOREX" | "MACRO";
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
  recentSweep: "BSL_SWEPT" | "SSL_SWEPT" | "NONE";
  sweepDetail?: string;
  activeFvgs: {
    type: "BULLISH" | "BEARISH";
    top: number;
    bottom: number;
  }[];
  candles: LiveCandle[];
}

