import axios from "axios";

const NASDAQ_API = "https://api.nasdaq.com/api/company";

const client = axios.create({
  baseURL: NASDAQ_API,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json",
  },
});

// Returns net institutional activity for a ticker based on the most recent 13F filings.
// net > 0 → more institutions opened new positions than closed (net buy pressure)
// net < 0 → more institutions sold out than opened (net sell pressure)
// Returns { newPositions, soldOutPositions, netActivity }
export async function getInstitutionalActivity(ticker) {
  const url = `/${ticker}/institutional-holdings?limit=1&offset=0&type=TOTAL&sortColumn=marketValue&sortOrder=DESC`;
  const response = await client.get(url);
  const rows = response.data?.data?.newSoldOutPositions?.rows ?? [];

  const parse = (label) => {
    const row = rows.find((r) => r.positions === label);
    return row ? parseInt(row.holders.replace(/,/g, ""), 10) : 0;
  };

  const newPositions = parse("New Positions");
  const soldOutPositions = parse("Sold Out Positions");

  return {
    newPositions,
    soldOutPositions,
    netActivity: newPositions - soldOutPositions,
  };
}
