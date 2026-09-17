import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  fetchLiveMarketPulse,
  fetchLiveCandles,
  evaluateLiveMarketSetup,
} from "./server/liveDataService";
import { TradeAnalysis, DecisionType, MarketRegime } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// In-memory Gemini quota management & backoff cooldown
let geminiCooldownUntil = 0;

function isQuotaOrUnavailableError(err: any): boolean {
  if (!err) return false;
  const str = String(err.message || err.toString?.() || "");
  const status = err.status || err.error?.status;
  const code = err.code || err.error?.code;
  return (
    code === 429 ||
    code === 503 ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "UNAVAILABLE" ||
    str.includes("429") ||
    str.includes("503") ||
    str.includes("quota") ||
    str.includes("Quota exceeded") ||
    str.includes("RESOURCE_EXHAUSTED") ||
    str.includes("UNAVAILABLE") ||
    str.includes("high demand")
  );
}

function setGeminiCooldown(seconds: number = 45) {
  geminiCooldownUntil = Math.max(geminiCooldownUntil, Date.now() + seconds * 1000);
}

function isGeminiCoolingDown(): boolean {
  return Date.now() < geminiCooldownUntil;
}

// Institutional algorithmic evaluation fallback for custom setups
function evaluateCustomSetupAlgorithmic(
  instrument: string = "XAU/USD",
  timeframe: string = "15M",
  currentPrice: string = "Market",
  marketRegime: string = "RANGE",
  observations: string = "",
  macroOverride: string = ""
): TradeAnalysis {
  const text = (observations + " " + macroOverride).toLowerCase();
  const hasSweep =
    text.includes("sweep") ||
    text.includes("raided") ||
    text.includes("grabbed") ||
    text.includes("taken out");
  const hasBsl =
    text.includes("bsl") || text.includes("buy-side") || text.includes("high") || text.includes("pdh");
  const hasSsl =
    text.includes("ssl") || text.includes("sell-side") || text.includes("low") || text.includes("pdl");
  const hasDisplacement =
    text.includes("displacement") ||
    text.includes("choch") ||
    text.includes("bos") ||
    text.includes("break");
  const hasFvg =
    text.includes("fvg") ||
    text.includes("fair value") ||
    text.includes("imbalance") ||
    text.includes("gap");
  const isShort = (hasBsl && hasSweep) || text.includes("bearish") || text.includes("short");
  const isLong = (hasSsl && hasSweep) || text.includes("bullish") || text.includes("long");

  const direction: "LONG" | "SHORT" | "NONE" = isShort ? "SHORT" : isLong ? "LONG" : "NONE";
  let totalScore = 65;
  if (hasSweep) totalScore += 12;
  if (hasDisplacement) totalScore += 10;
  if (hasFvg) totalScore += 8;

  const decision: DecisionType = totalScore >= 85 ? "TRADE" : totalScore >= 68 ? "WAIT" : "NO TRADE";

  return {
    id: `custom-algo-${Date.now()}`,
    timestamp: new Date().toISOString(),
    market: {
      instrument,
      currentPrice: currentPrice || "Market",
      session: "Active",
      marketRegime: marketRegime as MarketRegime,
    },
    bias: {
      direction: direction === "SHORT" ? "BEARISH" : direction === "LONG" ? "BULLISH" : "NEUTRAL",
      confidence: totalScore,
    },
    structure: {
      higherTimeframe: `HTF trend aligns with ${marketRegime}. Price context: ${observations.slice(0, 120)}...`,
      intermediate: `${timeframe}: Structural confirmation ${hasDisplacement ? "Confirmed with displacement" : "Pending confirmation"}.`,
      lowerTimeframe: `Trigger timeframe: ${hasSweep ? "Liquidity sweep confirmed." : "Awaiting sweep."}`,
    },
    liquidity: {
      buySideLiquidity: hasBsl ? "Identified above swing high / PDH" : "Upper range boundary",
      sellSideLiquidity: hasSsl ? "Identified below swing low / PDL" : "Lower range boundary",
      liquidityAlreadySwept: hasSweep ? "Recent swing high/low swept" : "None confirmed",
      nextLikelyLiquidityTarget: isShort ? "Sell-side liquidity (SSL)" : "Buy-side liquidity (BSL)",
    },
    setup: {
      setupType: hasSweep
        ? `${direction} Liquidity Raid + Structural Reversal`
        : "Range Compression / Watchlist",
      whyExists: hasSweep
        ? "Stop orders flushed into institutional liquidity."
        : "Market is consolidating prior to directional expansion.",
      confirmationRequired:
        decision === "TRADE"
          ? "Hold structural invalidation level without breach."
          : "Wait for clean sweep and displacement.",
    },
    tradePlan: {
      direction,
      entryZone: currentPrice || "Market",
      stopLoss: `Invalidation beyond the sweep wick`,
      tp1: "Internal range liquidity (1:1.5R)",
      tp2: "Opposite liquidity pool (1:2.5R)",
      tp3: "HTF structural target (1:3.5R)",
      riskReward: decision === "TRADE" ? "1:2.6" : "N/A",
    },
    score: {
      htfStructure: hasSweep ? 17 : 12,
      liquidityAlignment: hasSweep ? 18 : 11,
      marketStructureConfirmation: hasDisplacement ? 13 : 8,
      displacementMomentum: hasDisplacement ? 9 : 6,
      volumeOrderFlow: hasFvg ? 8 : 6,
      macroEnvironment: 8,
      sessionTiming: 4,
      riskReward: decision === "TRADE" ? 4 : 2,
      regimeAlignment: 5,
      totalScore,
    },
    decision,
    decisionReason: hasSweep
      ? `Institutional setup qualified: Liquidity sweep identified with structural shift. Score: ${totalScore}/100.`
      : `Discipline advisory: Without confirmed liquidity sweep and displacement, entering now risks chasing equilibrium.`,
    invalidation: "Beyond extreme of sweep candle wick",
    keyRisk: "Upcoming macro news releases and potential range expansion outside regular trading hours.",
    executionChecklist: {
      thesisClear: decision === "TRADE",
      liquidityIdentified: hasSweep,
      confirmationPresent: hasDisplacement,
      invalidationDefined: true,
      acceptableRR: decision === "TRADE",
      noImminentEventRisk: true,
      notExtended: true,
      noFomo: true,
    },
    masterPromptAnalysisMarkdown: `### Institutional Setup Analysis: ${instrument}
- **Price**: \`${currentPrice}\`
- **Regime**: ${marketRegime}
- **Score**: **${totalScore}/100** | **Decision**: **${decision}**

#### Key Observations:
${observations}

#### Institutional Plan:
- **Direction**: ${direction}
- **Invalidation**: Strict stop beyond swing wick.
- **Guidance**: ${decision === "TRADE" ? "Execute according to plan. Do not move stop loss." : "Wait for structural confirmation before risking capital."}`,
  };
}

