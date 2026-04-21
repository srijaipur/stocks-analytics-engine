/**
 * Index Screener
 * Fetches candidates from Finviz for each configured index, applies filters,
 * computes Alpha, and writes the top N tickers to the corresponding Excel sheet.
 *
 * Usage:
 *   npm run screen-rut      → Russell 2000 only
 *   npm run screen-dji      → Dow Jones only
 *   npm run screen-ndx      → Nasdaq 100 only
 *   npm run screen-sp100    → S&P 100 only
 *   npm run screen-all      → all four indices
 *
 * To customise criteria per index, edit INDEX_CONFIGS below.
 */

import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import { getPrices } from "../data/prices.js";
import { jensensAlpha } from "../factors/technicals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

// ─── Shared sector map ────────────────────────────────────────────────────────

const SECTOR_MAP = {
  Technology: "sec_technology",
  "Consumer Staples": "sec_consumerstaples",
  Materials: "sec_basicmaterials",
  "Real Estate": "sec_realestate",
  Financials: "sec_financial",
  Industrials: "sec_industrials",
  "Consumer Discretionary": "sec_consumerdiscretionary",
  Healthcare: "sec_healthcare",
  Energy: "sec_energy",
  Utilities: "sec_utilities",
  "Communication Services": "sec_communicationservices",
};

const ALL_SECTORS = Object.keys(SECTOR_MAP);

const SHARED_SECTORS = [
  "Technology",
  "Consumer Staples",
  "Materials",
  "Real Estate",
  "Financials",
  "Industrials",
  "Consumer Discretionary",
];

// ─── Index configurations ─────────────────────────────────────────────────────
// Each entry defines the Finviz screener filters and post-fetch filter thresholds.
// staticFilters: applied via Finviz URL (pre-filter, reduces API calls)
// sectors:       list of sector names to include (from SECTOR_MAP), [] = all sectors
// betaMin/Max:   post-fetch Beta range
// rsiMin:        post-fetch minimum RSI-14
// topN:          max tickers to write to the sheet

