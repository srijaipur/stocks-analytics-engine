// firebase/admin.js
import admin from "firebase-admin";

/**
 * Initialize Firebase Admin SDK once (singleton-safe)
 * Uses environment variables (NOT raw JSON files committed to repo)
 */

let adminApp = null;

function initFirebaseAdmin() {
  if (adminApp) return adminApp;

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return adminApp;
}

/**
 * Verify Firebase ID Token (server-side only)
 */
export async function verifyIdToken(idToken) {
  const app = initFirebaseAdmin();
  return admin.auth(app).verifyIdToken(idToken);
}

/**
 * Get user record (useful for RBAC expansion)
 */
export async function getUser(uid) {
  const app = initFirebaseAdmin();
  return admin.auth(app).getUser(uid);
}

/**
 * Future RBAC hook (DO NOT IMPLEMENT LOGIC YET)
 * Reserved for roles like: admin / analyst / viewer
 */
export async function getUserClaims(uid) {
  const user = await getUser(uid);
  return user.customClaims || {};
}