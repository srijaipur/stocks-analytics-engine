import { auth as adminAuth } from "./admin.js";
import { resolveUser } from "./resolveUser.js";

export async function buildAuthContext(idToken) {
  if (!idToken) {
    throw new Error("Missing Firebase ID token");
  }

  const decoded = await adminAuth().verifyIdToken(idToken);

  const uid = decoded.uid;
  const email = decoded.email;

  const user = await resolveUser({ uid, email });

  if (!user) {
    throw new Error("User not found in RBAC system");
  }

  return {
    uid,
    email: user.email,
    role: user.role,
    status: user.status,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  };
}