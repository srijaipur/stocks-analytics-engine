// ─────────────────────────────────────────────
// CHP STEP 1 — CANONICAL SCHEMA INTENT REGISTRY
// (READ-ONLY, NON-ENFORCING LAYER)
// ─────────────────────────────────────────────

export const CANONICAL_REGISTRY = {
  core_metrics: {
    Ticker: "string identifier",

    Composite_Score: {
      role: "legacy_investor_score",
      used_in: "report.html (visualizer.js)",
      status: "stable"
    },

    New_Composite_Score: {
      role: "primary_quant_score",
      used_in: "analytics.html (visualizer-analytics.js)",
      status: "stable"
    },

    Daily_Composite_Score_delta: {
      role: "momentum_delta",
      status: "stable"
    }
  },

  technicals: {
    RSI: {
      role: "momentum_indicator",
      alias: ["RSI_14Day (legacy UI reference)"],
      status: "canonical"
    },

    MA_Slope_50: {
      role: "trend_strength_indicator",
      status: "canonical"
    },

    Beta: {
      role: "market_risk_exposure",
      status: "canonical"
    },

    RS_Rank: {
      role: "relative_strength_rank",
      status: "canonical"
    }
  },

  fundamentals: {
    EPS_TTM: "earnings trailing twelve months",
    Inst_Accumulation: "institutional flow proxy",
    Net_Inst: "net institutional activity",
    Earnings_Date: "next earnings event"
  },

  risk: {
    Drawdown_pct: "max peak-to-trough decline",
    risk_score: "reserved (not actively computed yet)"
  },

  experimental_reserved: {
    leadership_score: "reserved field (not active)",
    trend_score: "reserved field (not active)"
  }
};