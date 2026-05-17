import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "data/analytics.html");
const SERVE = process.argv.includes("--serve");

// ---------- READ ----------
async function readData() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK_PATH);

  const rows = [];
  const headers = [];

  const sheet = wb.getWorksheet("ScoresCurrent");

  sheet.eachRow((row, i) => {
    const vals = row.values.slice(1);
    if (i === 1) headers.push(...vals);
    else {
    
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
  Old_Score: vals[16],
  New_Score: vals[17],
  Earnings_Date: vals[18],
  Delta: vals[19],
};
      if (obj.Ticker) rows.push(obj);
    }
  });

  // Signals
  const signalsSheet = wb.getWorksheet("SignalsTriggered");
  const signals = [];

  if (signalsSheet) {
    signalsSheet.eachRow((row, i) => {
      if (i === 1) return;
      signals.push({
        ticker: row.getCell(1).value,
        score: row.getCell(2).value,
        triggers: row.getCell(3).value,
      });
    });
  }

  const pf = new Set();
  const wl = new Set();

  const ps = wb.getWorksheet("Portfolio");
  const ws = wb.getWorksheet("Watchlist");

  if (ps) ps.eachRow((r, i) => { if (i > 1) pf.add(r.getCell(1).value); });
  if (ws) ws.eachRow((r, i) => { if (i > 1) wl.add(r.getCell(1).value); });

  return { rows, pf:[...pf], wl:[...wl], signals };
}

