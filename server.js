import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { authMiddleware } from "./authMiddleware.js";
import { serveReportRouter } from "./server/serveReport.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON support
app.use(express.json());

/**
 * HEALTH CHECK (important for debugging)
 */
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "stocks-analytics-engine" });
});

/**
 * PROTECTED REPORT ROUTE
 */
app.use("/report", authMiddleware, serveReportRouter);

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});