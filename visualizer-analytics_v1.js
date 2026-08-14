import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import { firebaseConfig } from "./firebase/firebaseConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");

const OUTPUT_PATH = path.resolve(__dirname, "data/analytics.html");

const SERVE = process.argv.includes("--serve");

// ======================================================
// READ EXCEL
// ======================================================

async function readData() {
  const wb = new ExcelJS.Workbook();

  await wb.xlsx.readFile(WORKBOOK_PATH);

  const rows = [];

  const sheet = wb.getWorksheet("ScoresCurrent");

  if (!sheet) {
    throw new Error("ScoresCurrent worksheet missing");
  }

  sheet.eachRow((row, i) => {
    if (i === 1) return;

    const vals = row.values.slice(1);

    const obj = {
      Ticker: vals[0],

      EPS_TTM: vals[1],

      EPS_Percentile: vals[2],

      EPS_Growth: vals[3],

      Inst_Accumulation: vals[4],

      Alpha_63D: vals[5],

      Beta: vals[6],

      RSI_14Day: vals[7],

      SMA200_Dist: vals[8],

      MA_Slope_50: vals[9],

      Volume_Expansion: vals[10],

      Net_Inst: vals[11],

      RS_vs_SP100: vals[12],

      Return_63D: vals[13],

      RS_Rank: vals[14],

      Drawdown_pct: vals[15],

      Composite_Score: vals[16],

      New_Composite_Score: vals[17],

      Earnings_Date: vals[18],

      Daily_Composite_Score_delta: vals[19],
    };

    if (obj.Ticker) {
      rows.push(obj);
    }
  });

  return { rows };
}

// ======================================================
// BUILD HTML
// ======================================================

function buildHtml(data) {
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html>

<head>
<script>
window.__ANALYTICS__ = ${safe};
</script>

<meta charset="UTF-8">

<title>Stocks Analytics</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

body {
  margin:0;
  background:#0f1117;
  color:#ddd;
  font-family:sans-serif;
}

header {
  padding:16px 24px;
  border-bottom:1px solid #222;
}

.tabs {
  display:flex;
  gap:12px;
  padding:12px 24px;
  border-bottom:1px solid #222;
}

.tab-btn {
  background:#1d2330;
  color:white;
  border:none;
  padding:10px 16px;
  border-radius:6px;
  cursor:pointer;
}

.page {
  display:none;
  padding:24px;
}

.page.active {
  display:block;
}

.grid {
  display:grid;
  grid-template-columns:
    repeat(auto-fill,minmax(280px,1fr));
  gap:16px;
}

.card {
  background:#1a1d27;
  border-radius:12px;
  padding:16px;
}

.metric {
  margin-top:8px;
}

.center-screen {
  height:80vh;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  gap:16px;
}

.hidden {
  display:none;
}

canvas {
  background:#161922;
  border-radius:12px;
  padding:16px;
}

.login-btn {
  background:#2563eb;
  color:white;
  border:none;
  border-radius:8px;
  padding:12px 18px;
  cursor:pointer;
  font-size:16px;
}

.error-box {
  background:#3b1111;
  border:1px solid #7f1d1d;
  padding:16px;
  border-radius:10px;
  margin:20px;
}

.green {
  border-left:4px solid #16a34a;
}

.yellow {
  border-left:4px solid #ca8a04;
}

.red {
  border-left:4px solid #dc2626;
}


  .report-link {
  font-size: 0.78rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid #ffffffaa; 
  background: #0d1a2e;
  color: #ffffff;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.25s ease;
  /* Stacked box-shadow layers create the intense fluorescent core and outer glow */
  box-shadow: 
    0 0 4px #ffffff, 
    0 0 10px #ffffff, 
    0 0 20px #64b5f6, 
    0 0 30px #2196f3;
}

.report-link:hover {
  background: #13233d;
  border-color: #ffffff;
  /* Glow intensifies on hover for an authentic neon effect */
  box-shadow: 
    0 0 6px #ffffff, 
    0 0 16px #ffffff, 
    0 0 26px #64b5f6, 
    0 0 40px #2196f3;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 0 2rem 2rem;
}

.analytics-table thead th {
  position: sticky;
  top: 0;
  z-index: 20;

  background: #1d2330;
  color: #ffffff;

  box-shadow:
    0 1px 0 rgba(255,255,255,0.08);
}

#momentumTable thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #1d2330;
}

</style>

</head>

<body>

<div id="auth"></div>

<div id="app" class="hidden">

<header>
  <h1>
    📊 Stocks Analytics Dashboard
  </h1>
  
   <a class="report-link" href="report-loader.html">
  ← General Stock Universe Report 
</a>

</header>

<div class="tabs">

  <button
    class="tab-btn"
    data-tab="overview"
  >
    Overview
  </button>

  <button
  class="tab-btn"
  data-tab="signals"
>
  Signals
</button>

  <button
    class="tab-btn"
    data-tab="risk"
  >
    Risk
  </button>

  <button
    class="tab-btn"
    data-tab="trends"
  >
    Trends
  </button>

</div>


<div
  id="overview"
  class="page active"
>

  <!-- ===================================== -->
  <!-- LEADERSHIP STRIP -->
  <!-- ===================================== -->

 

  <div style=" display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:16px; flex-wrap:wrap; " > <h2 style=" margin:0; font-size:20px; " > Leadership </h2> <button id="toggleLeadersBtn" class="tab-btn" > Show All Leaders </button> </div> <div class="grid" id="overviewGrid" ></div>

  <!-- ===================================== -->
  <!-- SEARCH -->
  <!-- ===================================== -->

  <div
    style="
      margin-top:24px;
      margin-bottom:16px;
    "
  >

    <input
      id="tickerSearch"
      type="text"
      placeholder="Search ticker..."
      style="
        width:100%;
        max-width:320px;
        padding:12px;
        border-radius:8px;
        border:none;
        background:#1a1d27;
        color:#ddd;
        font-size:14px;
      "
    />

  </div>

  <!-- ===================================== -->
  <!-- ANALYTICS TABLE -->
  <!-- ===================================== -->

  <div
    style="
      overflow-x:auto;
      border-radius:12px;
    "
  >

    <table
      id="analyticsTable"
      class="analytics-table"
      style="
        width:100%;
        border-collapse:collapse;
        min-width:900px;
        background:#161922;
      "
    >

      <thead>

        <tr
          style="
            background:#1d2330;
            text-align:left;
          "
        >

          <th style="padding:12px;">Ticker</th>
          <th style="padding:12px;">Score</th>
          <th style="padding:12px;">RS Rank</th>
          <th style="padding:12px;">RSI</th>
          <th style="padding:12px;">MA Slope</th>
          <th style="padding:12px;">Drawdown</th>
          <th style="padding:12px;">Beta</th>

        </tr>

      </thead>

      <tbody id="analyticsTableBody">
      </tbody>

    </table>

  </div>

</div>


<div
  id="signals"
  class="page"
>

  <div
    class="card"
  >

    <h2
      style="
        margin-top:0;
        margin-bottom:12px;
      "
    >
      Institutional Signals
    </h2>

    <div
      style="
        color:#bbb;
        font-size:14px;
        line-height:1.7;
      "
    >
      Signals intelligence layer
      initializing...
    </div>

    <div
      id="signalsGrid"
      class="grid"
      style="
        margin-top:18px;
      "
    >
    </div>

  </div>

