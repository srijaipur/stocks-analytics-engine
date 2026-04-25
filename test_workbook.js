import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(WORKBOOK_PATH);

const portfolio = workbook.getWorksheet("Portfolio");
const watchlist = workbook.getWorksheet("Watchlist");

console.log("📊 Portfolio sheet content:");
portfolio.eachRow((row, rowNumber) => {
  console.log(`  Row ${rowNumber}: ${row.getCell(1).value}`);
});

console.log("\n📋 Watchlist sheet content:");
watchlist.eachRow((row, rowNumber) => {
  console.log(`  Row ${rowNumber}: ${row.getCell(1).value}`);
});
