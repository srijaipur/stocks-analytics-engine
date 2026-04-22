/**
 * Clean and regenerate data/stocks.xlsx from tickers.json
 * Usage: node scripts/cleanWorkbook.js
 *
 * This script:
 *   1. Deletes the existing stocks.xlsx file
 *   2. Regenerates a fresh workbook from tickers.json
 *   3. Removes any invalid or test tickers that may have accumulated
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

// Remove existing workbook
if (fs.existsSync(WORKBOOK_PATH)) {
  fs.unlinkSync(WORKBOOK_PATH);
  console.log(`🗑️  Deleted ${WORKBOOK_PATH}`);
} else {
  console.log(`ℹ️  ${WORKBOOK_PATH} does not exist`);
}

// Regenerate fresh workbook by importing createWorkbook
console.log("📄 Regenerating clean workbook from tickers.json...");

// Dynamic import to run createWorkbook
const createWorkbookModule = await import("./createWorkbook.js");
console.log("✅ Workbook cleaned and regenerated successfully!");