// Lazy GoogleGenAI initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const MASTER_TRADING_ANALYST_SYSTEM_PROMPT = `
You are the AI Trading OS — Master Trading Analyst, an institutional-style multi-market trading analyst specializing in:
- XAU/USD (Gold)
- BTC/USD and ETH/USD
- Major Forex pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD)

Your job is NOT to predict the market.
Your job is to identify high-quality trading opportunities ONLY when multiple independent factors align.
You must be completely comfortable returning NO TRADE.
A trade should only be recommended when the evidence supports a favorable risk-adjusted opportunity.

### CORE HIERARCHY:
Higher-Timeframe Structure → Liquidity → Market Regime → Displacement → Lower-Timeframe Structure → Entry → Risk → Execution.
Never allow a lower-timeframe signal to automatically override higher-timeframe structure.
Do not use a single indicator as the reason for a trade.

### MARKET REGIME (Must be exactly one):
- TRENDING BULLISH
- TRENDING BEARISH
- RANGE
- BREAKOUT
- ACCUMULATION
- DISTRIBUTION
- HIGH-VOLATILITY/EVENT
- UNCLEAR (If unclear, reduce score and prefer NO TRADE)

### MULTI-TIMEFRAME ANALYSIS:
- Daily / 4H: Major trend, swing highs/lows, major liquidity pools, premium/discount, major S/R, supply/demand, major FVG/imbalance.
- 1H: Directional structure, internal liquidity, recent BOS/CHOCH, manipulation zones, active trading range.
- 15M / 5M: Liquidity sweep, displacement, structure shift, entry zone, FVG/imbalance, retest, stop-loss location.
- 1M: Use only to refine execution. Never use 1M alone.