// ---------- UI ----------
function buildHtml(data) {
const safe = JSON.stringify(data).replace(/</g, "\\u003c");

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<!-- ✅ FIXED CHART LOAD -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1"></script>

<style>
body { background:#0f1117; color:#ddd; font-family:sans-serif }

.tabs { display:flex; gap:10px; padding:10px }
.tab { background:#1a1d27; padding:8px; cursor:pointer }
.active { background:#333 }

.grid {
 display:grid;
 grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
 gap:10px;
 padding:10px;
}

.card {
 background:#1a1d27;
 border-radius:10px;
 padding:10px;
 text-align:center;
}

.score { font-size:1.4rem }

.green { border:1px solid #00e676 }
.yellow { border:1px solid #ffd600 }
.red { border:1px solid #f44336 }

.text-green { color:#00e676 }
.text-blue { color:#00bcd4 }
.text-yellow { color:#ffd600 }
.text-red { color:#f44336 }

.small { font-size:0.8rem; color:#aaa }

.hidden { display:none }
</style>

</head>

<body>

<h2 style="padding-left:10px">📊 Full Dashboard</h2>

<div class="tabs">
 <div class="tab active" onclick="show('analytics',this)">Analytics</div>
 <div class="tab" onclick="show('signals',this)">Signals</div>
 <div class="tab" onclick="show('trends',this)">Trends</div>
 <div class="tab" onclick="show('risk',this)">Risk</div>
</div>

<!-- ✅ ANALYTICS -->
<div id="analytics">
<h3>📊 Portfolio Structural Strength</h3>
<div id="pf" class="grid"></div>

<h3>👀 Watchlist Structural Strength</h3>
<div id="wl" class="grid"></div>
</div>

<!-- ✅ SIGNALS -->
<div id="signals" class="hidden">
<div id="signalsGrid" class="grid"></div>
</div>

<!-- ✅ TRENDS -->
<div id="trends" class="hidden">

<h3>🚀 Leaders</h3>
<div id="leaders" class="grid"></div>

<h3>⚡ Improving</h3>
<div id="improving" class="grid"></div>

<h3>⚠ Weakening</h3>
<div id="weakening" class="grid"></div>

<h3>❌ Laggards</h3>
<div id="laggards" class="grid"></div>

<canvas id="chart"></canvas>

</div>

<!-- ✅ RISK TAB -->
<div id="risk" class="hidden">

<h3>🛡️ Portfolio Health</h3>
<div id="riskSummary" class="small" style="padding:10px;"></div>

<h4>⚠️ Risk Alerts</h4>
<div id="riskList" class="grid"></div>

</div>

<script>

const data = ${safe};
const rows = data.rows;
// ---------- SCHEMA NORMALIZATION ----------
rows.forEach(function(r){

  // numeric normalization
  r.New_Score = Number(r.New_Score ?? r.Composite_Score ?? 0);

  r.Delta = Number(
    r.Delta ??
    r.Daily_Composite_Score_delta ??
    0
  );

  r.MA_Slope = Number(
    r.MA_Slope ??
    r.MA_Slope_50 ??
    0
  );

  r.Drawdown_pct = Number(
    r["Drawdown_%"] ??
    r.Drawdown_pct ??
    0
  );

});
const pf = new Set(data.pf);
const wl = new Set(data.wl);
const signals = data.signals;

// ---------- HELPERS ----------
function tier(score){
 if(score >= 80) return "High Strength";
 if(score >= 60) return "Constructive";
 if(score >= 40) return "Mixed";
 return "Weak Structure";
}

function color(score){
 if(score>=80) return "green";
 if(score>=40) return "yellow";
 return "red";
}

function delta(v){
 if(v == null) return "—";
 return v>=0 ? "▲ +" + v.toFixed(1) : "▼ " + v.toFixed(1);
}

// ---------- ANALYTICS ----------
function card(r){

  const score = Number(r.New_Score);
  const safeScore = isNaN(score) ? 0 : score;

  const deltaVal = Number(r.Delta);
  const safeDelta = isNaN(deltaVal) ? null : deltaVal;

  return "<div class='card "+color(safeScore)+"'>" +
    "<b>"+r.Ticker+"</b><br>" +
    "<div class='score'>"+safeScore.toFixed(1)+"</div>" +
    delta(safeDelta)+"<br>" +
    "<span class='small'>"+tier(safeScore)+"</span>" +
  "</div>";
}

document.getElementById("pf").innerHTML =
 rows.filter(r=>pf.has(r.Ticker)).map(card).join("");

document.getElementById("wl").innerHTML =
 rows.filter(r=>wl.has(r.Ticker)).map(card).join("");

// ---------- SIGNALS ----------
function signalColor(s){
 if(s.includes("Momentum")) return "text-green";
 if(s.includes("Relative")) return "text-blue";
 if(s.includes("Institutional")) return "text-yellow";
 return "text-red";
}

function isBearish(t){
 return (
  t.includes("Breakdown") ||
  t.includes("Weak") ||
  t.includes("Downtrend") ||
  t.includes("Selling") ||
  t.includes("Risk")
 );
}

let bullHTML = "";
let bearHTML = "";

signals.forEach(function(s){

 let bullLines = "";
 let bearLines = "";

 s.triggers.split(",").forEach(function(t){
   const line = "<div class='"+signalColor(t)+"'>"+t+"</div>";
   if(isBearish(t)) bearLines += line;
   else bullLines += line;
 });

 if(bullLines){
  bullHTML += "<div class='card'><b>"+s.ticker+"</b><br>"+bullLines+"</div>";
 }
 if(bearLines){
  bearHTML += "<div class='card red'><b>"+s.ticker+"</b><br>"+bearLines+"</div>";
 }
});

document.getElementById("signalsGrid").innerHTML =
 "<h3>🔥 Bullish Signals</h3>" + bullHTML +
 "<h3 style='margin-top:20px'>⚠️ Bearish Signals</h3>" + bearHTML;

// ---------- TRENDS ----------
function Q(r){
 if(r.New_Score>=60 && r.MA_Slope>0) return "leader";
 if(r.New_Score<60 && r.MA_Slope>0) return "improving";
 if(r.New_Score>=60) return "weak";
 return "lag";
}

const groups = { leader:[], improving:[], weak:[], lag:[] };

rows.forEach(function(r){
  groups[Q(r)].push(r);
});

document.getElementById("leaders").innerHTML = groups.leader.map(card).join("");
document.getElementById("improving").innerHTML = groups.improving.map(card).join("");
document.getElementById("weakening").innerHTML = groups.weak.map(card).join("");
document.getElementById("laggards").innerHTML = groups.lag.map(card).join("");

// ✅ Scatter Chart (BALANCED + LEGEND ENHANCED)
const chartEl = document.getElementById("chart");

// ---------- LABEL SELECTION LOGIC ----------

// Top 5 highest and bottom 5 lowest
const sortedByScore = rows.slice().sort((a,b)=>b.New_Score - a.New_Score);
const top5 = sortedByScore.slice(0,5);
const bottom5 = sortedByScore.slice(-5);

// Quadrant groups
function Q(r){
 if(r.New_Score>=60 && r.MA_Slope>0) return "leader";
 if(r.New_Score<60 && r.MA_Slope>0) return "improving";
 if(r.New_Score>=60) return "weak";
 return "lag";
}


const chartGroups = {
  leader: [],
  improving: [],
  weak: [],
  lag: []
};


rows.forEach(function(r){
  chartGroups[Q(r)].push(r);
});

// pick specific counts
const selected = []
  .concat(top5)
  .concat(bottom5)
  .concat(chartGroups.leader.slice(0,3))
  .concat(chartGroups.improving.slice(0,3))
  .concat(chartGroups.weak.slice(0,2))
  .concat(chartGroups.lag.slice(0,2));


// ✅ deduplicate tickers
const labelSet = new Set(selected.map(r => r.Ticker));


// ---------- CHART ----------
if (chartEl && window.Chart) {
  new Chart(chartEl, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Trend vs Score",

        pointBackgroundColor: function(ctx){
          return ctx.raw.pointBackgroundColor;
        },

        pointRadius: function(ctx){
          return ctx.raw.isPortfolio ? 7 : 4;
        },

        pointBorderWidth: function(ctx){
          return ctx.raw.isPortfolio ? 2 : 0;
        },

        pointBorderColor: function(ctx){
          return ctx.raw.isPortfolio ? "#ffffff" : "transparent";
        },

        pointHoverRadius: 8,

        data: rows.map(function(r){

          let color = "cyan";

          if(r.New_Score >= 60 && r.MA_Slope > 0) color = "#00e676";
          else if(r.New_Score < 60 && r.MA_Slope > 0) color = "#00bcd4";
          else if(r.New_Score >= 60) color = "#ffd600";
          else color = "#f44336";

          return {
            x: r.MA_Slope || 0,
            y: r.New_Score || 0,
            label: r.Ticker,
            pointBackgroundColor: color,
            isPortfolio: pf.has(r.Ticker) || wl.has(r.Ticker), // ✅ portfolio + watchlist
            showLabel: labelSet.has(r.Ticker) // ✅ controlled labeling
          };
        })
      }]
    },

    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const d = ctx.raw;
              return (
                d.label +
                " | Score: " + d.y.toFixed(1) +
                " | Trend: " + d.x.toFixed(3)
              );
            }
          }
        },

        zoom: {
          pan: { enabled:true, mode:'xy' },
          zoom: {
            wheel:{enabled:true},
            pinch:{enabled:true},
            mode:'xy'
          }
        },

        legend: { display:false }
      },

      scales: {
        x: {
          title: {
            display: true,
            text: "Trend (MA Slope)",
            color: "#e0e0e0",
            font: { size: 14, weight: "bold" }
          },
          ticks: { color:"#bbb" },
          grid: { color:"#333" }
        },

        y: {
          title: {
            display: true,
            text: "Score",
            color: "#e0e0e0",
            font: { size: 14, weight: "bold" }
          },
          ticks: { color:"#bbb" },
          grid: { color:"#333" },
          min:0,
          max:100
        }
      }
    },

    plugins: [

      // ✅ LABELS
      {
        id: 'pointLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;

          chart.data.datasets[0].data.forEach(function(p,i){
            if(!p.showLabel) return;

            const meta = chart.getDatasetMeta(0).data[i];
            const pos = meta.getProps(['x','y'], true);

            ctx.fillStyle = "#ddd";
            ctx.font = "10px sans-serif";
            ctx.fillText(p.label, pos.x + 6, pos.y - 6);
          });
        }
      },

      // ✅ LEGEND (ENHANCED)
     {
  id: 'legendOverlay',
  beforeDraw(chart) {
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;

    // ✅ Position in top-right corner
    const x = chartArea.right - 180;
    const y = chartArea.top + 10;

    ctx.save();

    // ✅ Background box (prevents clutter)
    ctx.fillStyle = "rgba(20,20,20,0.85)";
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x - 10, y - 5, 190, 100, 8);
    ctx.fill();
    ctx.stroke();

    // ✅ Text styling
    ctx.fillStyle = "#ddd";
    ctx.font = "12px sans-serif";

    let lineY = y + 10;

    ctx.fillText("🟢 Leaders", x, lineY); lineY += 18;
    ctx.fillText("🔵 Improving", x, lineY); lineY += 18;
    ctx.fillText("🟡 Weakening", x, lineY); lineY += 18;
    ctx.fillText("🔴 Laggards", x, lineY); lineY += 18;

    // ✅ divider line
    ctx.strokeStyle = "#555";
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + 150, lineY);
    ctx.stroke();

    lineY += 15;

    ctx.fillStyle = "#ccc";
    ctx.font = "11px sans-serif";
    ctx.fillText("⬤ White border = Portfolio / Watchlist", x, lineY);

    ctx.restore();
  }
}

    ]
  });
}

