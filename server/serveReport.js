import { adminAuth } from "../firebase/admin.js";
import express from "express";
import "dotenv/config";
import fs from "fs";
import ExcelJS from "exceljs";
import {
  authMiddleware,
  requireRole
} from "../firebase/authGate.js";

console.log("MODULE:", import.meta.url);
console.log("PID:", process.pid);
console.log("STEP A: imports loaded");
console.log("🚀 LOADED SERVER FILE: serveReport.js");

async function loadAnalyticsData() {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(
    process.cwd() + "/data/stocks.xlsx"
  );

  const sheet = workbook.getWorksheet("ScoresCurrent");

  if (!sheet) {
    return { rows: [] };
  }

  const rows = [];

  const headers = sheet.getRow(1).values;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const obj = {};

    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber]] = cell.value;
    });

    rows.push(obj);
  });

  return { rows };
}



const app = express();
globalThis.__APP__ = app;
console.log("GLOBAL APP SET", globalThis.__APP__ === app);
console.log("APP INSTANCE CREATED:", !!app);
console.log("STEP6: app._router at creation:", app._router);
app.use(express.json());

import cookieParser from "cookie-parser";

app.use(cookieParser());

//app.use("/firebase", express.static(process.cwd() + "/firebase"));
// 🚫 DISABLE FIREBASE CLIENT MODULE EXPOSURE (SENTINEL RULE)
app.use("/firebase", (req, res) => {
  res.status(404).send("Not available");
});

console.log("STEP B: before /health route");
/**
 * HEALTH CHECK (public)
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
console.log("ROUTES:", app._router?.stack?.length);
console.log("STEP6: after first route, router:", app._router);

console.log("REGISTERING ROUTE: /login.html");
app.get("/login.html", (req, res) => {
  res.sendFile(process.cwd() + "/data/login.html");
});


app.post("/sessionLogin", (req, res) => {
  return res.status(200).json({
    status: "disabled",
    message: "Using Authorization header auth instead"
  });
});


app.get("/api/analytics-data.js", async (req, res) => {
  try {
    const data = await loadAnalyticsData(); // MUST exist or be implemented

    const safe = {
      rows: Array.isArray(data?.rows)
        ? data.rows
        : []
    };

    res.setHeader(
      "Content-Type",
      "application/javascript"
    );

    res.send(
      `window.__ANALYTICS__ = ${JSON.stringify(safe)};`
    );

  } catch (e) {
    res.setHeader(
      "Content-Type",
      "application/javascript"
    );

    res.send(
      `window.__ANALYTICS__ = { rows: [] };`
    );
  }
});



/**
 * 🔐 PROTECTED: Serve report only to authenticated users
 */
app.get(
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

/*app.get(
  "/analytics",
  authMiddleware,
  requireRole("user"),
  async (req, res) => {
    console.log("AUTH HEADER:", req.headers.authorization);
    console.log("ROUTE HIT /analytics");
console.log("HEADERS:", req.headers.authorization);
console.log("USER:", req.user);
    try {
      res.sendFile(
        process.cwd() + "/data/analytics.html"
      );
    } catch (err) {
      res
        .status(500)
        .json({
          error: "Failed to load analytics"
        });
    }
  }
);*/
app.get(
  "/analytics",
  authMiddleware,
  requireRole("user"),
  async (req, res) => {
    console.log("AUTH HEADER:", req.headers.authorization);
    console.log("ROUTE HIT /analytics");
    console.log("USER:", req.user);

    try {
      res.sendFile(process.cwd() + "/data/analytics.html");
    } catch (err) {
      res.status(500).json({ error: "Failed to load analytics" });
    }
  }
);
app.get("/report-loader.html", (req, res) => {
  res.sendFile(
    process.cwd() + "/data/report-loader.html"
  );
});

app.get("/analytics-loader.html", (req, res) => {
  res.sendFile(
    process.cwd() + "/data/analytics-loader.html"
  );
});



console.log("STEP C: routes defined up to loader endpoints");


/**
 * 🔐 PROTECTED: Admin-only analytics trigger
 */
app.post(
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

console.log("🧭 REGISTERED ROUTES:");

console.log("🧭 REGISTERED ROUTES (SAFE):");

const routes =
  app._router?.stack || [];

const formatted = routes
  .filter(layer => layer.route)
  .map(layer => {
    const method = Object.keys(layer.route.methods)[0].toUpperCase();
    return `${method} ${layer.route.path}`;
  });

console.log(formatted);

console.log("STEP D: about to start server");
console.log("FINAL APP ROUTER OBJECT:", app._router);
console.log("STEP6: final router before listen:", app._router);

setTimeout(() => {
  try {
    console.log(
      "🧭 FINAL ROUTES:",
      app._router?.stack
        ?.filter(r => r.route)
        ?.map(r =>
          Object.keys(r.route.methods)[0] + " " + r.route.path
        )
    );
  } catch (e) {
    console.log("ROUTE DEBUG FAILED:", e.message);
  }
}, 1000);


app.listen(PORT, () => {
  console.log(`🔐 Secure server running on port ${PORT}`);
});