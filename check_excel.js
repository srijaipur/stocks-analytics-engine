import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(WORKBOOK_PATH);

const portfolio = workbook.getWorksheet("Portfolio");

console.log("📊 All tickers in Portfolio sheet:");
const tickers = [];
portfolio.eachRow((row, rowNumber) => {
  if (rowNumber > 1) {
    const ticker = row.getCell(1).value;
    tickers.push(ticker);
  }
});

console.log(tickers);
console.log(`\nTotal: ${tickers.length}`);

const testTickers = tickers.filter(t => t && t.includes("TEST"));
if (testTickers.length > 0) {
  console.log(`\n⚠️  Found test tickers: ${testTickers.join(", ")}`);
}
