import fs from "fs";

const inputFile = "visualizer-analytics.js";   // your 1994-line file
const outputFile = "output.js";

const text = fs.readFileSync(inputFile, "utf8");

// Removes leading line numbers like:
// "   123    code..." -> "code..."
const cleaned = text
  .split("\n")
  .map(line => line.replace(/^\s*\d+\s+/, ""))
  .join("\n");

fs.writeFileSync(outputFile, cleaned, "utf8");

console.log("Done → output.txt created without line numbers");