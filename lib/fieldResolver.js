// ─────────────────────────────────────────────
// CHP STEP 3 — FIELD RESOLVER LAYER
// (OPTION A SAFE MODE - NO UI IMPACT)
// ─────────────────────────────────────────────

export function resolveField(row, key) {
  if (!row) return 0;

  switch (key) {

    // =========================
    // RSI LEGACY COMPATIBILITY
    // =========================
    case "RSI_14Day":
      return row.RSI ?? 0;

    case "RSI":
      return row.RSI ?? 0;

    // =========================
    // MOVING AVERAGE SLOPE
    // =========================
    case "MA_Slope":
      return row.MA_Slope_50 ?? 0;

    case "MA_Slope_50":
      return row.MA_Slope_50 ?? 0;

    // =========================
    // SCORE NORMALIZATION
    // =========================
    case "Composite_Score":
      return row.Composite_Score ?? 0;

    case "New_Composite_Score":
      return row.New_Composite_Score ?? 0;

    case "Daily_Composite_Score_delta":
      return row.Daily_Composite_Score_delta ?? 0;

    // =========================
    // DEFAULT PASS-THROUGH
    // =========================
    default:
      return row[key] ?? 0;
  }
}