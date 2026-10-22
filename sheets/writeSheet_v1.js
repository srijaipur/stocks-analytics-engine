import ExcelJS from "exceljs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rename, rm } from "node:fs/promises";
const SCORE_HEADERS = [
  "Ticker",
  "EPS_TTM",
  "EPS_Percentile",
  "EPS_Growth",
  "Inst_Accumulation",
  "Alpha_63D",
  "Beta",
  "RSI_14Day",
  "SMA200_Dist",
  "MA_Slope_50",
  "Volume_Expansion",
  "Net_Inst",
  "RS_vs_SP100",
  "Return_63D",
  "RS_Rank",
  "Drawdown_%",
  "Composite_Score",
  "New_Composite_Score",
  "Earnings_Date",
  "Daily_Composite_Score_delta",
];
const SNAPSHOT_HEADERS = ["_date_", ""];
const SIGNAL_HEADERS = ["Ticker", "Score", "Triggers"];


function clearWorksheetRows(sheet) {
  for (let rowNumber = sheet.rowCount; rowNumber >= 1; rowNumber--) {
    sheet.spliceRows(rowNumber, 1);
  }
}
function validateInputs(rows, signals, workbookPath) {
  if (typeof workbookPath !== "string" || workbookPath.trim() === "") {
    throw new TypeError("A non-empty workbookPath is required.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError("rows must be a non-empty array.");
  }

  if (!Array.isArray(signals)) {
    throw new TypeError("signals must be an array.");
  }
const tickers = new Set();
rows.forEach((row, index) => {
    if (!Array.isArray(row) || row.length !== 19) {
      throw new TypeError(`rows[${index}] must contain exactly 19 values.`);
    }
const ticker = row[0];
    if (typeof ticker !== "string" || ticker.trim() === "") {
      throw new TypeError(`rows[${index}] has an invalid ticker.`);
    }
const normalizedTicker = ticker.trim().toUpperCase();
    if (tickers.has(normalizedTicker)) {
      throw new TypeError(`Duplicate ticker in rows: ${ticker}.`);
    }
tickers.add(normalizedTicker);
const numericColumns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17];
    for (const column of numericColumns) {
      if (typeof row[column] !== "number" || !Number.isFinite(row[column])) {
        throw new TypeError(
          `rows[${index}][${column}] must be a finite number.`
        );
      }
    }

    if (typeof row[10] !== "boolean") {
      throw new TypeError(`rows[${index}][10] must be a boolean.`);
    }

    if (row[13] !== null &&
        (typeof row[13] !== "number" || !Number.isFinite(row[13]))) {
      throw new TypeError(
        `rows[${index}][13] must be a finite number or null.`
      );
    }

    if (
      row[18] !== null &&
      (typeof row[18] !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row[18]) ||
        Number.isNaN(Date.parse(`${row[18]}T00:00:00Z`)))
    ) {
      throw new TypeError(
        `rows[${index}][18] must be a YYYY-MM-DD date string or null.`
      );
    }
  });
signals.forEach((signal, index) => {
    if (!signal || typeof signal !== "object" || Array.isArray(signal)) {
      throw new TypeError(`signals[${index}] must be an object.`);
    }
if (
      typeof signal.ticker !== "string" ||
      signal.ticker.trim() === "" ||
      !tickers.has(signal.ticker.trim().toUpperCase())
    ) {
      throw new TypeError(
        `signals[${index}] must reference a ticker in rows.`
      );
    }
if (typeof signal.score !== "number" || !Number.isFinite(signal.score)) {
      throw new TypeError(`signals[${index}].score must be a finite number.`);
    }
const matchingRow = rows.find(
  (row) =>
    row[0].trim().toUpperCase() ===
    signal.ticker.trim().toUpperCase()
);

if (signal.score !== matchingRow[17]) {
  throw new TypeError(
    `signals[${index}].score must match the composite score for ${signal.ticker}.`
  );
}
if (typeof signal.triggers !== "string" || signal.triggers.trim() === "") {
      throw new TypeError(`signals[${index}].triggers must be a non-empty string.`);
    }
  });
}
function scoreColor(score) {
  if (score >= 70) return "FFC6EFCE";
  if (score >= 50) return "FFDDEBF7";
  if (score >= 30) return "FFFCE4D6";
  return "FFFFC7CE";
}
export async function writeScoresV1(rows, signals, workbookPath) {
  validateInputs(rows, signals, workbookPath);

  const targetPath = path.resolve(workbookPath);
  const tempPath = `${targetPath}.${randomUUID()}.tmp.xlsx`;
try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(targetPath);

    let currentSheet = workbook.getWorksheet("ScoresCurrent");
    if (!currentSheet) currentSheet = workbook.addWorksheet("ScoresCurrent");

    let previousSheet = workbook.getWorksheet("ScoresPreviousDay");
    if (!previousSheet) {
      previousSheet = workbook.addWorksheet("ScoresPreviousDay");
    }
let signalSheet = workbook.getWorksheet("SignalsTriggered");
    if (!signalSheet) {
      signalSheet = workbook.addWorksheet("SignalsTriggered");
    }
const previousScores = new Map();
previousSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const ticker = row.getCell(1).value;
      const score = row.getCell(2).value;

      if (
        typeof ticker === "string" &&
        ticker.trim() !== "" &&
        typeof score === "number" &&
        Number.isFinite(score)
      ) {
        previousScores.set(ticker.trim().toUpperCase(), score);
      }
    });
const today = new Date().toISOString().slice(0, 10);
clearWorksheetRows(currentSheet);
    currentSheet.getRow(1).values = SCORE_HEADERS;
rows.forEach((row, index) => {
      const ticker = row[0].trim();
      const newScore = row[17];
      const previousScore = previousScores.get(ticker.toUpperCase());
      const delta =
        previousScore !== undefined
          ? +(newScore - previousScore).toFixed(2)
          : null;
const excelRow = currentSheet.getRow(index + 2);
      excelRow.values = [...row, delta];
const fillColor = scoreColor(newScore);
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
      });
    });
clearWorksheetRows(previousSheet);
    previousSheet.getRow(1).values = SNAPSHOT_HEADERS;
    previousSheet.getRow(1).getCell(2).value = today;
rows.forEach((row, index) => {
      previousSheet.getRow(index + 2).values = [row[0].trim(), row[17]];
    });
clearWorksheetRows(signalSheet);
    signalSheet.getRow(1).values = SIGNAL_HEADERS;
signals.forEach((signal, index) => {
      signalSheet.getRow(index + 2).values = [
        signal.ticker.trim(),
        signal.score,
        signal.triggers,
      ];
    });
await workbook.xlsx.writeFile(tempPath);
    await rename(tempPath, targetPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}