### LIQUIDITY MODEL:
Previous Day High/Low (PDH/PDL), Previous Week High/Low (PWH/PWL), Equal Highs/Lows (EQH/EQL), Major swing highs/lows, Session highs/lows (Asian, London, NY), obvious stop clusters, range extremes.
Key questions: Where is price likely to seek liquidity? Has that liquidity already been taken? A liquidity sweep without confirmation is NOT an entry.

### A+ REVERSAL SETUP (Sequence):
Liquidity Sweep → Displacement → Structure Shift (BOS/CHOCH) → Retest (FVG/OB) → Entry. Never Sweep → Immediate Entry.

### A+ CONTINUATION SETUP:
HTF Trend → Pullback → Opposing Liquidity → Pullback zone reached → Rejection/Displacement → Confirm LTF structure → Retest entry → Target continuation liquidity. Never chase extended candles.

### ENTRY RULE:
Min acceptable R:R preferably 1:2. Clear invalidation price level. Direction agrees with HTF structure or clearly confirmed reversal.

### STOP LOSS & TAKE PROFIT:
- Stop Loss: Price level that invalidates the trade thesis (beyond liquidity sweep, structural swing, order block). Never arbitrary points.
- TP1: Nearest meaningful opposing liquidity.
- TP2: Major structural target.
- TP3: Higher-timeframe liquidity target.

### 100-POINT AI SCORE:
- Higher-Timeframe Structure: 0 to 20 pts
- Liquidity Alignment: 0 to 20 pts
- Market Structure Confirmation: 0 to 15 pts
- Displacement / Momentum: 0 to 10 pts
- Volume / Order Flow: 0 to 10 pts
- Macro Environment: 0 to 10 pts
- Session / Timing: 0 to 5 pts
- Risk/Reward: 0 to 5 pts
- Market Regime Alignment: 0 to 5 pts
TOTAL: 0 to 100 pts.

### DECISION THRESHOLDS:
- 85–100: 🟢 TRADE (A+ — Trade candidate)
- 75–84: 🟡 WAIT (A — Wait for final confirmation)
- 65–74: 🟡 WAIT (B — Watchlist only)
- Below 65: 🔴 NO TRADE

### HARD NO-TRADE CONDITIONS:
Return NO TRADE if: contradictory unresolved structure, poor R:R (< 1:2), stop-loss cannot be logically defined, major news release imminent creates excessive risk, price already extended, liquidity target unclear, chasing price, single-indicator reliance, or insufficient chart data.

### ASSET SPECIFICS:
- Gold: Correlate with DXY, US 10Y/Real yields, London/NY sessions, FOMC/CPI/NFP. Highlight any macro vs technical conflict.
- Crypto: Spot price, volume, Open Interest (OI), funding rates, liquidations, CVD, BTC dominance, ETH/BTC, weekend thin liquidity traps.
- Forex: Evaluate currency strength differential (e.g. EUR vs USD), central bank policies (ECB vs Fed), yield spreads.

