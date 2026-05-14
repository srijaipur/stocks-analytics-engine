export function maxDrawdown(prices) {
  let peak = prices[0].close;
  let maxDD = 0;

  prices.forEach((p) => {
    peak = Math.max(peak, p.close);
    maxDD = Math.min(maxDD, (p.close - peak) / peak);
  });

  return Math.abs(maxDD);
}
