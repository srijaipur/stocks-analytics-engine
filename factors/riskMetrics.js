// ======================================================
// RISK ANALYSIS ENGINE
// ======================================================
// Computes risk/reward metrics (Sharpe, Sortino, Calmar)
// and risk-adjusted performance analysis
// ======================================================

/**
 * Compute risk metrics for a stock
 * Uses approximations based on available Excel data
 * For MVP, uses Beta as volatility proxy
 * @param {Object} stock - Stock data with historical metrics
 * @returns {Object} Risk metrics object
 */
export function computeRiskMetrics(stock) {
  if (!stock || stock.Ticker === undefined) {
    return null;
  }

  const beta = stock.Beta || 1.0;
  const drawdown = stock.Drawdown_pct || 0;
  const return63d = stock.Return_63D || 0;

  // Compute metrics
  const sharpeRatio = computeSharpeRatio(return63d, beta);
  const sortinoRatio = computeSortinoRatio(return63d, beta, drawdown);
  const calmarRatio = computeCalmarRatio(return63d, drawdown);
  const winRate = estimateWinRate(stock);
  const riskLevel = classifyRiskLevel(sharpeRatio, drawdown);

  return {
    ticker: stock.Ticker,
    // Risk measures
    drawdown: drawdown.toFixed(2),
    beta: beta.toFixed(2),
    // Risk-adjusted return
    sharpeRatio: sharpeRatio.toFixed(2),
    sortinoRatio: sortinoRatio.toFixed(2),
    calmarRatio: calmarRatio.toFixed(2),
    // Win analysis
    winRate: winRate.toFixed(0),
    riskLevel, // "LOW" | "MEDIUM" | "HIGH"
    // Raw data for sorting
    sharpeRatioNum: sharpeRatio,
    sortinoRatioNum: sortinoRatio,
    calmarRatioNum: calmarRatio,
    riskReward:
      return63d > 0 ? (return63d / Math.max(Math.abs(drawdown), 1)).toFixed(2) : "N/A",
  };
}

/**
 * Sharpe Ratio MVP proxy:
 * (Annualized Return - Risk-Free Rate) / Beta
 *
 * NOTE:
 * This is not a textbook Sharpe ratio because historical
 * return volatility is not available in the current data model.
 * Beta is used as a volatility proxy.
 */
function computeSharpeRatio(return63d, beta) {
  const riskFreeRate = 0.043; // 4.3% annual
  const annualReturn = (return63d / 100) * (252 / 63); // Annualize 63-day return
  const volatility = beta || 1.0;

  if (volatility === 0) return 0;
  return (annualReturn - riskFreeRate) / volatility;
}

/**
 * Sortino Ratio MVP proxy:
 * (Annualized Return - Risk-Free Rate) / Downside Risk Proxy
 *
 * NOTE:
 * Historical downside-return volatility is not available in the
 * current data model. Beta is adjusted by drawdown as a downside-risk proxy.
 */
function computeSortinoRatio(return63d, beta, drawdown) {
  const riskFreeRate = 0.043;
  const annualReturn = (return63d / 100) * (252 / 63);
  // Downside volatility is higher risk: multiply beta by drawdown factor
  const downsideVolatility = beta * (1 + drawdown / 100);

  if (downsideVolatility === 0) return 0;
  return (annualReturn - riskFreeRate) / downsideVolatility;
}

/**
 * Calmar Ratio: Annual Return / Max Drawdown
 * Higher is better; >1.0 is good
 */
function computeCalmarRatio(return63d, drawdown) {
  const annualReturn = (return63d / 100) * (252 / 63);

  if (Math.abs(drawdown) < Number.EPSILON) return 100; // Avoid division by zero
  return annualReturn / (Math.abs(drawdown) / 100);
}

/**
 * Estimate win rate from momentum indicators
 * MVP: Use RSI and daily delta as proxy
 */
function estimateWinRate(stock) {
  const rsi = stock.RSI_14Day || 50;
  const delta = stock.Daily_Composite_Score_delta || 0;

  // Heuristic: RSI away from neutral + positive delta = higher win rate
  let winRate = 50; // Baseline 50%

  // RSI adjustment (higher RSI = more likely up days)
  if (rsi > 60) winRate += (rsi - 60) * 0.5; // Max +20%
  else if (rsi < 40) winRate -= (40 - rsi) * 0.5; // Max -20%

  // Delta adjustment
  if (delta > 0.5) winRate += 10;
  else if (delta < -0.5) winRate -= 10;

  return Math.max(0, Math.min(100, winRate));
}

