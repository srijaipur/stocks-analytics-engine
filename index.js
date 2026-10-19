import "dotenv/config";
import { detectSignals } from "./signals/signalEngine.js";
import { readSheet } from "./sheets/readSheet.js";
import { writeScores } from "./sheets/writeSheet.js";
import { getFundamentals } from "./data/fundamentals.js";
import { getPrices } from "./data/prices.js";
import { getInstitutionalActivity } from "./data/institutions.js";
import { getCashflow } from "./data/cashflow.js";

import {
  fundamentalLevel,
  fundamentalTrend,
  institutionalAccumulation,
  getBeta,
  getRsi14,
  getSma200Dist,
  getEarningsDate,
  earningsQuality,
} from "./factors/fundamentals.js";

import {
  jensensAlpha,
  relativeStrength,
  maSlope,
  volumeExpansion,
  getReturn,
} from "./factors/technicals.js";

import { percentileRank } from "./factors/normalize.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, maxRetries = 5, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;

      if (attempt === maxRetries) throw err;

      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);

      if (status === 429) {
        const retryAfter = Number(err.response?.headers?.["retry-after"]);

        if (retryAfter > 0) delayMs = retryAfter * 1000;
      }

      await sleep(delayMs);
    }
  }
}

(async () => {
  const portfolio = await readSheet("Portfolio");
  const watchlist = await readSheet("Watchlist");
  const rut2000 = await readSheet("Russel_2000");
  const dowJones = await readSheet("Dow_Jones");
  const nasdaq = await readSheet("Nasdaq");
  const sp100 = await readSheet("SP_100");
  const universe = [
    ...new Set([...portfolio, ...watchlist, ...rut2000, ...dowJones, ...nasdaq, ...sp100]),
  ];

  const sp100Prices = await getPrices("^OEX");

  console.log(`\n📋 Universe: ${universe.length} tickers\n`);
  const data = [];
  const skipped = [];

  for (let i = 0; i < universe.length; i++) {
    const ticker = universe[i];

    process.stdout.write(`[${i + 1}/${universe.length}] ${ticker}... `);

    try {
      const fundamentals = await withRetry(() => getFundamentals(ticker));
      const [prices, institutions, cashflow] = await Promise.all([
        getPrices(ticker),
        getInstitutionalActivity(ticker),
        getCashflow(ticker),
      ]);

      data.push({ ticker, fundamentals, prices, institutions, cashflow });

      console.log("✓");

      await sleep(1000);
    } catch (err) {
      console.log("✗");

      skipped.push(ticker);
    }
  }

  // =========================

  // NORMALIZATION ARRAYS

  // =========================

  const allLevels = data.map((d) => fundamentalLevel(d.fundamentals));
  const allTrends = data.map((d) => fundamentalTrend(d.fundamentals));
  const allSlopes = data.map((d) => maSlope(d.prices, 50));
  const allRsi = data.map((d) => getRsi14(d.fundamentals));
  const allSma200 = data.map((d) => getSma200Dist(d.fundamentals));
  const allReturn63 = data.map((d) => getReturn(d.prices, 63));
  const allRelativeStrength = data.map((d) => relativeStrength(d.prices, sp100Prices));
  const allInstAccum = data.map((d) => institutionalAccumulation(d.fundamentals));

  // Earnings Quality (OCF / Net Income) is only available when Yahoo Finance returns
  // both inputs; build the ranking baseline from valid values only so missing data
  // doesn't skew the cross-universe percentile distribution.

  const allEarningsQualityValid = data

    .map((d) => earningsQuality(d.cashflow))
    .filter((v) => v !== null);

  const allDrawdown = data.map((d) => {
    let peak = d.prices[0]?.close || 1;

    let maxDD = 0;

    for (let i = 1; i < d.prices.length; i++) {
      if (d.prices[i].close > peak) peak = d.prices[i].close;

      const dd = (peak - d.prices[i].close) / peak;

      if (dd > maxDD) maxDD = dd;
    }

    return maxDD * 100;
  });

  // =========================

  // BUILD ROWS

  // =========================

  const rows = data.map(({ ticker, fundamentals, prices, institutions, cashflow }) => {
    const level = fundamentalLevel(fundamentals);
    const epsPercentile = percentileRank(level, allLevels);
    const trend = fundamentalTrend(fundamentals);
    const trendRank = percentileRank(trend, allTrends);
    const beta = getBeta(fundamentals);
    const rsi14 = getRsi14(fundamentals);
    const sma200Dist = getSma200Dist(fundamentals);
    const maSlope50 = maSlope(prices, 50);
    const maSlopeRank = percentileRank(maSlope50, allSlopes);
    const rs = relativeStrength(prices, sp100Prices);
    const rsRank = percentileRank(rs, allRelativeStrength);
    const return63 = getReturn(prices, 63);
    const return63Rank = percentileRank(return63, allReturn63);
    let peak = prices[0]?.close || 1;

    let maxDD = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i].close > peak) peak = prices[i].close;

      const dd = (peak - prices[i].close) / peak;

      if (dd > maxDD) maxDD = dd;
    }

    const drawdownPct = maxDD * 100;
    const drawdownRank = percentileRank(drawdownPct, allDrawdown);
    const alpha = jensensAlpha(prices, sp100Prices, beta);
    const instAccumulation = institutionalAccumulation(fundamentals);
    const instAccumRank = percentileRank(instAccumulation, allInstAccum);
    const volExpansion = volumeExpansion(prices);
    const netInstitutional = institutions.netActivity;
    const earningsQualityRaw = earningsQuality(cashflow);

    // Missing OCF/NetIncome data → neutral rank (50) so it doesn't bias the composite.

    const earningsQualityRank =
      earningsQualityRaw === null
        ? 50
        : percentileRank(earningsQualityRaw, allEarningsQualityValid);

    // OLD MODEL

    const compositeScore =
      0.3 * epsPercentile +
      0.3 * trendRank +
      0.2 * maSlopeRank +
      0.1 * percentileRank(rsi14, allRsi) +
      0.1 * percentileRank(sma200Dist, allSma200);

    // NEW MODEL

    // 25% Trend Strength + 20% EPS Growth + 15% Institutional Accumulation + 15% RS Rank

    // + 10% Return_63D + 10% MA_Slope_50 + 5% Earnings Quality - 15% Drawdown

    const newCompositeScore =
      0.25 * trendRank +
      0.2 * epsPercentile +
      0.15 * instAccumRank +
      0.15 * rsRank +
      0.1 * return63Rank +
      0.1 * maSlopeRank +
      0.05 * earningsQualityRank -
      0.15 * drawdownRank;

    const earningsDate = getEarningsDate(fundamentals);

    return [
      ticker,
      level,
      epsPercentile,
      trend,
      instAccumulation,
      alpha,
      beta,
      rsi14,
      sma200Dist,
      maSlope50,
      volExpansion,
      netInstitutional,
      rs,
      return63,
      rsRank,
      drawdownPct,
      compositeScore,
      newCompositeScore,
      earningsDate,
      instAccumRank,
      earningsQualityRaw,
      earningsQualityRank,
    ];
  });

  console.log(
    rows.slice(0, 5).map((r) => ({
      ticker: r[0],
      old: r[16],
      new: r[17],
    }))
  );

  const signals = detectSignals(rows);
  console.log("Signals Sample:", signals.slice(0, 5));
  await writeScores(rows, signals);
  x;
  console.log(`✅ Done — ${rows.length} tickers`);
})();
