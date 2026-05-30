const token = process.argv[2];

if (!token) {
  console.error("Usage:");
  console.error("node tools/decode-token.js <token>");
  process.exit(1);
}

const payload = JSON.parse(
  Buffer.from(token.split(".")[1], "base64").toString()
);

console.log(payload);