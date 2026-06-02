import { auth, db } from "./admin.js";

/**
 * UID-only RBAC Middleware (Canonical)
 * Firestore users/{uid} = single source of truth
 */
export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;

    console.log(
  "SENTINEL_AUTH_HEADER:",
  header ? "PRESENT" : "MISSING"
);

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing Authorization Bearer token",
      });
    }

    const idToken = header.split("Bearer ")[1];

    // 1. Verify Firebase token
    const decoded = await auth().verifyIdToken(idToken);

    console.log(
  "SENTINEL_UID:",
  decoded?.uid
);

    const uid = decoded?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Invalid token: missing uid",
      });
    }

    // 2. DIRECT Firestore RBAC lookup (NO resolver)
    const userSnap = await db().collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return res.status(403).json({
        error: "Access denied: user not found in RBAC system",
      });
    }

    const user = userSnap.data();

    if (user.status !== "active") {
      return res.status(403).json({
        error: "User is not active",
      });
    }

    // 3. Canonical identity context
    req.user = {
      uid,
      email: user.email || decoded.email || null,
      role: user.role || "user",
      status: user.status,
      isAdmin: user.role === "admin",
    };

    next();
  } catch (err) {
    console.error("AUTH_MIDDLEWARE_ERROR:", err);

    console.error(
  "SENTINEL_AUTH_ERROR:",
  err.message
);

    return res.status(401).json({
      error: "Unauthorized",
    });
  }
}

/**
 * Role guard (unchanged)
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden (RBAC)" });
    }

    next();
  };
}