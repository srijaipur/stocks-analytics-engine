import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import { firebaseConfig } from "./firebase/firebaseConfig.js";



const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const WORKBOOK_PATH = path.resolve(
  __dirname,
  "data/stocks.xlsx"
);

const OUTPUT_PATH = path.resolve(
  __dirname,
  "data/analytics.html"
);

const SERVE =
  process.argv.includes("--serve");

// ======================================================
// READ EXCEL
// ======================================================

async function readData() {

  

  const wb = new ExcelJS.Workbook();

  await wb.xlsx.readFile(WORKBOOK_PATH);

  //const rows = [];

  const sheet =
    wb.getWorksheet("ScoresCurrent");

  if (!sheet) {

    throw new Error(
      "ScoresCurrent worksheet missing"
    );
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

      Daily_Composite_Score_delta: vals[19]
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

  const safe = JSON.stringify(data)
    .replace(/</g, "\\u003c");

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

</style>

</head>

<body>

<div id="auth"></div>

<div id="app" class="hidden">

<header>
  <h1>
    📊 Stocks Analytics Dashboard
  </h1>
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

            <th style="padding:12px;">
              Ticker
            </th>

            <th style="padding:12px;">
              Delta
            </th>

            <th style="padding:12px;">
              Composite
            </th>

            <th style="padding:12px;">
              RSI
            </th>

            <th style="padding:12px;">
              MA Slope
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
  window.__ANALYTICS__ || {
    rows: []
  };

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
   return `
