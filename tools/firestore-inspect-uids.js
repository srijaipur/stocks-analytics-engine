import { db } from "../auth/admin.js";

async function run() {
  const snap = await db().collection("users").get();

  console.log("TOTAL USERS:", snap.size);

  snap.forEach(doc => {
    const data = doc.data();

    console.log("\n====================");
    console.log("DOC ID:", doc.id);
    console.log("DATA:", data);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});