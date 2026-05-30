import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { auth } from "../auth/admin.js";
import { authMiddleware, requireRole } from "../auth/authMiddleware.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.listen(3000);

app.use(express.json()); // MUST exist before routes
/**
 * BACKEND TOKEN GENERATION (for testing only - not for production use)
 */
app.get("/dev/token/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;

    const customToken = await auth().createCustomToken(uid);

    res.json({ customToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**Dev Login endpoint for token generation */
app.post("/dev/login", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid required" });
    }

    // 1. Create custom token (Firebase Admin SDK)
    const customToken = await auth().createCustomToken(uid);

    res.json({ customToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * HEALTH CHECK (no auth)
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "stocks-analytics-engine",
    time: new Date().toISOString(),
  });
});

/**
 * PROTECTED REPORT ENDPOINT
 * Uses existing generated file: data/report.html
 */
app.get("/report", authMiddleware, (req, res) => {
  try {
    res.sendFile(process.cwd() + "/data/report.html");
  } catch (err) {
    console.error("REPORT_ERROR:", err);
    res.status(500).json({ error: "Failed to load report" });
  }
});

/**
 * FUTURE HOOK: analytics trigger (admin only)
 * (safe placeholder for Step 2+)
 */
app.post("/admin/run-report", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({
    status: "not_implemented_yet",
    message: "Step 2 will wire analytics pipeline here",
  });
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});