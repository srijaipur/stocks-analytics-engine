// ✅ ONLY SHOWING UPDATED CORE UI SECTION
// keep your readData() FUNCTION SAME from previous response

function buildHtml(headers, rows, signals) {

const data = JSON.stringify(rows);
const signalsData = JSON.stringify(signals);

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Analytics Dashboard</title>

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
  <div class="tab-btn active" onclick="showTab('portfolio')">Portfolio</div>
  <div class="tab-btn" onclick="showTab('signals')">Signals</div>
  <div class="tab-btn" onclick="showTab('trends')">Trends</div>
</div>

<!-- ✅ PORTFOLIO -->
<div id="portfolio" class="tab-content active">
  <input class="search" placeholder="Filter..." oninput="filterCards(this.value)" />
  <div id="cards"></div>
</div>

<!-- ✅ SIGNALS -->
<div id="signals" class="tab-content">
  <div id="signalsList"></div>
</div>

<!-- ✅ TRENDS -->
<div id="trends" class="tab-content">
  <canvas id="chart"></canvas>
</div>

<script>

const rows = ${data};
const signals = ${signalsData};

// ✅ TAB CONTROLLER
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tab).classList.add('active');
  event.target.classList.add('active');
}

// ✅ SORT BY NEW SCORE
rows.sort((a,b)=>b.New_Score - a.New_Score);

const container = document.getElementById("cards");

// ✅ RENDER CARDS
function renderCards(data){
  container.innerHTML = "";
  data.forEach(r=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML =
      "<b>"+r.Ticker+"</b><br/>"+
      "Score: "+r.New_Score.toFixed(1)+"<br/>"+
      "RS Rank: "+(r.RS_Rank ?? "-");
    container.appendChild(div);
  });
}
renderCards(rows);

// ✅ FILTER
function filterCards(q){
  const filtered = rows.filter(r => r.Ticker.toLowerCase().includes(q.toLowerCase()));
  renderCards(filtered);
}

// ✅ SIGNALS VIEW
const sDiv = document.getElementById("signalsList");

signals.forEach(s=>{
  const el = document.createElement("div");
  el.className="card";
  el.innerHTML = "<b>"+s.ticker+"</b><br/>Score: "+s.score+"<br/>"+s.triggers;
  sDiv.appendChild(el);
});

// ✅ SIMPLE TREND CHART
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
