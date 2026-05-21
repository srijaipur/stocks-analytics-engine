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

  <div
    class="grid"
    id="overviewGrid"
  ></div>

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

  <canvas id="trendChart"></canvas>

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

const rows = data.rows || [];

// ======================================================
// DOM REFERENCES
// ======================================================

const authEl =
  document.getElementById("auth");

const appEl =
  document.getElementById("app");

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

      if (tab === "trends") {

        const existing =
          Chart.getChart(
            "trendChart"
          );

        if (!existing) {
          renderTrendChart();
        }
      }
    };
  });

// ======================================================
// AUTH FLOW
// ======================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

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

    } catch (err) {

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

  const target =
    document.getElementById(
      "overviewGrid"
    );

  target.innerHTML = rows
    .slice(0, 20)
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
}

// ======================================================
// RISK
// ======================================================

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

function renderTrendChart() {

  const ctx =
    document.getElementById(
      "trendChart"
    );

  new Chart(ctx, {

    type: "bar",

    data: {

      labels: rows
        .slice(0, 15)
        .map(
          (r) => r.Ticker
        ),

      datasets: [{

        label: "Score",

        data: rows
          .slice(0, 15)
          .map(
            (r) =>
              r.New_Composite_Score
          )
      }]
    }
  });
}

</script>

</body>
</html>`;
}

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