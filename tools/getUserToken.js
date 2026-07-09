import { adminAuth } from "../firebase/admin.js";

async function run() {
  try {
    const email = process.argv[2];

    if (!email) {
      console.error("Usage: node tools/getUserToken.js <email>");
      process.exit(1);
    }

    const customToken = await adminAuth.createCustomToken(email);

    console.log("\n=== CUSTOM TOKEN GENERATED ===\n");
    console.log(customToken);
    console.log("\n=============================\n");
  } catch (err) {
    console.error("Token generation failed:", err);
  }
}

run();
