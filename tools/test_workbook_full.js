import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(WORKBOOK_PATH);

const portfolio = workbook.getWorksheet("Portfolio");

console.log("📊 Portfolio sheet - Last 10 rows:");
const rows = [];
portfolio.eachRow((row, rowNumber) => {
  rows.push({ num: rowNumber, val: row.getCell(1).value });
});

rows.filter((r, i) => i >= rows.length - 10).forEach(r => {
  console.log(`  Row ${r.num}: ${r.val}`);
});

console.log(`\nTotal rows in Portfolio: ${rows.length}`);
