import { auth as adminAuth, db } from "./admin.js";
import { resolveUser } from "./rbacResolver.js";

/**
 * Resolve Firebase user → Firestore RBAC context
 */
export async function buildAuthContext(idToken) {
  if (!idToken) {
    throw new Error("Missing Firebase ID token");
  }

  // 1. Verify Firebase Auth token
  const decoded = await adminAuth().verifyIdToken(idToken);

  const uid = decoded.uid;

  // 2. Fetch Firestore user profile
  const snap = await db().collection("users").doc(uid).get();

  if (!snap.exists) {
    throw new Error("User not found in RBAC system");
  }

  const data = snap.data();

  // 3. Normalize RBAC context
  const context = {
    uid,
    email: data.email || decoded.email,
    role: data.role || "user",
    status: data.status || "pending",

    isAdmin: data.role === "admin",
    isActive: data.status === "active",
  };

  return context;
}