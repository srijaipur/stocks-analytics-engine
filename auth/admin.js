import admin from "firebase-admin";
import { getEnv } from "../config/env.js";

let app;

export function getAdminApp() {
  if (app) return app;

  const serviceAccountRaw = getEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const serviceAccount = JSON.parse(serviceAccountRaw);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}

export function db() {
  return getAdminApp().firestore();
}

export function auth() {
  return getAdminApp().auth();
}