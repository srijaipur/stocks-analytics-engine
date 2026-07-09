import { initializeApp } from "firebase/app";

// =====================================================
// FIREBASE CONFIG
// =====================================================

export const firebaseConfig = {
  apiKey: "AIzaSyBrGXWw9A2qp86h5ZMBIv8BgV9Pa6Sj3kw",

  authDomain: "stocks-analytics-platform.firebaseapp.com",

  projectId: "stocks-analytics-platform",

  storageBucket: "stocks-analytics-platform.firebasestorage.app",

  messagingSenderId: "563385076829",

  appId: "1:563385076829:web:dabe2dd4eb5955200b51b4",
};

// =====================================================
// CANONICAL APP SINGLETON
// =====================================================

export const app = initializeApp(firebaseConfig);