// Each staticFilter is { code, label, value } — single source of truth for
// both the Finviz URL and the criteria panel written to each index sheet.
const INDEX_CONFIGS = {
  rut: {
    label: "Russell 2000",
    sheetName: "Russel_2000",
    staticFilters: [
      { code: "idx_rut", label: "Index", value: "Russell 2000" },
      { code: "cap_small", label: "Cap", value: "Small ($300M–$2B)" },
      { code: "sh_price_o7", label: "Price min", value: "> $7" },
      { code: "ta_perf_ytdplus10", label: "YTD perf min", value: "> +10%" },
      { code: "fa_pe_u28", label: "P/E max", value: "< 28" },
      { code: "fa_epsqoq_pos", label: "EPS Q/Q", value: "Positive" },
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 68,
    topN: 15,
  },

  dji: {
    label: "Dow Jones",
    sheetName: "Dow_Jones",
    staticFilters: [
      { code: "idx_dji", label: "Index", value: "Dow Jones 30" },
      { code: "sh_price_o10", label: "Price min", value: "> $10" },
      { code: "ta_perf_ytdplus5", label: "YTD perf min", value: "> +5%" },
      { code: "fa_pe_u35", label: "P/E max", value: "< 35" },
      { code: "fa_epsqoq_pos", label: "EPS Q/Q", value: "Positive" },
    ],
    sectors: [], // No sector filter — Dow is diversified by design
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 64,
    topN: 15,
  },

  ndx: {
    label: "Nasdaq 100",
    sheetName: "Nasdaq",
    staticFilters: [
      { code: "idx_ndx", label: "Index", value: "Nasdaq 100" },
      { code: "sh_price_o10", label: "Price min", value: "> $10" },
      { code: "ta_perf_ytdplus10", label: "YTD perf min", value: "> +10%" },
      { code: "fa_pe_u50", label: "P/E max", value: "< 50" },
      { code: "fa_epsqoq_pos", label: "EPS Q/Q", value: "Positive" },
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.3, // Slightly wider — Nasdaq stocks tend to be more volatile
    rsiMin: 68,
    topN: 15,
  },

  sp100: {
    label: "S&P 100",
    sheetName: "SP_100",
    staticFilters: [
      { code: "idx_sp500", label: "Index", value: "S&P 500 (large-cap subset)" },
      { code: "cap_large", label: "Cap", value: "Large (approx. S&P 100)" },
      { code: "sh_price_o10", label: "Price min", value: "> $10" },
      { code: "ta_perf_ytdplus8", label: "YTD perf min", value: "> +8%" },
      { code: "fa_pe_u40", label: "P/E max", value: "< 40" },
      { code: "fa_epsqoq_pos", label: "EPS Q/Q", value: "Positive" },
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 68,
    topN: 15,
  },
};

// ─── Rate-limit helpers ──────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a function up to `maxRetries` times with exponential backoff.
 * Backs off immediately on HTTP 429; treats other errors as transient.
 */
async function withRetry(fn, maxRetries = 5, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      const isLast = attempt === maxRetries;
      if (isLast) throw err;

      // On 429 use Retry-After header if present, else double base delay
      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      if (status === 429) {
        const retryAfter = Number(err.response?.headers?.["retry-after"]);
        if (retryAfter > 0) delayMs = retryAfter * 1000;
        console.warn(
          `   ⏳ 429 rate-limited. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${maxRetries}...`
        );
      } else {
        console.warn(
          `   ⏳ Request failed (${status ?? err.code}). Retry ${attempt}/${maxRetries} in ${(delayMs / 1000).toFixed(1)}s...`
        );
      }
      await sleep(delayMs);
    }
  }
}

// Delay between consecutive per-ticker Finviz quote requests (ms)
const INTER_REQUEST_DELAY_MS = 1200;

// ─── Finviz helpers ───────────────────────────────────────────────────────────

const FINVIZ_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html",
};

const finvizClient = axios.create({
  baseURL: "https://finviz.com",
  headers: FINVIZ_HEADERS,
});

function buildScreenerUrl(config, startRow = 1) {
  const codes = config.staticFilters.map((f) => f.code);
  if (config.sectors.length > 0) {
    codes.push(config.sectors.map((s) => SECTOR_MAP[s]).join("|"));
  }
  return `/screener.ashx?v=111&f=${codes.join(",")}&ft=4&o=-marketcap&r=${startRow}`;
}

async function fetchAllCandidates(config) {
  const tickers = new Set();
  let row = 1;
  while (true) {
    const { data: html } = await withRetry(() => finvizClient.get(buildScreenerUrl(config, row)));
    const $ = cheerio.load(html);
    const rows = $("table.screener_table tr").not(":first-child");
    if (rows.length === 0) break;
    rows.each((_, tr) => {
      const ticker = $(tr).find("td:nth-child(2) a").text().trim();
      if (ticker) tickers.add(ticker);
    });
    row += 20;
    if (rows.length < 20) break;
    await sleep(800); // brief pause between screener pages
  }
  return [...tickers];
}

async function fetchQuote(ticker) {
  const { data: html } = await withRetry(() => finvizClient.get(`/quote.ashx?t=${ticker}`));
  const $ = cheerio.load(html);
  const result = {};
  let lastKey = "";
  $(".snapshot-table2 td").each((i, el) => {
    const text = $(el).text().trim();
    if (i % 2 === 0) lastKey = text;
    else result[lastKey] = text;
  });
  return result;
}

function parseNum(val) {
  return parseFloat(String(val ?? "").replace(/[%,]/g, "")) || 0;
}

// ─── Run screener for one index config ───────────────────────────────────────

