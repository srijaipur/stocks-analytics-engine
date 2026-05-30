import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebaseConfig.js";
import { loginWithGoogle } from "./auth.js";

const auth = getAuth(app);

/**
 * Soft Auth Gate:
 * - DOES NOT destroy DOM
 * - Adds overlay instead of replacing body
 * - Safe for report.html (production-safe)
 */
export function attachSoftAuthGate(startApp) {
  onAuthStateChanged(auth, (user) => {

    // AUTHED → proceed normally
    if (user) {
      removeOverlay();
      startApp?.(user);
      return;
    }

    // NOT AUTHED → overlay only
    showOverlay();
  });
}

/**
 * Overlay renderer (non-destructive)
 */
function showOverlay() {
  if (document.getElementById("auth-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";

  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(15,17,23,0.95)";
  overlay.style.color = "#fff";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "99999";

  overlay.innerHTML = `
    <h2>🔒 Authentication Required</h2>
    <p>Please sign in with Google to view this report</p>
    <button id="authLoginBtn" style="padding:10px 20px;margin-top:10px;cursor:pointer">
      Login with Google
    </button>
  `;

  document.body.appendChild(overlay);

  document.getElementById("authLoginBtn").onclick = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("Login failed:", e);
    }
  };
}

/**
 * Clean overlay removal
 */
function removeOverlay() {
  const el = document.getElementById("auth-overlay");
  if (el) el.remove();
}