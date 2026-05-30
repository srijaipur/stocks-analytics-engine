import { getAdmin } from "./admin.js";

/**
 * Standardized auth wrapper for all server endpoints
 * Returns normalized user context OR throws error
 */

export async function verifyRequest(req) {
  const authHeader = req.headers?.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  const idToken = authHeader.split("Bearer ")[1];

  const admin = getAdmin();

  const decodedToken = await admin.auth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || null,
    claims: decodedToken,
  };
}