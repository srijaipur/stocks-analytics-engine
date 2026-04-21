import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

export async function writeScores(rows) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  // --- ScoresCurrent sheet ---
  let sheet = workbook.getWorksheet("ScoresCurrent");
  if (!sheet) {
    sheet = workbook.addWorksheet("ScoresCurrent");
  }

  sheet.getRow(1).values = [
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
  ];

  // --- Read previous-day baseline from ScoresPreviousDay sheet ---
  // Row 1: ["_date_", "YYYY-MM-DD"]  — date of the snapshot
  // Row 2+: [ticker, compositeScore]
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  let prevSheet = workbook.getWorksheet("ScoresPreviousDay");
  if (!prevSheet) prevSheet = workbook.addWorksheet("ScoresPreviousDay");

  const prevScores = new Map();
  let prevDate = null;
  prevSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      prevDate = String(row.getCell(2).value ?? "").trim();
      return;
    }
    const ticker = String(row.getCell(1).value ?? "").trim();
    const score = parseFloat(row.getCell(2).value);
    if (ticker && !isNaN(score)) prevScores.set(ticker, score);
  });

  // Splice out all data rows cleanly (avoids ghost empty rows on re-runs)
  const lastRow = sheet.lastRow?.number || 1;
  if (lastRow > 1) sheet.spliceRows(2, lastRow - 1);

  // Row fill colours keyed by Composite_Score range (matches Composite_Formula legend)
  const SCORE_FILL = (score) => {
    if (score >= 70) return "FFC6EFCE"; // Green  — Strong Buy candidate
    if (score >= 50) return "FFDDEBF7"; // Teal   — Hold / Monitor
    if (score >= 30) return "FFFCE4D6"; // Pink   — Weak / Neutral
    return "FFFFC7CE"; // Red    — Consider reducing position
  };

  // Write new rows, appending Daily_Composite_Score_delta and applying row colour
  // delta is null for tickers with no prior snapshot
  rows.forEach((row, i) => {
    const ticker = String(row[0]).trim();
    const newScore = parseFloat(row[13]);
    const prev = prevScores.get(ticker);
    const delta = prev !== undefined && !isNaN(newScore) ? +(newScore - prev).toFixed(2) : null;

    const excelRow = sheet.getRow(i + 2);
    excelRow.values = [...row, delta];

    // Apply colour to every cell in the row based on Composite_Score
    const argb = SCORE_FILL(newScore);
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    });
    excelRow.commit();
  });

  // --- Update ScoresPreviousDay with today's scores ---
  // Always overwrite so same-day reruns show the intraday delta.
  prevSheet.spliceRows(1, prevSheet.lastRow?.number || 0);
  prevSheet.getRow(1).values = ["_date_", today];
  rows.forEach((row, i) => {
    prevSheet.getRow(i + 2).values = [String(row[0]).trim(), parseFloat(row[13]) || null];
  });

  // --- Composite Score Legend sheet ---
  let legend = workbook.getWorksheet("Composite_Formula");
  if (!legend) {
    legend = workbook.addWorksheet("Composite_Formula");
  }
  legend.getRow(1).values = ["Component", "Weight", "Signal Type", "Source"];
  const legendRows = [
    ["EPS_Percentile_In_Universe", "30%", "Earnings quality vs peers", "Finviz"],
    ["P(EPS_Fwd_Growth)", "30%", "Earnings acceleration", "Finviz"],
    ["P(MA_Slope_50)", "20%", "Medium-term price trend", "Yahoo Finance prices"],
    ["P(RSI_14)", "10%", "Short-term momentum strength", "Finviz"],
    ["P(SMA200_Dist)", "10%", "Long-term trend confirmation", "Finviz"],
    ["", "", "", ""],
    [
      "Formula",
      "Composite = 0.30 × P(EPS_Univ) + 0.30 × P(Fwd_Growth) + 0.20 × P(MA_Slope_50) + 0.10 × P(RSI_14) + 0.10 × P(SMA200_Dist)",
      "",
      "",
    ],
    ["", "", "", ""],
    ["Score Range", "Signal", "", ""],
    ["≥ 70", "Strong Buy candidate", "", ""],
    ["50 – 70", "Hold / Monitor", "", ""],
    ["30 – 50", "Weak / Neutral", "", ""],
    ["< 30", "Consider reducing position", "", ""],
    ["", "", "", ""],
    [
      "Note",
      "All P(x) values are percentile ranks within the current universe (0-100). Score is relative, not absolute.",
      "",
      "",
    ],
  ];
  legendRows.forEach((row, i) => {
    legend.getRow(i + 2).values = row;
  });

  // Apply colour coding to the Score Range / Signal rows so they match ScoresCurrent
  const signalColors = [
    { signal: "Strong Buy candidate", argb: "FFC6EFCE" }, // Green
    { signal: "Hold / Monitor", argb: "FFDDEBF7" }, // Teal
    { signal: "Weak / Neutral", argb: "FFFCE4D6" }, // Pink
    { signal: "Consider reducing position", argb: "FFFFC7CE" }, // Red
  ];
  legend.eachRow((row, rowNumber) => {
    if (rowNumber < 2) return;
    const signalCell = String(row.getCell(2).value ?? "").trim();
    const match = signalColors.find((s) => s.signal === signalCell);
    if (match) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: match.argb } };
      });
      row.commit();
    }
  });

  await workbook.xlsx.writeFile(WORKBOOK_PATH);
}
