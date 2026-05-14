import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

export async function readSheet(sheetName) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    console.warn(`⚠️  Worksheet "${sheetName}" not found in stocks.xlsx — skipping.`);
    return [];
  }

  const tickers = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const value = row.getCell(1).value;
    if (value) tickers.push(String(value).trim());
  });

  return tickers;
}
