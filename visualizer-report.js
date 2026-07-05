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

  .analytics-link {  font-size: 0.78rem;  padding: 0.35rem 0.8rem; 
  border-radius: 999px; border: 1px solid #2196f355; background:
   #0d1a2e; color: #90caf9; text-decoration: none; font-weight: 
   600; transition: all 0.15s ease;
   /* Stacked box-shadow layers create the intense fluorescent core and outer glow */
  box-shadow: 
    0 0 4px #ffffff, 
    0 0 10px #ffffff, 
    0 0 20px #64b5f6, 
    0 0 30px #2196f3;
    }
  .analytics-link:hover {  background: #13233d; border-color: #64b5f6;}
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
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
<div id="auth"></div>
<div id="app" class="hidden">
<header>
  <div>
    <h1>Stocks Analytics Report</h1>
    <div class="subtitle">Authenticated client report built from Stocks Universe</div>
  </div>
  <div>
  <a class="analytics-link" href="analytics-loader.html">
  Advanced Anlytical Signals →
</a>
</div>
  <button id="logoutBtn" class="logout-btn">Logout</button>
</header>
<div class="page">
  <div class="search-wrap">
    <input type="search" id="filterInput" placeholder="Filter by ticker or metric..." />
  </div>
  <div class="card-grid" id="cardGrid"></div>
  <!-- Upcoming Earnings (next 14 days) -->
<div class="earnings-section">
  <h2>&#128197; Upcoming Earnings &mdash; Next 14 Days</h2>
  <div class="earnings-strip" id="earningsStrip"></div>
</div>

<div class="grid">

  <!-- Alpha vs RSI Scatter -->
  <div class="card">
    <h2>Jensen's Alpha (63D) vs RSI-14</h2>
    <canvas id="scatterChart"></canvas>
  </div>

  <!-- MA Slope vs Composite -->
  <div class="card">
    <h2>Composite Score vs MA Slope (50D)</h2>
    <canvas id="slopeChart"></canvas>
  </div>

</div>

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

// ===============================
// SENTINEL SCHEMA ADAPTER (SOURCE OF TRUTH)
// ===============================
const schema = {
  ticker: (r) => r.Ticker,

  // Earnings proxy (since no EarningsDate exists in current dataset)
  earningsScore: (r) => Number(r.EPS_Percentile ?? 0),

  // Scatter: momentum / growth relationship
  scatterX: (r) => Number(r.EPS_Percentile ?? 0),
  scatterY: (r) => Number(r.EPS_Growth ?? 0),

  // Slope: fundamentals vs institutional flow
  slopeX: (r) => Number(r.EPS_TTM ?? 0),
  slopeY: (r) => Number(r.Inst_Accumulation ?? 0)
};

window.__ROWS__ = rows;

function scoreTier(score) {
  if (score >= 70) return { label: "Strong Buy", style: "green" };
  if (score >= 50) return { label: "Monitor", style: "blue" };
  if (score >= 30) return { label: "Weak", style: "orange" };
  return { label: "Reduce", style: "red" };
}

function getTier(score) {
  if (score >= 70) {
    return {
      label: "Strong Buy",
      scoreColor: "#81c784"
    };
  }

  if (score >= 50) {
    return {
      label: "Monitor",
      scoreColor: "#90caf9"
    };
  }

  if (score >= 30) {
    return {
      label: "Weak",
      scoreColor: "#ffb74d"
    };
  }

  return {
    label: "Reduce",
    scoreColor: "#ef9a9a"
  };
}

function scoreColor(score) {
  return getTier(score).scoreColor;
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) {
    return "—";
  }

  return Number(v).toFixed(2);
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
      '<p><strong>RSI:</strong> ' + formatValue(item.RSI_14Day) + '</p>' +
      '<p><strong>63D Return:</strong> ' + formatValue(item.Return_63D) + '%</p>' +
      '</div>';
  }).join('');
}

function renderTable(data) {
  const headers = ["Ticker", "Composite_Score", "EPS_TTM", "RSI_14Day", "MA_Slope_50", "Drawdown_%", "Return_63D", "Alpha_63D", "RS_vs_SP100"];
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
  const scatter = Chart.getChart("scatterChart");
if (scatter) scatter.destroy();

const slope = Chart.getChart("slopeChart");
if (slope) slope.destroy();

  initCharts(rows);
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
    initCharts(rows);
  });
}

//TO ADD COLORING SCHEMA TO SCATTER POINTS IN LINE WITH TIERING 
// (STRONG BUY, MONITOR, WEAK, REDUCE)
function getTierColor(score) {
  if (score >= 70) return "#4ade80"; // Strong Buy
  if (score >= 50) return "#60a5fa"; // Monitor
  if (score >= 30) return "#fbbf24"; // Weak
  return "#ef9a9a"; // Reduce
}



