# stocks-analytics-engine

Analytics Engine to pull data from finviz, yahoo-finance and generate a composite score from weightage technical and fundamental parameters to rank in pool consisting stocks from Dow, Nasdaq, RUT S&amp;P.

A Node.js quantitative stock analytics engine that fetches multi-source market data, computes a composite factor score for each ticker, and writes ranked, color-coded results to a local Excel workbook.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Sources](#data-sources)
- [Scoring Model](#scoring-model)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Docker](#docker)
- [Dependencies](#dependencies)
- [Configuration](#configuration)

---

## Overview

The engine operates on a universe of tickers drawn from up to six named sheets in `data/stocks.xlsx` (Portfolio, Watchlist, Russell 2000, Dow Jones, Nasdaq 100, S&P 100). For each ticker it:

1. Fetches fundamental data from **Finviz** (EPS, forward EPS growth, Beta, RSI-14, SMA-200 distance, institutional accumulation).
2. Fetches 150 days of daily OHLCV bars from **Yahoo Finance**.
3. Fetches institutional 13F filing counts from the **NASDAQ API**.
4. Computes a suite of factor signals and cross-ranks them as universe percentiles.
5. Combines the percentile ranks into a composite score (0–100).
6. Writes results back to `ScoresCurrent`, snapshots the previous day's scores for delta tracking, and generates a `Composite_Formula` legend sheet — all color-coded by score.

A separate screener script (`scripts/screenIndex.js`) populates the index sheets by scraping Finviz, post-filtering on Beta, RSI, and Jensen's Alpha, and writing the top-ranked candidates.

---

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
   Composite = 0.30×P(EPS_TTM) + 0.30×P(Fwd_Growth)
             + 0.20×P(MA_Slope_50) + 0.10×P(RSI_14) + 0.10×P(SMA200_Dist)
        │
        ▼  sheets/writeSheet.js
stocks.xlsx → ScoresCurrent | ScoresPreviousDay | Composite_Formula
```

**Screener flow** (`scripts/screenIndex.js`):

```
Finviz screener (paginated HTML scrape)
  → per-ticker Finviz quote + Yahoo Finance prices
  → post-filter: Beta range, RSI minimum, Jensen's Alpha > 0
  → sort by Jensen's Alpha descending
  → top-N tickers written to index sheet in stocks.xlsx
```

---

## Project Structure

```
stocks-analytics-engine/
├── index.js                  # Main entry point — full analytics pipeline
├── visualizer.js             # Reads stocks.xlsx → generates data/report.html (card grid + charts)
├── package.json
├── Dockerfile
├── eslint.config.js
├── data/
│   ├── fundamentals.js       # Finviz quote fetcher (@stonksjs/finviz)
│   ├── prices.js             # Yahoo Finance 150-day OHLCV fetcher
│   └── institutions.js       # NASDAQ API 13F institutional holdings fetcher
├── factors/
│   ├── fundamentals.js       # EPS level/trend, Beta, RSI-14, SMA-200 dist, inst. accum., earnings date
│   ├── technicals.js         # MA slope, volume expansion, relative strength, Jensen's Alpha
│   ├── normalize.js          # percentileRank() — cross-universe ranking
│   └── risk.js               # maxDrawdown() — computed but not in composite
├── scoring/
│   └── scoreEngine.js        # weightedScore() helper (60/40 level/trend blend)
├── scripts/
│   ├── createWorkbook.js     # One-time setup — creates data/stocks.xlsx with all sheets
│   └── screenIndex.js        # Index screener — scrapes Finviz, filters, writes index sheets
├── sheets/
│   ├── auth.js               # Deprecated stub (legacy Google Sheets auth)
│   ├── readSheet.js          # Reads ticker list from a named worksheet (exceljs)
│   └── writeSheet.js         # Writes scores, snapshots, color fills, legend sheet
└── utils/
    └── math.js               # Placeholder (no current exports)
```

---

## Data Sources

| Source                               | Data Retrieved                                                                                                           | Auth                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Finviz** (`finviz.com`)            | EPS TTM, forward EPS, Beta, RSI-14, SMA-200 distance, institutional accumulation %; also HTML-scraped for screener pages | None — browser User-Agent header |
| **Yahoo Finance** (`yahoo-finance2`) | 150-day daily OHLCV bars per ticker; `^OEX` used as the S&P 100 benchmark                                                | None                             |
| **NASDAQ API** (`api.nasdaq.com`)    | Institutional 13F holdings — counts of new and sold-out positions                                                        | None — public API                |

Rate-limit handling includes exponential backoff (up to 5 retries), `Retry-After` header support on HTTP 429 responses, and a 1.2-second inter-request delay between Finviz calls.

---

## Scoring Model

Each signal is independently percentile-ranked across the full ticker universe (0–100), then combined as a weighted sum:

| Factor                 | Signal                                    | Weight |
| ---------------------- | ----------------------------------------- | ------ |
| **EPS Level**          | EPS TTM from Finviz                       | 30%    |
| **EPS Forward Growth** | Forward EPS growth % from Finviz          | 30%    |
| **MA Slope (50-day)**  | 5-day slope of the 50-day moving average  | 20%    |
| **RSI-14**             | Relative Strength Index (14-day)          | 10%    |
| **SMA-200 Distance**   | % distance of price above its 200-day SMA | 10%    |

Additional signals computed but not included in the composite score:

- **Jensen's Alpha** — used for index screener filtering and sorting (α = R_stock − [Rf + β(R_market − Rf)], 63-day window, Rf = 4.3%).
- **Volume Expansion** — 5-day vs. 20-day average volume ratio (≥ 1.2× threshold).
- **Relative Strength** — 63-day return vs. the `^OEX` benchmark.
- **Max Drawdown** — peak-to-trough drawdown from price history.
- **Institutional Accumulation** — Finviz `instTrans` % and NASDAQ 13F new/sold-out counts.
- **Earnings Date** — next scheduled announcement date parsed from Finviz; tickers with earnings in the next 7 days are highlighted in a dedicated card strip in the visual report.

### Output Color Coding

Rows in `ScoresCurrent` are color-coded by composite score:

| Score Range | Color       |
| ----------- | ----------- |
| ≥ 80        | Green       |
| 60 – 79     | Light green |
| 40 – 59     | Yellow      |
| 20 – 39     | Orange      |
| < 20        | Red         |

---

## Prerequisites

- **Node.js** ≥ 20 (Node 24 recommended)
- **npm** ≥ 9

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Excel workbook

Run once to generate `data/stocks.xlsx` with all required sheets pre-populated with default Portfolio and Watchlist tickers:

```bash
node scripts/createWorkbook.js
```

You can then open `data/stocks.xlsx` and edit the **Portfolio** and **Watchlist** sheets to add or remove tickers (one per row, starting at row 2).

---

## Usage

### Run the analytics engine

Fetches data for all tickers across all sheets, computes composite scores, and writes results to `data/stocks.xlsx`:

```bash
npm start
```

### Populate index sheets (screener)

Scrape Finviz, filter, and rank candidates for each major index:

```bash
npm run screen-rut      # Russell 2000
npm run screen-dji      # Dow Jones 30
npm run screen-ndx      # Nasdaq 100
npm run screen-sp100    # S&P 100
npm run screen-all      # All four indices
```


### Generate the visual report

Reads `ScoresCurrent` from `stocks.xlsx` and writes a self-contained `data/report.html` with a score card grid, scatter charts, upcoming earnings strip, and a full sortable data table:

```bash
npm run visualize             # write data/report.html
npm run visualize:serve       # write + open in browser at http://localhost:3000
```

> Run `npm start` first — the report reads from the Excel workbook.

### Combined first-run setup

Creates the workbook and runs all four index screeners in sequence:

```bash
npm run setup
```

---

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

---

## Dependencies

### Production

| Package             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `@stonksjs/finviz`  | Finviz quote scraper                               |
| `axios`             | HTTP client (NASDAQ API, Finviz screener scraping) |
| `dayjs`             | Date arithmetic for Yahoo Finance price windows    |
| `dotenv`            | `.env` file loading                                |
| `exceljs`           | Read/write `data/stocks.xlsx`                      |
| `simple-statistics` | Statistical utility functions                      |

### Development

| Package                             | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `eslint` + `@eslint/js` + `globals` | Linting                                        |
| `eslint-config-prettier`            | Disable ESLint rules conflicting with Prettier |
| `prettier`                          | Code formatting                                |

---

## Configuration

Create a `.env` file in the project root if needed (currently loaded via `dotenv` for future extensibility — no variables are required by the current codebase):

```env
# .env — add any future API keys or config overrides here
```

The workbook path (`data/stocks.xlsx`) is the only persistent state. All sheets must exist before running `npm start` — use `scripts/createWorkbook.js` to initialize them.
