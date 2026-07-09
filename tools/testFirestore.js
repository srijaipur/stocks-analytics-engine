import { getTickerConfig } from "../firebase/firestore.js";

try {
  const data = await getTickerConfig();

  console.log("Firestore connection successful");
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error("Firestore test failed");
  console.error(err);

  process.exit(1);
}
