import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { getTickerConfig } from "../firebase/firestore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_PATH = path.resolve(__dirname, "../data/tickers.json");

export async function loadTickerConfig() {
  // ---------- TRY FIRESTORE ----------
  try {
    const remote = await getTickerConfig();

    console.log("Using Firestore ticker config");

    return {
      portfolio: remote.portfolio || [],
      watchlist: remote.watchlist || [],
      sp100: remote.sp100 || [],
      source: "firestore",
    };
  } catch (err) {
    console.warn("Firestore unavailable. Falling back to local tickers.json");
  }

  // ---------- FALLBACK ----------
  const local = JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8"));

  return {
    portfolio: local.portfolio || [],
    watchlist: local.watchlist || [],
    sp100: local.sp100 || [],
    source: "local",
  };
}
