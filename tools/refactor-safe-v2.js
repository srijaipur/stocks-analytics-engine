import fs from "fs";

const FILE = "visualizer-analytics.js";
let code = fs.readFileSync(FILE, "utf8");

// 1. Fix broken injection duplicates
code = code.replace(
  /rows\.map\(\(row,\s*index\)\s*=>\s*\{\s*const row = safeRow\(row\);/g,
  "rows.map((r, index) => {\n  const row = safeRow(r);"
);

// 2. Fix correct pattern (if already r exists incorrectly transformed)
code = code.replace(
  /rows\.map\(\(row,\s*index\)\s*=>/g,
  "rows.map((r, index) =>"
);

// 3. Ensure only ONE safeRow line exists per block
code = code.replace(
  /const row = safeRow\((r|row)\);\s*const row = safeRow\((r|row)\);/g,
  "const row = safeRow($1);"
);

// 4. Ensure r. → row. ONLY in context (safe heuristic)
code = code.replace(/\br\./g, "row.");

fs.writeFileSync(FILE, code);

console.log("✅ Cleaned + normalized visualizer-analytics.js");