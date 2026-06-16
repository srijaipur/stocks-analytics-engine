# Intrinsic Value Engine Implementation Plan

## Overview

This document describes the technical implementation plan for the `intrinsicvalueengine` feature branch. The goal is to build a static nightly report in `data/intrinsicvalue-report.html` for `portfolio` tickers only, using Firestore-backed configuration and existing repo patterns.

The report should:
- use `portfolio` tickers from `lib/loadTickerConfig.js`
- fetch data from Yahoo Finance and StockAnalysis.com
- compute current intrinsic value and historical intrinsic series
- render summary, risk & quality panels, and chart overlays
- generate a self-contained HTML file under `data/`
- support Firebase auth gating with an auth loader page
- reuse existing repo conventions from `report.html` and `analytics.html`

## Goals

- Build a report consistent with existing static report pages
- Keep the output in `data/`
- Maintain fault tolerance and rate-limit retry behavior
- Fully recompute nightly
- Integrate Firebase auth loader similar to `feature/googleauth-security-hardening-clean`

## Functional Requirements

1. **Portfolio-only ticker source**
   - Load tickers from Firestore `config/tickers` via `lib/loadTickerConfig.js`
   - Fall back to `data/tickers.json` if Firestore is unavailable

2. **Data fetching**
   - Use Yahoo Finance for current stock price and 1-year price history
   - Use StockAnalysis.com for fundamentals and company metrics
   - Fetch quarterly financial history if available; fall back to annual
   - Normalize data into the engine input shape

3. **Valuation calculations**
   - Compute DCF, EPV, and Relative valuations
   - Combine valuations into intrinsic low/high/avg
   - Calculate MOS, recommendation label, confidence score, and sentinel flags
   - Build a historical intrinsic series from prior periods

4. **Report output**
   - Generate a static HTML page at `data/intrinsicvalue-report.html`
   - Render the page from a Node build script under `/intrinsicvalueengine`
   - Include summary cards, risk panels, a price + intrinsic overlay chart, and historical intrinsic trend

5. **Security**
   - Add an auth loader page at `data/intrinsicvalue-loader.html`
   - Gate access through Firebase auth using existing app auth patterns

6. **Build process**
   - Add a build script in `/intrinsicvalueengine`
   - Add a root package script entry for building the report
   - Recompute the report fully each nightly execution

## Non-functional Requirements

- **Consistency**: Align with existing `data/report.html` and `data/analytics.html` page style and build model.
- **Reliability**: Use retry/backoff and per-ticker error isolation.
- **Performance**: Build data offline in Node, keep client HTML lightweight.
- **Maintainability**: Keep new code confined to `/intrinsicvalueengine`, reuse shared modules.
- **Security**: Keep Firebase auth gating aligned with current application security.

## Data Source Strategy

### Primary sources
- `yahoo-finance2` for price history and current price
- `stockanalysis.com` for fundamentals and company data

### Fallbacks
- Use fallback or optional free data sources only when StockAnalysis lacks required historical financials.
- Avoid crashes on missing fields; generate partial output and log warnings.

### Rate limiting and retry policy
- Retry transient failures with exponential backoff
- Use small per-ticker delays in the build
- Continue processing remaining tickers if one fails

## File Structure and Responsibilities

### New files to add

- `intrinsicvalueengine/services/stockAnalysisService.js`
  - fetch fundamentals and financial history from StockAnalysis.com
  - parse the needed metrics and load them into a normalized object
  - implement retry/backoff and fault-tolerant fetching

- `intrinsicvalueengine/services/yahooService.js`
  - fetch price history and current quote from Yahoo Finance
  - return normalized price series and quote metadata

- `intrinsicvalueengine/services/dataService.js`
  - orchestrate Yahoo + StockAnalysis data collection
  - return a consistent normalized ticker payload for the valuation engine

- `intrinsicvalueengine/core/historicalIntrinsic.js`
  - compute historical intrinsic values for past financial periods
  - produce series data for charting

- `intrinsicvalueengine/core/valuationEngine.js`
  - retain current DCF/EPV/Relative calculations
  - add a helper to compute historical intrinsic series from prior periods

- `intrinsicvalueengine/buildIntrinsicReport.js`
  - main Node build script for the report
  - load portfolio tickers from `lib/loadTickerConfig.js`
  - fetch and normalize ticker data
  - compute current + historical intrinsic results
  - generate `data/intrinsicvalue-report.html`

- `intrinsicvalueengine/templates/intrinsicReportTemplate.js`
  - build the HTML payload with embedded data and chart rendering logic
  - keep the page self-contained and static

- `data/intrinsicvalue-loader.html`
  - Firebase auth gating page
  - ensure only authenticated users see the report

### Shared/reused files

- `lib/loadTickerConfig.js`
  - loads ticker config from Firestore or local fallback

- `firebase/firebaseConfig.js`
  - provides Firebase app initialization

- `firebase/firestore.js`
  - reads `config/tickers` from Firestore

## Page Layout

The generated report should include:

- **Header**
  - build timestamp
  - report title and description
  - portfolio ticker count and data sources

- **Ticker summary cards**
  - ticker symbol
  - current price
  - average intrinsic value
  - MOS
  - recommendation
  - confidence score

- **Risk & Quality panels**
  - sentinel flags
  - earnings quality score
  - leverage/cash warning

- **Charts**
  - 1-year price history with intrinsic low/high band overlay
  - historical intrinsic value trend
  - optional price-to-intrinsic ratio or trend overlay

- **Per-ticker detail rows or blocks**
  - key inputs and assumptions
  - historical valuations by period

- **Footer**
  - build metadata
  - source attribution

## Build Flow

1. `buildIntrinsicReport.js` loads portfolio tickers.
2. The script fetches current and historical data for each ticker.
3. It computes valuation results and historical intrinsic series.
4. The report template combines the data into a static HTML file.
5. The script writes `data/intrinsicvalue-report.html`.
6. `data/intrinsicvalue-loader.html` provides auth-protected entry.

## Implementation Steps

### Step 1: Data service layer
- Build a Yahoo service for price data
- Build a StockAnalysis service for fundamentals and financial history
- Normalize results in `dataService.js`

### Step 2: Valuation logic
- Keep current valuation model in `valuationEngine.js`
- Add historical intrinsic series support in `historicalIntrinsic.js`
- Ensure the engine can compute both current and historical valuations

### Step 3: Report generation
- Create `buildIntrinsicReport.js` to orchestrate data fetch and report generation
- Build a template to emit static HTML into `data/intrinsicvalue-report.html`

### Step 4: Auth loader
- Add `data/intrinsicvalue-loader.html` using existing Firebase auth patterns
- Gate access to the static report

### Step 5: Build integration
- Add root npm script for the new build
- Optionally add a GitHub Actions workflow step later

## Notes on historical intrinsic series

- Use quarterly financials if available
- Fall back to annual statements if quarterly data is missing
- Compute one intrinsic value per historical period using the same valuation formulas
- Include `period`, `dcf`, `epv`, `relative`, `avg`, and `priceAtPeriodEnd`

## Notes on fault tolerance

- Use per-ticker try/catch during the build
- Continue building the report if one ticker fails
- Show a warning row or icon for incomplete data in the report
- Preserve the report even with partial results

## Example build target files

- `data/intrinsicvalue-report.html`
- `data/intrinsicvalue-loader.html`
- `data/intrinsicvalue-report.json` (optional runtime payload)

## Next action

Implement the scaffolding and code files described in this plan. The first code step is to create the service layer, then the valuation extension, and finally the static page builder.
