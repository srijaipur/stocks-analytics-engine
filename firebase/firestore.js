import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "./firebaseConfig.js";

const db = getFirestore(app);

export async function getTickerConfig() {
  const ref = doc(db, "config", "tickers");

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error("Ticker config document not found");
  }

  return snapshot.data();
}