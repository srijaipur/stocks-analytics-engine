import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { app } from "./firebaseConfig.browser.js";

const auth = getAuth(app);

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);

  const user = result.user;
  const token = await user.getIdToken();

  localStorage.setItem("idToken", token);

  return { user, token };
}