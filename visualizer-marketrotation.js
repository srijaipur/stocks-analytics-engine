/**
 * Market Rotation Visualizer
 *
 * Fetches sector and index performance data, computes rotation metrics,
 * generates investment-grade rotation signals.
 *
 * Patterns from visualizer-analytics.js:
 * - Simple async data fetch → buildHtml() → self-contained output
 * - Embedded data via window variable
 * - Chart.js initialization in HTML script
 * - Tab-based UI system
 *
 * Usage:
 *   node visualizer-marketrotation.js           → writes data/marketrotation.html
 *   node visualizer-marketrotation.js --serve   → writes + opens in browser
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { exec } from "child_process";
import YahooFinance from "yahoo-finance2";
import dayjs from "dayjs";
import { getReturn } from "./factors/technicals.js";
import { percentileRank } from "./factors/normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "data/marketrotation.html");
const SERVE = process.argv.includes("--serve");

const yahooFinance = new YahooFinance({
  suppressNotices: ["ripHistorical"],
});

// ======================================================
// CONFIGURATION
// ======================================================

const INSTRUMENTS = {
  indices: {
    OEX: { label: "S&P 100", ticker: "^OEX" },
    RUT: { label: "Russell 2000", ticker: "^RUT" },
    DJI: { label: "Dow Jones Industrial", ticker: "^DJI" },
    NDX: { label: "Nasdaq 100", ticker: "^NDX" },
  },
  sectors: {
    XLK: { label: "Technology", ticker: "XLK", sector: "Technology" },
    XLV: { label: "Healthcare", ticker: "XLV", sector: "Healthcare" },
    XLF: { label: "Financials", ticker: "XLF", sector: "Financials" },
    XLP: { label: "Consumer Staples", ticker: "XLP", sector: "Consumer Staples" },
    XLY: { label: "Consumer Discretionary", ticker: "XLY", sector: "Consumer Discretionary" },
    XLRE: { label: "Real Estate", ticker: "XLRE", sector: "Real Estate" },
    XLB: { label: "Materials", ticker: "XLB", sector: "Materials" },
    XLC: { label: "Communication Services", ticker: "XLC", sector: "Communication Services" },
    XLE: { label: "Energy", ticker: "XLE", sector: "Energy" },
    XLU: { label: "Utilities", ticker: "XLU", sector: "Utilities" },
    XLI: { label: "Industrials", ticker: "XLI", sector: "Industrials" },
  },
};

const TIMEFRAMES = [
  { key: "m5d", label: "5D", days: 5 },
  { key: "m21d", label: "21D", days: 21 },
  { key: "m63d", label: "63D", days: 63 },
];

// YTD is computed dynamically based on available data (will be set in computeMetrics)
let YTD_DAYS = null;

// ======================================================
// UTILITY: Retry with exponential backoff
// ======================================================

async function withRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[Retry ${attempt}/${maxRetries}] Waiting ${delayMs}ms before retry...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ======================================================
// FETCH DATA
// ======================================================

async function fetchMarketRotationData() {
  const instruments = [];

  const allInstruments = [
    ...Object.entries(INSTRUMENTS.indices).map(([key, val]) => ({
      key,
      ...val,
      type: "index",
    })),
    ...Object.entries(INSTRUMENTS.sectors).map(([key, val]) => ({
      key,
      ...val,
      type: "sector",
    })),
  ];

  console.log(`[Market Rotation] Fetching ${allInstruments.length} instruments...`);

  for (const inst of allInstruments) {
    try {
      const prices = await withRetry(async () => {
        const queryOptions = {
          period1: dayjs().startOf("year").toDate(),
          period2: new Date(),
          interval: "1d",
        };
        const result = await yahooFinance.historical(inst.ticker, queryOptions);
        return result
          .map((bar) => ({ date: bar.date, close: bar.close, volume: bar.volume }))
          .sort((a, b) => a.date - b.date);
      });

      if (!prices || prices.length < 64) {
        console.warn(
          `[WARN] ${inst.label} (${inst.ticker}): insufficient data (${prices?.length || 0} days)`
        );
        continue;
      }

      instruments.push({
        key: inst.key,
        ticker: inst.ticker,
        label: inst.label,
        type: inst.type,
        prices,
        sector: inst.sector || null,
      });

      console.log(`[OK] ${inst.label} (${inst.ticker}): ${prices.length} days`);
    } catch (err) {
      console.error(`[ERROR] ${inst.label} (${inst.ticker}): ${err.message}`);
    }
  }

  if (instruments.length === 0) {
    throw new Error("No instruments fetched successfully");
  }

  return instruments;
}

// ======================================================
// COMPUTE METRICS
// ======================================================

function computeMetrics(instruments) {
  // Set YTD dynamically on first call based on available data
  if (YTD_DAYS === null && instruments.length > 0 && instruments[0].prices?.length) {
    YTD_DAYS = instruments[0].prices.length - 1;
    console.log(`[Info] YTD period set to ${YTD_DAYS} trading days (from available data)`);
  }

  const withMetrics = instruments.map((inst) => {
    const momentum = {};
    const percentiles = {};

    // Compute momentum for fixed timeframes (5D, 21D, 63D)
    const fixedTimeframes = [
      { key: "m5d", label: "5D", days: 5 },
      { key: "m21d", label: "21D", days: 21 },
      { key: "m63d", label: "63D", days: 63 },
    ];
    
    for (const tf of fixedTimeframes) {
      const ret = getReturn(inst.prices, tf.days);
      momentum[tf.key] = ret !== null ? parseFloat(ret.toFixed(2)) : 0;
    }

    // Compute YTD momentum based on available data
    if (YTD_DAYS !== null && YTD_DAYS > 0) {
      const ret = getReturn(inst.prices, YTD_DAYS);
      momentum.ytd = ret !== null ? parseFloat(ret.toFixed(2)) : 0;
    }

    return {
      ...inst,
      momentum,
      percentiles, // Will fill after computing universe-wide percentiles
    };
  });

  // Compute percentile ranks (cross-universe)
  const allTimeframes = [
    { key: "m5d" },
    { key: "m21d" },
    { key: "m63d" },
    { key: "ytd" },
  ];

  for (const tf of allTimeframes) {
    const values = withMetrics.map((i) => i.momentum[tf.key]);
    withMetrics.forEach((inst) => {
      inst.percentiles[tf.key] = percentileRank(
        inst.momentum[tf.key],
        values
      );
    });
  }

  return withMetrics;
}

// ======================================================
// RELATIVE STRENGTH
// ======================================================

function computeRelativeStrength(instruments) {
  const oexInst = instruments.find((i) => i.ticker === "^OEX");
  if (!oexInst) {
    console.warn("[WARN] S&P 100 (OEX) not found; skipping relative strength calculation");
    return instruments;
  }

  const allTimeframes = ["m5d", "m21d", "m63d", "ytd"];

  return instruments.map((inst) => {
    const relativeStrength = {};
    for (const key of allTimeframes) {
      relativeStrength[key] =
        parseFloat((inst.momentum[key] - oexInst.momentum[key]).toFixed(2));
    }
    return {
      ...inst,
      relativeStrength,
    };
  });
}

// ======================================================
// GENERATE SIGNALS
// ======================================================

function generateRotationSignals(instruments) {
  const sectors = instruments.filter((i) => i.type === "sector");
  const indices = instruments.filter((i) => i.type === "index");

  // Rotation score: normalized spread of 5-day momentum
  const momentums5d = sectors.map((s) => s.momentum.m5d);
  const maxMomentum = Math.max(...momentums5d);
  const minMomentum = Math.min(...momentums5d);
  const meanMomentum = momentums5d.reduce((a, b) => a + b, 0) / momentums5d.length;

  let rotationScore = 0;
  if (Math.abs(meanMomentum) > 0.01) {
    rotationScore = Math.min(
      100,
      Math.abs((maxMomentum - minMomentum) / Math.abs(meanMomentum)) * 10
    );
  }

  // Determine rotation signal
  let rotationSignal = "STABLE";
  if (rotationScore > 75) {
    rotationSignal = "STRONG_ROTATION";
  } else if (rotationScore > 50) {
    rotationSignal = "MODERATE_ROTATION";
  } else if (rotationScore > 20) {
    rotationSignal = "MILD_ROTATION";
  }

  // Leaders and laggards
  const sortedBySector5d = [...sectors].sort(
    (a, b) => b.momentum.m5d - a.momentum.m5d
  );
  const leaders = sortedBySector5d.slice(0, 3);
  const laggards = sortedBySector5d.slice(-3).reverse();

  // Breadth indicators
  const breadthUp = sectors.filter((s) => s.momentum.m5d > 0).length;
  const breadthDown = sectors.filter((s) => s.momentum.m5d <= 0).length;

  // Best/worst index
  const indexesSorted = [...indices].sort(
    (a, b) => b.momentum.m5d - a.momentum.m5d
  );
  const bestIndex = indexesSorted[0];
  const worstIndex = indexesSorted[indexesSorted.length - 1];

  return {
    timestamp: new Date().toISOString(),
    rotationScore: parseFloat(rotationScore.toFixed(1)),
    rotationSignal,
    leaders,
    laggards,
    breadthUp,
    breadthDown,
    breadthAdvancing: sectors.filter((s) => s.momentum.m5d > 0).length,
    bestIndex: bestIndex ? bestIndex.label : "N/A",
    bestIndexReturn: bestIndex ? bestIndex.momentum.m5d : 0,
    worstIndex: worstIndex ? worstIndex.label : "N/A",
    worstIndexReturn: worstIndex ? worstIndex.momentum.m5d : 0,
  };
}

// ======================================================
// BUILD HTML (pattern from visualizer-analytics.js)
// ======================================================

function buildHtml(instruments, signal) {
  const sectors = instruments.filter((i) => i.type === "sector");
  const indices = instruments.filter((i) => i.type === "index");

  // Prepare chart data
  const sectorLabels = sectors.map((s) => s.label);
  const sector5d = sectors.map((s) => s.momentum.m5d);
  const sector21d = sectors.map((s) => s.momentum.m21d);
  const sector63d = sectors.map((s) => s.momentum.m63d);
  const sectorYtd = sectors.map((s) => s.momentum.ytd);

  const indexLabels = indices.map((i) => i.label);
  const index5d = indices.map((i) => i.momentum.m5d);
  const index21d = indices.map((i) => i.momentum.m21d);
  const index63d = indices.map((i) => i.momentum.m63d);
  const indexYtd = indices.map((i) => i.momentum.ytd);

  // Embed data as global variable (following visualizer-analytics pattern)
  const rotationData = {
    instruments,
    signal,
    charts: {
      sectorLabels,
      sector5d,
      sector21d,
      sector63d,
      sectorYtd,
      indexLabels,
      index5d,
      index21d,
      index63d,
      indexYtd,
    },
  };

  const safe = JSON.stringify(rotationData).replace(/</g, "\\u003c");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Market Rotation Analysis</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
<script>
window.__ROTATION__ = ${safe};
<\/script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0f1117;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
}

header {
  background: rgba(22, 27, 34, 0.8);
  border-bottom: 1px solid #30363d;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

header h1 {
  font-size: 2rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 0.95rem;
  color: #8b949e;
}

.tabs {
  display: flex;
  gap: 12px;
  padding: 12px 2rem;
  border-bottom: 1px solid #30363d;
}

.tab-btn {
  background: #1d2330;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.tab-btn:hover {
  background: #272b3e;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.page {
  display: none;
}

.page.active {
  display: block;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background: #1a1d27;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #30363d;
}

.card h2 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #e0e0e0;
  border-bottom: 1px solid #30363d;
  padding-bottom: 0.75rem;
}

.card h3 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: #e0e0e0;
}

.signal-banner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.signal-card {
  background: rgba(30, 33, 48, 0.6);
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 1rem;
}

.signal-card.highlight {
  background: rgba(46, 204, 113, 0.15);
  border-color: rgba(46, 204, 113, 0.5);
}

.signal-card h3 {
  font-size: 0.85rem;
  color: #8b949e;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.signal-card .value {
  font-size: 1.8rem;
  color: #00ff88;
  font-weight: 700;
}

.signal-card.moderate .value {
  color: #ffaa00;
}

.signal-card.strong .value {
  color: #ff4444;
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  gap: 2px;
  background: #0f1117;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.heatmap-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 4px;
  gap: 2px;
}

.heatmap-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  line-height: 1.1;
  text-align: center;
  word-break: break-word;
}

.heatmap-value {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.heatmap-cell:hover {
  transform: scale(1.1);
}

canvas {
  max-height: 320px;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85rem;
  margin-top: 1rem;
}

thead th {
  background: rgba(48, 54, 61, 0.8);
  color: #8b949e;
  padding: 0.75rem;
  text-align: right;
  font-weight: 600;
  border-bottom: 2px solid #30363d;
  position: sticky;
  top: 0;
  white-space: nowrap;
}

thead th:first-child {
  text-align: left;
}

tbody td {
  padding: 0.75rem;
  border-bottom: 1px solid #21262d;
  text-align: right;
}

tbody td:first-child {
  text-align: left;
  font-weight: 600;
  color: #e0e0e0;
}

tbody tr:hover {
  background: rgba(30, 33, 48, 0.8);
}

.positive { color: #2ecc71; }
.negative { color: #ff6b6b; }

.sector-list {
  background: rgba(48, 54, 61, 0.3);
  border-left: 3px solid #2ecc71;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.sector-list.laggards {
  border-left-color: #ff6b6b;
}

.sector-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(48, 54, 61, 0.5);
}

.sector-item:last-child {
  border-bottom: none;
}

footer {
  text-align: center;
  padding: 2rem;
  color: #6e7681;
  font-size: 0.85rem;
  border-top: 1px solid #30363d;
  margin-top: 2rem;
}
</style>
</head>
<body>

<header>
  <h1>📊 Market Rotation Analysis</h1>
  <div class="subtitle">
    Investment signals for sector and index rotation • ${new Date().toLocaleString()}
  </div>
</header>

<div class="tabs">
  <button class="tab-btn" data-tab="overview">Overview</button>
  <button class="tab-btn" data-tab="sectors">Sectors</button>
  <button class="tab-btn" data-tab="indices">Indices</button>
</div>

<div class="container">

  <div id="overview" class="page active">
    <div class="signal-banner" id="signalBanner"></div>
    <div class="card" style="grid-column: 1/-1;">
      <h2>Sector Performance Heatmap (5-Day Momentum)</h2>
      <div class="heatmap" id="heatmap"></div>
    </div>
    <div class="card">
      <h2>Sector Momentum</h2>
      <canvas id="sectorChart"><\/canvas>
    </div>
    <div class="card">
      <h2>Index Performance</h2>
      <canvas id="indexChart"><\/canvas>
    </div>
  </div>

  <div id="sectors" class="page">
    <div class="card" style="grid-column: 1/-1;">
      <h2>Sector Leaders & Laggards (5-Day)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="sector-list" id="leaders"></div>
        <div class="sector-list laggards" id="laggards"></div>
      </div>
    </div>
    <div class="card" style="grid-column: 1/-1;">
      <h2>Detailed Sector Metrics</h2>
      <div style="overflow-x: auto;">
        <table id="sectorTable">
          <thead>
            <tr>
              <th>Sector</th>
              <th>5D %</th>
              <th>21D %</th>
              <th>63D %</th>
              <th>YTD %</th>
              <th>RS vs OEX</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody id="sectorTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="indices" class="page">
    <div class="card" style="grid-column: 1/-1;">
      <h2>Detailed Index Metrics</h2>
      <div style="overflow-x: auto;">
        <table id="indexTable">
          <thead>
            <tr>
              <th>Index</th>
              <th>5D %</th>
              <th>21D %</th>
              <th>63D %</th>
              <th>YTD %</th>
              <th>Percentile</th>
            </tr>
          </thead>
          <tbody id="indexTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

</div>

<footer>
  <p>Market Rotation Analysis • Powered by Yahoo Finance and Stocks Analytics Engine</p>
</footer>

<script type="module">

const data = window.__ROTATION__ || { instruments: [], signal: {}, charts: {} };
const { instruments, signal, charts } = data;
const sectors = instruments.filter(i => i.type === "sector");
const indices = instruments.filter(i => i.type === "index");

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.onclick = () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.remove("active");
    });
    document.getElementById(tab).classList.add("active");
    
    if (tab === "sectors") renderSectorPage();
    if (tab === "indices") renderIndexPage();
  };
});

function renderOverview() {
  const banner = document.getElementById("signalBanner");
  const signalClass = 
    signal.rotationSignal === "STRONG_ROTATION" ? "strong" :
    signal.rotationSignal === "MODERATE_ROTATION" ? "moderate" :
    "highlight";

  banner.innerHTML = '<div class="signal-card ' + signalClass + '">' +
    '<h3>Rotation Score</h3>' +
    '<div class="value">' + signal.rotationScore + '</div>' +
    '<small>' + signal.rotationSignal.replace(/_/g, " ") + '</small>' +
    '</div>' +
    '<div class="signal-card">' +
    '<h3>Sectors Up</h3>' +
    '<div class="value positive">' + signal.breadthUp + '</div>' +
    '<small>of ' + (signal.breadthUp + signal.breadthDown) + ' sectors</small>' +
    '</div>' +
    '<div class="signal-card">' +
    '<h3>Best Index</h3>' +
    '<div class="value positive">+' + signal.bestIndexReturn + '%</div>' +
    '<small>' + signal.bestIndex + '</small>' +
    '</div>' +
    '<div class="signal-card">' +
    '<h3>Worst Index</h3>' +
    '<div class="value negative">' + signal.worstIndexReturn + '%</div>' +
    '<small>' + signal.worstIndex + '</small>' +
    '</div>';

  const heatmap = document.getElementById("heatmap");
  heatmap.innerHTML = "";
  
  sectors.forEach((s) => {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    const value = s.momentum.m5d;
    const bgColor =
      value >= 5 ? "#2ecc71" :
      value >= 2.5 ? "#52b788" :
      value >= 0 ? "#74c69d" :
      value >= -2.5 ? "#ffb3b3" :
      value >= -5 ? "#ff6b6b" :
      "#c92a2a";
    cell.style.backgroundColor = bgColor;
    cell.innerHTML = '<div class="heatmap-label">' + s.label + '</div><div class="heatmap-value">' + value.toFixed(1) + '%</div>';
    cell.title = s.label + ": " + value.toFixed(2) + "%";
    heatmap.appendChild(cell);
  });

  renderCharts();
}

function renderCharts() {
  const sectorChartInstance = Chart.getChart("sectorChart");
  if (sectorChartInstance) sectorChartInstance.destroy();
  
  const indexChartInstance = Chart.getChart("indexChart");
  if (indexChartInstance) indexChartInstance.destroy();

  const sectorCtx = document.getElementById("sectorChart").getContext("2d");
  new Chart(sectorCtx, {
    type: "bar",
    data: {
      labels: charts.sectorLabels,
      datasets: [
        {
          label: "5D",
          data: charts.sector5d,
          backgroundColor: "rgba(46, 204, 113, 0.7)",
        },
        {
          label: "21D",
          data: charts.sector21d,
          backgroundColor: "rgba(52, 152, 219, 0.7)",
        },
        {
          label: "63D",
          data: charts.sector63d,
          backgroundColor: "rgba(241, 196, 15, 0.7)",
        },
        {
          label: "YTD",
          data: charts.sectorYtd,
          backgroundColor: "rgba(155, 89, 182, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: "y",
      plugins: {
        legend: { labels: { color: "#8b949e", font: { size: 11 } } },
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48, 54, 61, 0.3)" },
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48, 54, 61, 0.3)" },
        },
      },
    },
  });

  const indexCtx = document.getElementById("indexChart").getContext("2d");
  new Chart(indexCtx, {
    type: "bar",
    data: {
      labels: charts.indexLabels,
      datasets: [
        {
          label: "5D",
          data: charts.index5d,
          backgroundColor: "rgba(46, 204, 113, 0.7)",
        },
        {
          label: "21D",
          data: charts.index21d,
          backgroundColor: "rgba(52, 152, 219, 0.7)",
        },
        {
          label: "63D",
          data: charts.index63d,
          backgroundColor: "rgba(241, 196, 15, 0.7)",
        },
        {
          label: "YTD",
          data: charts.indexYtd,
          backgroundColor: "rgba(155, 89, 182, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: "y",
      plugins: {
        legend: { labels: { color: "#8b949e", font: { size: 11 } } },
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48, 54, 61, 0.3)" },
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48, 54, 61, 0.3)" },
        },
      },
    },
  });
}

function renderSectorPage() {
  const leadersEl = document.getElementById("leaders");
  let html = "<h3>🚀 Top Performers</h3>";
  signal.leaders.forEach(s => {
    html += '<div class="sector-item"><span>' + s.label + '</span><span class="positive">+' + s.momentum.m5d + '%</span></div>';
  });
  leadersEl.innerHTML = html;

  const lagardsEl = document.getElementById("laggards");
  html = "<h3>📉 Bottom Performers</h3>";
  signal.laggards.forEach(s => {
    html += '<div class="sector-item"><span>' + s.label + '</span><span class="negative">' + s.momentum.m5d + '%</span></div>';
  });
  lagardsEl.innerHTML = html;

  const body = document.getElementById("sectorTableBody");
  html = "";
  [...sectors]
    .sort((a, b) => b.momentum.m5d - a.momentum.m5d)
    .forEach((s, idx) => {
      const posClass = s.momentum.m5d >= 0 ? "positive" : "negative";
      html += '<tr>' +
        '<td>' + s.label + '</td>' +
        '<td class="' + posClass + '">' + (s.momentum.m5d > 0 ? "+" : "") + s.momentum.m5d + '%</td>' +
        '<td class="' + (s.momentum.m21d >= 0 ? "positive" : "negative") + '">' + (s.momentum.m21d > 0 ? "+" : "") + s.momentum.m21d + '%</td>' +
        '<td class="' + (s.momentum.m63d >= 0 ? "positive" : "negative") + '">' + (s.momentum.m63d > 0 ? "+" : "") + s.momentum.m63d + '%</td>' +
        '<td class="' + (s.momentum.ytd >= 0 ? "positive" : "negative") + '">' + (s.momentum.ytd > 0 ? "+" : "") + s.momentum.ytd + '%</td>' +
        '<td class="' + (s.relativeStrength.m5d >= 0 ? "positive" : "negative") + '">' + (s.relativeStrength.m5d > 0 ? "+" : "") + s.relativeStrength.m5d + '%</td>' +
        '<td>#' + (idx + 1) + '</td>' +
        '</tr>';
    });
  body.innerHTML = html;
}

function renderIndexPage() {
  const body = document.getElementById("indexTableBody");
  let html = "";
  [...indices]
    .sort((a, b) => b.momentum.m5d - a.momentum.m5d)
    .forEach((i) => {
      const posClass = i.momentum.m5d >= 0 ? "positive" : "negative";
      html += '<tr>' +
        '<td>' + i.label + '</td>' +
        '<td class="' + posClass + '">' + (i.momentum.m5d > 0 ? "+" : "") + i.momentum.m5d + '%</td>' +
        '<td class="' + (i.momentum.m21d >= 0 ? "positive" : "negative") + '">' + (i.momentum.m21d > 0 ? "+" : "") + i.momentum.m21d + '%</td>' +
        '<td class="' + (i.momentum.m63d >= 0 ? "positive" : "negative") + '">' + (i.momentum.m63d > 0 ? "+" : "") + i.momentum.m63d + '%</td>' +
        '<td class="' + (i.momentum.ytd >= 0 ? "positive" : "negative") + '">' + (i.momentum.ytd > 0 ? "+" : "") + i.momentum.ytd + '%</td>' +
        '<td>' + i.percentiles.m5d + 'th</td>' +
        '</tr>';
    });
  body.innerHTML = html;
}

renderOverview();

<\/script>

</body>
</html>`;

  return html;
}

// ======================================================
// MAIN (orchestration)
// ======================================================

async function main() {
  try {
    console.log(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.log("  MARKET ROTATION VISUALIZER");
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );

    console.log("[Phase 1/4] Fetching instrument data...");
    const instruments = await fetchMarketRotationData();
    console.log(`[Phase 1] ✓ Fetched ${instruments.length} instruments\n`);

    console.log("[Phase 2/4] Computing metrics...");
    let withMetrics = computeMetrics(instruments);
    console.log(`[Phase 2] ✓ Computed metrics\n`);

    console.log("[Phase 3/4] Computing relative strength...");
    withMetrics = computeRelativeStrength(withMetrics);
    console.log("[Phase 3] ✓ Relative strength computed\n");

    console.log("[Phase 4/4] Generating signals...");
    const signal = generateRotationSignals(withMetrics);
    console.log(`[Phase 4] ✓ Rotation Score: ${signal.rotationScore}\n`);

    console.log("[Build] Generating HTML report...");
    const html = buildHtml(withMetrics, signal);
    fs.writeFileSync(OUTPUT_PATH, html);
    console.log(`[Build] ✓ Report written to: ${OUTPUT_PATH}\n`);

    console.log(
      "═══════════════════════════════════════════════════════════"
    );
    console.log("  ✓ Analysis Complete");
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );

    if (SERVE) {
      const server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      });

      const PORT = 8888;
      server.listen(PORT, () => {
        console.log(
          `[Serve] Opening browser: http://localhost:${PORT}\n`
        );
        exec(`start http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();