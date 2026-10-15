
/**
 * Index Charting v1
 * Independent pipeline; legacy screener remains unchanged.
 */
import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import YahooFinance from "yahoo-finance2";
import dayjs from "dayjs";
import path from "path";
import { fileURLToPath } from "url";
import { jensensAlpha } from "../factors/technicals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");
const OUTPUT_SHEET = "IndexChartingCurrent";

const yahooFinance = new YahooFinance({
  suppressNotices: ["ripHistorical"],
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const SECTOR_MAP = {
  Technology: "sec_technology",
  "Consumer Staples": "sec_consumerstaples",
  Materials: "sec_basicmaterials",
  "Real Estate": "sec_realestate",
  Financials: "sec_financial",
  Industrials: "sec_industrials",
  "Consumer Discretionary": "sec_consumerdiscretionary",
};

const SHARED_SECTORS = Object.keys(SECTOR_MAP);

const INDEX_CONFIGS = {
  rut: {
    label: "Russell 2000",
    filters: [
      "idx_rut",
      "cap_small",
      "sh_price_o7",
      "ta_perf_ytdplus10",
      "fa_pe_u28",
      "fa_epsqoq_pos",
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 50,
  },

  dji: {
    label: "Dow Jones",
    filters: [
      "idx_dji",
      "sh_price_o10",
      "ta_perf_ytdplus5",
      "fa_pe_u35",
      "fa_epsqoq_pos",
    ],
    sectors: [],
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 50,
  },

  ndx: {
    label: "Nasdaq 100",
    filters: [
      "idx_ndx",
      "sh_price_o10",
      "ta_perf_ytdplus10",
      "fa_pe_u50",
      "fa_epsqoq_pos",
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.3,
    rsiMin: 60,
  },

  sp100: {
    label: "S&P 100",
    // Finviz approximation: S&P 500 universe plus large-cap filter.
    filters: [
      "idx_sp500",
      "cap_large",
      "sh_price_o10",
      "ta_perf_ytdplus8",
      "fa_pe_u40",
      "fa_epsqoq_pos",
    ],
    sectors: SHARED_SECTORS,
    betaMin: 0.7,
    betaMax: 1.2,
    rsiMin: 50,
  },
};

const finvizClient = axios.create({
  baseURL: "https://finviz.com",
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html",
  },
});

function buildScreenerUrl(config, startRow = 1) {
  const filters = [...config.filters];

  if (config.sectors.length > 0) {
    const sectorFilters = config.sectors
      .map((sector) => SECTOR_MAP[sector])
      .filter(Boolean);

    if (sectorFilters.length > 0) {
      filters.push(sectorFilters.join("|"));
    }
  }

  return `/screener.ashx?v=111&f=${filters.join(",")}&ft=4&o=-marketcap&r=${startRow}`;
}

async function withRetry(operation, attempts = 4) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < attempts - 1) {
        await sleep(1000 * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

async function fetchCandidates(config) {
  const candidates = new Map();

  for (let startRow = 1; ; startRow += 20) {
    const response = await withRetry(() =>
      finvizClient.get(buildScreenerUrl(config, startRow))
    );

    const $ = cheerio.load(response.data);
    const rows = $("table.screener_table tr").not(":first-child");
    let pageCount = 0;

    rows.each((_, element) => {
      const ticker = $(element)
        .find("td:nth-child(2) a.tab-link")
        .first()
        .text()
        .trim()
        .toUpperCase();

      const sector = $(element)
        .find("td:nth-child(4)")
        .text()
        .trim();

      if (ticker) {
        candidates.set(ticker, {
          ticker,
          sector: sector || null,
        });
        pageCount += 1;
      }
    });

    if (pageCount < 20) break;

    await sleep(500);
  }

  return [...candidates.values()];
}

function parseNumeric(value) {
  if (value == null || value === "" || value === "-") return null;

  const parsed = Number(String(value).replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchQuote(ticker) {
  const response = await withRetry(() =>
    finvizClient.get(`/quote.ashx?t=${encodeURIComponent(ticker)}`)
  );

  const $ = cheerio.load(response.data);
  const values = {};

  $(".snapshot-table2 td").each((index, element) => {
    if (index % 2 === 0) {
      const key = $(element).text().trim();
      const value = $(".snapshot-table2 td").eq(index + 1).text().trim();
      if (key) values[key] = value;
    }
  });

  return {
    beta: parseNumeric(values.Beta),
    rsi: parseNumeric(values["RSI (14)"]),
    sector: values.Sector || null,
  };
}

async function fetchDailyHistory(ticker) {
  const end = dayjs().add(1, "day").startOf("day");
  const start = end.subtract(500, "day");

  const bars = await withRetry(() =>
    yahooFinance.historical(ticker, {
      period1: start.toDate(),
      period2: end.toDate(),
      interval: "1d",
    })
  );

  return (bars || [])
    .filter((bar) => Number.isFinite(Number(bar.close)) && Number(bar.close) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculatePriceMetrics(bars) {
  const closes = bars.map((bar) => Number(bar.close));

  if (closes.length < 253) {
    return {
      return63D: null,
      drawdown252D: null,
      historyBars: closes.length,
    };
  }

  const latest = closes[closes.length - 1];
  const close63SessionsAgo = closes[closes.length - 64];
  const window252 = closes.slice(-253);

  let peak = window252[0];
  let maxDrawdown = 0;

  for (const close of window252) {
    peak = Math.max(peak, close);
    maxDrawdown = Math.max(maxDrawdown, (peak - close) / peak);
  }

  return {
    return63D: (latest / close63SessionsAgo) - 1,
    // Positive magnitude: e.g. 0.25 means a 25% peak-to-trough loss.
    drawdown252D: maxDrawdown,
    historyBars: closes.length,
  };
}

async function runIndex(config, benchmarkHistory) {
  console.log(`\n[Index Charting] Discovering ${config.label} candidates...`);

  const candidates = await fetchCandidates(config);
  console.log(`[Index Charting] ${config.label}: ${candidates.length} candidates`);

  const rows = [];

  for (const candidate of candidates) {
    const { ticker, sector } = candidate;

    try {
      const quote = await fetchQuote(ticker);

      if (
        quote.beta == null ||
        quote.rsi == null ||
        quote.beta < config.betaMin ||
        quote.beta > config.betaMax ||
        quote.rsi < config.rsiMin
      ) {
        continue;
      }

      const history = await fetchDailyHistory(ticker);
      const metrics = calculatePriceMetrics(history);

      const alpha =
        history.length >= 64 &&
        benchmarkHistory.length >= 64
          ? jensensAlpha(history, benchmarkHistory, quote.beta)
          : null;

      rows.push({
        ticker,
        index: config.label,
        sector: sector || quote.sector,
        beta: quote.beta,
        rsi: quote.rsi,
        return63D: metrics.return63D,
        drawdown252D: metrics.drawdown252D,
        alpha63D: alpha,
        historyBars: metrics.historyBars,
        asOf: history.length
          ? dayjs(history[history.length - 1].date).format("YYYY-MM-DD")
          : null,
      });

      if (rows.length % 25 === 0) {
        console.log(`[Index Charting] ${config.label}: ${rows.length} rows qualified`);
      }

      await sleep(150);
    } catch (error) {
      console.warn(`[Index Charting] Skipping ${ticker}: ${error.message}`);
    }
  }

  console.log(`[Index Charting] ${config.label}: ${rows.length} rows qualified`);
  return rows;
}

function mergeMembership(rows) {
  const byTicker = new Map();

  for (const row of rows) {
    const existing = byTicker.get(row.ticker);

    if (existing) {
      const memberships = new Set(existing.indexMembership.split(" | "));
      memberships.add(row.index);
      existing.indexMembership = [...memberships].join(" | ");
      continue;
    }

    byTicker.set(row.ticker, {
      ...row,
      indexMembership: row.index,
    });
  }

  return [...byTicker.values()];
}

async function writeDataset(rows) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  let sheet = workbook.getWorksheet(OUTPUT_SHEET);

  if (!sheet) {
    sheet = workbook.addWorksheet(OUTPUT_SHEET);
  } else {
    for (let row = sheet.rowCount; row >= 1; row--) {
      sheet.spliceRows(row, 1);
    }
  }

  const columns = [
    "Ticker",
    "IndexMembership",
    "Sector",
    "Beta",
    "RSI",
    "Return_63D",
    "Drawdown_252D",
    "JensenAlpha_63D",
    "HistoryBars",
    "PriceAsOf",
  ];

  sheet.addRow(columns);

  for (const row of rows) {
    sheet.addRow([
      row.ticker,
      row.indexMembership,
      row.sector,
      row.beta,
      row.rsi,
      row.return63D,
      row.drawdown252D,
      row.alpha63D,
      row.historyBars,
      row.asOf,
    ]);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  for (const column of sheet.columns) {
    column.width = Math.min(
      24,
      Math.max(12, ...column.values.map((value) => String(value ?? "").length + 2))
    );
  }

  await workbook.xlsx.writeFile(WORKBOOK_PATH);
  console.log(`[Index Charting] Wrote ${rows.length} unique tickers to ${OUTPUT_SHEET}`);
}

async function main() {
  const requested = (process.argv[2] || "all").toLowerCase();
  const validKeys = Object.keys(INDEX_CONFIGS);

  if (requested !== "all" && !validKeys.includes(requested)) {
    throw new Error(`Unknown index "${requested}". Choose: ${validKeys.join(", ")}, all`);
  }

  const keys = requested === "all" ? validKeys : [requested];

  console.log("[Index Charting] Fetching ^OEX benchmark history...");
  const benchmarkHistory = await fetchDailyHistory("^OEX");
  console.log(`[Index Charting] Benchmark history: ${benchmarkHistory.length} daily bars`);

  const allRows = [];

  for (const key of keys) {
    const rows = await runIndex(INDEX_CONFIGS[key], benchmarkHistory);
    allRows.push(...rows);
  }

  const dataset = mergeMembership(allRows);

if (dataset.length === 0) {
  throw new Error(
    "No qualified tickers found; preserving existing IndexChartingCurrent data."
  );
}

await writeDataset(dataset);
}

main().catch((error) => {
  console.error("[Index Charting] Failed:", error.message);
  process.exitCode = 1;
});