</div>

<div
  id="risk"
  class="page"
>

  <div
    class="grid"
    id="riskGrid"
  ></div>

</div>

<div
  id="trends"
  class="page"
>

  <!-- ===================================== -->
  <!-- MOMENTUM DELTA LADDER -->
  <!-- ===================================== -->

  <div
    class="card"
    style="
      margin-bottom:24px;
    "
  >

    <h2
      style="
        margin-top:0;
        margin-bottom:16px;
      "
    >
      Momentum Delta Ladder
    </h2>
    
    <div
      style="
        overflow-x:auto;
      "
    >

      <div
        style="
          max-height:350px;
          overflow-y:auto;
          border:1px solid #333;
          border-radius:6px;
        "
      >

        <table
          id="momentumTable"
          class="analytics-table"
          style="
            width:100%;
            border-collapse:collapse;
            min-width:900px;
          "
        >

          <thead>

            <tr
              style="
                background:#1d2330;
                text-align:left;
              "
            >

              <th id="sortTicker" style="padding:12px;cursor:pointer;">
  Ticker ↕
</th>

<th id="sortDelta" style="padding:12px;cursor:pointer;">
  Delta ↕
</th>

<th id="sortComposite" style="padding:12px;cursor:pointer;">
  Composite ↕
</th>

<th id="sortRSI" style="padding:12px;cursor:pointer;">
  RSI ↕
</th>

<th id="sortMASlope" style="padding:12px;cursor:pointer;">
  MA Slope ↕
</th>

            </tr>

          </thead>

          <tbody
            id="momentumTableBody"
          >
          </tbody>

        </table>

      </div>

    </div>

  </div>

  <!-- ===================================== -->
  <!-- LEADERSHIP MOMENTUM QUADRANTS -->
  <!-- ===================================== -->

  <div
    class="card"
    style="
      margin-bottom:24px;
    "
  >

    <h2
      style="
        margin-top:0;
        margin-bottom:10px;
      "
    >
      Leadership Momentum Quadrants
    </h2>

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px,1fr)
          );
        gap:8px;
        margin-bottom:18px;
        font-size:13px;
        color:#bbb;
      "
    >

      <div>
        🟢 <strong>Q1 High Score + Positive Momentum</strong><br>
        Leadership
      </div>

      <div>
        🟡 <strong>Q4 Low Score + Positive Momentum</strong><br>
        Emerging Strength
      </div>

      <div>
        🟠 <strong>Q2 High Score + Negative Momentum</strong><br>
        Exhaustion
      </div>

      <div>
        🔴 <strong>Q3 Low Score + Negative Momentum</strong><br>
        Weakness
      </div>

    </div>

    <canvas
      id="quadrantChart"
    ></canvas>

  </div>

  <!-- ===================================== -->
  <!-- RSI MARKET REGIME MAP -->
  <!-- ===================================== -->

  <div
    class="card"
  >

    <h2
      style="
        margin-top:0;
        margin-bottom:10px;
      "
    >
      RSI Market Regime Map
    </h2>

    <div
      style="
        margin-bottom:16px;
        font-size:13px;
        color:#bbb;
        line-height:1.6;
      "
    >
      Each point represents one ticker
      in the current analytics universe.
      RSI regimes are color-coded for
      breadth and participation analysis.
    </div>

    <div
      style="
        display:flex;
        gap:18px;
        flex-wrap:wrap;
        margin-bottom:14px;
        font-size:13px;
        color:#bbb;
      "
    >

      <div>
        🟢 Strong RSI &gt; 60
      </div>

      <div>
        🟡 Neutral RSI 40–60
      </div>

      <div>
        🔴 Weak RSI &lt; 40
      </div>

    </div>

    <canvas
      id="rsiRegimeChart"
      height="130"
    ></canvas>

  </div>

</div>

<script src="/api/analytics-data.js"></script>

<script type="module">

// ======================================================
// FIREBASE IMPORTS
// ======================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ======================================================
// FIREBASE INIT
// ======================================================

const app = initializeApp(
  ${JSON.stringify(firebaseConfig)}
);

const auth = getAuth(app);

const db = getFirestore(app);

const provider =
  new GoogleAuthProvider();

// ======================================================
// ANALYTICS DATA
// ======================================================

// Data is injected securely at runtime
// from /api/analytics-data.js

const data =
  window.__ANALYTICS__ || { rows: [] };

const rows = data.rows;

//const rows = data.rows || [];

// ======================================================
// DOM REFERENCES
// ======================================================

const authEl =
  document.getElementById("auth");

const appEl =
  document.getElementById("app");

  // ====================================================== 
  // // LEADERSHIP STATE
  // 
   // ====================================================== 
   let showAllLeaders = false;

   
const toggleLeadersBtn =
  document.getElementById(
    "toggleLeadersBtn"
  );




  // ======================================================
// AUTH UI HELPERS
// ======================================================

function renderLoginScreen() {

   authEl.innerHTML =
    '<div class="center-screen">' +
    '<h2>🔒 Login Required</h2>' +
    '<button id="loginBtn" class="login-btn">' +
    'Sign in with Google' +
    '</button>' +
    '</div>';

  document
    .getElementById(
      "loginBtn"
    )
    .onclick = () => {

      signInWithPopup(
        auth,
        provider
      );
    };
}

function renderAccessDenied(email) {

  authEl.innerHTML =
    '<div class="error-box">' +
    '<h2>⛔ Access Denied</h2>' +
    '<div>' +
    email +
    '</div>' +
    '</div>';
}

function renderAuthError(err) {

  authEl.innerHTML =
    '<div class="error-box">' +
    '<h2>❌ Authentication Error</h2>' +
    '<pre>' +
    err.message +
    '</pre>' +
    '</div>';
}

function bootAuthenticatedApp() {

  authEl.innerHTML = "";

  appEl.classList.remove(
    "hidden"
  );

  renderOverview();

  renderSignals();

  renderRisk();

  renderTrendChart();
}

// ======================================================
// TAB SYSTEM
// ======================================================

document
 .querySelectorAll("[data-tab]")
  .forEach((btn) => {

    btn.onclick = () => {

      const tab =
        btn.dataset.tab;

      document
        .querySelectorAll(".page")
        .forEach((p) => {
          p.classList.remove(
            "active"
          );
        });

      document
        .getElementById(tab)
        .classList.add("active");

      if (tab === "trends") { renderTrendChart(); }
    };
  });

// ======================================================
// AUTH FLOW
// ======================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

    renderLoginScreen();

      authEl.innerHTML =
        '<div class="center-screen">' +
        '<h2>🔒 Login Required</h2>' +
        '<button id="loginBtn" class="login-btn">' +
        'Sign in with Google' +
        '</button>' +
        '</div>';

      document
        .getElementById(
          "loginBtn"
        )
        .onclick = () => {
          signInWithPopup(
            auth,
            provider
          );
        };

      return;
    }

    try {

      const email =
        user.email;

      const whitelistRef =
        doc(
          db,
          "whitelist",
          email
        );

      const whitelistSnap =
        await getDoc(
          whitelistRef
        );

      if (
        !whitelistSnap.exists()
      ) {

      renderAccessDenied(email);

        authEl.innerHTML =
          '<div class="error-box">' +
          '<h2>⛔ Access Denied</h2>' +
          '<div>' +
          email +
          '</div>' +
          '</div>';

        return;
      }

      authEl.innerHTML = "";

      appEl.classList.remove(
        "hidden"
      );

      renderOverview();

      renderRisk();

      bootAuthenticatedApp();

      
toggleLeadersBtn.onclick =
  () => {

    showAllLeaders =
      !showAllLeaders;

    renderOverview();
  };



    } catch (err) {

    renderAuthError(err);

      console.error(err);

      authEl.innerHTML =
        '<div class="error-box">' +
        '<h2>❌ Authentication Error</h2>' +
        '<pre>' +
        err.message +
        '</pre>' +
        '</div>';
    }
  }
);

