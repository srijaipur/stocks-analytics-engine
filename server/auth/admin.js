import admin from "firebase-admin";

/**
 * Initializes Firebase Admin SDK once (server-side only)
 * Uses service account JSON via env-safe loading
 */

let initialized = false;

export function getAdmin() {
  if (!initialized) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
  }

  return admin;
}