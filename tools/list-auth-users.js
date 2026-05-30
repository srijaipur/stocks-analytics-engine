import { auth } from "../auth/admin.js";

async function run() {
  const result = await auth().listUsers(1000);

  console.log("TOTAL AUTH USERS:", result.users.length);

  for (const user of result.users) {
    console.log("\n====================");
    console.log("UID:", user.uid);
    console.log("EMAIL:", user.email);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("AUTH_USER_DUMP_ERROR:", err);
  process.exit(1);
});