function initCharts(rows) {
  try {

  if (window.__chartsInitialized) return;
window.__chartsInitialized = true;

  if (!rows || !rows.length) {
  console.warn("No data available for charts");
  return;
}
    // --- Earnings strip placeholder starts here---
    const strip = document.getElementById("earningsStrip");
    if (strip) {
      const now = new Date();
now.setHours(0, 0, 0, 0);

const in14 = new Date(now.getTime() + 14 * 86400000);

const upcoming = rows
  .filter(r => {
    if (!r.Earnings_Date) return false;

    const d = new Date(r.Earnings_Date);
    if (isNaN(d)) return false;

    return d >= now && d <= in14;
  })
  .sort((a, b) => new Date(a.Earnings_Date) - new Date(b.Earnings_Date))
  .slice(0, 12);

strip.innerHTML = upcoming
  .map(r => {
    return "<div style='padding:8px 12px;margin:4px;background:#1b2030;border-radius:10px;display:inline-block;'>"
      + "<strong>" + (r.Ticker || "") + "</strong><br/>"
      + "<span style='color:#8a97b3;font-size:12px;'>" + (r.Earnings_Date || "—") + "</span>"
      + "</div>";
  })
  .join("");

   
    }

    // --- Earnings strip placeholder ends here---

       //Plugin for Quadrants in Charts starts here
       //Plugin block for slope Chart starts here
       const slopeQuadrantPlugin = {
  id: "slopeQuadrants",

  afterDraw(chart) {
    if (chart.canvas.id !== "slopeChart") return;

    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const xMid = (scales.x.min + scales.x.max) / 2;
    const yMid = (scales.y.min + scales.y.max) / 2;

    const xPixel = scales.x.getPixelForValue(xMid);
    const yPixel = scales.y.getPixelForValue(yMid);

    ctx.save();

    // cross lines
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(xPixel, chartArea.top);
    ctx.lineTo(xPixel, chartArea.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartArea.left, yPixel);
    ctx.lineTo(chartArea.right, yPixel);
    ctx.stroke();

    // labels (INVESTOR SEMANTICS)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";

    ctx.fillText("Q2 ⚠️ High quality but deteriorating", chartArea.left + 10, chartArea.top + 10);
    ctx.fillText("Q1 🚀 Strong + improving (best stocks)", chartArea.right - 160, chartArea.top + 10);
    ctx.fillText("Q3 ❌ Weak + declining", chartArea.left + 10, chartArea.bottom - 20);
    ctx.fillText("Q4 🔄 Improving but low quality (speculative reversal)", chartArea.right - 160, chartArea.bottom - 20);

    ctx.restore();
  }
};
       //Plugin block for slope Chart ends here

       //Plugin block for scatter Chart starts here
       const rsiAlphaQuadrantPlugin = {
  id: "rsiAlphaQuadrants",

  afterDraw(chart) {
    if (chart.canvas.id !== "scatterChart") return;

    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const xMid = (scales.x.min + scales.x.max) / 2;
    const yMid = (scales.y.min + scales.y.max) / 2;

    const xPixel = scales.x.getPixelForValue(xMid);
    const yPixel = scales.y.getPixelForValue(yMid);

    ctx.save();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(xPixel, chartArea.top);
    ctx.lineTo(xPixel, chartArea.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartArea.left, yPixel);
    ctx.lineTo(chartArea.right, yPixel);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";

    ctx.fillText("Q1 Overheated Alpha", chartArea.right - 160, chartArea.top + 10);
    ctx.fillText("Q2 Alpha Accumulation", chartArea.left + 10, chartArea.top + 10);
    ctx.fillText("Q3 Weak Zone", chartArea.left + 10, chartArea.bottom - 20);
    ctx.fillText("Q4 Trap / Reversal", chartArea.right - 160, chartArea.bottom - 20);

    ctx.restore();
  }
};
       //Plugin block for scatter Chart ends here



    // --- Scatter Chart (Alpha vs RSI) ---
    const scatterCtx = document.getElementById("scatterChart");
    if (scatterCtx && window.Chart) {

    //Code for coloring points based on Composite_Score tiering 
    // is added in the data mapping below, 
    // using getTierColor function to assign colors according to the defined score tiers 
    // (Strong Buy, Monitor, Weak, Reduce).

    
// ===============================
// SCATTER LEGEND (TIER COLORS ONLY) STARTS HERE
// ===============================
const legendEl = document.createElement("div");
legendEl.style.display = "flex";
legendEl.style.gap = "10px";
legendEl.style.margin = "8px 0 12px 0";
legendEl.style.flexWrap = "wrap";
legendEl.style.fontSize = "12px";
legendEl.style.color = "#e0e0e0";

const legendItems = [
  { label: "Strong Buy (70+)", color: "#81c784" },
  { label: "Monitor (50-70)", color: "#90caf9" },
  { label: "Weak (30-50)", color: "#ffb74d" },
  { label: "Reduce (<30)", color: "#ef9a9a" }
];

legendItems.forEach(item => {
  const el = document.createElement("div");
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.gap = "6px";

  const dot = document.createElement("span");
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "50%";
  dot.style.background = item.color;
  dot.style.display = "inline-block";

  const text = document.createElement("span");
  text.innerText = item.label;

  el.appendChild(dot);
  el.appendChild(text);

  legendEl.appendChild(el);
});

// attach legend ABOVE scatter canvas safely
scatterCtx.parentNode.insertBefore(legendEl, scatterCtx);

// ===============================
// SCATTER LEGEND (TIER COLORS ONLY) ENDS HERE
// ===============================

      new Chart(scatterCtx, {
        type: "scatter",
        data: {
        datasets: [{
  label: "Alpha vs RSI",

  data: rows.map(r => ({
    x: Number(r.RSI_14Day ?? 0),
    y: Number(r.Alpha_63D ?? 0),
    ticker: r.Ticker ?? "",
    score: Number(r.Composite_Score ?? 0)
  })),
  //plugins: [rsiAlphaQuadrantPlugin],   // ✅ Call to the custom quadrant plugin for scatter chart
        
  backgroundColor: rows.map(r => getTierColor(r.Composite_Score)),

  pointBackgroundColor: rows.map(r => getTierColor(r.Composite_Score)),

  pointBorderColor: "#0b1220",

  pointBorderWidth: 1.2,

  pointRadius: rows.map(r => {
    const s = r.Composite_Score ?? 0;

    if (s >= 70) return 8;   // Strong Buy (emphasis)
    if (s >= 50) return 7;   // Monitor
    if (s >= 30) return 6;   // Weak
    return 5;                // Reduce
  }),

  hoverRadius: 10
}]  
        },
      //  plugins: [],   // ✅ Call to the quadrant plugin is not needed for scatter, only slope chart
        options: {
        //Strict Visal Layer to overide for point dimensions in chart start here.
        elements: {
          point: {
            radius: 6,              // FIX: stronger visibility
            hoverRadius: 8,
            borderWidth: 1.2
            
          }
        },
        //Strict Visual Layer to override for point dimensions in chart ends here.

  responsive: true,

  plugins: {
    tooltip: {
      callbacks: {
        label(ctx) {
          const d = ctx.raw || {};

          const ticker = d.ticker || "—";
          const rsi = d.x ?? "—";
          const alpha = d.y ?? "—";
          const score = d.score ?? "—";

          return (
            ticker +
            " RSI=" + fmt(rsi) +
            " α=" + fmt(alpha) +
            " score=" + fmt(score)
          );
        }
      }
    }
  },

  scales: {
    x: {
      title: {
        display: true,
        text: "RSI (0–100)"
      },
      min: 0,
      max: 100
    },
    y: {
      title: {
        display: true,
        text: "Alpha (63D)"
      }
    }
  }
}
        
      });
    }

    // --- Slope Chart (MA Slope vs Composite) ---
const slopeCtx = document.getElementById("slopeChart");
if (slopeCtx && window.Chart) {

  new Chart(slopeCtx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "MA Slope vs Composite",

        data: rows.map(r => ({
          x: Number(r.MA_Slope_50 ?? 0),
          y: Number(r.Composite_Score ?? 0),
          ticker: r.Ticker ?? "",
          score: Number(r.Composite_Score ?? 0)
        })),

        // 🎯 UNIFIED TIER COLOR SYSTEM (same logic as scatter chart)
        backgroundColor: rows.map(r => getTierColor(r.Composite_Score)),
        pointBackgroundColor: rows.map(r => getTierColor(r.Composite_Score)),

        // 🧠 visual clarity (match scatter UX)
        pointBorderColor: "#0b1220",
        pointBorderWidth: 1.2,

        // 📈 tier-aware sizing (same architecture pattern)
        pointRadius: rows.map(r => {
          const s = r.Composite_Score ?? 0;

          if (s >= 70) return 8;
          if (s >= 50) return 7;
          if (s >= 30) return 6;
          return 5;
        }),

        hoverRadius: rows.map(r => {
    const s = r.Composite_Score ?? 0;

    if (s >= 70) return 11;
    if (s >= 50) return 10;
    if (s >= 30) return 9;
    return 8;
  })
      }]
    },
        plugins: [slopeQuadrantPlugin],   // ✅ Call to the custom quadrant plugin for slope chart
        options: {

        // To FIX GLovbal ELEMENT COLLISION (CRITICAL) start here
        elements: {
  point: {
    radius: 6,
    hoverRadius: 10,
    borderWidth: 1.2,
    backgroundColor: undefined   // 🧠 IMPORTANT: prevent override bleed
  }
},
  // To FIX GLovbal ELEMENT COLLISION (CRITICAL) start here
  responsive: true,

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      callbacks: {
        label(ctx) {
          const d = ctx.raw || {};

          const ticker = d.ticker || "—";
          const slope = d.x ?? "—";
          const score = d.y ?? "—";

          return (
            ticker +
            " slope=" + fmt(slope) +
            " score=" + fmt(score)
          );
        }
      }
    }
  },

  scales: {
    x: {
      title: {
        display: true,
        text: "MA Slope (50D)"
      }
    },
    y: {
      title: {
        display: true,
        text: "Composite Score"
      }
    }
  }
} 
      });
    }

  } catch (e) {
    console.error("Chart init failed:", e);
  }
}

window.initCharts = initCharts;
 


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
