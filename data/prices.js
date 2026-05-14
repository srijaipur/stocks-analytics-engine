import YahooFinance from "yahoo-finance2";
import dayjs from "dayjs";

const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical"] });

// Returns last 150 calendar days of daily bars: [{ date, close, volume }, ...]
// 150 days covers ~105 trading days, enough for SMA-100 + 5-day slope window.
// Sorted oldest-first so index 0 is the earliest day.
export async function getPrices(ticker) {
  const queryOptions = {
    period1: dayjs().subtract(150, "day").toDate(),
    period2: new Date(),
    interval: "1d",
  };
  const result = await yahooFinance.historical(ticker, queryOptions);
  return result
    .map((bar) => ({ date: bar.date, close: bar.close, volume: bar.volume }))
    .sort((a, b) => a.date - b.date);
}

