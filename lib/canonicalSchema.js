// ─────────────────────────────────────────────
// STEP 2D — CANONICAL FIELD CONTRACT
// ─────────────────────────────────────────────

export const CANONICAL_FIELDS = {
  required: [
    "Ticker",
    "Composite_Score",
    "Daily_Composite_Score_delta",
    "RSI",
    "Alpha_63D",
    "MA_Slope_50",
    "Beta",
    "Drawdown_pct"
  ],

  optional: [
    "EPS_TTM",
    "EPS_Percentile_In_Universe",
    "EPS_Fwd_Grwth_Trnd",
    "RS_vs_SP100",
    "SMA200_Dist_%",
    "Inst_Accumulation",
    "Net_Inst",
    "Volume_Expansion",
    "Earnings_Date"
  ]
};

export function validateSchema(row) {
  const errors = [];

  for (const f of CANONICAL_FIELDS.required) {
    if (row[f] === undefined || row[f] === null) {
      errors.push(f + " missing");
    }
  }

  return errors;
}