async function runScreener(config, sp100Prices, workbook) {
  console.log(`\n🔍 [${config.label}] Fetching candidates...`);
  const candidates = await fetchAllCandidates(config);
  console.log(`   Found ${candidates.length} candidates after screener pre-filters.`);

  if (candidates.length === 0) {
    console.log(`   ⚠️  No candidates found. Skipping.`);
    return;
  }

  const results = [];
  for (const ticker of candidates) {
    try {
      // Fetch sequentially to respect Finviz rate limits
      const quote = await fetchQuote(ticker);
      const prices = await getPrices(ticker);
      const beta = parseNum(quote["Beta"]);
      const rsi14 = parseNum(quote["RSI (14)"]);
      const alpha = jensensAlpha(prices, sp100Prices, beta);

      if (beta < config.betaMin || beta > config.betaMax) continue;
      if (rsi14 < config.rsiMin) continue;
      if (alpha <= 0) continue;

      results.push({ ticker, beta, rsi14, alpha });
    } catch (err) {
      console.warn(`   ⚠️  Skipping ${ticker}: ${err.message}`);
    }
    await sleep(INTER_REQUEST_DELAY_MS);
  }

  console.log(
    `   ${results.length} passed post-filters (Beta ${config.betaMin}–${config.betaMax}, RSI ≥ ${config.rsiMin}, Alpha > 0).`
  );

  results.sort((a, b) => b.alpha - a.alpha);
  const top = results.slice(0, config.topN);

  console.log(`✅ Top ${top.length} tickers for ${config.label}:`);
  top.forEach((r, i) =>
    console.log(`   ${i + 1}. ${r.ticker}  α=${r.alpha.toFixed(4)}  β=${r.beta}  RSI=${r.rsi14}`)
  );

  // Write to sheet
  let sheet = workbook.getWorksheet(config.sheetName);
  if (!sheet) sheet = workbook.addWorksheet(config.sheetName);
  sheet.spliceRows(1, sheet.rowCount);

  // Column A: header + tickers
  sheet.getRow(1).getCell(1).value = "Ticker";
  top.forEach((r, i) => {
    sheet.getRow(i + 2).getCell(1).value = r.ticker;
  });

  // Columns C–D: criteria panel — labels/values come directly from staticFilters
  const runDate = new Date().toISOString().slice(0, 10);
  const criteriaRows = [
    ["Criteria", "Value"],
    ["Last Run", runDate],
    ...config.staticFilters.map((f) => [f.label, f.value]),
    ["Sectors", config.sectors.length > 0 ? config.sectors.join(", ") : "All sectors"],
    ["Beta range", `${config.betaMin} – ${config.betaMax}`],
    ["RSI min", String(config.rsiMin)],
    ["Alpha", "> 0"],
    ["Ranked by", "Alpha (highest first)"],
    ["Top N", String(config.topN)],
    ["Results", `${top.length} of ${results.length} qualified`],
  ];
  criteriaRows.forEach(([label, value], i) => {
    const r = sheet.getRow(i + 1);
    r.getCell(3).value = label;
    r.getCell(4).value = value;
  });

  console.log(
    `💾 Written to sheet "${config.sheetName}" (${top.length} tickers + criteria panel).`
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

(async () => {
  // Determine which indices to run from CLI arg: node screenIndex.js rut|dji|ndx|sp100|all
  const arg = process.argv[2] ?? "all";
  const keys = arg === "all" ? Object.keys(INDEX_CONFIGS) : [arg];

  const invalid = keys.filter((k) => !INDEX_CONFIGS[k]);
  if (invalid.length) {
    console.error(
      `❌ Unknown index key(s): ${invalid.join(", ")}. Valid: ${Object.keys(INDEX_CONFIGS).join(", ")}, all`
    );
    process.exit(1);
  }

  const sp100Prices = await getPrices("^OEX");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  for (const key of keys) {
    await runScreener(INDEX_CONFIGS[key], sp100Prices, workbook);
  }

  await workbook.xlsx.writeFile(WORKBOOK_PATH);
  console.log("\n✅ All done. stocks.xlsx updated.");
})();
