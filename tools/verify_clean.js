import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(WORKBOOK_PATH);

const portfolio = workbook.getWorksheet("Portfolio");
const tickers = [];
portfolio.eachRow((row, rowNumber) => {
  if (rowNumber > 1) {
    const ticker = row.getCell(1).value;
    tickers.push(ticker);
  }
});

const testTickers = tickers.filter(t => t && (t.includes("TEST") || t.includes("NEW")));

console.log(`✅ Total tickers in Portfolio: ${tickers.length}`);
if (testTickers.length === 0) {
  console.log("✅ No test tickers found - workbook is clean!");
} else {
  console.log(`⚠️  Found test tickers: ${testTickers.join(", ")}`);
}