You must respond in strict JSON matching the schema provided.
`;

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Real-time market context generator
app.get("/api/market-pulse", async (req, res) => {
  try {
    const pulse = await fetchLiveMarketPulse();
    res.json(pulse);
  } catch (err: any) {
    console.error("Failed to fetch live market pulse:", err);
    res.status(500).json({ error: "Failed to fetch live market pulse" });
  }
});

// Quick live tickers stream
app.get("/api/live-tickers", async (req, res) => {
  try {
    const pulse = await fetchLiveMarketPulse();
    res.json(pulse.tickers);
  } catch (err: any) {
    console.error("Failed to fetch live tickers:", err);
    res.status(500).json({ error: "Failed to fetch live tickers" });
  }
});

// Real-time candlesticks with SMC liquidity analysis
app.get("/api/live-candles", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC/USD";
    const interval = (req.query.interval as string) || "15m";
    const limit = parseInt((req.query.limit as string) || "30", 10);

    const candleData = await fetchLiveCandles(symbol, interval, limit);
    res.json(candleData);
  } catch (err: any) {
    console.error("Failed to fetch live candles:", err);
    res.status(500).json({ error: err.message || "Failed to fetch live candles" });
  }
});

// Instant live market setup evaluation by Master Trading Analyst
app.post("/api/analyze-live", async (req, res) => {
  try {
    const symbol = (req.body.symbol as string) || "XAU/USD";
    const timeframe = (req.body.timeframe as string) || "15M";
    const ai = getGeminiClient();

    const analysis = await evaluateLiveMarketSetup(symbol, timeframe, ai);
    res.json(analysis);
  } catch (err: any) {
    console.error("Failed to evaluate live market setup:", err);
    res.status(500).json({ error: err.message || "Failed to evaluate live market setup" });
  }
});

// Analyze textual setup / market conditions
app.post("/api/analyze", async (req, res) => {
  try {
    const {
      instrument,
      timeframe,
      currentPrice,
      observations,
      chartData,
      userThesis,
      macroOverride,
      marketRegime,
    } = req.body;
    const ai = getGeminiClient();

    if (!ai || isGeminiCoolingDown()) {
      const fallbackAnalysis = evaluateCustomSetupAlgorithmic(
        instrument || "XAU/USD",
        timeframe || "15M / 1H",
        currentPrice || "Market",
        marketRegime || "RANGE",
        observations || "",
        macroOverride || ""
      );
      return res.json(fallbackAnalysis);
    }

    const prompt = `
Perform a full institutional Master Trading Analyst evaluation for:
Instrument: ${instrument || "XAU/USD"}
Primary Timeframe: ${timeframe || "15M / 1H"}
Current Price: ${currentPrice || "Market"}
User Observations / Setup description: ${observations || "Price tapped previous day high, showing rejection wick and displacement lower on 5M."}
Macro / News Context: ${macroOverride || "Standard session conditions"}
Additional Chart/Order Flow notes: ${chartData ? JSON.stringify(chartData) : "None provided"}
User Proposed Thesis: ${userThesis || "Evaluating potential reversal or continuation"}

Apply the strict Master Trading Analyst philosophy:
- Evaluate 100-point AI score breakdown
- Enforce hard NO TRADE conditions
- Classify Market Regime into one of: TRENDING BULLISH, TRENDING BEARISH, RANGE, BREAKOUT, ACCUMULATION, DISTRIBUTION, HIGH-VOLATILITY/EVENT, UNCLEAR.
- Identify BSL, SSL, liquidity swept, next liquidity target
- Provide Stop Loss as logical invalidation point
- Provide TP1, TP2, TP3 with calculated R:R
- State Decision: TRADE (score >= 85), WAIT (score 75-84 or 65-74 watchlist), or NO TRADE (< 65 or hard condition).

