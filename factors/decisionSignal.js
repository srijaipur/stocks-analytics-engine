// ======================================================
// DECISION SIGNAL ENGINE
// ======================================================
// Generates explicit BUY/SELL/HOLD trading recommendations
// based on multi-factor decision tree analysis
// ======================================================

/**
 * Compute decision signal (BUY/SELL/HOLD) for a stock
 * @param {Object} stock - Stock data object with metrics
 * @returns {Object} Decision object with signal, confidence, rationale, etc.
 */
export function computeDecisionSignal(stock) {
  if (!stock || stock.Ticker === undefined) {
    return null;
  }

  // Normalize metrics
  const scoreNorm = Math.min(100, stock.New_Composite_Score || 0);
  const rsiNorm = stock.RSI_14Day || 50;
  const slopeNorm = normalizeSlope(stock.MA_Slope_50 || 0);

  // Apply decision rules
  const signal = decideSignal(scoreNorm, rsiNorm, slopeNorm, stock);
  const confidence = computeConfidence(scoreNorm, rsiNorm, slopeNorm, stock);
  const rationale = generateRationale(signal, stock);

  return {
    ticker: stock.Ticker,
    signal, // "BUY" | "SELL" | "HOLD"
    confidence, // 0-100
    rationale, // Plain English explanation
    entryPrice: computeEntryPrice(stock, signal),
    stopLoss: computeStopLoss(stock),
    profitTarget: computeProfitTarget(stock),
    positionSize: computePositionSize(stock, signal, confidence),
    timeframe: "1-4 weeks",
  };
}

/**
 * Normalize MA slope to 0-100 scale
 */
function normalizeSlope(slope) {
  // Slope ranges typically -0.1 to 0.1
  // Map to 0-100 scale: [-0.1 to 0.1] → [0 to 100]
  const normalized = ((slope + 0.1) / 0.2) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Decision tree logic
 */
function decideSignal(score, rsi, slope, stock) {
  // STRONG BUY condition
  if (score >= 75 && rsi >= 40 && rsi <= 60 && slope > 40) {
    if (stock.Daily_Composite_Score_delta > 0.5) {
      return "BUY";
    }
  }

  // SELL condition
  if (
    score < 50 ||
    rsi < 25 ||
    slope < 30 ||
    (stock.Drawdown_pct || 0) > 22
  ) {
    return "SELL";
  }

  // HOLD (default)
  return "HOLD";
}

/**
 * Confidence score 0-100
 */
function computeConfidence(score, rsi, slope, stock) {
  let confidence = 50; // Baseline

  // Score component (0-25 points)
  if (score >= 80) confidence += 25;
  else if (score >= 70) confidence += 18;
  else if (score >= 60) confidence += 12;

  // RSI component (0-20 points)
  // Distance from neutral 50 indicates strength
  const rsiDist = Math.min(Math.abs(rsi - 50), 30);
  confidence += (20 * rsiDist) / 30; // Max 20 points

  // Slope component (0-20 points)
  if (slope > 50) confidence += 20;
  else if (slope > 40) confidence += 10;
  else if (slope < 35) confidence -= 15;

  // Daily delta component (0-15 points)
  const delta = stock.Daily_Composite_Score_delta || 0;
  if (delta > 1.0) confidence += 15;
  else if (delta > 0.5) confidence += 8;
  else if (delta < -0.5) confidence -= 10;

  // Institutional component (0-10 points)
  const instAccum = stock.Inst_Accumulation || 0;
  if (instAccum > 60) confidence += 10;
  else if (instAccum < 20) confidence -= 5;

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Entry price guidance
 */
function computeEntryPrice(stock, signal) {
  if (signal === "BUY") return "At current market or on pullback to SMA50";
  if (signal === "SELL") return "Exit immediately or on rally";
  return "Monitor for setup clarity";
}

/**
 * Stop loss placement (risk management)
 */
function computeStopLoss(stock) {
  // Stop loss: Max drawdown + 5% buffer
  const drawdown = stock.Drawdown_pct || 0;
  const stopPercent = Math.min(drawdown + 5, 25); // Cap at 25%
  return `-${stopPercent.toFixed(1)}%`;
}

/**
 * Profit target (upside potential)
 */
function computeProfitTarget(stock) {
  // Use RSI distance from overbought (70) as upside proxy
  const rsi = stock.RSI_14Day || 50;
  // If RSI = 40, has ~30 points to overbought → estimate 30% upside
  const upside = Math.max((70 - rsi) * 1.2, 10); // At least 10% target
  return `+${upside.toFixed(1)}%`;
}

/**
 * Position size using Kelly Criterion approximation
 */
function computePositionSize(stock, signal, confidence) {
  if (signal !== "BUY") return "0%";

  // Kelly: f = (p*b - q) / b
  // p = win probability (confidence as proxy)
  // q = 1 - p
  // b = odds (1:1 typically)

  const winRate = confidence / 100;
  const kelly = winRate * 1 - (1 - winRate); // Simplified Kelly
  const positionPercent = Math.min(kelly * 100, 5); // Cap at 5% per position

  return `${positionPercent.toFixed(2)}% of portfolio`;
}

/**
 * Plain English rationale
 */
function generateRationale(signal, stock) {
  const score = stock.New_Composite_Score || 0;
  const rsi = stock.RSI_14Day || 50;
  const delta = stock.Daily_Composite_Score_delta || 0;
  const drawdown = stock.Drawdown_pct || 0;

  if (signal === "BUY") {
    return (
      `Strong score (${score.toFixed(1)}/100), ` +
      `optimal RSI (${rsi.toFixed(0)}), ` +
      `positive momentum (${delta > 0 ? "↑" : "→"}). ` +
      `Entry on pullback to SMA50.`
    );
  }

  if (signal === "SELL") {
    return (
      `Score deteriorating (daily ${delta.toFixed(2)}) ` +
      `or drawdown risk (${drawdown.toFixed(1)}%). ` +
      `Consider reducing or exiting position.`
    );
  }

  return "Mixed signals. Monitor for clearer entry/exit setup. Hold existing if in position.";
}

/**
 * Export decision signals for all stocks
 */
export function computeAllDecisionSignals(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((stock) => computeDecisionSignal(stock))
    .filter((d) => d !== null);
}

/**
 * Count signals by type
 */
export function countSignalsByType(decisions) {
  return {
    buy: decisions.filter((d) => d.signal === "BUY").length,
    sell: decisions.filter((d) => d.signal === "SELL").length,
    hold: decisions.filter((d) => d.signal === "HOLD").length,
  };
}

/**
 * Compute average confidence by signal type
 */
export function averageConfidenceBySignal(decisions) {
  const buy = decisions.filter((d) => d.signal === "BUY");
  const sell = decisions.filter((d) => d.signal === "SELL");
  const hold = decisions.filter((d) => d.signal === "HOLD");

  return {
    buy: buy.length > 0 ? buy.reduce((sum, d) => sum + d.confidence, 0) / buy.length : 0,
    sell: sell.length > 0 ? sell.reduce((sum, d) => sum + d.confidence, 0) / sell.length : 0,
    hold: hold.length > 0 ? hold.reduce((sum, d) => sum + d.confidence, 0) / hold.length : 0,
  };
}
