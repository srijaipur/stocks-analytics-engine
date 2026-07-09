import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrGXWw9A2qp86h5ZMBIv8BgV9Pa6Sj3kw",
  authDomain: "stocks-analytics-platform.firebaseapp.com",
  projectId: "stocks-analytics-platform",
  storageBucket: "stocks-analytics-platform.firebasestorage.app",
  messagingSenderId: "563385076829",
  appId: "1:563385076829:web:dabe2dd4eb5955200b51b4",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
