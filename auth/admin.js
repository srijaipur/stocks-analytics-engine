import admin from "firebase-admin";
import { getEnv } from "../config/env.js";

const serviceAccountRaw = getEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
const serviceAccount = JSON.parse(serviceAccountRaw);

// ✅ CRITICAL FIX: proper singleton guard
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// expose direct stable references
export const db = () => admin.firestore();
export const auth = () => admin.auth();