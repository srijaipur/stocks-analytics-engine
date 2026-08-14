// ======================================================
// TREND REGIME ANALYSIS ENGINE
// ======================================================
// Classifies trend regime and confirms signal strength
// Identifies continuation vs reversal scenarios
// ======================================================

/**
 * Analyze trend regime for a stock
 * @param {Object} stock - Stock data with technical metrics
 * @returns {Object} Regime analysis with classification and confidence
 */
export function analyzeTrendRegime(stock) {
  if (!stock || stock.Ticker === undefined) {
    return null;
  }

  const regime = classifyRegime(stock);
  const strength = computeRegimeStrength(stock);
  const confidence = computeRegimeConfidence(stock);
  const actionability = computeActionability(regime);
  const description = generateRegimeDescription(regime, stock);
  const nextMove = predictNextMove(regime, stock);
  const catalysts = identifyCatalysts(regime, stock);

  return {
    ticker: stock.Ticker,
    regime, // String name of regime
    strength, // 0-100 (how clearly defined)
    confidence, // 0-100 (statistical confidence)
    actionability, // 0-100 (clarity for action)
    description, // Human readable regime name
    nextMove, // Expected next price move
    catalysts, // What could change regime
    // Store raw scores for sorting
    strengthNum: strength,
    confidenceNum: confidence,
    actionabilityNum: actionability,
  };
}

/**
 * Regime Classification (5 regimes)
 */
function classifyRegime(stock) {
  const score = stock.New_Composite_Score || 0;
  const slope = stock.MA_Slope_50 || 0;
  const rsi = stock.RSI_14Day || 50;

  // Normalize slope to 0-100 scale
  const slopeNorm = ((slope + 0.1) / 0.2) * 100;

  // STRONG UPTREND: Score ≥ 75, Slope > 0, RSI 40-60
  if (score >= 75 && slopeNorm > 50 && rsi >= 40 && rsi <= 60) {
    return "STRONG_UPTREND";
  }

  // WEAK UPTREND: Score ≥ 60, Slope > 0
  if (score >= 60 && slopeNorm > 50) {
    return "WEAK_UPTREND";
  }

  // NEUTRAL: Score 40-59, Slope ≈ 0 (±0.01)
  if (score >= 40 && score < 60 && Math.abs(slope) < 0.01) {
    return "NEUTRAL";
  }

  // WEAK DOWNTREND: Score 20-39, Slope < 0
  if (score >= 20 && score < 40 && slopeNorm < 50) {
    return "WEAK_DOWNTREND";
  }

  // STRONG DOWNTREND: Score < 20, Slope < 0, RSI < 30
  if (score < 20 && slopeNorm < 50 && rsi < 30) {
    return "STRONG_DOWNTREND";
  }

  return "UNCLEAR";
}

/**
 * Regime Strength (0-100: how clearly defined)
 */
function computeRegimeStrength(stock) {
  const score = stock.New_Composite_Score || 0;
  const slope = stock.MA_Slope_50 || 0;
  const rsi = stock.RSI_14Day || 50;

  let strength = 50; // Baseline

  // Score distance from center
  if (score >= 75) strength += Math.min(25, (score - 75) * 5);
  else if (score >= 60) strength += 15;
  else if (score < 40) strength -= 15;

  // Slope magnitude
  if (Math.abs(slope) > 0.03) strength += 15;
  else if (Math.abs(slope) < 0.01) strength -= 10;

  // RSI distance from neutral 50
  const rsiDist = Math.abs(rsi - 50);
  if (rsiDist > 15) strength += 10;
  else if (rsiDist < 5) strength -= 10;

  return Math.max(0, Math.min(100, strength));
}

/**
 * Regime Confidence (0-100: agreement across signals)
 */
function computeRegimeConfidence(stock) {
  const score = stock.New_Composite_Score || 0;
  const slope = stock.MA_Slope_50 || 0;
  const rsi = stock.RSI_14Day || 50;
  const delta = stock.Daily_Composite_Score_delta || 0;
  const sma200Dist = stock.SMA200_Dist || 0;

  let agreements = 0;
  const totalChecks = 4;

  // Check 1: Score direction aligns with slope
  if ((score >= 60 && slope > 0) || (score < 40 && slope < 0)) {
    agreements++;
  }

  // Check 2: RSI aligns with trend
  if ((slope > 0 && rsi > 40) || (slope < 0 && rsi < 60)) {
    agreements++;
  }

  // Check 3: Daily momentum same direction as trend
  if ((slope > 0 && delta > 0) || (slope < 0 && delta < 0)) {
    agreements++;
  }

  // Check 4: Price position vs 200MA
  if ((slope > 0 && sma200Dist > 0) || (slope < 0 && sma200Dist < 0)) {
    agreements++;
  }

  return (agreements / totalChecks) * 100;
}

/**
 * Actionability (0-100: clarity for action)
 */
function computeActionability(regime) {
  const actionMap = {
    STRONG_UPTREND: 90,
    WEAK_UPTREND: 60,
    NEUTRAL: 30,
    WEAK_DOWNTREND: 60,
    STRONG_DOWNTREND: 90,
    UNCLEAR: 20,
  };

  return actionMap[regime] || 0;
}

/**
 * Regime description
 */