/**
 * Classify risk level based on Sharpe ratio and drawdown
 */
function classifyRiskLevel(sharpeRatio, drawdown) {
  if (sharpeRatio < 0.5 || drawdown > 25) return "HIGH";
  if (sharpeRatio < 1.0 || drawdown > 15) return "MEDIUM";
  return "LOW";
}

/**
 * Compute portfolio-level risk metrics
 */
export function computePortfolioRiskMetrics(riskMetrics) {
  if (!Array.isArray(riskMetrics) || riskMetrics.length === 0) {
    return {
      avgSharpe: 0,
      avgSortino: 0,
      avgCalmar: 0,
      medianDrawdown: 0,
      maxDrawdown: 0,
      avgBeta: 1.0,
      highRiskCount: 0,
    };
  }

  const sharpeRatios = riskMetrics.map((r) => parseFloat(r.sharpeRatio) || 0);
  const sortinoRatios = riskMetrics.map((r) => parseFloat(r.sortinoRatio) || 0);
  const calmarRatios = riskMetrics.map((r) => parseFloat(r.calmarRatio) || 0);
  const drawdowns = riskMetrics.map((r) => parseFloat(r.drawdown) || 0);
  const betas = riskMetrics.map((r) => parseFloat(r.beta) || 1.0);
  const highRisk = riskMetrics.filter((r) => r.riskLevel === "HIGH").length;

  return {
    avgSharpe: (sharpeRatios.reduce((a, b) => a + b, 0) / sharpeRatios.length).toFixed(2),
    avgSortino: (sortinoRatios.reduce((a, b) => a + b, 0) / sortinoRatios.length).toFixed(2),
    avgCalmar: (calmarRatios.reduce((a, b) => a + b, 0) / calmarRatios.length).toFixed(2),
    medianDrawdown: percentile(drawdowns, 0.5).toFixed(2),
    maxDrawdown: Math.max(...drawdowns).toFixed(2),
    avgBeta: (betas.reduce((a, b) => a + b, 0) / betas.length).toFixed(2),
    highRiskCount: highRisk,
  };
}

/**
 * Calculate percentile of array
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Filter high-risk stocks (drawdown > 20%)
 */
export function filterHighRiskStocks(riskMetrics, threshold = 20) {
  return riskMetrics.filter((r) => parseFloat(r.drawdown) > threshold);
}

/**
 * Rank stocks by risk-adjusted return (Sharpe ratio)
 */
export function rankByRiskAdjustedReturn(riskMetrics) {
  return [...riskMetrics].sort(
    (a, b) => parseFloat(b.sharpeRatio) - parseFloat(a.sharpeRatio)
  );
}

/**
 * Compute all risk metrics for stock universe
 */
export function computeAllRiskMetrics(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((stock) => computeRiskMetrics(stock))
    .filter((r) => r !== null);
}

/**
 * Risk/Reward analysis per stock
 */
export function computeRiskRewardAnalysis(stock) {
  const return63d = stock.Return_63D || 0;
  const drawdown = stock.Drawdown_pct || 0;

  if (drawdown === 0) {
    return {
      ticker: stock.Ticker,
      ratio: "N/A",
      assessment: "No drawdown recorded",
      recommendation: "Assess with caution",
    };
  }

  const ratio = return63d / Math.abs(drawdown);

  let assessment = "";
  let recommendation = "";

  if (ratio > 2) {
    assessment = "Excellent risk/reward";
    recommendation = "Strong buy candidate";
  } else if (ratio > 1) {
    assessment = "Good risk/reward";
    recommendation = "Consider position";
  } else if (ratio > 0) {
    assessment = "Poor risk/reward";
    recommendation = "Avoid or reduce";
  } else {
    assessment = "Negative return";
    recommendation = "Exit or stay out";
  }

  return {
    ticker: stock.Ticker,
    ratio: ratio.toFixed(2),
    return: return63d.toFixed(2),
    drawdown: drawdown.toFixed(2),
    assessment,
    recommendation,
  };
}
