import { auth } from "../auth/admin.js";

async function run() {
  const result = await auth().listUsers();

  console.log("TOTAL AUTH USERS:", result.users.length);

  result.users.forEach(user => {
    console.log("\n====================");
    console.log("UID:", user.uid);
    console.log("EMAIL:", user.email);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});