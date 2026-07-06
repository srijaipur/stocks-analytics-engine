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

      RSI: vals[7],

      SMA200_Dist: vals[8],

      MA_Slope: vals[9],

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
        🟢 <strong>Top Right</strong><br>
        Leadership
      </div>

      <div>
        🟡 <strong>Bottom Right</strong><br>
        Emerging Strength
      </div>

      <div>
        🟠 <strong>Top Left</strong><br>
        Exhaustion
      </div>

      <div>
        🔴 <strong>Bottom Left</strong><br>
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


  const rows =
    (window.__ANALYTICS__ &&
     window.__ANALYTICS__.rows) || [];

  if (!Array.isArray(rows)) return;

  const grid =
    document.getElementById("signalsGrid");

  if (!grid) return;
  

  // ============================
  // HELPERS
  // ============================

  function topN(
    arr,
    fn,
    n = 3
  ) {

    return [...arr]
      .sort(
        (a, b) =>
          fn(b) - fn(a)
      )
      .slice(0, n);
  }

  function card(title, items, color) {

  return (
    '<div class="card">' +

    '<h3 style="color:' + color + '">' +
    title +
    '</h3>' +

    '<div style="margin-top:10px">' +

    items.map(i =>
      '<div style="margin:6px 0">' +
        '<b>' + i.Ticker + '</b>' +
        '<span style="color:#aaa">' +
          ' (' + i.New_Composite_Score + ')' +
        '</span>' +
      '</div>'
    ).join("") +

    '</div>' +

    '</div>'
  );
}
  
  

  // ============================
  // SIGNAL LOGIC (PHASE 1)
  // ============================

  const leadership =
    topN(
      rows,
      r =>
        (r.New_Composite_Score || 0) +
        (r.Daily_Composite_Score_delta || 0)
    );

  const accumulation =
    topN(
      rows,
      r =>
        (r.Inst_Accumulation || 0) +
        (r.Net_Inst || 0)
    );

  const momentum =
    topN(
      rows,
      r =>
        (r.RSI_14Day || 0) +
        (r.MA_Slope || 0)
    );

  const risk =
    topN(
      rows,
      r =>
        (r.Drawdown_pct || 0) -
        (r.New_Composite_Score || 0)
    );

  // ============================
  // RENDER
  // ============================

  grid.innerHTML =

    card(
      "Leadership Expansion",
      leadership,
      "#4caf50"
    ) +

    card(
      "Institutional Accumulation",
      accumulation,
      "#2196f3"
    ) +

    card(
      "Momentum Continuation",
      momentum,
      "#ff9800"
    ) +

    card(
      "Risk Deterioration",
      risk,
      "#f44336"
    );
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

  const risky = rows.filter(
    (r) => {

      return (
        r.Drawdown_pct > 25
      );
    }
  );

  document
    .getElementById(
      "riskGrid"
    )
    .innerHTML = risky
      .map((r) => {

        return (
          '<div class="card red">' +

          '<h3>⚠️ ' +
          r.Ticker +
          '</h3>' +

          '<div>' +
          'Drawdown: ' +
          r.Drawdown_pct +
          '</div>' +

          '</div>'
        );

      })
      .join("");
}

// ======================================================
// TREND CHART
// ======================================================

// ======================================================
// TRENDS
// ======================================================

function renderTrendChart() {

  renderMomentumLadder();

  renderQuadrantChart();

  renderRSIRegimeChart();
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
  [...rows].sort((a,b) => {

    let av;
    let bv;

   

    const result =
      av > bv ? 1 :
      av < bv ? -1 : 0;

    
  });

  body.innerHTML =
    sorted
      .map((r) => {

        const delta =
          Number(
            r.Daily_Composite_Score_delta || 0
          ).toFixed(2);

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

        if (Number(delta) > 0) {
          deltaColor = "#16a34a";
        }

        if (Number(delta) < 0) {
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