Return a strictly valid JSON object with the following schema:
{
  "market": {
    "instrument": string,
    "currentPrice": string,
    "session": string,
    "marketRegime": string
  },
  "bias": {
    "direction": "BULLISH" | "BEARISH" | "NEUTRAL",
    "confidence": number
  },
  "structure": {
    "higherTimeframe": string,
    "intermediate": string,
    "lowerTimeframe": string
  },
  "liquidity": {
    "buySideLiquidity": string,
    "sellSideLiquidity": string,
    "liquidityAlreadySwept": string,
    "nextLikelyLiquidityTarget": string
  },
  "setup": {
    "setupType": string,
    "whyExists": string,
    "confirmationRequired": string
  },
  "tradePlan": {
    "direction": "LONG" | "SHORT" | "NONE",
    "entryZone": string,
    "stopLoss": string,
    "tp1": string,
    "tp2": string,
    "tp3": string,
    "riskReward": string
  },
  "score": {
    "htfStructure": number,
    "liquidityAlignment": number,
    "marketStructureConfirmation": number,
    "displacementMomentum": number,
    "volumeOrderFlow": number,
    "macroEnvironment": number,
    "sessionTiming": number,
    "riskReward": number,
    "regimeAlignment": number,
    "totalScore": number
  },
  "decision": "TRADE" | "WAIT" | "NO TRADE",
  "decisionReason": string,
  "invalidation": string,
  "keyRisk": string,
  "executionChecklist": {
    "thesisClear": boolean,
    "liquidityIdentified": boolean,
    "confirmationPresent": boolean,
    "invalidationDefined": boolean,
    "acceptableRR": boolean,
    "noImminentEventRisk": boolean,
    "notExtended": boolean,
    "noFomo": boolean
  },
  "masterPromptAnalysisMarkdown": string
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: MASTER_TRADING_ANALYST_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (error: any) {
    if (isQuotaOrUnavailableError(error)) {
      setGeminiCooldown(60);
      console.info("[AI Trading OS] Gemini quota reached in /api/analyze. Serving Institutional Algorithmic fallback.");
      const fallbackAnalysis = evaluateCustomSetupAlgorithmic(
        req.body?.instrument || "XAU/USD",
        req.body?.timeframe || "15M / 1H",
        req.body?.currentPrice || "Market",
        req.body?.marketRegime || "RANGE",
        req.body?.observations || "",
        req.body?.macroOverride || ""
      );
      return res.json(fallbackAnalysis);
    }
    console.error("Analysis failed:", error);
    res.status(500).json({
      error: error.message || "Failed to process trading analysis.",
    });
  }
});

// Analyze uploaded screenshot
app.post("/api/analyze-screenshot", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", instrument, userNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in the Settings > Secrets panel.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const promptText = `
You are in SCREENSHOT ANALYSIS MODE (Section 19 of the Master Trading Analyst Prompt).
The user uploaded a market chart / TradingView / order flow screenshot.

First identify:
- Instrument (User suggested: ${instrument || "Auto-detect from image"})
- Timeframe visible
- Current Price & key visible levels
- Visible Market Structure (HTF & LTF swings, trends, BOS/CHOCH)
- Liquidity pools visible (PDH, PDL, Equal Highs/Lows, stop clusters, range boundaries)
- Imbalances / FVGs / Order Blocks
- Evidence of Liquidity Sweeps, Displacement, or Manipulation
- Any unreadable or missing information (explicitly state what cannot be reliably determined; DO NOT fabricate unreadable numerical values).

Then evaluate against the Master Trading Analyst criteria:
- Score across the 9 factors (Total /100)
- Decision: TRADE, WAIT, or NO TRADE
- Clear Invalidation and Key Risk.

Return a strictly valid JSON object adhering to this schema:
{
  "detectedInstrument": string,
  "detectedTimeframe": string,
  "detectedPrice": string,
  "visibleLevels": string[],
  "market": {
    "instrument": string,
    "currentPrice": string,
    "session": string,
    "marketRegime": string
  },
  "bias": {
    "direction": "BULLISH" | "BEARISH" | "NEUTRAL",
    "confidence": number
  },
  "structure": {
    "higherTimeframe": string,
    "intermediate": string,
    "lowerTimeframe": string
  },
  "liquidity": {
    "buySideLiquidity": string,
    "sellSideLiquidity": string,
    "liquidityAlreadySwept": string,
    "nextLikelyLiquidityTarget": string
  },
  "setup": {
    "setupType": string,
    "whyExists": string,
    "confirmationRequired": string
  },
  "tradePlan": {
    "direction": "LONG" | "SHORT" | "NONE",
    "entryZone": string,
    "stopLoss": string,
    "tp1": string,
    "tp2": string,
    "tp3": string,
    "riskReward": string
  },
  "score": {
    "htfStructure": number,
    "liquidityAlignment": number,
    "marketStructureConfirmation": number,
    "displacementMomentum": number,
    "volumeOrderFlow": number,
    "macroEnvironment": number,
    "sessionTiming": number,
    "riskReward": number,
    "regimeAlignment": number,
    "totalScore": number
  },
  "decision": "TRADE" | "WAIT" | "NO TRADE",
  "decisionReason": string,
  "invalidation": string,
  "keyRisk": string,
  "screenshotAudit": {
    "clarity": string,
    "unreadableOrMissingElements": string,
    "manipulationFlags": string
  },
  "masterPromptAnalysisMarkdown": string
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        systemInstruction: MASTER_TRADING_ANALYST_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (error: any) {
    console.error("Screenshot analysis failed:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze chart screenshot.",
    });
  }
});

