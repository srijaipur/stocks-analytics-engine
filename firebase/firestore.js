import { initializeApp } from "firebase/app";

import { getFirestore, doc, getDoc } from "firebase/firestore";

import { firebaseConfig } from "./firebaseConfig.js";

// =====================================================
// FIREBASE SINGLETON
// =====================================================

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// =====================================================
// HELPERS
// =====================================================

function sanitizeTickerArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`config/tickers.${fieldName} must be an array`);
  }

  return value
    .filter(Boolean)
    .map((v) => String(v).trim().toUpperCase())
    .filter((v) => v.length > 0);
}

// =====================================================
// CANONICAL CONFIG API
// =====================================================

export async function getTickerConfig() {
  const ref = doc(db, "config", "tickers");

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Missing Firestore document: config/tickers");
  }

  const data = snap.data();

  if (!data || typeof data !== "object") {
    throw new Error("Invalid Firestore config/tickers payload");
  }

  return {
    portfolio: sanitizeTickerArray(data.portfolio || [], "portfolio"),

    watchlist: sanitizeTickerArray(data.watchlist || [], "watchlist"),

    sp100: sanitizeTickerArray(data.sp100 || [], "sp100"),

    updatedAt: data.updatedAt || null,
  };
}
