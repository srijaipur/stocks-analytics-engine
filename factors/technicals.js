// Computes Jensen's Alpha over 63 trading days.
// α = R_stock - [Rf + β × (R_market - Rf)]
// Rf is the annualised risk-free rate (default 4.3% US T-bill) scaled to 63 trading days.
// prices and marketPrices must be sorted oldest-first; at least 64 bars required.
export function jensensAlpha(prices, marketPrices, beta, annualRiskFreeRate = 0.043) {
  if (prices.length < 64 || marketPrices.length < 64) return 0;
  const rf = (annualRiskFreeRate / 252) * 63;
  const rStock = prices[prices.length - 1].close / prices[prices.length - 64].close - 1;
  const rMarket =
    marketPrices[marketPrices.length - 1].close / marketPrices[marketPrices.length - 64].close - 1;
  return rStock - (rf + beta * (rMarket - rf));
}

// Computes 63-trading-day price return of stock relative to a market benchmark.
// Positive = stock outperformed the benchmark over the period.
// prices arrays must be sorted oldest-first; at least 64 bars required.
export function relativeStrength(stock, market) {
  if (stock.length < 64 || market.length < 64) return 0;
  const stockReturn = stock[stock.length - 1].close / stock[stock.length - 64].close;
  const marketReturn = market[market.length - 1].close / market[market.length - 64].close;
  return stockReturn - marketReturn;
}

// Computes the slope of the period-day simple moving average over the last
// slopeDays candles, normalised by the MA value so it is unit-independent.
// A positive value means the MA is rising; negative means falling.
// prices: [{ close, volume }, ...] sorted oldest-first.
export function maSlope(prices, period = 50, slopeDays = 5) {
  if (prices.length < period + slopeDays) return 0;

  const ma = (slice) => slice.reduce((sum, p) => sum + p.close, 0) / slice.length;

  const end = prices.length;
  const maRecent = ma(prices.slice(end - period, end));
  const maPrev = ma(prices.slice(end - period - slopeDays, end - slopeDays));

  if (maPrev === 0) return 0;
  return (maRecent - maPrev) / maPrev;
}

// Returns true when the average volume of the last shortWindow candles is
// greater than the average of the prior longWindow candles by at least
// the expansionThreshold ratio (default 20% above the baseline).
// prices: [{ close, volume }, ...] sorted oldest-first.
export function volumeExpansion(
  prices,
  shortWindow = 5,
  longWindow = 20,
  expansionThreshold = 1.2
) {
  if (prices.length < longWindow + shortWindow) return false;

  const end = prices.length;
  const avg = (slice) => slice.reduce((sum, p) => sum + p.volume, 0) / slice.length;

  const recentAvg = avg(prices.slice(end - shortWindow, end));
  const baselineAvg = avg(prices.slice(end - longWindow - shortWindow, end - shortWindow));

  if (baselineAvg === 0) return false;
  return recentAvg / baselineAvg >= expansionThreshold;
}
