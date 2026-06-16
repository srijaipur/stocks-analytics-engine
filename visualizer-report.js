// visualizer-report.js
// Reads ScoresCurrent from data/stocks.xlsx and generates an auth-protected data/report.html
// Usage:
//   node visualizer-report.js           → writes data/report.html
//   node visualizer-report.js --serve   → writes + serves on http://localhost:3000

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { firebaseConfig } from "./firebase/firebaseConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "data/report.html");
const SERVE = process.argv.includes("--serve");
const PORT = process.env.PORT || 3000;

function normalizeCellValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    if (value.text !== undefined) return value.text;
    if (value.richText !== undefined) return value.richText;
    if (value.result !== undefined) return value.result;
    if (value.formula !== undefined) return value.result ?? value.formula;
  }
  return value;
}

async function readScores() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const sheet = workbook.getWorksheet("ScoresCurrent");
  if (!sheet) {
    throw new Error("ScoresCurrent sheet not found. Run `npm start` first.");
  }

  const headers = sheet.getRow(1).values.slice(1).map(String);
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1);
    const item = {};
    headers.forEach((header, index) => {
      item[header] = normalizeCellValue(values[index]);
    });
    if (item.Ticker) rows.push(item);
  });

  return rows;
}

function buildHtml(rows) {
  const safeData = JSON.stringify(rows).replace(/</g, "\\u003c");
  const firebaseConfigJson = JSON.stringify(firebaseConfig).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Stocks Analytics Report — Authenticated</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { min-height: 100vh; font-family: system-ui, sans-serif; background: #0f1117; color: #e0e0e0; }
  .hidden { display: none; }
  .center-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .auth-card, .card { background: #151824; border: 1px solid #2d3344; border-radius: 16px; padding: 24px; max-width: 900px; width: 100%; }
  .login-btn, .logout-btn { border: none; border-radius: 10px; padding: 12px 18px; cursor: pointer; background: #2196f3; color: white; font-weight: 700; }
  .login-btn:hover, .logout-btn:hover { background: #64b5f6; }
  header { padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  header h1 { font-size: 1.6rem; }
  .subtitle { color: #8a97b3; font-size: 0.95rem; margin-top: 8px; }
  .search-wrap { padding: 0 24px 16px; }
  input[type=search] { width: 100%; max-width: 320px; padding: 10px 14px; border-radius: 10px; border: 1px solid #2d3344; background: #0f1117; color: #e0e0e0; }
  .page { padding: 0 24px 24px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; padding: 0 24px 24px; }
  .ticker-card { border-radius: 16px; padding: 14px; background: #1b2030; border: 1px solid #2d3344; }
  .ticker-card h2 { font-size: 0.9rem; margin-bottom: 8px; color: #d1d9ff; }
  .ticker-card p { font-size: 0.82rem; color: #b0b7c8; line-height: 1.5; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th, td { padding: 10px 14px; border-bottom: 1px solid #2d3344; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  thead th { background: #171d2f; position: sticky; top: 0; z-index: 2; }
  tbody tr:hover { background: #1f273f; }
  .pill { border-radius: 999px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
  .pill.green { background: rgba(76, 175, 80, 0.18); color: #81c784; }
  .pill.blue { background: rgba(33, 150, 243, 0.18); color: #90caf9; }
  .pill.orange { background: rgba(255, 152, 0, 0.16); color: #ffb74d; }
  .pill.red { background: rgba(244, 67, 54, 0.16); color: #ef9a9a; }
  .summary-line { margin-top: 8px; color: #8a97b3; font-size: 0.94rem; }
</style>
</head>
<body>
<div id="auth"></div>
<div id="app" class="hidden">
<header>
  <div>
    <h1>Stocks Analytics Report</h1>
    <div class="subtitle">Authenticated client report built from data/stocks.xlsx</div>
  </div>
  <button id="logoutBtn" class="logout-btn">Logout</button>
</header>
<div class="page">
  <div class="search-wrap">
    <input type="search" id="filterInput" placeholder="Filter by ticker or metric..." />
  </div>
  <div class="card-grid" id="cardGrid"></div>
  <div class="card table-wrap">
    <h2>Full Scores Table</h2>
    <div class="summary-line" id="rowCount"></div>
    <table>
      <thead id="tableHead"></thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>
</div>
</div>
<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const fbApp = initializeApp(${firebaseConfigJson});
const auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();
const db = getFirestore(fbApp);
const rows = ${safeData};
const authEl = document.getElementById("auth");
const appEl = document.getElementById("app");
const filterInput = document.getElementById("filterInput");
const cardGrid = document.getElementById("cardGrid");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const rowCount = document.getElementById("rowCount");
const logoutBtn = document.getElementById("logoutBtn");

function scoreTier(score) {
  if (score >= 70) return { label: "Strong Buy", style: "green" };
  if (score >= 50) return { label: "Monitor", style: "blue" };
  if (score >= 30) return { label: "Weak", style: "orange" };
  return { label: "Reduce", style: "red" };
}

function renderLoginScreen() {
  authEl.innerHTML = '<div class="center-screen">' +
    '<div class="auth-card">' +
    '<h2>🔒 Login Required</h2>' +
    '<p style="margin: 16px 0 24px; color: #9aa3b5;">Sign in with Google to view the report.</p>' +
    '<button id="loginBtn" class="login-btn">Sign in with Google</button>' +
    '</div>' +
    '</div>';
  document.getElementById("loginBtn").onclick = () => {
    signInWithPopup(auth, provider);
  };
}

function renderAccessDenied(email) {
  authEl.innerHTML = '<div class="center-screen">' +
    '<div class="auth-card">' +
    '<h2>⛔ Access Denied</h2>' +
    '<p>User ' + email + ' is not authorized to view this report.</p>' +
    '</div>' +
    '</div>';
}

function renderAuthError(err) {
  authEl.innerHTML = '<div class="center-screen">' +
    '<div class="auth-card">' +
    '<h2>❌ Authentication Error</h2>' +
    '<pre style="white-space: pre-wrap; color: #f88;">' + String(err.message || err) + '</pre>' +
    '</div>' +
    '</div>';
}

function formatValue(value, decimals = 2) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toFixed(decimals);
  return String(value);
}

function renderCards(data) {
  const sorted = [...data].sort((a, b) => (b.Composite_Score || 0) - (a.Composite_Score || 0));
  cardGrid.innerHTML = sorted.map((item) => {
    const score = Number(item.Composite_Score || 0);
    const tier = scoreTier(score);
    return '<div class="ticker-card">' +
      '<h2>' + (item.Ticker || "—") + '</h2>' +
      '<p><strong>Score:</strong> ' + formatValue(score) + '</p>' +
      '<p><span class="pill ' + tier.style + '">' + tier.label + '</span></p>' +
      '<p><strong>RSI:</strong> ' + formatValue(item.RSI) + '</p>' +
      '<p><strong>63D Return:</strong> ' + formatValue(item.Return_63D) + '%</p>' +
      '</div>';
  }).join('');
}

function renderTable(data) {
  const headers = ["Ticker", "Composite_Score", "EPS_TTM", "RSI", "MA_Slope", "Drawdown_pct", "Return_63D", "Alpha_63D", "RS_vs_SP100"];
  tableHead.innerHTML = '<tr>' + headers.map((h) => '<th>' + h + '</th>').join('') + '</tr>';
  tableBody.innerHTML = data.map((item) => {
    return '<tr>' + headers.map((h, index) => {
      const value = item[h];
      return index === 0 ? '<td>' + (value || '—') + '</td>' : '<td>' + formatValue(value, 2) + '</td>';
    }).join('') + '</tr>';
  }).join('');
  rowCount.textContent = data.length + ' rows displayed';
}

function bootApp() {
  authEl.innerHTML = '';
  appEl.classList.remove('hidden');
  renderCards(rows);
  renderTable(rows);
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.reload();
  };
  filterInput.addEventListener('input', () => {
    const query = filterInput.value.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      return Object.values(item).some((value) => String(value || '').toLowerCase().includes(query));
    });
    renderCards(filtered);
    renderTable(filtered);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    renderLoginScreen();
    return;
  }
  try {
    const email = user.email;
    const whitelistRef = doc(db, 'whitelist', email);
    const whitelistSnap = await getDoc(whitelistRef);
    if (!whitelistSnap.exists()) {
      renderAccessDenied(email);
      return;
    }
    bootApp();
  } catch (err) {
    renderAuthError(err);
    console.error(err);
  }
});
</script>
</body>
</html>`;
}

async function writeReport() {
  const rows = await readScores();
  const html = buildHtml(rows);
  await fs.promises.writeFile(OUTPUT_PATH, html, 'utf8');
  console.log(`Wrote report: ${OUTPUT_PATH}`);
}

function serveReport() {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/report.html') {
      fs.readFile(OUTPUT_PATH, 'utf8', (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Failed to read report file');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
  server.listen(PORT, () => {
    console.log(`Serving report at http://localhost:${PORT}`);
  });
}

async function main() {
  await writeReport();
  if (SERVE) serveReport();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
