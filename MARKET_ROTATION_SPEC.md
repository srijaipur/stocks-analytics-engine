# Market Rotation Visualizer — App Specification

**Version**: 1.0  
**Status**: Design Phase  
**Date**: 2026-08-14  
**Author**: Investment Analytics Team  

---

## Executive Summary

Create a **Market Rotation Visualizer** (`visualizer-marketrotation.js`) that analyzes sector and index performance trends to help investment professionals identify market rotation signals. This tool uses free data from Yahoo Finance API (via `yahoo-finance2` library) to track momentum across 4 major indices (SP100, RUT, DJI, Nasdaq) and 9 market sectors.

**Key Goals**:
- ✅ Identify which sectors are leading/lagging
- ✅ Spot rotation trends (money moving between sectors)
- ✅ Provide investment-grade signal quality
- ✅ Zero disruption to existing analytics pipeline
- ✅ Standalone execution via new npm script

---

## 1. Product Requirements

### 1.1 Functional Requirements

#### FR1: Index & Sector Performance Tracking
- **Tracked Indices**: S&P 100 (OEX), Russell 2000 (RUT), Dow Jones (DJI), Nasdaq 100 (NDX)
  - Fetch start-of-year historical price data per index (~152-155 trading days)
  - Calculate 5-day, 21-day, 63-day momentum (% return over periods)
  - Track YTD performance
  
- **Tracked Sectors** (9 total):
  - Healthcare (XLV)
  - Financials (XLF)
  - Utilities (XLU)
  - Consumer Staples (XLP)
  - Consumer Discretionary (XLY)
  - Real Estate (XLRE)
  - Materials (XLB)
  - Communication Services (XLC)
  - Energy (XLE)
  - Technology (XLK)
  - Industrials (XLI) — *Optional 11th sector*

#### FR2: Rotation Signal Computation
- **Sector Heatmap**: Performance matrix (relative strength vs S&P 100)
- **Momentum Indicators**:
  - 5-day momentum (short-term trend)
  - 21-day momentum (intermediate trend)
  - 63-day momentum (long-term trend)
  - YTD performance (year-to-date)
- **Rotation Score**: Quantitative metric indicating strength of rotation (0–100 scale)
  - Measures concentration of gains in leading sectors
  - Flags unusual sector divergence

#### FR3: Investment Expert Signals
- **Leading Sectors**: Top 3 sectors by momentum (last 5/21/63 days)
- **Lagging Sectors**: Bottom 3 sectors
- **Rotation Alert**: Triggers when significant shifts occur (e.g., >15% outperformance gap)
- **Breadth**: Cumulative gain/loss count across sectors
- **Relative Strength vs Index**: Each sector vs S&P 100

#### FR4: HTML Report Generation
- **Chart 1**: Sector Performance Heatmap (color-coded grid by momentum)
- **Chart 2**: Index Performance Comparison (line chart, 6-month view)
- **Chart 3**: Sector Momentum Comparison (5D, 21D, 63D, YTD bars)
- **Chart 4**: Rotation Matrix (sector vs sector correlation heatmap)
- **Table**: Detailed metrics per sector/index
  - Columns: Ticker/Sector, 5D%, 21D%, 63D%, YTD%, Rank, Signal
  
#### FR5: Data Export
- Optional: Write rotation metrics to Excel `Rotation_Analysis` sheet
  - Allows historical tracking of rotation trends
  - Enables comparison across multiple run dates

---

### 1.2 Non-Functional Requirements

#### NR1: Performance
- Fetch and compute metrics for 14 instruments in <30 seconds
- HTML generation in <5 seconds
- Minimal memory footprint (<100 MB)

#### NR2: Reliability
- Graceful error handling for missing/incomplete data
- Fallback defaults when a sector/index is unavailable
- Retry logic for failed API calls (existing pattern from `index.js`)

#### NR3: Maintainability
- Zero modifications to existing files (`visualizer.js`, `visualizer-analytics.js`, etc.)
- Self-contained module with clear input/output contracts
- Reusable helper functions for momentum/percentile calculation

#### NR4: Integration
- Independent npm script: `npm run visualize:rotation`
- Optional `--serve` flag to open browser
- Output: `data/marketrotation.html` (alongside existing reports)
- Optional Excel integration: append `Rotation_Analysis` sheet to `data/stocks.xlsx`

---

## 2. Data Model

