import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrGXWw9A2qp86h5ZMBIv8BgV9Pa6Sj3kw",
  authDomain: "stocks-analytics-platform.firebaseapp.com",
  projectId: "stocks-analytics-platform",
  storageBucket: "stocks-analytics-platform.firebasestorage.app",
  messagingSenderId: "563385076829",
  appId: "1:563385076829:web:dabe2dd4eb5955200b51b4",
};

const CUSTOM_TOKEN = process.argv[2];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const cred = await signInWithCustomToken(auth, CUSTOM_TOKEN);

const idToken = await cred.user.getIdToken();

console.log(idToken);