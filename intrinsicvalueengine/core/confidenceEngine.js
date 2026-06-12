export function runConfidence(data, vals) {

  let score = 100;

  if (!data.fcf) score -= 20;

  const spread = Math.max(...vals) / Math.min(...vals);
  if (spread > 2) score -= 20;

  if (data.fcf < data.netIncome) score -= 10;

  return Math.max(score, 0);
}