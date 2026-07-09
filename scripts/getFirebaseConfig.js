#!/usr/bin/env node

/**
 * Script to fetch and display tickers from Firebase config collection
 * Uses Firebase Admin SDK to query the config/tickers document
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

async function getTickersFromFirebase() {
  try {
    // Initialize Firebase Admin if not already initialized
    const apps = getApps();
    if (apps.length === 0) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      );

      initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
      });
    }

    const db = getFirestore();

    // Fetch the config/tickers document
    const docRef = db.collection("config").doc("tickers");
    const doc = await docRef.get();

    if (!doc.exists) {
      console.error("❌ Document config/tickers not found in Firebase");
      process.exit(1);
    }

    const data = doc.data();
    console.log("📊 FIREBASE CONFIG TICKERS");
    console.log("=".repeat(60));

    let totalCount = 0;
    const breakdown = {};

    // Display each category
    for (const [category, tickers] of Object.entries(data)) {
      if (Array.isArray(tickers)) {
        const count = tickers.length;
        breakdown[category] = count;
        totalCount += count;

        console.log(`\n${category.toUpperCase()} (${count} tickers):`);
        console.log("-".repeat(60));

        // Display tickers in rows of 10
        for (let i = 0; i < tickers.length; i += 10) {
          const row = tickers.slice(i, i + 10);
          console.log(row.join(", "));
        }
      } else if (category !== "updatedAt") {
        console.log(`\n${category}: (not an array)`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    console.log("=".repeat(60));

    for (const [category, count] of Object.entries(breakdown)) {
      console.log(`${category.padEnd(15)}: ${count} tickers`);
    }

    console.log("-".repeat(60));
    console.log(`${"TOTAL".padEnd(15)}: ${totalCount} tickers`);
    console.log("=".repeat(60));

    // Output JSON
    if (data.updatedAt) {
      const timestamp =
        data.updatedAt.toDate?.() || new Date(data.updatedAt);
      console.log(`\nLast updated: ${timestamp.toISOString()}`);
    }

    console.log("\nFull JSON data:");
    const jsonOutput = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "updatedAt") {
        const timestamp = value?.toDate?.() || new Date(value);
        jsonOutput[key] = timestamp.toISOString();
      } else {
        jsonOutput[key] = value;
      }
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
  } catch (error) {
    console.error("❌ Error fetching from Firebase:", error.message);
    console.error(error);
    process.exit(1);
  }
}

getTickersFromFirebase();
