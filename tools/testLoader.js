import { loadTickerConfig } from "../lib/loadTickerConfig.js";

try {
  const config = await loadTickerConfig();

  console.log(JSON.stringify(config, null, 2));
} catch (err) {
  console.error("Ticker loader test failed");
  console.error(err);

  process.exit(1);
}
