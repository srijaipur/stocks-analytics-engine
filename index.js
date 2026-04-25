import "dotenv/config";
import { readSheet } from "./sheets/readSheet.js";
import { writeScores } from "./sheets/writeSheet.js";
import { getFundamentals } from "./data/fundamentals.js";
import { getPrices } from "./data/prices.js";
import { getInstitutionalActivity } from "./data/institutions.js";
import {
  fundamentalLevel,
  fundamentalTrend,
  institutionalAccumulation,
  getBeta,
  getRsi14,
  getSma200Dist,
  getEarningsDate,
} from "./factors/fundamentals.js";
import { maSlope, volumeExpansion, relativeStrength, jensensAlpha } from "./factors/technicals.js";
import { percentileRank } from "./factors/normalize.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, maxRetries = 5, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      const isLast = attempt === maxRetries;
      if (isLast) throw err;
      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      if (status === 429) {
        const retryAfter = Number(err.response?.headers?.["retry-after"]);
        if (retryAfter > 0) delayMs = retryAfter * 1000;
        console.warn(`  ⏳ 429 on attempt ${attempt}. Waiting ${(delayMs / 1000).toFixed(1)}s...`);
      } else {
        console.warn(
          `  ⏳ Request failed (${status ?? err.code}). Retry ${attempt}/${maxRetries} in ${(delayMs / 1000).toFixed(1)}s...`
        );
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

  // Fetch S&P 100 benchmark prices once, shared across all tickers
  const sp100Prices = await getPrices("^OEX");

  console.log(
    `\n📋 Universe: ${universe.length} unique tickers (${portfolio.length} portfolio, ${watchlist.length} watchlist, ${rut2000.length + dowJones.length + nasdaq.length + sp100.length} index)\n`
  );

  // First pass: fetch all data sequentially to avoid Finviz 429 rate-limits
  const data = [];
  const skipped = [];
  for (let i = 0; i < universe.length; i++) {
    const ticker = universe[i];
    process.stdout.write(`  [${i + 1}/${universe.length}] ${ticker}... `);
    try {
      const fundamentals = await withRetry(() => getFundamentals(ticker));
      const [prices, institutions] = await Promise.all([
        getPrices(ticker),
        getInstitutionalActivity(ticker),
      ]);
      data.push({ ticker, fundamentals, prices, institutions });
      console.log("✓");
      await sleep(1200); // only delay after successful fetch
    } catch (err) {
      console.log(`✗ SKIPPED — ${err.message}`);
      skipped.push({ ticker, reason: err.message });
    }
  }

  if (skipped.length > 0) {
    console.warn(`\n⚠️  ${skipped.length} ticker(s) skipped:`);
    skipped.forEach(({ ticker, reason }) => {
      const source = portfolio.includes(ticker)
        ? "PORTFOLIO"
        : watchlist.includes(ticker)
          ? "Watchlist"
          : "Index";
      console.warn(`   [${source}] ${ticker}: ${reason}`);
    });
    console.warn("");
  }

  // Collect all values needed for cross-universe percentile ranking
  const allLevels = data.map(({ fundamentals }) => fundamentalLevel(fundamentals));
  const allTrends = data.map(({ fundamentals }) => fundamentalTrend(fundamentals));
  const allSlopes = data.map(({ prices }) => maSlope(prices, 50));
  const allRsi = data.map(({ fundamentals }) => getRsi14(fundamentals));
  const allSma200 = data.map(({ fundamentals }) => getSma200Dist(fundamentals));

  // Second pass: compute factors and build rows
  const rows = data.map(({ ticker, fundamentals, prices, institutions }) => {
    const level = fundamentalLevel(fundamentals);
    const epsPercentile = percentileRank(level, allLevels);
    const trend = fundamentalTrend(fundamentals);
    const instAccumulation = institutionalAccumulation(fundamentals);
    const beta = getBeta(fundamentals);
    const rsi14 = getRsi14(fundamentals);
    const sma200Dist = getSma200Dist(fundamentals);
    const maSlope50 = maSlope(prices, 50);
    const volExpansion = volumeExpansion(prices);
    const netInstitutional = institutions.netActivity;
    const rsVsSP100 = relativeStrength(prices, sp100Prices);
    const alpha = jensensAlpha(prices, sp100Prices, beta);
    const earningsDate = getEarningsDate(fundamentals);

    // Composite Score (0–100) — Option B:
    // 30% P(EPS_Percentile_In_Universe) + 30% P(EPS_Fwd_Growth) + 20% P(MA_Slope_50) + 10% P(RSI_14) + 10% P(SMA200_Dist)
    const compositeScore =
      0.3 * epsPercentile +
      0.3 * percentileRank(trend, allTrends) +
      0.2 * percentileRank(maSlope50, allSlopes) +
      0.1 * percentileRank(rsi14, allRsi) +
      0.1 * percentileRank(sma200Dist, allSma200);

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
      rsVsSP100,
      compositeScore,
      earningsDate,
    ];
  });

  await writeScores(rows);
  console.log(
    `✅ Done — ${rows.length} tickers written to ScoresCurrent${skipped.length > 0 ? `, ${skipped.length} skipped (see warnings above)` : ""}.`
  );
})();
