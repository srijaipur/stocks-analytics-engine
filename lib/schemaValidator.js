export const CANONICAL_SCHEMA = new Set([
  "Ticker",

  "EPS_Growth",
  "EPS_Percentile",
  "RS_Rank",

  "RSI",
  "MA_Slope",
  "Alpha_63D",
  "Return_63D",
  "RS_vs_SP100",

  "Inst_Accumulation",
  "Net_Inst",
  "Volume_Expansion",

  "Beta",
  "Drawdown_pct",

  "Earnings_Date",

  "leadership_score",
  "risk_score",
  "trend_score"
]);

export function validateRow(row) {
  const errors = [];

  for (const key of Object.keys(row)) {
    if (!CANONICAL_SCHEMA.has(key)) {
      errors.push(`NON_CANONICAL_FIELD: ${key}`);
    }
  }

  return errors;
}