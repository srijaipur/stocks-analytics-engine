import express from "express";
import "dotenv/config";

import { authMiddleware, requireRole } from "../auth/authMiddleware.js";

const router = express.Router();
app.use(express.json());

/**
 * HEALTH CHECK (public)
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * 🔐 PROTECTED: Serve report only to authenticated users
 */
router.get(
  "/report",
  authMiddleware,
  requireRole("user"),
  async (req, res) => {
    try {
      res.sendFile(process.cwd() + "/data/report.html");
    } catch (err) {
      res.status(500).json({ error: "Failed to load report" });
    }
  }
);

/**
 * 🔐 PROTECTED: Admin-only analytics trigger
 */
router.post(
  "/admin/run-report",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { exec } = await import("child_process");

      exec("node index.js", (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Report generation failed" });
        }

        res.json({ status: "report triggered" });
      });
    } catch (err) {
      res.status(500).json({ error: "server error" });
    }
  }
);

const PORT = process.env.PORT || 3000;

export default router;