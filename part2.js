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
  }

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

  function card(
  title,
  items,
  color
) {

  return `
<div class="card">

  <h3 style="color:${color}">
    ${title}
  </h3>

  <div style="margin-top:10px">

    ${items.map(i => `
      <div style="margin:6px 0">
        <b>${i.Ticker}</b>
        <span style="color:#aaa">
          (${i.New_Composite_Score})
        </span>
      </div>
    `).join("")}

  </div>

</div>
  `;
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
        (r.RSI || 0) +
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
