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
