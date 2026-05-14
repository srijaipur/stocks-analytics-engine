import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

export async function writeScores(rows, signals) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  let sheet = workbook.getWorksheet("ScoresCurrent");
  if (!sheet) sheet = workbook.addWorksheet("ScoresCurrent");

  sheet.getRow(1).values = [
    "Ticker",
    "EPS_TTM",
    "EPS_Percentile",
    "EPS_Growth",
    "Inst_Accumulation",
    "Alpha_63D",
    "Beta",
    "RSI",
    "SMA200_Dist",
    "MA_Slope",
    "Volume_Expansion",
    "Net_Inst",

    "RS_vs_SP100",
    "Return_63D",
    "RS_Rank",
    "Drawdown_%",

    "Old_Score",
    "New_Score",

    "Earnings_Date",
    "Delta",
  ];

  const today = new Date().toISOString().slice(0, 10);

  let prevSheet = workbook.getWorksheet("ScoresPreviousDay");
  if (!prevSheet) prevSheet = workbook.addWorksheet("ScoresPreviousDay");

  const prevScores = new Map();

  prevSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const ticker = row.getCell(1).value;
    const score = parseFloat(row.getCell(2).value);
    if (ticker && !isNaN(score)) {
      prevScores.set(ticker, score);
    }
  });

  const lastRow = sheet.lastRow?.number || 1;
  if (lastRow > 1) sheet.spliceRows(2, lastRow - 1);

  const color = (score) => {
    if (score >= 70) return "FFC6EFCE";
    if (score >= 50) return "FFDDEBF7";
    if (score >= 30) return "FFFCE4D6";
    return "FFFFC7CE";
  };

  rows.forEach((row, i) => {
    const ticker = row[0];
    const newScore = row[17];

    const prev = prevScores.get(ticker);
    const delta = prev !== undefined ? +(newScore - prev).toFixed(2) : null;

    const excelRow = sheet.getRow(i + 2);
    excelRow.values = [...row, delta];

    const fillColor = color(newScore);

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    });

    excelRow.commit();
  });

  prevSheet.spliceRows(1, prevSheet.lastRow?.number || 0);
  prevSheet.getRow(1).values = ["_date_", today];

  rows.forEach((row, i) => {
    prevSheet.getRow(i + 2).values = [row[0], row[17]];
  });

  // =========================
// SignalsTriggered Sheet
// =========================

let signalSheet = workbook.getWorksheet("SignalsTriggered");
if (!signalSheet) signalSheet = workbook.addWorksheet("SignalsTriggered");

// Headers
signalSheet.getRow(1).values = [
  "Ticker",
  "Score",
  "Triggers"
];

// Clear existing rows
const lastSignalRow = signalSheet.lastRow?.number || 1;
if (lastSignalRow > 1) {
  signalSheet.spliceRows(2, lastSignalRow - 1);
}

// Populate
signals.forEach((s, i) => {
  signalSheet.getRow(i + 2).values = [
    s.ticker,
    s.score,
    s.triggers
  ];
});


  await workbook.xlsx.writeFile(WORKBOOK_PATH);
}
