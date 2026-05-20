import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app } from "./firebaseConfig.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}