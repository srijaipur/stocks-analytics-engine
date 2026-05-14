import { getPrices } from "./data/prices.js";
import { getFundamentals } from "./data/fundamentals.js";

const ticker = "BIO";
console.log(`Testing ticker: ${ticker}`);

try {
  console.log("Fetching prices...");
  const prices = await getPrices(ticker);
  console.log(`✓ Prices fetched for ${ticker}`);
} catch (err) {
  console.error(`✗ Error fetching prices for ${ticker}:`, err.message);
}

try {
  console.log("Fetching fundamentals...");
  const fundamentals = await getFundamentals(ticker);
  console.log(`✓ Fundamentals fetched for ${ticker}`);
} catch (err) {
  console.error(`✗ Error fetching fundamentals for ${ticker}:`, err.message);
}

console.log("Test complete");
