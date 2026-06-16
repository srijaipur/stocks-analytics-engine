import { adminAuth } from "../firebase/admin.js";

async function run() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: node tools/get-custom-token.js <email>");
    process.exit(1);
  }

  const customToken = await adminAuth.createCustomToken(email);

  console.log(customToken);
}

run();