// ---------- PORTFOLIO RISK (ENHANCED + BACKWARD SAFE) ----------
const portfolioRows = rows.filter(r => pf.has(r.Ticker));

// ✅ preserve your original counts
let greenCount = 0;
let yellowCount = 0;
let redCount = 0;

// ✅ new scoring system
let totalRiskPoints = 0;
let riskHTML = "";
let contributors = [];

portfolioRows.forEach(function(r){

  let flags = [];
  let risk = 0;

  // ✅ ORIGINAL COLOR CLASSIFICATION (PRESERVED)
  if(r.New_Score >= 80) greenCount++;
  else if(r.New_Score >= 40) yellowCount++;
  else redCount++;

  // ✅ SCORING MODEL (NEW)
  if(r.New_Score < 40){
    risk += 40;
    flags.push("Weak Score");
  }
  else if(r.New_Score < 60){
    risk += 20;
  }

  if(r.MA_Slope < 0){
    risk += 30;
    flags.push("Downtrend");
  }

  if(r.Drawdown_pct > 30){
    risk += 30;
    flags.push("Drawdown Risk");
  }

  totalRiskPoints += risk;

  // ✅ preserve your alert logic
  if(flags.length){
    riskHTML += "<div class='card red'>" +
      "<b>" + r.Ticker + "</b><br>" +
      flags.join("<br>") +
    "</div>";
  }

  // ✅ NEW: contributor ranking
  if(risk >= 40){
    contributors.push({
      ticker: r.Ticker,
      risk: risk,
      reasons: flags
    });
  }

});