### 2.1 Instrument Configuration
```javascript
const INSTRUMENTS = {
  indices: {
    "OEX": { label: "S&P 100", ticker: "^OEX" },
    "RUT": { label: "Russell 2000", ticker: "^RUT" },
    "DJI": { label: "Dow Jones Industrial", ticker: "^DJI" },
    "NDX": { label: "Nasdaq 100", ticker: "^NDX" }
  },
  sectors: {
    "XLK": { label: "Technology", sector: "Technology" },
    "XLV": { label: "Healthcare", sector: "Healthcare" },
    "XLF": { label: "Financials", sector: "Financials" },
    "XLP": { label: "Consumer Staples", sector: "Consumer Staples" },
    "XLY": { label: "Consumer Discretionary", sector: "Consumer Discretionary" },
    "XLRE": { label: "Real Estate", sector: "Real Estate" },
    "XLB": { label: "Materials", sector: "Materials" },
    "XLC": { label: "Communication Services", sector: "Communication Services" },
    "XLE": { label: "Energy", sector: "Energy" },
    "XLU": { label: "Utilities", sector: "Utilities" },
    "XLI": { label: "Industrials", sector: "Industrials" }
  }
};
```

### 2.2 Computed Metrics
```javascript
// Per instrument:
{
  ticker: "XLV",
  label: "Healthcare",
  type: "sector", // | "index"
  
  // Price history (oldest-first)
  prices: [
    { date: "2025-02-14", close: 145.23, volume: 12345600 },
    ...
  ],
  
  // Momentum metrics
  momentum: {
    m5d: 2.34,      // 5-day return %
    m21d: 5.67,     // 21-day return %
    m63d: 12.45,    // 63-day return %
    ytd: 8.90,      // Year-to-date return %
  },
  
  // Percentile ranks (vs all instruments)
  percentiles: {
    m5d: 65,
    m21d: 72,
    m63d: 58,
    ytd: 64,
  },
  
  // Relative strength vs S&P 100
  rsVsSP100: {
    m5d: 1.23,      // Outperformance % vs OEX
    m21d: 2.45,
  }
}
```

### 2.3 Rotation Signal
```javascript
{
  timestamp: "2026-08-14T10:30:00Z",
  
  // Leading and lagging sectors
  leaders: [
    { ticker: "XLE", label: "Energy", m5d: 8.9, rank: 1 },
    { ticker: "XLF", label: "Financials", m5d: 4.5, rank: 2 },
    { ticker: "XLV", label: "Healthcare", m5d: 2.1, rank: 3 },
  ],
  
  laggards: [
    { ticker: "XLK", label: "Technology", m5d: -2.3, rank: 11 },
    { ticker: "XLC", label: "Comm Services", m5d: -1.8, rank: 10 },
    { ticker: "XLY", label: "Cons Disc", m5d: 0.2, rank: 9 },
  ],
  
  // Rotation intensity
  rotationScore: 68,  // 0–100
  rotationSignal: "MODERATE_ROTATION", // | "STRONG_ROTATION" | "STABLE"
  
  // Breadth indicators
  breadthUp: 8,       // Number of sectors up
  breadthDown: 3,     // Number of sectors down
  breadthAdvancing: 10, // >0 return
  
  // Index comparison
  bestIndex: "OEX",
  bestIndexReturn: 1.5,
  worstIndex: "RUT",
  worstIndexReturn: -0.8,
}
```

---

## 3. Architecture & Design

### 3.1 Module Structure
```
visualizer-marketrotation.js (main entry)
├── fetchInstrumentData()     → Yahoo Finance API
├── computeMomentum()         → % returns over periods
├── computePercentiles()      → cross-universe ranking
├── computeRelativeStrength() → vs S&P 100
├── generateRotationSignals() → investment logic
├── buildHtml()               → Chart.js visualization
└── serveAndWrite()           → file I/O
```

### 3.2 Code Patterns (Aligned with Project)

**Pattern 1: Reuse existing factor functions**
```javascript
import { getReturn } from "./factors/technicals.js";
import { percentileRank } from "./factors/normalize.js";

// Reuse: getReturn(prices, period) already computes momentum
momentum.m5d = getReturn(prices, 5);
momentum.m21d = getReturn(prices, 21);
momentum.m63d = getReturn(prices, 63);
```

**Pattern 2: Error handling (from index.js)**
```javascript
async function withRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
```

**Pattern 3: HTML generation (from visualizer.js)**
- CDN-based Chart.js for charts
- Self-contained HTML (no external dependencies)
- Dark theme matching existing dashboards
- Responsive grid layout

---

## 4. Technical Specifications

### 4.1 Dependencies
- **Existing**: `yahoo-finance2`, `dayjs`, `chart.js` (CDN)
- **No new npm packages required**

### 4.2 Data Sources
- **Yahoo Finance API** (via `yahoo-finance2`):
  - Indices: `^OEX`, `^RUT`, `^DJI`, `^NDX`
  - Sector ETFs: `XLK`, `XLV`, `XLF`, `XLP`, `XLY`, `XLRE`, `XLB`, `XLC`, `XLE`, `XLU`, `XLI`
  - Start-of-year historical data (~152-155 trading days, matches existing pattern)

### 4.3 Algorithms

