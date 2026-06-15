import { adminAuth } from "./admin.js";
console.log("🔥 AUTHGATE ACTIVE");
export async function authMiddleware(req, res, next) {
  try {
    
    let token = null;

const header = req.headers.authorization;

if (header?.startsWith("Bearer ")) {
  token = header.split("Bearer ")[1];
}

if (!token && req.cookies?.sessionToken) {
  token = req.cookies.sessionToken;
}

if (!token) {
  return res.status(401).json({
    error: "Unauthorized"
  });
}

    const decoded = await adminAuth.verifyIdToken(token);
    console.log("DECODED TOKEN:", decoded);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      role: decoded.role || "user"
    };

    next();
  } catch (err) {
   console.error("AUTH ERROR (authMiddleware):", err);

return res.status(401).json({
  error: "Unauthorized",
  stage: "authMiddleware"
});
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    console.log("➡️ requireRole ENTERED");
    console.log("EXPECTED ROLE:", role);
    console.log("ACTUAL USER:", req.user);

    if (!req.user) {
      console.log("❌ requireRole BLOCK: no req.user");
      return res.status(401).json({
        error: "Unauthenticated",
        stage: "requireRole:noUser"
      });
    }

    if (req.user.role !== role && req.user.role !== "admin") {
      console.log("❌ requireRole BLOCK: role mismatch");
      console.log("EXPECTED:", role);
      console.log("ACTUAL:", req.user.role);

      return res.status(403).json({
        error: "Forbidden (RBAC)",
        stage: "requireRole:roleMismatch"
      });
    }

    console.log("✅ requireRole PASSED");
    next();
  };
}