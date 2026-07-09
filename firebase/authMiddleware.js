import { adminAuth } from "./admin.js";
//import { resolveUser } from "./rbacResolver.js";

/**
 * RBAC Middleware (FinTech-grade gatekeeper)
 */
export async function authMiddleware(req, res, next) {
  console.log("MIDDLEWARE USER:", req.user);
  console.log("ROLE CHECK:", req.user?.role);
  try {
    // 1. Extract token
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing Authorization Bearer token",
      });
    }

    const idToken = header.split("Bearer ")[1];

    // 2. Verify Firebase token
    const decoded = await adminAuth().verifyIdToken(idToken);

    if (!decoded.uid) {
      return res.status(401).json({
        error: "Invalid token: missing uid",
      });
    }

    // 3. Resolve RBAC user (single source of truth)
    /*const identity = await resolveUser({
      uid: decoded.uid,
      email: decoded.email,
    });

    if (!identity) {
      return res.status(403).json({
        error: "Access denied: user not found in RBAC system",
      });
    }

    if (identity.status !== "active") {
      return res.status(403).json({
        error: "User is not active",
      });
    }*/

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
      keyType: "firebase",
    };

    // 4. Attach canonical user context
    req.user = {
      uid: decoded.uid,
      email: identity.email,
      role: identity.role || "user",
      keyType: identity.keyType || "email",
    };

    next();
  } catch (err) {
    console.error("AUTH_MIDDLEWARE_ERROR:", err);

    return res.status(401).json({
      error: "Unauthorized",
    });
  }
}

/**
 * Role-based guard
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