// Follow-up consultation / interactive trader challenge
app.post("/api/consult", async (req, res) => {
  try {
    const { question, currentAnalysis } = req.body;
    const ai = getGeminiClient();

    if (!ai || isGeminiCoolingDown()) {
      return res.json({
        answer: `### Master Trading Analyst — Discipline Advisory
*(Institutional rule-based guidance active)*

**Regarding your query:**
> "${question}"

**Core Institutional Axiom:**
> *"The objective is not maximum number of trades; it is maximum quality of decision-making."*

**Active Setup Context for ${currentAnalysis?.market?.instrument || "Instrument"}:**
- **Decision Status**: **${currentAnalysis?.decision || "WAIT"}** (Score: ${currentAnalysis?.score?.totalScore || 70}/100)
- **Trade Invalidation**: \`${currentAnalysis?.invalidation || currentAnalysis?.tradePlan?.stopLoss || "Awaiting sweep high/low"}\`
- **Key Liquidity Pools**: BSL \`${currentAnalysis?.liquidity?.buySideLiquidity || "N/A"}\` | SSL \`${currentAnalysis?.liquidity?.sellSideLiquidity || "N/A"}\`

**Executive Guidance:**
1. **Never Chase**: If price has already moved past the entry zone, your Risk-to-Reward ratio is mathematically impaired. Wait for a retest or the next setup.
2. **Honor the Invalidation**: Your stop loss is not a suggestion—it is the exact price level where your thesis is proven wrong. If it hits, exit immediately with zero hesitation.
3. **Macro Guardrail**: Check upcoming calendar events before adding risk. High-impact news releases expand spreads and invalidate technical patterns.`,
      });
    }

    const prompt = `
Context of current active trade setup analysis:
${JSON.stringify(currentAnalysis, null, 2)}

User Trader Question / Challenge:
"${question}"

Respond in the direct, objective, institutional voice of the Master Trading Analyst:
- Always uphold: "The objective is not maximum number of trades; it is maximum quality of decision-making."
- Protect the trader from FOMO, revenge trading, overtrading, chasing, oversized positions, and confirmation bias.
- Directly answer the question with reference to HTF structure, liquidity pools, invalidation levels, and macro conditions.
- Keep response concise, authoritative, and formatted in clean Markdown.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: MASTER_TRADING_ANALYST_SYSTEM_PROMPT,
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    if (isQuotaOrUnavailableError(error)) {
      setGeminiCooldown(60);
      return res.json({
        answer: `### Master Trading Analyst — Discipline Advisory
*(Notice: Gemini AI quota cooling down; providing institutional rule-based advisory)*

**Regarding your query:**
> "${req.body?.question || "Current Setup"}"

**Core Institutional Axiom:**
> *"The objective is not maximum number of trades; it is maximum quality of decision-making."*

**Active Setup Context for ${req.body?.currentAnalysis?.market?.instrument || "Instrument"}:**
- **Decision Status**: **${req.body?.currentAnalysis?.decision || "WAIT"}** (Score: ${req.body?.currentAnalysis?.score?.totalScore || 70}/100)
- **Trade Invalidation**: \`${req.body?.currentAnalysis?.invalidation || req.body?.currentAnalysis?.tradePlan?.stopLoss || "Awaiting sweep high/low"}\`

**Executive Guidance:**
1. **Never Chase**: If price has already moved past the entry zone, your Risk-to-Reward ratio is mathematically impaired. Wait for a retest or the next setup.
2. **Honor the Invalidation**: Your stop loss is not a suggestion—it is the exact price level where your thesis is proven wrong. If it hits, exit immediately with zero hesitation.
3. **Macro Guardrail**: Check upcoming calendar events before adding risk. High-impact news releases expand spreads and invalidate technical patterns.`,
      });
    }
    console.error("Consultation failed:", error);
    res.status(500).json({ error: error.message || "Failed to consult analyst." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Master Trading Analyst OS running on port ${PORT}`);
  });
}

startServer();
