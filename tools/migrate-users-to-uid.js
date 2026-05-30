import { db } from "../auth/admin.js";

async function migrate() {
  const snap = await db().collection("users").get();

  console.log(`Migrating ${snap.size} users...`);

  for (const doc of snap.docs) {
    const data = doc.data();

    // skip if already uid-based
    if (doc.id.length > 20 && doc.id === data.uid) continue;

    // if no uid stored, use doc.id as fallback identity
    const uid = data.uid || doc.id;

    console.log(`→ Creating UID doc: ${uid}`);

    await db().collection("users").doc(uid).set({
      ...data,
      uid,
    });
  }

  console.log("✅ Migration complete (UID-based structure created)");
}

migrate().catch(console.error);