# stocks-analytics-engine

A Node.js quantitative stock analytics engine that fetches multi-source market data, computes a composite factor score for each ticker, and writes ranked, color-coded results to a local Excel workbook and interactive HTML report.

## Table of Contents

- [Overview](#overview)
- [Recent Changes](#recent-changes)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Sources](#data-sources)
- [Scoring Model](#scoring-model)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Adding a New Ticker to the Report](#adding-a-new-ticker-to-the-report)
- [Docker](#docker)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
- [Sanity Check Table](#sanity-check-table)

---

## Overview

`stocks-analytics-engine` is a Node.js analytics engine that collects multi-source market data, computes a suite of fundamental and technical factors, converts them into cross-universe percentiles, and produces a composite ranking per ticker. Results are written to an Excel workbook (`data/stocks.xlsx`) and a self-contained HTML report (`data/report.html`). The project includes utilities to manage workbooks, run Finviz-based index screeners, and protect the report endpoints behind Firebase authentication with simple RBAC.

## Recent Changes

- Branch: `feature/googleauth-security-hardening-clean` — focuses on authentication hardening, safer workbook creation, and cleanup utilities.
- Workbook creation is idempotent: `scripts/createWorkbook.js` will add missing sheets and append new tickers without destroying user edits in the workbook.
- Added `scripts/cleanWorkbook.js` to delete and regenerate `data/stocks.xlsx` from canonical `data/tickers.json` when invalid tickers accumulate.
- Added `visualizer-report.js` and related npm scripts to generate Firebase auth-protected `data/report.html` output for logged-in users.
- Added a nightly GitHub Actions workflow at `.github/workflows/report.yml` to build the workbook, run the analytics pipeline, generate both report and analytics pages, validate outputs, and deploy static assets to GitHub Pages.
- Server routes for `/report` and `/analytics` are guarded with `authMiddleware` + `requireRole()` to restrict access to authenticated users; admin-only endpoints (e.g., `/admin/run-report`) allow triggering analytics runs.

## Architecture

```
stocks.xlsx (Portfolio, Watchlist, Russel_2000, Dow_Jones, Nasdaq, SP_100)
        │
        ▼  sheets/readSheet.js
index.js — deduped ticker universe
        │
        ├──► data/fundamentals.js  →  Finviz  (EPS TTM, fwd EPS, Beta, RSI, SMA200, inst%)
        ├──► data/prices.js        →  Yahoo Finance  (150-day OHLCV + ^OEX benchmark)
        └──► data/institutions.js  →  NASDAQ API  (13F new / sold-out counts)
        │
        ▼  factors/
   fundamentalLevel, fundamentalTrend, getBeta, getRsi14,
   getSma200Dist, institutionalAccumulation,
   maSlope, volumeExpansion, relativeStrength, jensensAlpha
        │
        ▼  factors/normalize.js  (percentileRank — cross-universe)
   Composite = 0.25×P(Trend) + 0.25×P(EPS_TTM)
             + 0.20×P(Return_63D) + 0.10×P(RS) + 0.10×P(MA_Slope) - 0.10×P(Drawdown)
        │
        ▼  sheets/writeSheet.js
stocks.xlsx → ScoresCurrent | ScoresPreviousDay | Composite_Formula | SignalsTriggered
```

### Screener flow

```
Finviz screener (paginated HTML scrape)
  → per-ticker Finviz quote + Yahoo Finance prices
  → post-filter: Beta range, RSI minimum, Jensen's Alpha > 0
  → sort by Jensen's Alpha descending
  → top-N tickers written to index sheet in stocks.xlsx
```

## Project Structure

```
stocks-analytics-engine/
├── index.js                  # Main entry point — full analytics pipeline
├── signalEngine.js           # Signal computation helpers
├── visualizer.js             # Reads stocks.xlsx → generates report.html
├── visualizer-analytics.js   # Advanced analytics HTML generator
├── visualizer-report.js      # Auth-protected report generation using Firebase auth
├── package.json
├── Dockerfile
├── eslint.config.js
├── data/
│   ├── fundamentals.js       # Finviz quote fetcher (@stonksjs/finviz)
│   ├── prices.js             # Yahoo Finance 150-day OHLCV fetcher
│   ├── institutions.js       # NASDAQ API 13F institutional holdings fetcher
│   ├── analytics.html        # Advanced analytics template
│   ├── report.html           # Report template (generated)
│   ├── analytics-loader.html # Token validation wrapper → /analytics
│   ├── report-loader.html    # Token validation wrapper → /report
│   ├── login.html            # Firebase Google Sign-In entry point
│   └── tickers.json          # Canonical ticker configuration
├── factors/
│   ├── fundamentals.js       # EPS level/trend, Beta, RSI-14, SMA-200, inst. %
│   ├── technicals.js         # MA slope, volume expansion, relative strength, Jensen's Alpha
│   ├── normalize.js          # percentileRank() — cross-universe ranking
│   └── risk.js               # maxDrawdown() — computed but not in composite
├── scoring/
│   └── scoreEngine.js        # weightedScore() helper
├── sheets/
│   ├── auth.js               # Deprecated stub (legacy Google Sheets)
│   ├── readSheet.js          # Reads ticker list from workbook sheet (exceljs)
│   └── writeSheet.js         # Writes scores, snapshots, color fills
├── firebase/
│   ├── admin.js              # Firebase Admin SDK initialization
│   ├── auth.js               # Client-side Firebase setup
│   ├── authGate.js           # Browser auth gate middleware
│   ├── authMiddleware.js     # Express bearer token verification
│   ├── firebaseConfig.js     # Server-side Firebase config
│   └── firebaseConfig.browser.js # Client-side Firebase config
├── server/
│   └── serveReport.js        # Express app with protected /report, /analytics, /admin endpoints
├── scripts/
│   ├── createWorkbook.js     # Idempotent workbook creation from tickers.json
│   ├── cleanWorkbook.js      # Delete and regenerate workbook from scratch
│   └── screenIndex.js        # Finviz screener → populates index sheet
├── public/
│   └── analytics-client.js   # Client-side analytics logic
├── lib/
│   └── loadTickerConfig.js   # Load tickers.json configuration
└── tools/
    ├── test_ticker.js        # Single-ticker test utility
    ├── test_invalid_ticker.js # Invalid ticker test utility
    ├── test_workbook.js      # Workbook validation tests
    ├── test_workbook_full.js # Full workbook flow test
    ├── testFirestore.js      # Firebase Firestore connectivity test
    ├── testLoader.js         # Test data loading pipeline
    ├── testUsersFirestore.js # Firebase users collection test
    ├── get-Custom-token.js   # Generate custom JWT token
    ├── getUserToken.js       # Get Firebase user token
    └── verify_clean.js       # Verify workbook cleanup
```

## Data Sources

| Source                               | Data Retrieved                                                                                                           | Auth                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Finviz** (`finviz.com`)            | EPS TTM, forward EPS, Beta, RSI-14, SMA-200 distance, institutional accumulation %; also HTML-scraped for screener pages | None — browser User-Agent header |
| **Yahoo Finance** (`yahoo-finance2`) | 150-day daily OHLCV bars per ticker; `^OEX` used as the S&P 100 benchmark                                                | None                             |
| **NASDAQ API** (`api.nasdaq.com`)    | Institutional 13F holdings — counts of new and sold-out positions                                                        | None — public API                |

**Rate-limit handling:** Exponential backoff (up to 5 retries), `Retry-After` header support on HTTP 429 responses, and a 1.2-second inter-request delay between Finviz calls.

## Scoring Model

Each signal is independently percentile-ranked across the full ticker universe (0–100), then combined as a weighted sum:

| Factor                     | Signal                                       | Weight |
| -------------------------- | -------------------------------------------- | ------ |
| **Trend (Forward Growth)** | EPS growth/forward trend from Finviz         | 25%    |
| **EPS Level**              | EPS TTM from Finviz                          | 25%    |
| **Momentum (63D Return)**  | 63-day price return                          | 20%    |
| **Relative Strength**      | 63-day return vs. `^OEX` benchmark           | 10%    |
| **MA Slope (50-day)**      | 5-day slope of the 50-day moving average     | 10%    |
| **Risk (Drawdown)**        | Maximum peak-to-trough drawdown (subtracted) | -10%   |

**Additional signals** (computed but not in composite): Jensen's Alpha (63d), Volume Expansion (5-day vs. 20-day average), Institutional Accumulation (% from Finviz + NASDAQ 13F counts), Next Earnings Date.

### Output Color Coding

| Score Range | Color       | Label      |
| ----------- | ----------- | ---------- |
| ≥ 80        | Green       | Strong Buy |
| 60 – 79     | Light green | Monitor    |
| 40 – 59     | Yellow      | Neutral    |
| 20 – 39     | Orange      | Reduce     |
| < 20        | Red         | Avoid      |

Color mappings are applied by `sheets/writeSheet.js` when writing `ScoresCurrent` (Excel ARGB fill values) and are also reflected in `data/report.html` card and table visualizations.

## Prerequisites

- Node.js >= 20 (Node 24 recommended)
- npm >= 9
- Network access to Finviz, Yahoo Finance, and NASDAQ API endpoints
- Firebase project configured with Google Sign-In (Client ID required for `login.html`)
- Service account key exported as JSON (set via `FIREBASE_SERVICE_ACCOUNT_JSON`)

Optional: Docker for containerized runs

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Configure tickers: edit `data/tickers.json` to list `portfolio` and `watchlist` tickers (canonical source for scripts/createWorkbook).

3. Create the workbook (idempotent script — safe to re-run):

```bash
node scripts/createWorkbook.js
```

4. Provide Firebase service account credentials (for protected server endpoints) by setting `FIREBASE_SERVICE_ACCOUNT_JSON` in environment or `.env` (see Configuration).

## Usage

### Run the analytics engine

Fetches data for all tickers across all sheets, computes composite scores, writes results to `data/stocks.xlsx`, and then generates the HTML report via `visualizer.js`:

```bash
npm start
```

This runs `node index.js && node visualizer.js` per `package.json` scripts. The full run will:

- Read Excel sheets (Portfolio, Watchlist, index sheets) via `sheets/readSheet.js`.
- Fetch fundamentals (Finviz), prices (Yahoo Finance), institutional activity (NASDAQ API).
- Compute factors, normalize to percentiles, calculate composite scores and signals.
- Write `ScoresCurrent`, a `SignalsTriggered` sheet, and snapshot `ScoresPreviousDay` in `data/stocks.xlsx`.
- Generate `data/report.html` for visualization.

### Manage the Excel workbook

Create or update workbook headers and sheets:

```bash
node scripts/createWorkbook.js
```

Clean and regenerate workbook from `data/tickers.json` (removes invalid/test tickers):

```bash
npm run clean-workbook
```

> **Note:** `createWorkbook.js` is intentionally idempotent — it appends missing sheets and preserves existing rows so that manual edits to the workbook are not destroyed.

### Populate index sheets (screener)

Run the Finviz-based screener to populate `Russel_2000`, `Dow_Jones`, `Nasdaq`, and `SP_100` sheets:

```bash
npm run screen-rut      # Russell 2000
npm run screen-dji      # Dow Jones 30
npm run screen-ndx      # Nasdaq 100
npm run screen-sp100    # S&P 100
npm run screen-all      # All four indices
```

Each screen command fetches paginated screener results from Finviz, post-filters by Beta/RSI/Alpha thresholds, computes alpha using historical prices, and writes the top-N tickers to the relevant sheet.

### Generate the visual report

Reads `ScoresCurrent` from `stocks.xlsx` and writes a self-contained `data/report.html` with a score card grid, scatter charts, upcoming earnings strip, and a full sortable data table.

Use the original report builder:

```bash
npm run visualize             # write data/report.html using visualizer.js
npm run visualize:serve       # write + open in browser at http://localhost:3000
```

Use the new auth-protected report builder:

```bash
npm run visualize-report      # write data/report.html using visualizer-report.js
npm run visualize-report:serve  # write + open in browser at http://localhost:3000
```

This build path generates a report page that includes Firebase client-side auth and Firestore whitelist checks, so it is intended for authenticated users.

> Run `npm start` first — the report reads from the Excel workbook.

### Combined first-run setup

Creates the workbook and runs all four index screeners in sequence:

```bash
npm run setup
```

This performs `node scripts/createWorkbook.js` followed by `node scripts/screenIndex.js all` (configured in `package.json`). Use this for initial repository setup.

## Adding a New Ticker to the Report

To include a new stock ticker in the final web report, follow these steps:

1. Edit `data/tickers.json` and add the new ticker symbol to either the `"portfolio"` or `"watchlist"` array. Ensure the ticker is valid and exists on major exchanges.

2. Sync the Excel workbook:

```bash
node scripts/createWorkbook.js
```

3. Run the analytics engine to fetch market data and compute scores for all tickers, including the new one:

```bash
npm start
```

This step may take several minutes as it fetches data from Finviz, Yahoo Finance, and NASDAQ APIs for each ticker.

4. Generate the updated report:

```bash
npm run visualize
```

This generates `data/report.html` with the new ticker included in the score cards, charts, and data table.

5. Publish the report and analytics pages to GitHub Pages:

This repository includes a scheduled GitHub Actions workflow in `.github/workflows/report.yml`. When merged into `main`, the workflow will:

- regenerate `data/stocks.xlsx`
- run the analytics pipeline via `index.js`
- generate `data/report.html` with Firebase auth protection
- generate `data/analytics.html`
- validate both generated artifacts
- deploy the `data/` directory to GitHub Pages as the published site root

The latest nightly site will be available at `https://srijaipur.github.io/stocks-analytics-engine/index.html` for the report, and `https://srijaipur.github.io/stocks-analytics-engine/analytics.html` for analytics.

> **Notes:**
>
> - The GitHub Actions workflow validates that `data/index.html` has a non-zero ticker count, that `data/analytics.html` contains serialized analytics payload, and that `data/report.html` retains auth protections without leaking admin secrets.
> - Invalid or delisted tickers will cause errors during data fetching. Verify the ticker exists before adding.
> - The report only includes tickers that have successfully been processed and scored.
> - For bulk additions, add multiple tickers at once and follow the same steps.
> - If you encounter failures due to invalid tickers, run `npm run clean-workbook` to regenerate the Excel file from scratch.

## Docker

Build the image:

```bash
docker build -t stocks-analytics-engine .
```

Run, mounting the local `data/` directory to persist `stocks.xlsx` between runs:

```bash
# Linux / macOS
docker run -v "$(pwd)/data:/app/data" stocks-analytics-engine

# Windows PowerShell
docker run -v "${PWD}/data:/app/data" stocks-analytics-engine
```

**Corporate network / SSL inspection:** The Dockerfile includes commented-out instructions for injecting a custom CA certificate. The Node process already uses `--use-system-ca` so system-trusted CAs are automatically respected inside the container.

## Dependencies

### Production

| Package             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `@stonksjs/finviz`  | Finviz quote helper and screener scraping       |
| `axios`             | HTTP client for NASDAQ API and internal patches |
| `cookie-parser`     | Express middleware for parsing cookies          |
| `cors`              | Cross-origin resource sharing middleware        |
| `dayjs`             | Lightweight date handling                       |
| `dotenv`            | Environment variable loading from `.env`        |
| `exceljs`           | Read/write Excel workbooks (.xlsx)              |
| `express`           | Web server framework for protected routes       |
| `firebase`          | Client-side Firebase SDK for auth               |
| `firebase-admin`    | Admin SDK for token verification and management |
| `helmet`            | Security middleware (headers hardening)         |
| `morgan`            | HTTP request logger                             |
| `simple-statistics` | Percentile and statistical helpers              |
| `yahoo-finance2`    | Historical price data fetcher                   |

### Development

| Package                  | Purpose                             |
| ------------------------ | ----------------------------------- |
| `@eslint/js`             | ESLint JavaScript configuration     |
| `eslint`                 | Linting tool                        |
| `eslint-config-prettier` | ESLint + Prettier compatibility     |
| `globals`                | Global variables for different envs |
| `prettier`               | Code formatter                      |

## Configuration

Environment variables are loaded from a `.env` file (never commit to source control).

**Key variables:**

- `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON string of Firebase service account for token verification. `firebase/admin.js` parses this and constructs a certificate for the Admin SDK. Ensure `private_key` contains `\\n` that will be replaced with real newlines at runtime.
- (Optional) Any additional environment variables used by your deployment or CI.

**Example `.env`:**

```bash
# Single-line JSON string. Ensure proper escaping of newlines in `private_key`.
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"my-project",...,"private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n" }'
```

**Workbook location:** `sheets/readSheet.js` and `sheets/writeSheet.js` expect the workbook at `data/stocks.xlsx`. Use `scripts/createWorkbook.js` to create or repair it.

**Protected endpoints:** The branch includes Firebase-based authentication for report and analytics endpoints:

- `data/login.html` — Google Sign-In entry point
- `data/report-loader.html` — Checks for idToken, fetches `/report`
- `data/analytics-loader.html` — Checks for idToken, fetches `/analytics`
- `server/serveReport.js` — Express routes with `authMiddleware` and role-based access control

## Sanity Check Table

Before running a full analytics pass, verify the following:

- Node/npm installed and `npm install` completed.
- `data/tickers.json` contains valid ticker symbols.
- `node scripts/createWorkbook.js` runs without error and creates `data/stocks.xlsx`.
- Network connectivity to `finviz.com`, `api.nasdaq.com`, and Yahoo endpoints.
- If protecting routes with Firebase: `FIREBASE_SERVICE_ACCOUNT_JSON` is set and `tools/getUserToken.js <email>` can generate a custom token.
- Run single-ticker tests: `node tools/test_ticker.js` and `node tools/test_invalid_ticker.js` to validate fetch logic and error handling.

---

If you'd like, I can also:

- Open the new `README.MD` file for review, or
- Commit & push this branch with the new README and create a draft PR against `main`.
