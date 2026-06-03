import { db } from "../auth/admin.js";

async function run() {
  try {
    const snap = await db().collection("users").get();

    const output = snap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    console.log("SENTINEL_USERS_COLLECTION:");
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error("INSPECT_ERROR:", err);
  }

  process.exit(0);
}

run();