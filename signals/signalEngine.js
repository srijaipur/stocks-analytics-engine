export function detectSignals(rows) {
  const signals = [];

  rows.forEach((row) => {
    const ticker = row[0];

    const return63 = row[13];
    const rsRank = row[14];
    const drawdown = row[15];
    const score = row[17];
    const earningsDate = row[18];

    // You can extend row later with volume flag if needed
    const triggers = [];

    // ✅ 1. Momentum breakout
    if (return63 > 20 && rsRank > 70) {
      triggers.push("Momentum Breakout");
    }

    // ✅ 2. Multi-day breakout (proxy using strong momentum + trend)
    if (return63 > 15 && score > 70) {
      triggers.push("Multi-Day Breakout");
    }

    // ✅ 3. Relative strength
    if (rsRank > 85) {
      triggers.push("Market Leader");
    }

    // ✅ 4. Low risk trend
    if (drawdown < 15 && score > 60) {
      triggers.push("Stable Uptrend");
    }

    // ✅ 5. Earnings proximity (next 7 days)
    if (earningsDate) {
      const now = new Date();
      const eDate = new Date(earningsDate);
      const diff = (eDate - now) / (1000 * 60 * 60 * 24);

      if (diff >= 0 && diff <= 7) {
        triggers.push("Earnings Upcoming");
      }
    }

    // ✅ 6. Volume spike (placeholder – uses volExpansion flag if added later)
    const volExpansion = row[10];
    if (volExpansion === true) {
      triggers.push("Volume Spike");
    }

    // ✅ 7. Institutional surge
    const inst = row[11];
    if (inst !== null && inst > 0) {
      triggers.push("Institutional Buying");
    }

    if (triggers.length > 0) {
      signals.push({
        ticker,
        score,
        triggers: triggers.join(", "),
      });
    }
  });

  return signals.sort((a, b) => b.score - a.score).slice(0, 50);
}
