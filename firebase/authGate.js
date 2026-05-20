import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebaseConfig.js";

const auth = getAuth(app);

export function attachAuthGate(startApp) {
  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      document.body.innerHTML = `
        <div style="background:#0f1117;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column">
          <h2>🔒 Access Restricted</h2>
          <p>Sign in with Google to continue</p>
          <button id="loginBtn" style="padding:10px 20px">Login</button>
        </div>
      `;

      document.getElementById("loginBtn").onclick = async () => {
        const { loginWithGoogle } = await import("./auth.js");
        await loginWithGoogle();
        location.reload();
      };

      return;
    }

    startApp(user);
  });
}