#### Algorithm 1: Rotation Score
```
rotationScore = 100 × (max_momentum - min_momentum) / |mean_momentum|
  where max/min/mean are computed across all 11 instruments

Interpretation:
- 0-20:    Stable market (all sectors moving together)
- 20-50:   Mild rotation (some sector divergence)
- 50-75:   Moderate rotation (clear leaders/laggards)
- 75-100:  Strong rotation (high sector divergence)
```

#### Algorithm 2: Relative Strength vs S&P 100
```
rsVsSP100_5d = momentum_sector_5d - momentum_OEX_5d
  Positive = sector outperforming S&P 100
  Negative = sector underperforming
```

#### Algorithm 3: Percentile Ranking
Reuse existing `percentileRank()` from `factors/normalize.js`:
```javascript
percentile = percentileRank(value, [array of all values]);
// Returns 0–100 percentile within universe
```

---

## 5. Implementation Plan

### Phase 1: Core Data Fetch & Processing (~2 hours)
1. Create `visualizer-marketrotation.js` skeleton
2. Implement `fetchInstrumentData()` using yahoo-finance2
3. Implement `computeMomentum()` reusing `getReturn()`
4. Implement `computePercentiles()` reusing `percentileRank()`
5. Add error handling & retry logic
6. **Verification**: Log computed metrics to console

### Phase 2: Signal Generation (~1 hour)
7. Implement `generateRotationSignals()`
8. Compute rotation score, leaders, laggards
9. Calculate breadth indicators
10. **Verification**: Validate signal thresholds with historical data

### Phase 3: HTML Visualization (~2 hours)
11. Create `buildHtml()` with Chart.js integration
12. Build heatmap chart (sector performance matrix)
13. Build line chart (index comparison, 6 months)
14. Build bar chart (momentum comparison)
15. Build table with all metrics
16. **Verification**: Visual inspection in browser

### Phase 4: Integration & Testing (~1 hour)
17. Add `npm run visualize:rotation` script to package.json
18. Add `--serve` flag support
19. Optional: Add Excel writer for historical tracking
20. Test full pipeline end-to-end
21. **Verification**: Run against live market data

---

## 6. Acceptance Criteria

- [ ] Fetches 11 instruments (4 indices + 7 sectors) in <30 seconds
- [ ] Generates `data/marketrotation.html` in <5 seconds
- [ ] HTML renders without errors on Chrome/Firefox/Safari
- [ ] Charts are interactive (hover, legend toggle)
- [ ] All 14 instruments show correct momentum values
- [ ] Rotation score matches algorithm (within ±2 points)
- [ ] Leaders/laggards correctly identified
- [ ] No existing files modified
- [ ] `npm run visualize:rotation` succeeds
- [ ] `npm run visualize:rotation --serve` opens browser
- [ ] README updated with new feature docs

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Yahoo Finance API downtime | Graceful fallback with cached data or N/A values |
| Missing price data for a sector ETF | Skip that instrument, log warning, continue |
| Performance regression in existing pipeline | Zero modifications to existing files; verify package.json unchanged |
| User confusion (new report) | Document in README.md with screenshot and interpretation guide |

---

## 8. Future Enhancements

1. **Correlation Analysis**: Show sector correlations (money flow patterns)
2. **Rotation Prediction**: ML-based signal for sector rotations ahead
3. **Real-time Alerts**: WebSocket integration for intraday signals
4. **Sector Basket Screener**: Suggest top 3 stocks per leading sector
5. **Portfolio Stress Test**: Show portfolio exposure to rotation shifts
6. **International Markets**: Extend to global sector/index tracking

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| **Rotation** | Money flowing from one sector/asset class to another |
| **Momentum** | % return over a defined period (5D, 21D, 63D, YTD) |
| **Relative Strength** | Outperformance vs a benchmark (e.g., S&P 100) |
| **Breadth** | Count of sectors advancing (positive return) vs declining |
| **Heatmap** | Color-coded matrix showing performance comparison |
| **YTD** | Year-to-date return (Jan 1 to today), computed dynamically based on available trading days in fetched data |

---

**Appendix A: Sector ETF Tickers**

| Sector | Ticker | Provider |
|--------|--------|----------|
| Technology | XLK | Vanguard |
| Healthcare | XLV | Vanguard |
| Financials | XLF | Vanguard |
| Consumer Staples | XLP | Vanguard |
| Consumer Discretionary | XLY | Vanguard |
| Real Estate | XLRE | Vanguard |
| Materials | XLB | Vanguard |
| Communication Services | XLC | Vanguard |
| Energy | XLE | Vanguard |
| Utilities | XLU | Vanguard |
| Industrials | XLI | Vanguard |

---

**Appendix B: Index Tickers**

| Index | Ticker | Company |
|-------|--------|---------|
| S&P 100 | OEX / ^OEX | Yahoo Finance symbol |
| Russell 2000 | RUT / ^RUT | Yahoo Finance symbol |
| Dow Jones Industrial | DJI / ^DJI | Yahoo Finance symbol |
| Nasdaq 100 | NDX / ^NDX | Yahoo Finance symbol |

