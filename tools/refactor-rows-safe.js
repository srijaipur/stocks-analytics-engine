import fs from "fs";

const FILE = "visualizer-analytics.js";

let code = fs.readFileSync(FILE, "utf8");

// Find rows.map((r, index) => { blocks
const mapRegex =
  /rows\.map\(\(r,\s*index\)\s*=>\s*\{/g;

let match;
let output = "";
let lastIndex = 0;

while ((match = mapRegex.exec(code)) !== null) {
  const start = match.index;

  // append code before match
  output += code.slice(lastIndex, start);

  // replace header
  output += "rows.map((row, index) => {\n  const row = safeRow(row);";

  lastIndex = mapRegex.lastIndex;
}

// append remainder
output += code.slice(lastIndex);

// Now fix internal r. ONLY in map blocks safely
output = output.replace(
  /rows\.map\(\(row,\s*index\)\s*=>\s*\{([\s\S]*?)\}/g,
  (block) => {
    return block.replace(/\br\./g, "row.");
  }
);

fs.writeFileSync(FILE, output);

console.log("✅ Safe refactor complete (rows.map → row + safeRow injection)");