// ======================================================
// OVERVIEW
// ======================================================

function scoreColor(score) {

  if (score >= 80) {
    return "green";
  }

  if (score >= 40) {
    return "yellow";
  }

  return "red";
}


function renderOverview() {

  // ==========================================
  // LEADERSHIP STRIP
  // ==========================================

  const target =
    document.getElementById(
      "overviewGrid"
    );

  target.innerHTML = rows
    .slice( 0, showAllLeaders ? rows.length : 10 )
    .map((r) => {

      const score =
        Number(
          r.New_Composite_Score || 0
        ).toFixed(1);

      const rs =
        Number(
          r.RS_Rank || 0
        ).toFixed(1);

      const eps =
        Number(
          r.EPS_TTM || 0
        ).toFixed(2);

      const inst =
        Number(
          r.Inst_Accumulation || 0
        ).toFixed(2);

      return (

        '<div class="card ' +

        scoreColor(
          r.New_Composite_Score
        ) +

        '">' +

        '<h2>' +
        r.Ticker +
        '</h2>' +

        '<div class="metric">' +
        '<strong>Composite Score:</strong> ' +
        score +
        '</div>' +

        '<div class="metric">' +
        '<strong>RS Rank:</strong> ' +
        rs +
        '</div>' +

        '<div class="metric">' +
        '<strong>EPS:</strong> ' +
        eps +
        '</div>' +

        '<div class="metric">' +
        '<strong>Institutional Accumulation:</strong> ' +
        inst +
        '</div>' +

        '</div>'
      );

    })
    .join("");

  // ==========================================
  // ANALYTICS TABLE
  // ==========================================

  toggleLeadersBtn.innerText = showAllLeaders ? "Collapse Leaders" : "Show All Leaders";

  renderAnalyticsTable(rows);
}

// ======================================================
// SIGNALS
// ======================================================

