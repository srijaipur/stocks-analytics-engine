import { db } from "./admin.js";

/**
 * UID-safe RBAC resolver (no schema migration required)
 */
export async function resolveUser(uid, email) {
  let query;

  // Prefer email match (your DB is email-based)
  if (email) {
    query = await db()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
  }

  if (!query || query.empty) {
    return null;
  }

  const doc = query.docs[0];

  return {
    key: doc.id,
    user: doc.data(),
    keyType: "email"
  };
}