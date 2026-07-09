import { initializeApp, cert, getApps } from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";

import "dotenv/config";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
      })
    : getApps()[0];

export const adminAuth = getAuth();
