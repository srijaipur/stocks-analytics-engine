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

  const rows = [];

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
  id="risk"
  class="page"
>

  <div
    class="grid"
    id="riskGrid"
  ></div>

</div>

<div id="trends" class="page" > <!-- ===================================== --> <!-- MOMENTUM DELTA LADDER --> <!-- ===================================== --> <div class="card" style=" margin-bottom:24px; " > <h2 style=" margin-top:0; margin-bottom:16px; " > Momentum Delta Ladder </h2> <div style=" overflow-x:auto; " > <table id="momentumTable" style=" width:100%; border-collapse:collapse; min-width:900px; " > <thead> <tr style=" background:#1d2330; text-align:left; " > <th style="padding:12px;">Ticker</th> <th style="padding:12px;">Delta</th> <th style="padding:12px;">Composite</th> <th style="padding:12px;">RSI</th> <th style="padding:12px;">MA Slope</th> </tr> </thead> <tbody id="momentumTableBody"> </tbody> </table> </div> </div> <!-- ===================================== --> <!-- QUADRANT CHART --> <!-- ===================================== --> <div class="card" style=" margin-bottom:24px; " > <h2 style=" margin-top:0; margin-bottom:16px; " > Composite vs MA Slope </h2> <canvas id="quadrantChart"></canvas> </div> <!-- ===================================== --> <!-- RSI REGIME --> <!-- ===================================== --> <div class="card" > <h2 style=" margin-top:0; margin-bottom:16px; " > RSI Regime Structure </h2> <canvas id="rsiRegimeChart"></canvas> </div> </div>

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

const rows = data.rows || [];

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

  renderRisk();
}

// ======================================================
// TAB SYSTEM
// ======================================================

document
  .querySelectorAll(".tab-btn")
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
    [...rows].sort(
      (a, b) => {

        return (
          Number(
            b.Daily_Composite_Score_delta || 0
          ) -

          Number(
            a.Daily_Composite_Score_delta || 0
          )
        );
      }
    );

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

  const existing =
    Chart.getChart(
      "quadrantChart"
    );

  if (existing) {
    existing.destroy();
  }

  const ctx =
    document.getElementById(
      "quadrantChart"
    );

  if (!ctx) {
    return;
  }

  const quadrantData =
    rows.map((r) => {

      const score =
        Number(
          r.New_Composite_Score || 0
        );

   
const rawSlope =
  Number(
    r.MA_Slope_50 || 0
  );

const slope =
  rawSlope * 10000;



      const rs =
        Number(
          r.RS_Rank || 0
        );

      let color =
        "#888";

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
                  point.y +
                  " | Slope: " +
                  point.x
                );
              }
          }
        }
      },

      scales: {

        x: {

          title: {

            display: true,

            text:
              "MA Slope 50"
          }
        },

        y: {

          title: {

            display: true,

            text:
              "Composite Score"
          },

          min: 0,

          max: 100
        }
      }
    }
  });
}



// ======================================================
// RSI REGIME
// ======================================================


function renderRSIRegimeChart() {

  const existing =
    Chart.getChart(
      "rsiRegimeChart"
    );

  if (existing) {
    existing.destroy();
  }

  const ctx =
    document.getElementById(
      "rsiRegimeChart"
    );

  if (!ctx) {
    return;
  }

  let weak = 0;
  let neutral = 0;
  let strong = 0;

  rows.forEach((r) => {

    const rsi =
      Number(
        r.RSI_14Day || 0
      );

    if (rsi < 40) {
      weak++;
    }

    else if (rsi <= 60) {
      neutral++;
    }

    else {
      strong++;
    }
  });
 
console.log({
  weak,
  neutral,
  strong
});



  new Chart(ctx, {

    type: "doughnut",

    data: {

      labels: [
        "Weak",
        "Neutral",
        "Strong"
      ],

      datasets: [{

        data: [
          weak,
          neutral,
          strong
        ],

        backgroundColor: [
          "#dc2626",
          "#eab308",
          "#16a34a"
        ]
      }]
    },

    options: {

      responsive: true,

      plugins: {

        legend: {

          position: "bottom"
        }
      }
    }
  });
}
</script> </body> </html>`; }
// ======================================================
// MAIN
// ======================================================

(async () => {

  const data =
    await readData();

  const html =
    buildHtml(data);

  fs.writeFileSync(
    OUTPUT_PATH,
    html
  );

  console.log(
    "analytics.html generated"
  );

  if (SERVE) {

    http
  .createServer(
    (req, res) => {

      // ==========================================
      // API: analytics runtime data
      // ==========================================

      if (
        req.url ===
        "/api/analytics-data.js"
      ) {

        const payload =
          `
window.__ANALYTICS__ = ${JSON.stringify(data)};
`;

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/javascript"
          }
        );

        res.end(payload);

        return;
      }

      // ==========================================
      // DEFAULT: analytics html
      // ==========================================

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html"
        }
      );

      res.end(html);

    }
  )
      .listen(
        3000,
        "0.0.0.0",
        () => {

          console.log(
            "Server running at http://localhost:3000"
          );
        }
      );
  }

})();