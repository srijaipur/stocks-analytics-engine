// visualizer.js
// Reads ScoresCurrent from data/stocks.xlsx and generates data/report.html
// Usage:
//   node visualizer.js           → writes data/report.html
//   node visualizer.js --serve   → writes + opens in browser via local server

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "data/report.html");
const SERVE = process.argv.includes("--serve");

// ── 1. Read ScoresCurrent from Excel ──────────────────────────────────────────

async function readScores() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const sheet = workbook.getWorksheet("ScoresCurrent");
  if (!sheet) throw new Error("ScoresCurrent sheet not found. Run `npm start` first.");

  const headers = [];
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // exceljs uses 1-based index; slice off index 0
    if (rowNumber === 1) {
      headers.push(...values.map(String));
    } else {
      const obj = {};
      headers.forEach((h, i) => {
        const v = values[i];
        obj[h] = v === null || v === undefined ? null : typeof v === "object" ? Number(v) : v;
      });
      if (obj["Ticker"]) rows.push(obj);
    }
  });

  return { headers, rows };
}

// ── 2. Build self-contained HTML ──────────────────────────────────────────────

function buildHtml(headers, rows) {
  const jsonData = JSON.stringify(rows);
  const jsonHeaders = JSON.stringify(headers);

  const scoreColor = (s) => {
    if (s >= 70) return "#4caf50";
    if (s >= 50) return "#2196f3";
    if (s >= 30) return "#ff9800";
    return "#f44336";
  };

  // Pre-compute colors for each row (used in chart datasets)
  const barColors = rows.map((r) => scoreColor(r["Composite_Score"]));

  const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Stocks Analytics Report — ${new Date().toLocaleDateString()}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e0e0e0; }
  h1 { padding: 1.5rem 2rem 0.5rem; font-size: 1.4rem; color: #fff; }
  .subtitle { padding: 0 2rem 1.5rem; font-size: 0.85rem; color: #888; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 0 2rem 2rem; }
  .card { background: #1a1d27; border-radius: 10px; padding: 1.25rem; }
  .card h2 { font-size: 0.95rem; color: #aaa; margin-bottom: 1rem; }
  .card.full { grid-column: 1 / -1; }
  canvas { max-height: 360px; }

  /* Table */
  .table-wrap { overflow-x: auto; max-height: 480px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.78rem; }
  thead th {
    position: sticky; top: 0; background: #23263a; color: #bbb;
    padding: 0.5rem 0.75rem; text-align: right; cursor: pointer; user-select: none;
    white-space: nowrap;
  }
  thead th:first-child { text-align: left; }
  thead th:hover { color: #fff; }
  tbody tr:nth-child(even) { background: #1e2130; }
  tbody tr:hover { background: #272b3e; }
  td { padding: 0.4rem 0.75rem; text-align: right; white-space: nowrap; }
  td:first-child { text-align: left; font-weight: 600; }
  .pill {
    display: inline-block; padding: 0.15rem 0.5rem;
    border-radius: 999px; font-size: 0.75rem; font-weight: 700; color: #fff;
  }
  .delta-pos { color: #4caf50; }
  .delta-neg { color: #f44336; }
  .delta-null { color: #555; }

  /* Search */
  .search-wrap { padding: 0 2rem 1rem; }
  input[type=search] {
    background: #1a1d27; border: 1px solid #333; border-radius: 6px;
    color: #e0e0e0; padding: 0.45rem 0.9rem; font-size: 0.85rem; width: 240px;
    outline: none;
  }
  input[type=search]:focus { border-color: #555; }
</style>
</head>
<body>

<h1>Stocks Analytics Report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; ${rows.length} tickers</p>

<div class="grid">

  <!-- Composite Score Bar Chart -->
  <div class="card full">
    <h2>Composite Score — Universe Ranking</h2>
    <canvas id="barChart"></canvas>
  </div>

  <!-- Alpha vs RSI Scatter -->
  <div class="card">
    <h2>Jensen's Alpha (63D) vs RSI-14</h2>
    <canvas id="scatterChart"></canvas>
  </div>

  <!-- MA Slope vs Composite -->
  <div class="card">
    <h2>MA Slope (50D) vs Composite Score</h2>
    <canvas id="slopeChart"></canvas>
  </div>

</div>

<!-- Data Table -->
<div class="search-wrap">
  <input type="search" id="filterInput" placeholder="Filter by ticker…" />
</div>
<div class="card full" style="margin: 0 2rem 2rem; overflow:hidden;">
  <h2>Full Data Table <span id="rowCount" style="color:#555;font-weight:normal"></span></h2>
  <div class="table-wrap">
    <table id="dataTable">
      <thead id="tableHead"></thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>
</div>

<script>
const HEADERS = ${jsonHeaders};
const ROWS    = ${jsonData};

// ── Colour helpers ────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 70) return "#4caf50";
  if (s >= 50) return "#2196f3";
  if (s >= 30) return "#ff9800";
  return "#f44336";
}
function scoreLabel(s) {
  if (s >= 70) return "Strong Buy";
  if (s >= 50) return "Monitor";
  if (s >= 30) return "Weak";
  return "Reduce";
}
function fmt(v, decimals = 2) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  return typeof v === "number" ? v.toFixed(decimals) : v;
}

// ── 1. Bar Chart — sorted descending by Composite_Score ──────────────────────
const sorted = [...ROWS].sort((a, b) => b.Composite_Score - a.Composite_Score);
new Chart(document.getElementById("barChart"), {
  type: "bar",
  data: {
    labels: sorted.map(r => r.Ticker),
    datasets: [{
      label: "Composite Score",
      data: sorted.map(r => r.Composite_Score),
      backgroundColor: sorted.map(r => scoreColor(r.Composite_Score)),
      borderRadius: 4,
    }, {
      label: "Daily Delta",
      data: sorted.map(r => r.Daily_Composite_Score_delta),
      backgroundColor: sorted.map(r =>
        (r.Daily_Composite_Score_delta ?? 0) >= 0 ? "#4caf5066" : "#f4433666"
      ),
      borderRadius: 4,
    }]
  },
  options: {
    indexAxis: "y",
    responsive: true,
    plugins: { legend: { labels: { color: "#aaa" } } },
    scales: {
      x: { ticks: { color: "#888" }, grid: { color: "#ffffff0f" }, min: 0, max: 100 },
      y: { ticks: { color: "#ccc", font: { size: 10 } }, grid: { color: "#ffffff08" } }
    }
  }
});

// ── 2. Scatter — Alpha vs RSI ─────────────────────────────────────────────────
new Chart(document.getElementById("scatterChart"), {
  type: "scatter",
  data: {
    datasets: [{
      label: "Tickers",
      data: ROWS.map(r => ({ x: r.Alpha_63D, y: r.RSI_14Day, ticker: r.Ticker, score: r.Composite_Score })),
      backgroundColor: ROWS.map(r => scoreColor(r.Composite_Score) + "cc"),
      pointRadius: 6,
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = ctx.raw;
            return \`\${d.ticker}  α=\${fmt(d.x)}  RSI=\${fmt(d.y)}  Score=\${fmt(d.score)}\`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: "Alpha (63D)", color: "#888" }, ticks: { color: "#888" }, grid: { color: "#ffffff0f" } },
      y: { title: { display: true, text: "RSI-14", color: "#888" }, ticks: { color: "#888" }, grid: { color: "#ffffff0f" } }
    }
  }
});

// ── 3. Scatter — MA Slope vs Composite ───────────────────────────────────────
new Chart(document.getElementById("slopeChart"), {
  type: "scatter",
  data: {
    datasets: [{
      label: "Tickers",
      data: ROWS.map(r => ({ x: r.MA_Slope_50, y: r.Composite_Score, ticker: r.Ticker })),
      backgroundColor: ROWS.map(r => scoreColor(r.Composite_Score) + "cc"),
      pointRadius: 6,
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = ctx.raw;
            return \`\${d.ticker}  slope=\${fmt(d.x)}  score=\${fmt(d.y)}\`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: "MA Slope (50D)", color: "#888" }, ticks: { color: "#888" }, grid: { color: "#ffffff0f" } },
      y: { title: { display: true, text: "Composite Score", color: "#888" }, ticks: { color: "#888" }, grid: { color: "#ffffff0f" }, min: 0, max: 100 }
    }
  }
});

// ── 4. Data Table ─────────────────────────────────────────────────────────────
const COLS = [
  "Ticker", "Composite_Score", "Daily_Composite_Score_delta",
  "EPS_TTM", "EPS_Percentile_In_Universe", "EPS_Fwd_Grwth_Trnd",
  "Alpha_63D", "Beta", "RSI_14Day", "SMA200_Dist_%",
  "MA_Slope_50", "Vol Expansion", "Institutional_Accumulation_%",
  "LastQRtr_InstActivity", "RS_vs_SP100"
];

const thead = document.getElementById("tableHead");
const tbody = document.getElementById("tableBody");
const rowCountEl = document.getElementById("rowCount");

// Render header
const tr = document.createElement("tr");
COLS.forEach((col, ci) => {
  const th = document.createElement("th");
  th.textContent = col.replace(/_/g, " ");
  th.dataset.col = col;
  th.dataset.dir = "desc";
  th.addEventListener("click", () => sortTable(col, th));
  tr.appendChild(th);
});
thead.appendChild(tr);

let currentRows = [...ROWS].sort((a, b) => b.Composite_Score - a.Composite_Score);

function renderTable(data) {
  tbody.innerHTML = "";
  rowCountEl.textContent = "(" + data.length + ")";
  data.forEach(row => {
    const tr = document.createElement("tr");
    COLS.forEach((col, ci) => {
      const td = document.createElement("td");
      const val = row[col];
      if (col === "Composite_Score") {
        td.innerHTML = \`<span class="pill" style="background:\${scoreColor(val)}">\${fmt(val)} \${scoreLabel(val)}</span>\`;
      } else if (col === "Daily_Composite_Score_delta") {
        if (val === null || val === undefined) {
          td.innerHTML = '<span class="delta-null">—</span>';
        } else {
          const cls = val >= 0 ? "delta-pos" : "delta-neg";
          td.innerHTML = \`<span class="\${cls}">\${val >= 0 ? "+" : ""}\${fmt(val)}</span>\`;
        }
      } else if (col === "Vol Expansion") {
        td.textContent = val ? "✓" : "✗";
        td.style.color = val ? "#4caf50" : "#f44336";
      } else {
        td.textContent = fmt(val);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function sortTable(col, thEl) {
  const dir = thEl.dataset.dir === "desc" ? "asc" : "desc";
  document.querySelectorAll("thead th").forEach(t => t.dataset.dir = "desc");
  thEl.dataset.dir = dir;
  currentRows.sort((a, b) => {
    const av = a[col] ?? -Infinity;
    const bv = b[col] ?? -Infinity;
    return dir === "desc" ? bv - av : av - bv;
  });
  renderTable(currentRows);
}

// Filter
document.getElementById("filterInput").addEventListener("input", (e) => {
  const q = e.target.value.trim().toUpperCase();
  const filtered = q ? ROWS.filter(r => r.Ticker.toUpperCase().includes(q)) : [...ROWS];
  currentRows = filtered;
  renderTable(filtered);
});

renderTable(currentRows);
<\/script>
</body>
</html>`;

  return html;
}

// ── 3. Main ───────────────────────────────────────────────────────────────────

const { headers, rows } = await readScores();
const html = buildHtml(headers, rows);
fs.writeFileSync(OUTPUT_PATH, html, "utf8");
console.log(`✅ Report written → ${OUTPUT_PATH}  (${rows.length} tickers)`);

if (SERVE) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(OUTPUT_PATH));
  });
  server.listen(3000, "127.0.0.1", () => {
    const url = "http://localhost:3000";
    console.log(`🌐 Serving at ${url}`);
    // Open in default browser (cross-platform)
    const cmd = process.platform === "win32" ? `start ${url}`
              : process.platform === "darwin" ? `open ${url}`
              : `xdg-open ${url}`;
    exec(cmd);
  });
}