// ✅ FINAL SCORE (NEW)
let avgRisk = 0;

if(portfolioRows.length > 0){
  avgRisk = Math.round(totalRiskPoints / portfolioRows.length);
}

if(avgRisk > 100) avgRisk = 100;

// ✅ LEVEL (slightly refined)
let riskLevel = "LOW";

if(avgRisk >= 60) riskLevel = "HIGH";
else if(avgRisk >= 30) riskLevel = "MODERATE";

// ✅ UPDATED SUMMARY (MERGED OLD + NEW)
document.getElementById("riskSummary").innerHTML =
  "<b>Risk Score: " + avgRisk + " / 100</b><br><br>" +
  "Level: " + riskLevel + "<br><br>" +
  "Exposure → " +
  "🟢 " + greenCount +
  " | 🟡 " + yellowCount +
  " | 🔴 " + redCount;

// ✅ TOP CONTRIBUTORS (NEW INSIGHT)
contributors = contributors
  .sort(function(a,b){ return b.risk - a.risk; })
  .slice(0,5);

// ✅ MERGE alerts + contributors
document.getElementById("riskList").innerHTML =
  contributors.length
    ? contributors.map(function(c){
        return "<div class='card red'>" +
          "<b>" + c.ticker + "</b><br>" +
          c.reasons.join("<br>") +
        "</div>";
      }).join("")
    : "<span class='small'>No major risks detected</span>";

// ---------- TABS ----------
function show(id,el){
 document.getElementById("analytics").classList.add("hidden");
 document.getElementById("signals").classList.add("hidden");
 document.getElementById("trends").classList.add("hidden");
 document.getElementById("risk").classList.add("hidden");

 document.getElementById(id).classList.remove("hidden");

 document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
 el.classList.add("active");
}

</script>

</body>
</html>`;
}

// ---------- MAIN ----------
(async()=>{
 const data = await readData();
 const html = buildHtml(data);

 fs.writeFileSync(OUTPUT_PATH,html);

 if(SERVE){
  http.createServer((req,res)=>{
    res.writeHead(200,{"Content-Type":"text/html"});
    res.end(html);
  }).listen(3000,"0.0.0.0");

  process.stdin.resume();
 }
})();