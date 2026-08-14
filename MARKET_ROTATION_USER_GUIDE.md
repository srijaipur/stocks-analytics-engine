# Market Rotation Analyzer — User Guide for Investors
**Simple, Easy-to-Understand Guide for Making Better Investment Decisions**

---

## 📱 What is This Tool?

Think of the **Market Rotation Analyzer** as your personal **investment referee** that watches 11 different market sectors and tells you:

- 🏆 **Which sectors are winning** (best performers)
- 📉 **Which sectors are losing** (worst performers)
- 🔄 **When to switch** between sectors
- 📊 **How strong the market** is overall

**In plain English**: This tool helps you know *when* to move your money from slow sectors to fast sectors.

---

## 🚀 How to Run It

### Option 1: Access via Web (Easiest - Requires Login)
If the server is running, open this link in your browser:
```
http://localhost:3000/data/marketrotation-loader.html
```
This automatically handles authentication and displays your market rotation report.

### Option 2: Generate Report Locally (Takes ~35 seconds)
Open your terminal and type:
```bash
npm run visualize:rotation
```
This creates an HTML file called `marketrotation.html` that you can open in your browser.

### Option 3: Generate Report & Open in Browser (No Server Needed)
```bash
npm run visualize:rotation:serve
```
This automatically opens the report in your browser so you can see results immediately.

---

## 📊 Understanding Your Report

When you open the report, you'll see three tabs: **Overview**, **Sectors**, and **Indices**.

### **Overview Tab** (Start Here!)

#### 1. **Rotation Score** — The Traffic Light
```
Score Range:  What It Means:
0–20          🟢 GREEN (Stable) — All sectors moving together, no switching needed
20–50         🟡 YELLOW (Mild) — Some sectors performing better
50–75         🟠 ORANGE (Moderate) — Clear leaders and laggards, time to switch!
75–100        🔴 RED (Strong) — Major divergence, great rotation opportunity
```

**Real Example**: 
- Score = 68.9 (MODERATE_ROTATION) → Energy sector is up 7.6%, Consumer Discretionary is down 1.2%
- **Action**: Good time to consider moving money from Consumer stocks to Energy stocks

#### 2. **Sectors Up / Down**
Shows how many sectors are performing well:
```
Sectors Up: 9 of 11

Translation: 
- 9 sectors are making money
- Only 2 sectors are losing money
- This is HEALTHY (means the market is broadly strong)
```

**What to Look For**:
- 9+ sectors up = Healthy market, broad-based gains ✅
- 5-8 sectors up = Mixed market, be careful
- 0-4 sectors up = Weak market, consider defensive stocks ⚠️

#### 3. **Best & Worst Index**
Shows which major market index is winning:
```
Best Index:   Nasdaq 100 (+1.14%)
Worst Index:  Dow Jones (-0.49%)

Translation:
- Tech stocks (Nasdaq) are doing great
- Large-cap blue-chip stocks (Dow) are struggling
- If you own Nasdaq → Doing well 👍
- If you own Dow → Consider switching 👎
```

#### 4. **Sector Performance Heatmap** (The Colored Grid)
This is like a visual "traffic light" for all 11 sectors:

```
🟩 Dark Green Box  = Sector UP big (≥ +5%)
🟩 Light Green Box = Sector UP small (+0% to +5%)
🟥 Light Red Box   = Sector DOWN small (-0% to -5%)
🟥 Dark Red Box    = Sector DOWN big (< -5%)
```

**Each colored box shows**:
- Sector name (e.g., "Energy")
- Performance (e.g., "+7.6%")

**What to Do**:
- 🟩 Dark Green → **Best buy**: These sectors are hot
- 🟥 Dark Red → **Consider selling**: These sectors are struggling

---

### **Sectors Tab** (Details for Each Sector)

#### 1. **Leaders & Laggards Section**
Shows the **Top 3 Winning Sectors** and **Bottom 3 Losing Sectors**:

```
🏆 Top Performers (Leaders):
1. Energy:                +7.62%
2. Communication Services: +1.59%
3. Technology:            +1.30%

📉 Bottom Performers (Laggards):
1. Consumer Discretionary: -1.23%
2. Materials:             -0.75%
3. Real Estate:           +0.24%
```

**What to Do**:
- **Leaders**: Consider buying these sectors
- **Laggards**: Consider selling these sectors (or reduce holdings)
- **Pairs Strategy**: Buy Leaders + Sell Laggards to profit from the difference

#### 2. **Detailed Sector Metrics Table**
A full table showing everything about each sector:

| What You See | What It Means |
|--------------|---------------|
| **5D %** | How much the sector gained/lost in last 5 days |
| **21D %** | How much in the last 21 days (about 1 month) |
| **63D %** | How much in the last 63 days (about 3 months) |
| **YTD %** | How much since January 1st this year |
| **RS vs OEX** | Is this sector beating the S&P 100 benchmark? |
| **Rank** | What position is it? (#1 = best, #11 = worst) |

**Quick Read**: 
- Look at **5D %** column to see short-term winners/losers
- Look at **21D % or 63D %** to see longer trends
- Green numbers = Good, Red numbers = Bad

---

### **Indices Tab** (The Big Market Indicators)

Shows performance of 4 major market indices (the "big guys"):

| Index | What It Represents |
|-------|-------------------|
| **S&P 100** | 100 largest US companies (your benchmark) |
| **Russell 2000** | Small-cap companies |
| **Dow Jones** | 30 biggest blue-chip companies |
| **Nasdaq 100** | Tech and growth companies |

**How to Read It**:
- **S&P 100** is your **baseline** — compare everything to this
- **Nasdaq leading?** → Growth/Tech season is hot
- **Russell 2000 leading?** → Small-cap season is hot
- **Dow leading?** → Large-cap/Value season is hot

---

## 💡 Real-World Examples

### Example 1: Time to Rotate from Growth to Value

**Scenario**: You look at your report today:
```
Rotation Score: 75 (STRONG_ROTATION)
Leaders: Energy (+7.6%), Financials (+3.2%), Materials (+2.1%)
Laggards: Technology (+0.5%), Communication Services (-0.2%)
S&P 100: +0.5%  ← Benchmark is flat
```

**What This Tells You**:
- Strong rotation happening (Score = 75)
- Growth sectors (Tech, Comm) are slowing down
- Value sectors (Energy, Financials) are accelerating
- **Action**: Consider moving 20-30% of Tech holdings to Energy/Financials

### Example 2: Healthy Broad-Based Market

**Scenario**:
```
Rotation Score: 35 (MILD_ROTATION)
Sectors Up: 10 of 11
Breadth: 91% advancing
S&P 100: +1.2%  ← Strong benchmark gain
```

**What This Tells You**:
- All sectors moving up together (no rotation yet)
- Broad-based rally (most sectors participating)
- Market is healthy and strong
- **Action**: Hold positions, market is doing well. No need to rotate.

### Example 3: Weak Market with Concentration

**Scenario**:
```
Rotation Score: 12 (STABLE)
Sectors Up: 3 of 11
Breadth: 27% advancing
S&P 100: -0.8%  ← Market is down
```

**What This Tells You**:
- Market is struggling (only 3 sectors up)
- Concentrated rally (a few sectors carrying the market)
- Weak breadth = risky situation
- **Action**: Consider moving to defensive sectors (Healthcare, Utilities) or reduce stock holdings

---

## 🎯 Investment Strategies Using This Report

### Strategy 1: Simple Sector Rotation
**Best For**: Investors who want to chase trends

**Steps**:
1. Check the **Leaders & Laggards** section
2. Identify top 3 performing sectors
3. Move 10-20% of portfolio to top 3 sectors
4. Remove holdings from bottom 3 sectors
5. Check report every week or month

**Example**:
```
Current portfolio: 50% Tech, 20% Healthcare, 30% Cash

After Rotation:
Look at report → Energy and Financials are top performers
New portfolio: 30% Tech, 10% Healthcare, 30% Energy, 20% Financials, 10% Cash
```

### Strategy 2: Pairs Trading (Advanced)
**Best For**: Investors with brokerage accounts that support short selling

**Steps**:
1. BUY (Long) the top 3 sectors
2. SELL SHORT (Bet against) the bottom 3 sectors
3. Profit when top performers go higher AND laggards go lower
4. Reduce positions when Rotation Score drops below 50

**Example**:
```
Buy: $10,000 worth of Energy ETF (XLE)
Short: $10,000 worth of Consumer Discretionary ETF (XLY)

If Energy goes up 5% and Consumer Discretionary goes down 2%:
Your profit = 5% + 2% = 7% on your investment
```

### Strategy 3: Breadth Trading
**Best For**: Conservative investors

**Steps**:
1. Check "Sectors Up" number
2. If 9+ sectors up → Increase stock holdings (market is healthy)
3. If 5-8 sectors up → Hold current position (mixed market)
4. If 0-4 sectors up → Move to defensive stocks (market is weak)

**Example**:
```
Monday:  Sectors Up: 10/11 → Increase portfolio to 80% stocks, 20% cash
Friday:  Sectors Up: 3/11  → Reduce to 40% stocks, 60% cash
```

### Strategy 4: Index Selection
**Best For**: Index fund and ETF investors

**Steps**:
1. Check which index is performing best
2. If Nasdaq leading → Buy Nasdaq 100 ETF (QQQ)
3. If Russell 2000 leading → Buy Small-cap ETF (IWM)
4. If Dow leading → Buy Dow ETF (DIA)

**Example**:
```
Report shows:
- Nasdaq 100: +2.5% ✅
- Russell 2000: -0.3%
- Dow Jones: -0.1%

Action: Buy Nasdaq 100 ETF for the next 1-3 months
```

---

## 📌 Key Numbers to Watch

### The Rotation Score (Most Important!)
```
Score < 20:  Ignore rotation signals, hold positions
Score 20-50: Mild rotation, consider small position changes (5-10%)
Score 50-75: Moderate rotation, consider moderate changes (10-20%)
Score > 75:  Strong rotation, can make bigger moves (20-30%+)
```

### Sectors Up % (Market Health)
```
≥75%: Healthy, broad-based market
50-75%: Mixed, be careful with new positions
<50%: Weak, consider defensive moves
```

### Relative Strength (Outperformance)
```
+3% or higher: Strong outperformer, BUY
+1% to +3%:    Mild outperformer, HOLD
-1% to +1%:    In-line with benchmark, HOLD
-1% to -3%:    Underperformer, CONSIDER SELLING
-3% or lower:  Weak underperformer, SELL
```

---

## 🎨 Color Guide

### Heatmap Colors (Quick Reference)
```
🟩 Dark Green  (#2ecc71)   Sector is UP ≥5%        → BUY SIGNAL
🟩 Light Green (#74c69d)   Sector is UP 0-5%       → HOLD
🟥 Light Red   (#ffb3b3)   Sector is DOWN 0-5%     → HOLD
🟥 Dark Red    (#c92a2a)   Sector is DOWN ≥5%      → SELL SIGNAL
```

### Table Numbers (Quick Reference)
```
🟢 Green Number    Positive return, sector is up
🔴 Red Number      Negative return, sector is down
```

---

## ❓ FAQ for Investors

### Q1: How Often Should I Check This Report?
**A**: 
- **Active traders**: Daily or several times per week
- **Swing traders**: Weekly
- **Long-term investors**: Monthly or quarterly
- Minimum: Once per month to stay aware

### Q2: Can I Trust This Tool?
**A**: 
Yes! It uses:
- Real price data from Yahoo Finance
- Industry-standard financial formulas
- Same techniques used by professional investors
- However, past performance doesn't guarantee future results. Always do your own research.

### Q3: What Sectors Are These?
**A**: These are the 11 major sectors that make up the S&P 500:

| Sector | Companies |
|--------|-----------|
| **Technology** | Apple, Microsoft, Google, Meta, Tesla |
| **Healthcare** | Pfizer, Johnson & Johnson, UnitedHealth |
| **Financials** | JPMorgan, Goldman Sachs, Berkshire Hathaway |
| **Consumer Discretionary** | Amazon, Walmart, Nike, McDonald's |
| **Consumer Staples** | Coca-Cola, Procter & Gamble, Costco |
| **Industrials** | Boeing, Caterpillar, 3M |
| **Energy** | ExxonMobil, Chevron, ConocoPhillips |
| **Real Estate (REIT)** | Welltower, Crown Castle, Prologis |
| **Materials** | Dow Inc., Linde, Albemarle |
| **Communication Services** | Comcast, Charter, Disney, Netflix |
| **Utilities** | Duke Energy, NextEra Energy, Southern Company |

### Q4: What Does "RS vs OEX" Mean?
**A**: 
- OEX = S&P 100 (your benchmark)
- RS = "Relative Strength"
- "RS vs OEX +2.5%" = This sector is beating S&P 100 by 2.5%
- Simple: Is this sector doing better than the overall market?

### Q5: Should I Use This for Short-Term or Long-Term Investing?
**A**: 
- **Short-term (Days-Weeks)**: This works GREAT for trading rotation signals
- **Medium-term (Months)**: This works VERY WELL for tactical shifts
- **Long-term (Years)**: Use with less frequency, check quarterly

### Q6: What If I Disagree with the Report?
**A**: 
This tool shows data, not predictions. If you disagree:
1. Check Yahoo Finance manually (use real data)
2. Trust your own research and conviction
3. Don't force a trade because the report says so
4. Always use stop-losses to protect yourself

### Q7: How Much Money Should I Move?
**A**: 
- **Conservative**: 5-10% reallocation (avoid big swings)
- **Moderate**: 10-20% reallocation (common approach)
- **Aggressive**: 20%+ reallocation (only if experienced)
- **Rule of Thumb**: Never move more than 20% at once (avoid timing risk)

### Q8: What's the Percentile Rank?
**A**: 
```
90th percentile = Top 10% (excellent, best performer)
50th percentile = Middle (average)
10th percentile = Bottom 10% (poor, worst performer)
```
**Simple**: Higher percentile = Better performer

---

## 🚨 Risk Warnings

### Important Disclaimers:
1. ⚠️ **Past Performance**: Historical returns don't guarantee future results
2. ⚠️ **Market Risk**: Sectors can change leadership quickly
3. ⚠️ **Concentration Risk**: Overweighting one sector adds risk
4. ⚠️ **Timing Risk**: Switching sectors too often costs money in fees/taxes
5. ⚠️ **No Guarantees**: This tool is one input, not a trading system

### Best Practices:
- ✅ Always use stop-losses (sell if down 5-10%)
- ✅ Don't chase every signal (follow medium-term trends)
- ✅ Keep some cash (for flexibility)
- ✅ Diversify across sectors (don't put all eggs in one basket)
- ✅ Review this report monthly (not daily)
- ✅ Consider tax implications before trading

---

## 🔧 Troubleshooting

### Issue: "Report Won't Open"
**Fix**: 
1. Make sure you ran: `npm run visualize:rotation`
2. Look for file: `data/marketrotation.html`
3. Try opening in Chrome or Firefox (not Edge)

### Issue: "All Numbers Show 0%"
**Fix**: 
- Usually means market is flat (no winners/losers)
- This is normal during sideways markets
- Check tomorrow when market is more active

### Issue: "Some Sectors Show No Data"
**Fix**: 
- Rare situation when Yahoo Finance has issues
- Try running again in 1-2 minutes
- Check your internet connection

### Issue: "Charts Not Displaying"
**Fix**: 
- Your browser may have blocked internet (charts need Chart.js from internet)
- Allow scripts on the page
- Try a different browser

---

## 📚 Glossary (Simple Explanations)

| Term | What It Means |
|------|---------------|
| **Momentum** | Speed of gain/loss (% up or down) |
| **Rotation** | When money moves from one sector to another |
| **Breadth** | How many sectors are participating in rally |
| **Outperformance** | Beating the benchmark (S&P 100) |
| **Laggard** | Worst performing sector |
| **Leader** | Best performing sector |
| **ETF** | Fund that tracks a sector (like XLE for Energy) |
| **Percentile** | Position compared to all others (50th = middle) |
| **Relative Strength** | Comparing to benchmark instead of standalone |
| **Volatility** | How much price bounces up and down |

---

## 💬 Real-Life Example Walkthrough

### Scenario: You're an Investor with $100,000 Portfolio

**Current Holdings**:
- $40,000 in Technology stocks
- $30,000 in Consumer goods  
- $20,000 in Utilities
- $10,000 in Cash

**You Check Your Report and See**:
```
Rotation Score: 65 (MODERATE_ROTATION)
Leaders: Energy (+7.6%), Financials (+2.1%), Industrials (+1.8%)
Laggards: Technology (+0.5%), Consumer Discretionary (-1.2%)
Sectors Up: 9/11 (Healthy)
S&P 100: +0.8%
```

**Your Analysis**:
- Tech is slowing down (only +0.5% vs market +0.8%)
- Energy is HOT (+7.6% vs market +0.8%)
- Rotation score 65 = Good opportunity
- Market is healthy (9/11 sectors up)

**Your Action**:
```
SELL:  $15,000 of Technology (reduce from $40k to $25k)
BUY:   $10,000 of Energy ETF (XLE)
BUY:   $5,000 of Financial ETF (XLF)

New Holdings:
- $25,000 Technology (down from $40k)
- $30,000 Consumer goods (unchanged)
- $20,000 Utilities (unchanged)
- $10,000 Energy (new)
- $5,000 Financials (new)
- $10,000 Cash (unchanged)
```

**Two Weeks Later**:
- Tech down to 40 (lost value) ✅ Good you sold
- Energy up to 85 ✅ Good you bought
- Your rotating saved you money!

---

## 📞 Need Help?

If you have questions:
1. Re-read the **"Key Numbers to Watch"** section above
2. Check the **FAQ** section for common questions
3. Refer to the **Real-Life Examples** section
4. Try a small test trade (1-5% of portfolio) before going bigger

---

## ✅ Checklist Before Making a Trade

Before you trade based on this report, check:

- [ ] Is Rotation Score above 50? (Moderate or Strong rotation)
- [ ] Do Leaders have at least +2% 5D momentum?
- [ ] Do Laggards have negative or flat momentum?
- [ ] Are at least 8/11 sectors up? (Market is healthy)
- [ ] Have I checked my stop-loss? (Risk management)
- [ ] Did I consider tax implications?
- [ ] Am I moving only 5-20% of portfolio? (Not too aggressive)
- [ ] Did I look at the last 21D or 63D (not just 5D)? (Confirm trend)

---

**Remember**: Investing is a marathon, not a sprint. Use this tool to make informed decisions, but don't overreact to every signal. Small, consistent moves are better than big, emotional trades. 

**Happy investing!** 📈

---

**Version**: 1.0  
**Last Updated**: 2026-08-14  
**Audience**: Individual Investors (No Financial Advice)

*Disclaimer: This guide is for educational purposes only. It is not financial advice. Always consult a financial advisor before making investment decisions. Past performance does not guarantee future results.*
