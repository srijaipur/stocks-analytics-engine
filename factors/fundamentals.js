// data is a @stonksjs/finviz Quote object, e.g. { epsTtm: 6.43, epsNextY: "7.29", ... }

export function fundamentalLevel(data) {
  return parseFloat(data.epsTtm) || 0;
}

export function fundamentalTrend(data) {
  const epsCurrent = parseFloat(data.epsTtm) || 0;
  const epsForward = parseFloat(data.epsNextY) || 0;
  if (epsCurrent === 0) return 0;
  // Returns forward EPS growth rate (e.g. 0.12 = 12% projected growth)
  return (epsForward - epsCurrent) / Math.abs(epsCurrent);
}

// Returns the Finviz beta (5-year monthly vs S&P 500).
export function getBeta(data) {
  return parseFloat(data.beta) || 0;
}

// Returns the % change in total institutional ownership vs the prior 13F period.
// Positive = net accumulation, Negative = net distribution.
// Source: Finviz instTrans field (e.g. "0.53%" → 0.53)
export function institutionalAccumulation(data) {
  return parseFloat(String(data.instTrans).replace("%", "")) || 0;
}

// Returns the 14-day RSI from Finviz (0–100).
export function getRsi14(data) {
  return parseFloat(data.rsi14) || 0;
}

// Returns the % distance of price from the 200-day SMA from Finviz.
// Positive = price above SMA200 (uptrend), Negative = below (downtrend).
export function getSma200Dist(data) {
  return parseFloat(String(data.sma200).replace("%", "")) || 0;
}
