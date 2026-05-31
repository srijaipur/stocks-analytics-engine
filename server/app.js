import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { auth } from "../auth/admin.js";
import { authMiddleware, requireRole } from "../auth/authMiddleware.js";

const app = express();

// ============================
// CORE MIDDLEWARE
// ============================
app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // temporarily disabled for analytics UI stability
  })
);
app.use(morgan("dev"));

// ============================
// STATIC FILES
// ============================
app.use("/data", express.static(path.join(process.cwd(), "data")));

// ============================
// DEV AUTH HELPERS
// ============================
app.get("/dev/token/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const customToken = await auth().createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/dev/login", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid required" });
    }

    const customToken = await auth().createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// HEALTH
// ============================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "stocks-analytics-engine",
    time: new Date().toISOString(),
  });
});

app.get("/api/analytics-data.json", async (req, res) => {
  try {
    const visualizerPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../visualizer-analytics.js"
    );

    const mod = await import(visualizerPath);

    const payload = mod.readData
      ? await mod.readData()
      : { rows: [] };

    res.json(payload);
  } catch (err) {
    console.error("analytics-json-error:", err);
    res.status(500).json({ error: "analytics load failed" });
  }
});

// ============================
// REPORT (PROTECTED)
// ============================
app.get("/report", authMiddleware, (req, res) => {
  try {
    res.sendFile(process.cwd() + "/data/report.html");
  } catch (err) {
    res.status(500).json({ error: "Failed to load report" });
  }
});

// ============================
// ANALYTICS HTML (PUBLIC UI)
// ============================
app.get("/analytics", (req, res) => {
  try {
    res.sendFile(process.cwd() + "/data/analytics.html");
  } catch (err) {
    res.status(500).json({ error: "Failed to load analytics dashboard" });
  }
});

// ============================
// CANONICAL DATA API (SOURCE OF TRUTH)
// ============================

// THIS is the ONLY valid runtime data endpoint
app.get("/api/analytics-data", authMiddleware, async (req, res) => {
  try {
    const visualizerPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../visualizer-analytics.js"
    );

    const module = await import(visualizerPath);

    const payload = module.readData ? await module.readData() : null;

    if (!payload) {
      return res.status(500).json({
        error: "Analytics payload missing",
      });
    }

    res.json({
      rows: payload.rows || [],
      meta: {
        generatedAt: new Date().toISOString(),
        source: "visualizer-analytics",
      },
    });
  } catch (err) {
    console.error("ANALYTICS_API_ERROR:", err);
    res.status(500).json({ error: "Failed to load analytics data" });
  }
});

// ============================
// ADMIN HOOK
// ============================
app.post(
  "/admin/run-report",
  authMiddleware,
  requireRole("admin"),
  (req, res) => {
    res.json({
      status: "not_implemented_yet",
      message: "Step 2 pipeline hook reserved",
    });
  }
);

// ============================
// SERVER START
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});