function generateRegimeDescription(regime, stock) {
  const regimeNames = {
    STRONG_UPTREND: "🟢 Strong Uptrend - Clear Buy Signal",
    WEAK_UPTREND: "🟢 Weak Uptrend - Mixed Signals, Monitor",
    NEUTRAL: "⚪ Neutral Range - Breakout Pending",
    WEAK_DOWNTREND: "🔴 Weak Downtrend - Deteriorating, Consider Exit",
    STRONG_DOWNTREND: "🔴 Strong Downtrend - Clear Sell Signal",
    UNCLEAR: "❓ Unclear Regime - More Data Needed",
  };

  return regimeNames[regime] || regime;
}

/**
 * Predict next likely move
 */
function predictNextMove(regime, stock) {
  const predictions = {
    STRONG_UPTREND:
      "Likely to continue higher. Watch for RSI > 70 (overbought pullback opportunity).",
    WEAK_UPTREND:
      "Could accelerate or consolidate. Await confirmation above resistance.",
    NEUTRAL:
      "Range-bound. Clear breakout likely once regime clarifies. Watch 52-week levels.",
    WEAK_DOWNTREND:
      "Could reverse if score bounces. Monitor support levels and volume.",
    STRONG_DOWNTREND:
      "Likely to continue lower. Avoid long positions; consider short setup.",
    UNCLEAR:
      "Regime unclear. Gather more data or wait for clearer price action.",
  };

  return predictions[regime] || "Unknown regime";
}

/**
 * Identify catalysts for regime change
 */
function identifyCatalysts(regime, stock) {
  const catalysts = [];

  switch (regime) {
    case "STRONG_UPTREND":
      catalysts.push("Score drops below 75 → Upgrade to WEAK_UPTREND");
      catalysts.push("RSI crosses above 70 → Overbought pullback");
      catalysts.push("MA Slope turns negative → Downtrend risk");
      break;

    case "WEAK_UPTREND":
      catalysts.push("Score breaks 80 → Upgrade to STRONG_UPTREND");
      catalysts.push("Score falls below 60 → Downgrade to NEUTRAL");
      catalysts.push("Volume spike → Momentum confirmation needed");
      break;

    case "NEUTRAL":
      catalysts.push("Score break above 60 + Slope > 0 → Uptrend");
      catalysts.push("Score break below 40 + Slope < 0 → Downtrend");
      catalysts.push("Earnings announcement → Potential sharp move");
      break;

    case "WEAK_DOWNTREND":
      catalysts.push("Score bounces above 50 → Reversal opportunity");
      catalysts.push("Support hold + volume surge → Uptrend signal");
      catalysts.push("Score falls to <20 → STRONG_DOWNTREND risk");
      break;

    case "STRONG_DOWNTREND":
      catalysts.push("Score rises above 40 + Slope > 0 → Reversal");
      catalysts.push("RSI crosses above 30 (oversold bounce)");
      catalysts.push("Support holds on volume → Turnaround setup");
      break;

    default:
      catalysts.push("Wait for regime clarity before acting");
  }

  return catalysts;
}

/**
 * Compute all regime analyses
 */
export function computeAllRegimes(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((stock) => analyzeTrendRegime(stock))
    .filter((r) => r !== null);
}

/**
 * Count stocks by regime
 */
export function countByRegime(regimes) {
  const counts = {};

  regimes.forEach((r) => {
    counts[r.regime] = (counts[r.regime] || 0) + 1;
  });

  return {
    STRONG_UPTREND: counts.STRONG_UPTREND || 0,
    WEAK_UPTREND: counts.WEAK_UPTREND || 0,
    NEUTRAL: counts.NEUTRAL || 0,
    WEAK_DOWNTREND: counts.WEAK_DOWNTREND || 0,
    STRONG_DOWNTREND: counts.STRONG_DOWNTREND || 0,
    UNCLEAR: counts.UNCLEAR || 0,
  };
}

/**
 * Filter regimes by type
 */
export function filterByRegime(regimes, regimeType) {
  return regimes.filter((r) => r.regime === regimeType);
}

/**
 * Rank regimes by actionability
 */
export function rankByActionability(regimes) {
  return [...regimes].sort(
    (a, b) => b.actionabilityNum - a.actionabilityNum
  );
}

/**
 * Assess momentum sustainability
 */
export function assessMomentumSustainability(stock) {
  const rsi = stock.RSI_14Day || 50;
  const delta = stock.Daily_Composite_Score_delta || 0;
  const slopeNorm = ((stock.MA_Slope_50 || 0) + 0.1) / 0.2;

  let sustainability = "UNSUSTAINABLE";
  let reason = "";

  if (slopeNorm > 0.5 && rsi >= 40 && rsi <= 60 && delta > 0) {
    sustainability = "SUSTAINABLE";
    reason = "Strong momentum, RSI neutral, positive delta";
  } else if (slopeNorm > 0.5 && delta > 0) {
    sustainability = "MODERATELY_SUSTAINABLE";
    reason = "Uptrend intact but RSI may indicate exhaustion";
  } else if (rsi > 70 || rsi < 30) {
    sustainability = "AT_RISK";
    reason = "Extreme RSI suggests reversal likely";
  }

  return {
    ticker: stock.Ticker,
    sustainability,
    reason,
    rsi,
    delta,
  };
}
