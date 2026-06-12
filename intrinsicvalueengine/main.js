import { fetchFinancials } from "./services/dataService.js";
import { calculateIntrinsicValue } from "./core/valuationEngine.js";
import { logger, renderLogs } from "./services/logger.js";

window.runAnalysis = async function () {
  const ticker = document.getElementById("ticker").value.toUpperCase();

  logger.clear();
  logger.info(`Analyzing ${ticker}`);

  try {
    const data = await fetchFinancials(ticker);

    const result = calculateIntrinsicValue(data);

    renderSummary(result);
    renderTiles(result);
    renderSentinel(result);
    renderWarnings(result.flags);

  } catch (err) {
    logger.error(err.message);
  }

  renderLogs();
};

function renderSummary(r) {
  document.getElementById("summary").innerHTML = `
    <h2>Summary</h2>
    <p><b>Intrinsic Value:</b> $${r.intrinsic.low.toFixed(0)} - $${r.intrinsic.high.toFixed(0)}</p>
    <p><b>Price:</b> $${r.price}</p>
    <p><b>MOS:</b> ${(r.mos * 100).toFixed(1)}%</p>
    <p><b>Recommendation:</b> ${r.recommendation}</p>
    <p><b>Confidence:</b> ${r.confidence}/100</p>
  `;
}

function renderTiles(r) {
  document.getElementById("dcf").innerHTML =
    `<h3>DCF</h3>$${r.models.dcf.value.toFixed(0)}`;

  document.getElementById("epv").innerHTML =
    `<h3>EPV</h3>$${r.models.epv.value.toFixed(0)}`;

  document.getElementById("relative").innerHTML =
    `<h3>Relative</h3>$${r.models.relative.value.toFixed(0)}`;
}

function renderSentinel(r) {
  document.getElementById("sentinel").innerHTML =
    `<h3>Sentinel</h3>Earnings Quality: ${r.sentinel.earningsQuality}/10`;
}

function renderWarnings(flags) {
  document.getElementById("warnings").innerHTML =
    flags.map(f => `<p>⚠️ ${f}</p>`).join("");
}