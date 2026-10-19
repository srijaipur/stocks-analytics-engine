// tools/test_visualizer_columns.js

// Regression guard for the ScoresCurrent → visualizer column mapping.

//

// Problem it guards against: visualizer-analytics.js (and friends) read the

// ScoresCurrent sheet in data/stocks.xlsx. If a column is ever added/reordered

// without updating every reader, values can silently land on the wrong field.

//

// Usage:

//   node tools/test_visualizer_columns.js --snapshot   → writes the current

//       reader output to tools/__golden__/analytics-rows.json (run this once,

//       right before making a column change, to capture the "before" state)

//   node tools/test_visualizer_columns.js               → re-reads the sheet

//       and diffs against the golden file. Fails (exit 1) if any pre-existing

//       column's value changed for any ticker. New columns are allowed and

//       reported as informational only.

import ExcelJS from "exceljs";

import fs from "fs";

import path from "path";

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WORKBOOK_PATH = path.resolve(__dirname, "../data/stocks.xlsx");

const GOLDEN_DIR = path.resolve(__dirname, "__golden__");

const GOLDEN_PATH = path.join(GOLDEN_DIR, "analytics-rows.json");

const SNAPSHOT_MODE = process.argv.includes("--snapshot");

// Mirrors the header-driven read used by visualizer-analytics.js / visualizer.js /

// visualizer-report.js / visualizer-indices.js — kept intentionally identical so

// this test actually exercises the same mapping logic they rely on.

async function readScoresCurrent() {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const sheet = workbook.getWorksheet("ScoresCurrent");

  if (!sheet) throw new Error("ScoresCurrent sheet not found. Run `npm start` first.");

  const headers = sheet.getRow(1).values.slice(1).map(String);

  const rows = [];

  sheet.eachRow((row, i) => {
    if (i === 1) return;

    const vals = row.values.slice(1);

    const obj = {};

    headers.forEach((h, idx) => {
      obj[h] = vals[idx] === undefined ? null : vals[idx];
    });

    if (obj.Ticker) rows.push(obj);
  });

  return rows;
}

function toMapByTicker(rows) {
  return new Map(rows.map((r) => [r.Ticker, r]));
}

async function main() {
  const rows = await readScoresCurrent();

  if (SNAPSHOT_MODE) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });

    fs.writeFileSync(GOLDEN_PATH, JSON.stringify(rows, null, 2));

    console.log(`✅ Golden snapshot written: ${GOLDEN_PATH} (${rows.length} tickers)`);

    return;
  }

  if (!fs.existsSync(GOLDEN_PATH)) {
    console.error(
      `❌ No golden file at ${GOLDEN_PATH}. Run with --snapshot before making column changes.`
    );

    process.exitCode = 1;

    return;
  }

  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8"));

  const goldenByTicker = toMapByTicker(golden);

  const currentByTicker = toMapByTicker(rows);

  let regressions = 0;

  let newColumns = new Set();

  for (const [ticker, goldenRow] of goldenByTicker) {
    const currentRow = currentByTicker.get(ticker);

    if (!currentRow) {
      console.warn(`⚠️  ${ticker} missing from current sheet (ticker removed?)`);

      continue;
    }

    for (const key of Object.keys(goldenRow)) {
      if (!(key in currentRow)) {
        console.error(`❌ ${ticker}: column "${key}" missing in current output`);

        regressions++;

        continue;
      }

      if (goldenRow[key] !== currentRow[key]) {
        console.error(
          `❌ ${ticker}: "${key}" changed — golden=${goldenRow[key]} current=${currentRow[key]}`
        );

        regressions++;
      }
    }

    for (const key of Object.keys(currentRow)) {
      if (!(key in goldenRow)) newColumns.add(key);
    }
  }

  if (newColumns.size > 0) {
    console.log(
      `ℹ️  New columns detected (expected for intentional additions): ${[...newColumns].join(", ")}`
    );
  }

  if (regressions > 0) {
    console.error(`\n❌ ${regressions} regression(s) found in existing columns.`);

    process.exitCode = 1;
  } else {
    console.log(`\n✅ No regressions in existing columns across ${golden.length} tickers.`);
  }
}

main().catch((err) => {
  console.error(err);

  process.exitCode = 1;
});