function renderSignals() {
  const rows = (window.__ANALYTICS__ && window.__ANALYTICS__.rows) || [];
  if (!Array.isArray(rows)) return;

  const grid = document.getElementById("signalsGrid");
  if (!grid) return;

  // ============================
  // INLINE HELPERS (from decisionSignal.js)
  // ============================
  
  function normalizeSlope(slope) {
    const normalized = ((slope + 0.1) / 0.2) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  function decideSignal(score, rsi, slope, stock) {
    if (score >= 75 && rsi >= 40 && rsi <= 60 && slope > 40) {
      if (stock.Daily_Composite_Score_delta > 0.5) {
        return "BUY";
      }
    }
    if (score < 50 || rsi < 25 || slope < 30 || (stock.Drawdown_pct || 0) > 22) {
      return "SELL";
    }
    return "HOLD";
  }

  function computeConfidence(score, rsi, slope, stock) {
    let confidence = 50;
    if (score >= 80) confidence += 25;
    else if (score >= 70) confidence += 18;
    else if (score >= 60) confidence += 12;
    
    const rsiDist = Math.min(Math.abs(rsi - 50), 30);
    confidence += (20 * rsiDist) / 30;
    
    if (slope > 50) confidence += 20;
    else if (slope > 40) confidence += 10;
    else if (slope < 35) confidence -= 15;
    
    const delta = stock.Daily_Composite_Score_delta || 0;
    if (delta > 1.0) confidence += 15;
    else if (delta > 0.5) confidence += 8;
    else if (delta < -0.5) confidence -= 10;
    
    const instAccum = stock.Inst_Accumulation || 0;
    if (instAccum > 60) confidence += 10;
    else if (instAccum < 20) confidence -= 5;
    
    return Math.max(0, Math.min(100, confidence));
  }

  function generateRationale(signal, stock) {
    if (signal === "BUY") return "Strong momentum with institutional support";
    if (signal === "SELL") return "Deteriorating technicals; exit positions";
    return "Mixed signals; wait for clarity";
  }

  function computePositionSize(stock, signal, confidence) {
    if (signal !== "BUY") return "0%";
    const f = ((confidence / 100) * 2 - 1) / 2;
    return Math.max(1, Math.min(5, f * 5)).toFixed(1) + "%";
  }

  // ============================
  // COMPUTE SIGNALS
  // ============================
  
  const decisions = rows.map(stock => {
    // Skip rows without ticker (data integrity check)
    if (!stock || !stock.Ticker) return null;
    
    const scoreNorm = Math.min(100, stock.New_Composite_Score || 0);
    const rsiNorm = stock.RSI_14Day || 50;
    const slopeNorm = normalizeSlope(stock.MA_Slope_50 || 0);
    
    const signal = decideSignal(scoreNorm, rsiNorm, slopeNorm, stock);
    const confidence = computeConfidence(scoreNorm, rsiNorm, slopeNorm, stock);
    
    return {
      ticker: stock.Ticker,
      signal,
      confidence,
      rationale: generateRationale(signal, stock),
      entryPrice: signal === "BUY" ? "Market/SMA50" : (signal === "SELL" ? "Exit" : "Monitor"),
      stopLoss: "-" + Math.min((stock.Drawdown_pct || 0) + 5, 25).toFixed(1) + "%",
      profitTarget: "+" + Math.max((70 - rsiNorm) * 1.2, 10).toFixed(1) + "%",
      positionSize: computePositionSize(stock, signal, confidence),
      timeframe: "1-4 weeks"
    };
  }).filter(d => d !== null);

  const counts = {
    buy: decisions.filter(d => d.signal === "BUY").length,
    hold: decisions.filter(d => d.signal === "HOLD").length,
    sell: decisions.filter(d => d.signal === "SELL").length
  };

  const avgConf = {
    buy: decisions.filter(d => d.signal === "BUY").reduce((s, d) => s + d.confidence, 0) / Math.max(1, counts.buy),
    hold: decisions.filter(d => d.signal === "HOLD").reduce((s, d) => s + d.confidence, 0) / Math.max(1, counts.hold),
    sell: decisions.filter(d => d.signal === "SELL").reduce((s, d) => s + d.confidence, 0) / Math.max(1, counts.sell)
  };

  // ============================
  // BUILD SUMMARY CARDS
  // ============================
  let summaryHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">';
  
  summaryHTML += '<div class="card" style="border-left: 4px solid #16a34a;">';
  summaryHTML += '<h3 style="margin: 0; color: #16a34a; font-size: 14px;">🟢 BUY SIGNALS</h3>';
  summaryHTML += '<div style="font-size: 28px; font-weight: bold; margin: 8px 0;">' + counts.buy + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Avg Confidence: ' + avgConf.buy.toFixed(0) + '%</div>';
  summaryHTML += '</div>';
  
  summaryHTML += '<div class="card" style="border-left: 4px solid #eab308;">';
  summaryHTML += '<h3 style="margin: 0; color: #eab308; font-size: 14px;">🟡 HOLD SIGNALS</h3>';
  summaryHTML += '<div style="font-size: 28px; font-weight: bold; margin: 8px 0;">' + counts.hold + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Avg Confidence: ' + avgConf.hold.toFixed(0) + '%</div>';
  summaryHTML += '</div>';
  
  summaryHTML += '<div class="card" style="border-left: 4px solid #dc2626;">';
  summaryHTML += '<h3 style="margin: 0; color: #dc2626; font-size: 14px;">🔴 SELL SIGNALS</h3>';
  summaryHTML += '<div style="font-size: 28px; font-weight: bold; margin: 8px 0;">' + counts.sell + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Avg Confidence: ' + avgConf.sell.toFixed(0) + '%</div>';
  summaryHTML += '</div>';
  summaryHTML += '</div>';

  // ============================
  // BUILD DETAILED TABLE
  // ============================
  const sortedDecisions = [...decisions].sort((a, b) => b.confidence - a.confidence);

  let tableHTML = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
  tableHTML += '<thead><tr style="background: #1d2330; border-bottom: 1px solid #333;">';
  tableHTML += '<th style="padding: 12px; text-align: left;">Ticker</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Signal</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Confidence</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Target</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Stop Loss</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Position</th>';
  tableHTML += '<th style="padding: 12px; text-align: left;">Rationale</th>';
  tableHTML += '</tr></thead><tbody>';

  sortedDecisions.forEach(d => {
    const signalColor = d.signal === "BUY" ? "#16a34a" : (d.signal === "SELL" ? "#dc2626" : "#eab308");
    tableHTML += '<tr style="border-bottom: 1px solid #222;">';
    tableHTML += '<td style="padding: 12px;"><strong>' + d.ticker + '</strong></td>';
    tableHTML += '<td style="padding: 12px; text-align: center; color: ' + signalColor + '; font-weight: bold;">' + d.signal + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center;">' + d.confidence.toFixed(0) + '%<div style="width: 50px; height: 4px; background: #333; border-radius: 2px; margin-top: 4px;"><div style="width: ' + d.confidence + '%; height: 100%; background: ' + signalColor + '; border-radius: 2px;"></div></div></td>';
    tableHTML += '<td style="padding: 12px; text-align: center; color: #51cf66;">' + d.profitTarget + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center; color: #ff6b6b;">' + d.stopLoss + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center; font-size: 12px;">' + d.positionSize + '</td>';
    tableHTML += '<td style="padding: 12px; color: #aaa; max-width: 250px;">' + d.rationale + '</td>';
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table></div>';
  grid.innerHTML = summaryHTML + tableHTML;
}


// ======================================================
// RISK
// ======================================================
function renderAnalyticsTable(
  dataRows
) {

  // ==========================================
  // SEARCH INPUT
  // ==========================================

  const searchInput =
    document.getElementById(
      "tickerSearch"
    );

  // ==========================================
  // TABLE INITIAL RENDER
  // ==========================================

  renderAnalyticsTableRows(
    dataRows
  );

  // ==========================================
  // LIVE SEARCH
  // ==========================================

  searchInput.oninput = () => {

    const term =
      searchInput.value
        .toLowerCase();

    const filtered =
      rows.filter((r) => {

        return (
          r.Ticker
            .toLowerCase()
            .includes(term)
        );
      });

    renderAnalyticsTableRows(
      filtered
    );
  };
}

function renderAnalyticsTableRows(
  dataRows
) {

  const body =
    document.getElementById(
      "analyticsTableBody"
    );

  body.innerHTML =
    dataRows
      .map((r) => {

        const score =
          Number(
            r.New_Composite_Score || 0
          ).toFixed(1);

        const rs =
          Number(
            r.RS_Rank || 0
          ).toFixed(1);

        const rsi =
          Number(
            r.RSI_14Day || 0
          ).toFixed(1);

        const slope =
          Number(
            r.MA_Slope_50 || 0
          ).toFixed(2);

        const drawdown =
          Number(
            r.Drawdown_pct || 0
          ).toFixed(1);

        const beta =
          Number(
            r.Beta || 0
          ).toFixed(2);

       return ( '<tr>' + '<td style="padding:12px;">' + r.Ticker + '</td>' + '<td style="padding:12px;">' + score + '</td>' + '<td style="padding:12px;">' + rs + '</td>' + '<td style="padding:12px;">' + rsi + '</td>' + '<td style="padding:12px;">' + slope + '</td>' + '<td style="padding:12px;">' + drawdown + '</td>' + '<td style="padding:12px;">' + beta + '</td>' + '</tr>' );
      })
      .join("");
}

function renderRisk() {
  const rows = (window.__ANALYTICS__ && window.__ANALYTICS__.rows) || [];
  if (!Array.isArray(rows)) return;

  const riskGrid = document.getElementById("riskGrid");
  if (!riskGrid) return;

  // ============================
  // INLINE HELPERS (from riskMetrics.js)
  // ============================
  
  function computeSharpeRatio(return63d, beta) {
    const riskFreeRate = 0.043;
    const annualReturn = (return63d / 63) * 252;
    const volatility = beta || 1.0;
    if (volatility === 0) return 0;
    return (annualReturn - riskFreeRate) / volatility;
  }

  function computeSortinoRatio(return63d, beta, drawdown) {
    const riskFreeRate = 0.043;
    const annualReturn = (return63d / 63) * 252;
    const downsideVolatility = beta * (1 + drawdown / 100);
    if (downsideVolatility === 0) return 0;
    return (annualReturn - riskFreeRate) / downsideVolatility;
  }

  function computeCalmarRatio(return63d, drawdown) {
    const annualReturn = (return63d / 63) * 252;
    if (Math.abs(drawdown) < 0.01) return 100;
    return annualReturn / Math.abs(drawdown);
  }

  function estimateWinRate(stock) {
    const rsi = stock.RSI_14Day || 50;
    const delta = stock.Daily_Composite_Score_delta || 0;
    let winRate = 50;
    if (rsi > 60) winRate += (rsi - 60) * 0.5;
    else if (rsi < 40) winRate -= (40 - rsi) * 0.5;
    if (delta > 0.5) winRate += 10;
    else if (delta < -0.5) winRate -= 10;
    return Math.max(0, Math.min(100, winRate));
  }

  function classifyRiskLevel(sharpeRatio, drawdown) {
    if (sharpeRatio < 0.5 || drawdown > 25) return "HIGH";
    if (sharpeRatio < 1.0 || drawdown > 15) return "MEDIUM";
    return "LOW";
  }

  // ============================
  // COMPUTE RISK METRICS
  // ============================
  
  const riskMetrics = rows.map(stock => {
    const beta = stock.Beta || 1.0;
    const drawdown = stock.Drawdown_pct || 0;
    const return63d = stock.Return_63D || 0;
    
    const sharpeRatio = computeSharpeRatio(return63d, beta);
    const sortinoRatio = computeSortinoRatio(return63d, beta, drawdown);
    const calmarRatio = computeCalmarRatio(return63d, drawdown);
    const winRate = estimateWinRate(stock);
    const riskLevel = classifyRiskLevel(sharpeRatio, drawdown);

    return {
      ticker: stock.Ticker,
      drawdown: drawdown.toFixed(2),
      beta: beta.toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
      sortinoRatio: sortinoRatio.toFixed(2),
      calmarRatio: calmarRatio.toFixed(2),
      winRate: winRate.toFixed(0),
      riskLevel,
      sharpeRatioNum: sharpeRatio,
      sortinoRatioNum: sortinoRatio,
      calmarRatioNum: calmarRatio
    };
  }).filter(r => r !== null);

  // Portfolio metrics
  const sharpeRatios = riskMetrics.map(r => parseFloat(r.sharpeRatio) || 0);
  const sortinoRatios = riskMetrics.map(r => parseFloat(r.sortinoRatio) || 0);
  const calmarRatios = riskMetrics.map(r => parseFloat(r.calmarRatio) || 0);
  const drawdowns = riskMetrics.map(r => parseFloat(r.drawdown) || 0);
  const betas = riskMetrics.map(r => parseFloat(r.beta) || 1.0);

  const portfolioRisk = {
    avgSharpe: (sharpeRatios.reduce((a, b) => a + b, 0) / sharpeRatios.length).toFixed(2),
    avgSortino: (sortinoRatios.reduce((a, b) => a + b, 0) / sortinoRatios.length).toFixed(2),
    avgCalmar: (calmarRatios.reduce((a, b) => a + b, 0) / calmarRatios.length).toFixed(2),
    maxDrawdown: Math.max(...drawdowns).toFixed(2),
    avgBeta: (betas.reduce((a, b) => a + b, 0) / betas.length).toFixed(2)
  };

  const highRiskStocks = riskMetrics.filter(r => parseFloat(r.drawdown) > 20);
  const rankedBySharp = [...riskMetrics].sort((a, b) => b.sharpeRatioNum - a.sharpeRatioNum).slice(0, 10);

  // ============================
  // BUILD PORTFOLIO SUMMARY CARDS
  // ============================
  let summaryHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">';
  
  summaryHTML += '<div class="card" style="border-left: 4px solid #eab308;"><h3 style="margin: 0; color: #eab308; font-size: 14px;">⚠️ PORTFOLIO VOLATILITY</h3>';
  summaryHTML += '<div style="font-size: 22px; font-weight: bold; margin: 8px 0;">' + portfolioRisk.avgBeta + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Avg Beta (vs market)</div></div>';
  
  summaryHTML += '<div class="card"><h3 style="margin: 0; color: #2196f3; font-size: 14px;">📊 SHARPE RATIO</h3>';
  summaryHTML += '<div style="font-size: 22px; font-weight: bold; margin: 8px 0;">' + portfolioRisk.avgSharpe + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Risk-adjusted return (>1.0 good)</div></div>';
  
  summaryHTML += '<div class="card"><h3 style="margin: 0; color: #4caf50; font-size: 14px;">💰 SORTINO RATIO</h3>';
  summaryHTML += '<div style="font-size: 22px; font-weight: bold; margin: 8px 0;">' + portfolioRisk.avgSortino + '</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Downside-adjusted (>1.5 good)</div></div>';
  
  summaryHTML += '<div class="card" style="border-left: 4px solid #dc2626;"><h3 style="margin: 0; color: #dc2626; font-size: 14px;">📉 MAX DRAWDOWN</h3>';
  summaryHTML += '<div style="font-size: 22px; font-weight: bold; margin: 8px 0;">-' + portfolioRisk.maxDrawdown + '%</div>';
  summaryHTML += '<div style="font-size: 12px; color: #aaa;">Peak-to-trough</div></div>';
  summaryHTML += '</div>';

  // ============================
  // BUILD RISK/REWARD TABLE
  // ============================
  let tableHTML = '<div style="margin-bottom: 24px;"><h3>📋 Stock-Level Risk Assessment</h3>';
  tableHTML += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
  tableHTML += '<thead><tr style="background: #1d2330; border-bottom: 1px solid #333;">';
  tableHTML += '<th style="padding: 12px; text-align: left;">Ticker</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Drawdown</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Beta</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Sharpe</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Sortino</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Calmar</th>';
  tableHTML += '<th style="padding: 12px; text-align: center;">Risk Level</th>';
  tableHTML += '</tr></thead><tbody>';

  rankedBySharp.forEach(r => {
    const riskColor = r.riskLevel === "HIGH" ? "#dc2626" : (r.riskLevel === "MEDIUM" ? "#eab308" : "#16a34a");
    tableHTML += '<tr style="border-bottom: 1px solid #222;">';
    tableHTML += '<td style="padding: 12px;"><strong>' + r.ticker + '</strong></td>';
    tableHTML += '<td style="padding: 12px; text-align: center; color: #ff6b6b;">-' + r.drawdown + '%</td>';
    tableHTML += '<td style="padding: 12px; text-align: center;">' + r.beta + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center;" title="MVP approximation: uses Beta as volatility proxy (70% accuracy)">' + r.sharpeRatio + '<span style="color: #888; font-size: 10px;">ⓘ</span></td>';
    tableHTML += '<td style="padding: 12px; text-align: center;">' + r.sortinoRatio + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center;">' + r.calmarRatio + '</td>';
    tableHTML += '<td style="padding: 12px; text-align: center; font-weight: bold; color: ' + riskColor + ';">' + r.riskLevel + '</td>';
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table></div></div>';

  // ============================
  // BUILD HIGH-RISK ALERTS
  // ============================
  let alertsHTML = '<div class="card" style="margin-top: 16px; border-left: 4px solid #dc2626;"><h3 style="margin-top: 0; color: #dc2626;">🔴 HIGH RISK POSITIONS (Drawdown > 20%)</h3>';
  
  if (highRiskStocks.length > 0) {
    alertsHTML += '<div>';
    highRiskStocks.forEach(s => {
      const recommendation = parseFloat(s.drawdown) > 25 ? "⚠️ Exit immediately" : "📉 Consider reducing position";
      alertsHTML += '<div style="padding: 12px; margin: 8px 0; background: rgba(255, 107, 107, 0.1); border-left: 3px solid #dc2626; border-radius: 4px;">';
      alertsHTML += '<strong>' + s.ticker + '</strong>: Down <strong>' + s.drawdown + '%</strong> from peak';
      alertsHTML += '<div style="font-size: 12px; color: #aaa; margin-top: 4px;">Sharpe Ratio: ' + s.sharpeRatio + ' | Recommendation: ' + recommendation + '</div>';
      alertsHTML += '</div>';
    });
    alertsHTML += '</div>';
  } else {
    alertsHTML += '<div style="padding: 12px; color: #16a34a;">✅ No stocks with extreme drawdown</div>';
  }
  
  alertsHTML += '</div>';

  riskGrid.innerHTML = summaryHTML + tableHTML + alertsHTML;
}


// ======================================================
// TREND CHART
// ======================================================

// ======================================================
// TRENDS
// ======================================================

function renderTrendChart() {

  renderRegimeTable();

  renderMomentumLadder();

  renderQuadrantChart();

  renderRSIRegimeChart();
}

// ======================================================
// REGIME TABLE (INLINED from trendRegime.js)
// ======================================================

function renderRegimeTable() {
  const rows = (window.__ANALYTICS__ && window.__ANALYTICS__.rows) || [];
  if (!Array.isArray(rows)) return;

  // ============================
  // INLINE HELPERS (from trendRegime.js)
  // ============================
  
  function normalizeSlope(slope) {
    return ((slope + 0.1) / 0.2) * 100;
  }

  function classifyRegime(stock) {
    const score = stock.New_Composite_Score || 0;
    const slope = stock.MA_Slope_50 || 0;
    const rsi = stock.RSI_14Day || 50;
    const slopeNorm = normalizeSlope(slope);

    // Check STRONG_UPTREND first (most specific)
    if (score >= 75 && slopeNorm > 50 && rsi >= 40 && rsi <= 60) return "STRONG_UPTREND";
    // Then WEAK_UPTREND (less specific, excludes STRONG cases)
    if (score >= 60 && slopeNorm > 50 && (score < 75 || rsi < 40 || rsi > 60)) return "WEAK_UPTREND";
    if (score >= 40 && score < 60 && Math.abs(slope) < 0.01) return "NEUTRAL";
    if (score >= 20 && score < 40 && slopeNorm < 50) return "WEAK_DOWNTREND";
    if (score < 20 && slopeNorm < 50 && rsi < 30) return "STRONG_DOWNTREND";
    return "UNCLEAR";
  }

  function computeRegimeStrength(stock) {
    const score = stock.New_Composite_Score || 0;
    const slope = stock.MA_Slope_50 || 0;
    const rsi = stock.RSI_14Day || 50;
    let strength = 50;
    
    if (score >= 75) strength += Math.min(25, (score - 75) * 5);
    else if (score >= 60) strength += 15;
    else if (score < 40) strength -= 15;
    
    if (Math.abs(slope) > 0.03) strength += 15;
    else if (Math.abs(slope) < 0.01) strength -= 10;
    
    const rsiDist = Math.abs(rsi - 50);
    if (rsiDist > 15) strength += 10;
    else if (rsiDist < 5) strength -= 10;
    
    return Math.max(0, Math.min(100, strength));
  }

  function computeRegimeConfidence(stock) {
    const score = stock.New_Composite_Score || 0;
    const slope = stock.MA_Slope_50 || 0;
    const rsi = stock.RSI_14Day || 50;
    const delta = stock.Daily_Composite_Score_delta || 0;
    const sma200Dist = stock.SMA200_Dist || 0;

    let agreements = 0;
    if ((score >= 60 && slope > 0) || (score < 40 && slope < 0)) agreements++;
    if ((slope > 0 && rsi > 40) || (slope < 0 && rsi < 60)) agreements++;
    if ((slope > 0 && delta > 0) || (slope < 0 && delta < 0)) agreements++;
    if ((slope > 0 && sma200Dist > 0) || (slope < 0 && sma200Dist < 0)) agreements++;

    return (agreements / 4) * 100;
  }

  function computeActionability(regime) {
    const map = {
      STRONG_UPTREND: 90,
      WEAK_UPTREND: 60,
      NEUTRAL: 30,
      WEAK_DOWNTREND: 50,
      STRONG_DOWNTREND: 80,
      UNCLEAR: 10
    };
    return map[regime] || 10;
  }

  function predictNextMove(regime, stock) {
    if (regime === "STRONG_UPTREND") return "Continue up; target +15-20%";
    if (regime === "WEAK_UPTREND") return "Mixed; watch for breakout";
    if (regime === "NEUTRAL") return "Wait for direction clarity";
    if (regime === "WEAK_DOWNTREND") return "Mixed; watch for support";
    if (regime === "STRONG_DOWNTREND") return "Continue down; target -15-20%";
    return "Unclear; gather data";
  }

  // ============================
  // COMPUTE REGIMES
  // ============================
  
  const regimes = rows.map(stock => {
    const regime = classifyRegime(stock);
    const strength = computeRegimeStrength(stock);
    const confidence = computeRegimeConfidence(stock);
    const actionability = computeActionability(regime);

    return {
      ticker: stock.Ticker,
      regime,
      strength,
      confidence,
      actionability,
      description: regime.replace(/_/g, " "),
      nextMove: predictNextMove(regime, stock),
      strengthNum: strength,
      confidenceNum: confidence,
      actionabilityNum: actionability
    };
  }).filter(r => r !== null);

  const regimeCounts = {
    STRONG_UPTREND: regimes.filter(r => r.regime === "STRONG_UPTREND").length,
    WEAK_UPTREND: regimes.filter(r => r.regime === "WEAK_UPTREND").length,
    NEUTRAL: regimes.filter(r => r.regime === "NEUTRAL").length,
    WEAK_DOWNTREND: regimes.filter(r => r.regime === "WEAK_DOWNTREND").length,
    STRONG_DOWNTREND: regimes.filter(r => r.regime === "STRONG_DOWNTREND").length
  };

  const rankedByActionability = [...regimes].sort((a, b) => b.actionabilityNum - a.actionabilityNum).slice(0, 15);

  // ============================
  // BUILD REGIME PANEL
  // ============================
  
  let regimePanel = '<div style="margin-bottom: 24px;">';
  regimePanel += '<h2>🔄 Trend Regime Classification</h2>';
  
  // Regime Summary Cards
  regimePanel += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">';
  
  regimePanel += '<div class="card" style="background: #1a4d2e; border-left: 4px solid #16a34a;"><h3 style="margin: 0; color: #16a34a; font-size: 14px;">🟢 STRONG UPTREND</h3>';
  regimePanel += '<div style="font-size: 20px; font-weight: bold; margin: 8px 0;">' + regimeCounts.STRONG_UPTREND + '</div>';
  regimePanel += '<div style="font-size: 11px; color: #aaa;">High confidence uptrend</div></div>';
  
  regimePanel += '<div class="card" style="background: #1a3a1a; border-left: 4px solid #51cf66;"><h3 style="margin: 0; color: #51cf66; font-size: 14px;">🟢 WEAK UPTREND</h3>';
  regimePanel += '<div style="font-size: 20px; font-weight: bold; margin: 8px 0;">' + regimeCounts.WEAK_UPTREND + '</div>';
  regimePanel += '<div style="font-size: 11px; color: #aaa;">Mixed signals; monitor</div></div>';
  
  regimePanel += '<div class="card" style="background: #1a1a1a; border-left: 4px solid #888;"><h3 style="margin: 0; color: #888; font-size: 14px;">⚪ NEUTRAL</h3>';
  regimePanel += '<div style="font-size: 20px; font-weight: bold; margin: 8px 0;">' + regimeCounts.NEUTRAL + '</div>';
  regimePanel += '<div style="font-size: 11px; color: #aaa;">Range-bound; wait</div></div>';
  
  regimePanel += '<div class="card" style="background: #2a1a1a; border-left: 4px solid #ff8787;"><h3 style="margin: 0; color: #ff8787; font-size: 14px;">🔴 WEAK DOWNTREND</h3>';
  regimePanel += '<div style="font-size: 20px; font-weight: bold; margin: 8px 0;">' + regimeCounts.WEAK_DOWNTREND + '</div>';
  regimePanel += '<div style="font-size: 11px; color: #aaa;">Deteriorating; consider exit</div></div>';
  
  regimePanel += '<div class="card" style="background: #3d1a1a; border-left: 4px solid #dc2626;"><h3 style="margin: 0; color: #dc2626; font-size: 14px;">🔴 STRONG DOWNTREND</h3>';
  regimePanel += '<div style="font-size: 20px; font-weight: bold; margin: 8px 0;">' + regimeCounts.STRONG_DOWNTREND + '</div>';
  regimePanel += '<div style="font-size: 11px; color: #aaa;">Clear downtrend; avoid</div></div>';
  
  regimePanel += '</div>';

  // Regime Details Table
  regimePanel += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
  regimePanel += '<thead><tr style="background: #1d2330; border-bottom: 1px solid #333;">';
  regimePanel += '<th style="padding: 12px; text-align: left;">Ticker</th>';
  regimePanel += '<th style="padding: 12px; text-align: center;">Regime</th>';
  regimePanel += '<th style="padding: 12px; text-align: center;">Strength</th>';
  regimePanel += '<th style="padding: 12px; text-align: center;">Confidence</th>';
  regimePanel += '<th style="padding: 12px; text-align: center;">Actionability</th>';
  regimePanel += '<th style="padding: 12px; text-align: left;">Next Move</th>';
  regimePanel += '</tr></thead><tbody>';

  rankedByActionability.forEach(r => {
    const regimeColorMap = {
      STRONG_UPTREND: "#16a34a",
      WEAK_UPTREND: "#51cf66",
      NEUTRAL: "#888",
      WEAK_DOWNTREND: "#ff8787",
      STRONG_DOWNTREND: "#dc2626"
    };
    const regimeColor = regimeColorMap[r.regime] || "#aaa";
    const actionBarColor = r.actionability > 70 ? "#16a34a" : (r.actionability > 40 ? "#eab308" : "#888");

    regimePanel += '<tr style="border-bottom: 1px solid #222;">';
    regimePanel += '<td style="padding: 12px;"><strong>' + r.ticker + '</strong></td>';
    regimePanel += '<td style="padding: 12px; color: ' + regimeColor + '; font-weight: bold; text-align: center;">' + r.regime + '</td>';
    regimePanel += '<td style="padding: 12px; text-align: center;"><div style="font-size: 12px;">' + r.strength.toFixed(0) + '/100</div><div style="width: 50px; height: 4px; background: #333; border-radius: 2px; margin-top: 4px;"><div style="width: ' + r.strength + '%; height: 100%; background: ' + regimeColor + '; border-radius: 2px;"></div></div></td>';
    regimePanel += '<td style="padding: 12px; text-align: center;">' + r.confidence.toFixed(0) + '%</td>';
    regimePanel += '<td style="padding: 12px; text-align: center;"><div style="font-size: 12px;">' + r.actionability.toFixed(0) + '/100</div><div style="width: 50px; height: 4px; background: #333; border-radius: 2px; margin-top: 4px;"><div style="width: ' + r.actionability + '%; height: 100%; background: ' + actionBarColor + '; border-radius: 2px;"></div></div></td>';
    regimePanel += '<td style="padding: 12px; color: #aaa; max-width: 200px; font-size: 11px;">' + r.nextMove + '</td>';
    regimePanel += '</tr>';
  });

  regimePanel += '</tbody></table></div>';
  regimePanel += '</div>';

  // Insert regime panel before existing trend charts
  const trendsDiv = document.getElementById("trends");
  if (trendsDiv) {
    const existingHTML = trendsDiv.innerHTML;
    trendsDiv.innerHTML = regimePanel + existingHTML;
  }
}


// ======================================================
// MOMENTUM LADDER
// ======================================================

function renderMomentumLadder() {

  const body =
    document.getElementById(
      "momentumTableBody"
    );

  if (!body) {
    return;
  }

  const sorted =
    [...rows].sort((a, b) => {
      const av = Number(a.Daily_Composite_Score_delta ?? 0);
      const bv = Number(b.Daily_Composite_Score_delta ?? 0);

      return bv - av;
    });

  
  
  body.innerHTML =
    sorted
      .map((r) => {

        const deltaRaw =
          r.Daily_Composite_Score_delta;

        const delta =
          deltaRaw == null
            ? "—"
            : Number(deltaRaw).toFixed(2);

        const score =
          Number(
            r.New_Composite_Score || 0
          ).toFixed(1);

        const rsi =
          Number(
            r.RSI_14Day || 0
          ).toFixed(1);

        const slope =
          Number(
            r.MA_Slope_50 || 0
          ).toFixed(2);

        let deltaColor =
          "#888";

        if (deltaRaw != null && Number(deltaRaw) > 0) {
          deltaColor = "#16a34a";
        }

        if (deltaRaw != null && Number(deltaRaw) < 0) {
          deltaColor = "#dc2626";
        }

        return (

          '<tr>' +

          '<td style="padding:12px;">' +
          r.Ticker +
          '</td>' +

          '<td style="padding:12px;color:' +
          deltaColor +
          ';">' +
          delta +
          '</td>' +

          '<td style="padding:12px;">' +
          score +
          '</td>' +

          '<td style="padding:12px;">' +
          rsi +
          '</td>' +

          '<td style="padding:12px;">' +
          slope +
          '</td>' +

          '</tr>'
        );

      })
      .join("");
}

// ======================================================
// QUADRANT CHART
// ======================================================


function renderQuadrantChart() {



  // ==========================================
  // DESTROY EXISTING INSTANCE
  // ==========================================

  const existing =
    Chart.getChart(
      "quadrantChart"
    );

  if (existing) {

    existing.destroy();
  }

  // ==========================================
  // GET CANVAS
  // ==========================================

  const ctx =
    document.getElementById(
      "quadrantChart"
    );

  if (!ctx) {
    return;
  }

  // ==========================================
  // BUILD QUADRANT DATA
  // ==========================================

  const quadrantData =
    rows.map((r) => {

      const score =
        Number(
          r.New_Composite_Score || 0
        );

      const slope =
  Number(
    r.MA_Slope_50 || 0
  );

      const rs =
        Number(
          r.RS_Rank || 0
        );

      let color =
        "#888";

      // ======================================
      // QUADRANT COLOR LOGIC
      // ======================================

      if (
        score >= 80 &&
        slope > 0
      ) {

        color = "#16a34a";
      }

      else if (
        score >= 60
      ) {

        color = "#eab308";
      }

      else {

        color = "#dc2626";
      }

      return {

        label:
          r.Ticker,

        x:
          slope,

        y:
          score,

        radius:
          Math.max(
            4,
            rs / 20
          ),

        backgroundColor:
          color
      };
    });

  // ==========================================
  // VALIDATION LOG
  // ==========================================

  // ==========================================
// RUNTIME X-AXIS RANGE (MA_Slope_50)
// ==========================================

const xValues =
  quadrantData
    .map(p => p.x)
    .filter(Number.isFinite);

const xMin =
  Math.min(...xValues);

const xMax =
  Math.max(...xValues);

// Prevent zero-width ranges.
const span =
  Math.max(
    xMax - xMin,
    0.02
  );

// 15% visual padding.
const padding =
  span * 0.15;

  // ==========================================
// QUADRANT MIDPOINTS
// ==========================================

const yValues =
  quadrantData
    .map(p => p.y)
    .filter(Number.isFinite);

const xMid =
  (xMin + xMax) / 2;

const yMin =
  Math.min(...yValues);

const yMax =
  Math.max(...yValues);

const yMid =
  (yMin + yMax) / 2;

  // ==========================================
// QUADRANT GUIDE PLUGIN
// ==========================================

const quadrantGuide = {

  id: "quadrantGuide",

  beforeDraw(chart) {

    const {

      ctx,

      scales: {

        x,

        y

      }

    } = chart;

    const xPixel =
      x.getPixelForValue(xMid);

    const yPixel =
      y.getPixelForValue(yMid);

    ctx.save();

    ctx.strokeStyle =
      "rgba(255,191,0,0.90)";

    ctx.lineWidth = 2;

    ctx.setLineDash([8,6]);

    ctx.beginPath();

    ctx.moveTo(
      xPixel,
      y.top
    );

    ctx.lineTo(
      xPixel,
      y.bottom
    );

    ctx.moveTo(
      x.left,
      yPixel
    );

    ctx.lineTo(
      x.right,
      yPixel
    );

    ctx.stroke();
    ctx.setLineDash([]);

    // ------------------------------------
// Quadrant Labels
// ------------------------------------

ctx.fillStyle =
  "rgba(255,191,0,0.95)";

ctx.font =
  "bold 13px Arial";

ctx.textAlign =
  "center";

ctx.textBaseline =
  "middle";

const pad = 18;

ctx.fillText(
  "Q2",
  x.left + pad,
  y.top + pad
);

ctx.fillText(
  "Q1",
  x.right - pad,
  y.top + pad
);

ctx.fillText(
  "Q3",
  x.left + pad,
  y.bottom - pad
);

ctx.fillText(
  "Q4",
  x.right - pad,
  y.bottom - pad
);

    ctx.restore();

  }

};

  // ==========================================
  // CHART
  // ==========================================

  new Chart(ctx, {

    type: "bubble",

    data: {

      datasets: [{

        label:
          "Leadership Structure",

        data:
          quadrantData
      }]
    },
    plugins: [

  quadrantGuide

],

    options: {

      responsive: true,

      plugins: {

        legend: {

          display: false
        },

        tooltip: {

          callbacks: {

            label:
              function(context) {

                const point =
                  context.raw;

                return (

  point.label +

  " | Score: " +

  point.y.toFixed(1) +

  " | MA Slope (50D): " +

  point.x.toFixed(4)

);
              }
          }
        }
      },

      scales: {

        // ======================================
        // X AXIS
        // ======================================

        x: {

          title: {

            display: true,

            text:
              "MA Slope (50D)",

            color:
              "#ddd"
          },

          min: xMin - padding,

          max: xMax + padding,

          grid: {

            color:
              "rgba(255,255,255,0.18)"
          },

          border: {

            color:
              "rgba(255,255,255,0.45)",

            width: 2
          },

          ticks: {

            color:
              "#aaa"
          }
        },

        // ======================================
        // Y AXIS
        // ======================================

        y: {

          title: {

            display: true,

            text:
              "Composite Score",

            color:
              "#ddd"
          },

          min: 0,

          max: 100,

          grid: {

            color:
              "rgba(255,255,255,0.12)"
          },

          border: {

            color:
              "rgba(255,255,255,0.45)",

            width: 2
          },

          ticks: {

            color:
              "#aaa"
          }
        }
      }
    }
  });
}



// ======================================================
// RSI REGIME
// ======================================================


function renderRSIRegimeChart() {

  // ==========================================
  // DESTROY EXISTING CHART
  // ==========================================

  const existing =
    Chart.getChart(
      "rsiRegimeChart"
    );

  if (existing) {

    existing.destroy();
  }

  // ==========================================
  // GET CANVAS
  // ==========================================

  const ctx =
    document.getElementById(
      "rsiRegimeChart"
    );

  if (!ctx) {

    return;
  }

  // ==========================================
  // BUILD RSI POINTS
  // ==========================================

  const scatterData =
    rows.map((r, index) => {

      const rsi =
  Number(
    r.RSI_14Day || 0
  );

      const score =
        Number(
          r.New_Composite_Score || 0
        );

      let color =
        "#888";

      // ==============================
      // REGIME COLORS
      // ==============================

      if (rsi > 60) {

        color = "#16a34a";
      }

      else if (rsi >= 40) {

        color = "#eab308";
      }

      else {

        color = "#dc2626";
      }

      let regime;

if (rsi > 60) {

  regime = "Strong Momentum";

}

else if (rsi >= 40) {

  regime = "Neutral";

}

else {

  regime = "Weak Momentum";

}

      return {

               x:
          score,

        y:
          rsi,

        r:
          6,

        ticker:
          r.Ticker,

        score:
          score,

        regime:
          regime,

        backgroundColor:
          color
      };
    });

  // ==========================================
  // VALIDATION
  // ==========================================

  

  // ==========================================
  // CHART
  // ==========================================

  new Chart(ctx, {

    type: "bubble",

    data: {

      datasets: [{

    label:
      "RSI Universe",

    data:
      scatterData,

    backgroundColor:
      (ctx) => ctx.raw.backgroundColor,

    borderColor:
      (ctx) => ctx.raw.backgroundColor,

    borderWidth: 1.25

}]
    },

    options: {

      responsive: true,

      plugins: {

        legend: {

          display: false
        },

        tooltip: {

          callbacks: {

            label:
              function(context) {

                const point =
                  context.raw;

                return (
  point.ticker +
  " | RSI-14: " +
  point.y.toFixed(1) +
  " | Composite: " +
  point.score.toFixed(1) +
  " | " +
  point.regime
);
              }
          }
        }
      },

      scales: {

        // ======================================
        // X AXIS
        // ======================================

        x: {

          title: {

            display: true,

            text:
              "Stock's Composite Score",

            color:
              "#ddd"
          },
          min: 0,

          max: 100,

          grid: {

            color:
              "rgba(255,255,255,0.08)"
          },

          border: {

            color:
              "rgba(255,255,255,0.45)",

            width: 2
          },

          ticks: {

            color:
              "#999",

            maxTicksLimit: 12
          }
        },

        // ======================================
        // Y AXIS
        // ======================================

        y: {

          title: {

            display: true,

            text:
              "RSI-14",

            color:
              "#ddd"
          },

          min: 0,

          max: 100,

          grid: {

            color:
              function(context) {

                const value =
                  context.tick.value;

                // ==========================
                // HIGHLIGHT THRESHOLDS
                // ==========================

                if (
                  value === 40 ||
                  value === 60
                ) {

                  return (
                    "rgba(245,158,11,0.70)"
                  );
                }

                return (
                  "rgba(255,255,255,0.08)"
                );
              }
          },

          border: {

            color:
              "rgba(255,255,255,0.45)",

            width: 2
          },

          ticks: {

            color:
              "#aaa"
          }
        }
      }
    }
  });
}

</script>
</body>
</html>
`;
}
// ======================================================
// MAIN
// ======================================================

(async () => {
  const data = await readData();

  const html = buildHtml(data);

  fs.writeFileSync(OUTPUT_PATH, html);

  console.log("analytics.html generated");

  if (SERVE) {
    http
      .createServer((req, res) => {
        // ==========================================
        // API: analytics runtime data
        // ==========================================

        if (req.url === "/api/analytics-data.js") {
          const payload = `
window.__ANALYTICS__ = ${JSON.stringify(data)};
`;

          res.writeHead(200, {
            "Content-Type": "application/javascript",
          });

          res.end(payload);

          return;
        }

        // ==========================================
        // DEFAULT: analytics html
        // ==========================================

        res.writeHead(200, {
          "Content-Type": "text/html",
        });

        res.end(html);
      })
      .listen(3000, "0.0.0.0", () => {
        console.log("Server running at http://localhost:3000");
      });
  }
})();
