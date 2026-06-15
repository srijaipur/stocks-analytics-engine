import admin from "../firebase/admin.js";
import { getFirestore } from "firebase-admin/firestore";

async function getUsersByRole(roleFilter = null) {
  const db = getFirestore(admin.app());

  const snapshot = await db.collection("users").get();

  const users = [];

  snapshot.forEach(doc => {
    const data = doc.data();

    if (!roleFilter || data.role === roleFilter) {
      users.push({
        id: doc.id,
        ...data
      });
    }
  });

  return users;
}

try {
  const role = process.argv[2];

  const users = await getUsersByRole(role);

  console.log("Firestore users fetch successful");
  console.log("Filter role:", role || "ALL");
  console.log(JSON.stringify(users, null, 2));

} catch (err) {
  console.error("Firestore user fetch failed");
  console.error(err);
  process.exit(1);
}