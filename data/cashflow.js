import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical"] });

// Returns { operatingCashflow, netIncome } (TTM, most recent fiscal period) for a ticker,
// sourced from Yahoo Finance's quoteSummary endpoint. Used to derive Earnings Quality
// (operatingCashflow / netIncome) — a cash-backed-earnings check that catches
// accounting-driven EPS growth not supported by real cash generation.
// Returns { operatingCashflow: null, netIncome: null } when data is unavailable
// (e.g. financial sector tickers, recent IPOs, or de-listed/thin-coverage names).

export async function getCashflow(ticker) {
  try {
    const qs = await yahooFinance.quoteSummary(ticker, {
      modules: ["financialData", "incomeStatementHistory"],
    });

    const operatingCashflow = qs.financialData?.operatingCashflow ?? null;
    const netIncome = qs.incomeStatementHistory?.incomeStatementHistory?.[0]?.netIncome ?? null;

    return { operatingCashflow, netIncome };
  } catch {
    return { operatingCashflow: null, netIncome: null };
  }
}
