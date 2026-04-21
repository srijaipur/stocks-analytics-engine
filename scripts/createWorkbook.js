/**
 * Run once to create data/stocks.xlsx with the required worksheets.
 * Usage: node scripts/createWorkbook.js
 *
 * Sheets created:
 *   Portfolio      – column A: ticker symbols you own
 *   Watchlist      – column A: ticker symbols you are watching
 *   ScoresCurrent  – written by the engine (Ticker | Level | Trend)
 */

import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

const workbook = new ExcelJS.Workbook();

// If the workbook already exists, load it so we can add missing sheets
// without destroying any tickers the user has already entered.
if (fs.existsSync(WORKBOOK_PATH)) {
  await workbook.xlsx.readFile(WORKBOOK_PATH);
  console.log("📂 Existing stocks.xlsx loaded — only adding missing sheets.");
} else {
  console.log("📄 Creating new stocks.xlsx...");
}

function ensureSheet(name, headerRow) {
  if (!workbook.getWorksheet(name)) {
    const sheet = workbook.addWorksheet(name);
    sheet.getRow(1).values = headerRow;
  }
  return workbook.getWorksheet(name);
}

// Writes a ticker list to a sheet, always replacing whatever is there.
// createWorkbook.js is the source of truth for Portfolio and Watchlist.
function writeTickers(sheet, tickers) {
  const lastRow = sheet.lastRow?.number || 1;
  if (lastRow > 1) sheet.spliceRows(2, lastRow - 1);
  tickers.forEach((t, i) => {
    sheet.getRow(i + 2).values = [t];
  });
}

// --- Portfolio sheet ---
const portfolio = ensureSheet("Portfolio", ["Ticker"]);
writeTickers(portfolio, [
  "XOM",
  "AMD",
  "SNOW",
  "TSLA",
  "NFLX",
  "NVDA",
  "UNH",
  "PLTR",
  "DIS",
  "UROY",
  "OKTA",
  "INTC",
  "NTLA",
  "CRSP",
  "ALHC",
  "BIIB",
  "BIO",
  "ENPH",
  "MSTR",
  "SMR",
  "IONQ",
  "JOBY",
  "ACHR",
  "SOFI",
  "BA",
  "AVGO",
  "RIVN",
  "CEG",
  "PYPL",
  "CRWD",
  "PERI",
  "BLSH",
  "MBLY",
  "CMS",
  "IOT",
  "SHOP",
]);

// --- Watchlist sheet ---
const watchlist = ensureSheet("Watchlist", ["Ticker"]);
writeTickers(watchlist, ["VRT", "BE", "SMRT", "USAR", "LRCX", "QS", "P"]);

// --- ScoresCurrent sheet (managed by engine) ---
ensureSheet("ScoresCurrent", [
  "Ticker",
  "EPS_TTM",
  "EPS_Percentile_In_Universe",
  "EPS_Fwd_Grwth_Trnd",
  "Institutional_Accumulation_%",
  "Alpha_63D",
  "Beta",
  "RSI_14Day",
  "SMA200_Dist_%",
  "MA_Slope_50",
  "Vol Expansion",
  "LastQRtr_InstActivity",
  "RS_vs_SP100",
  "Composite_Score",
  "Daily_Composite_Score_delta",
]);
ensureSheet("ScoresPreviousDay", ["_date_", ""]); // managed by writeSheet.js — do not edit manually

// --- Index sheets (populated by npm run screen-* scripts) ---
ensureSheet("Russel_2000", ["Ticker"]);
ensureSheet("Dow_Jones", ["Ticker"]);
ensureSheet("Nasdaq", ["Ticker"]);
ensureSheet("SP_100", ["Ticker"]);

// Ensure data/ directory exists
fs.mkdirSync(path.dirname(WORKBOOK_PATH), { recursive: true });

await workbook.xlsx.writeFile(WORKBOOK_PATH);
console.log(`✅ Created ${WORKBOOK_PATH}`);
