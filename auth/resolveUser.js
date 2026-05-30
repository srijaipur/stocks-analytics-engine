import { db } from "./admin.js";

/**
 * Single source of truth for RBAC identity resolution
 * Supports transition toward UID system safely
 */
export async function resolveUser({ uid, email }) {
  if (!uid && !email) {
    throw new Error("No identity provided");
  }

  /**
   * PHASE 1 RULE:
   * Prefer email lookup (because current DB is email-centric)
   * UID reserved for future migration
   */

  let snap = null;

  // 1. Try email-based lookup (CURRENT REALITY)
  if (email) {
    const emailQuery = await db()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      snap = emailQuery.docs[0];
    }
  }

  // 2. fallback: UID (future-proofing)
  if (!snap && uid) {
    const uidQuery = await db()
      .collection("users")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (!uidQuery.empty) {
      snap = uidQuery.docs[0];
    }
  }

  if (!snap) {
    return null;
  }

  const data = snap.data();

  return {
    docId: snap.id,
    uid: uid || null,
    email: data.email,
    role: data.role || "user",
    status: data.status || "pending",
    isAdmin: data.role === "admin",
    isActive: data.status === "active",
  };
}