import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.resolve(__dirname, "data/stocks.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "data/report.html");
const SERVE = process.argv.includes("--serve");

// ✅ READ DATA
async function readData() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const sheet = workbook.getWorksheet("ScoresCurrent");
  const rows = [];

  const headers = [];

  sheet.eachRow((row, i) => {
    const values = row.values.slice(1);

    if (i === 1) {
      headers.push(...values);
    } else {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      if (obj.Ticker) rows.push(obj);
    }
  });

  // ✅ Read signals
  const signalsSheet = workbook.getWorksheet("SignalsTriggered");
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

  return { rows, signals };
}

// ✅ BUILD UI
function buildHtml(rows, signals) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Analytics Dashboard</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body { font-family:sans-serif; background:#0f1117; color:#ddd; }

.tabs {
  display:flex;
  gap:10px;
  padding:10px;
}

.tab-btn {
  padding:8px 14px;
  background:#1a1d27;
  border:1px solid #333;
  cursor:pointer;
}
.tab-btn.active { background:#333; }

.tab-content { display:none; padding:20px; }
.tab-content.active { display:block; }

.card {
  background:#1a1d27;
  border-radius:8px;
  padding:10px;
  margin:5px;
  display:inline-block;
  width:140px;
}

.search { margin:10px; }
</style>
</head>

<body>

<h1>Stock Analytics Dashboard</h1>

<div class="tabs">
  <div class="tab-btn active" onclick="showTab(event,'portfolio')">Portfolio</div>
  <div class="tab-btn" onclick="showTab(event,'signals')">Signals</div>
  <div class="tab-btn" onclick="showTab(event,'trends')">Trends</div>
</div>

<!-- PORTFOLIO -->
<div id="portfolio" class="tab-content active">
  <input class="search" placeholder="Filter..." oninput="filterCards(this.value)" />
  <div id="cards"></div>
</div>

<!-- SIGNALS -->
<div id="signals" class="tab-content">
  <div id="signalsList"></div>
</div>

<!-- TRENDS -->
<div id="trends" class="tab-content">
  <canvas id="chart"></canvas>
</div>

<script>

const rows = ${JSON.stringify(rows)};
const signals = ${JSON.stringify(signals)};

// TAB HANDLER
function showTab(evt, tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tab).classList.add('active');
  evt.target.classList.add('active');
}

// SORT BY NEW SCORE
rows.sort((a,b)=>b.New_Score-a.New_Score);

const container = document.getElementById("cards");

function renderCards(data){
  container.innerHTML = "";
  data.forEach(r=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML =
      "<b>"+r.Ticker+"</b><br/>"+
      "Score: "+(r.New_Score?.toFixed(1)||"-")+"<br/>"+
      "RS Rank: "+(r.RS_Rank ?? "-");
    container.appendChild(div);
  });
}

renderCards(rows);

// FILTER
function filterCards(q){
  const filtered = rows.filter(r => r.Ticker.toLowerCase().includes(q.toLowerCase()));
  renderCards(filtered);
}

// SIGNALS
const sDiv = document.getElementById("signalsList");

signals.forEach(s=>{
  const el = document.createElement("div");
  el.className="card";
  el.innerHTML =
    "<b>"+s.ticker+"</b><br/>"+
    "Score: "+s.score+"<br/>"+
    s.triggers;
  sDiv.appendChild(el);
});

// CHART
new Chart(document.getElementById("chart"),{
  type:"scatter",
  data:{
    datasets:[{
      data: rows.map(r=>({x:r.MA_Slope,y:r.New_Score})),
      pointBackgroundColor:"cyan"
    }]
  }
});

</script>

</body>
</html>
`;
}

// ✅ MAIN
(async () => {
  const { rows, signals } = await readData();

  const html = buildHtml(rows, signals);
  fs.writeFileSync(OUTPUT_PATH, html);

  console.log("✅ Report generated");

  if (SERVE) {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });

    server.listen(3000, "0.0.0.0", () => {
      console.log("✅ Server running on port 3000");
