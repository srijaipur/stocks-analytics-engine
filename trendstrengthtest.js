import axios from "axios";

 

/**

* Calculates Trend Strength Index [Alpha Extract] metrics for a given ticker.

* @param {string} ticker - The stock or crypto symbol (e.g., 'BTC-USD', 'AAPL').

* @param {number} length - Lookback period for VWMA and ATR (default: 14).

* @returns {Promise<Object>} Calculated elements.

*/

async function getAlphaExtractMetrics(ticker, length = 14) {

    try {

        // 1. Fetch historical OHLCV data using Axios from Yahoo Finance API

        // Fetching length * 4 to ensure we have enough preceding data for accurate rolling averages

        const period1 = Math.floor((Date.now() - (length * 4 * 24 * 60 * 60 * 1000)) / 1000);

        const period2 = Math.floor(Date.now() / 1000);

        const url =
  `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
  `?period1=${period1}` +
  `&period2=${period2}` +
  `&interval=1d`;

  console.log(url);
 

        const response = await axios.get(url, {

            headers: { 'User-Agent': 'Mozilla/5.0' }

        });

        console.log(response.status);
        console.log(Object.keys(response.data));

 

        const result = response.data.chart.result[0];

        const timestamps = result.timestamp;

        const quotes = result.indicators.quote[0];

       

        const close = quotes.close;

        const high = quotes.high;

        const low = quotes.low;

        const volume = quotes.volume;

 

        // Clean out any null/undefined values from Yahoo data gaps

        const data = [];

        for (let i = 0; i < timestamps.length; i++) {

            if (close[i] && high[i] && low[i] && volume[i]) {

                data.push({ close: close[i], high: high[i], low: low[i], volume: volume[i] });

            }

        }

 

        if (data.length < length) {

            throw new Error(`Insufficient data retrieved for ${ticker}.`);

        }

 

        // 2. Pre-calculate structural arrays for VWMA & ATR

        const totalBars = data.length;

        const atrArray = [];

        const vwmaArray = [];

        const trArray = []; // True Range

 

        // Calculate True Range (TR) for all bars

        for (let i = 0; i < totalBars; i++) {

            if (i === 0) {

                trArray.push(data[i].high - data[i].low);

            } else {

                const tr = Math.max(

                    data[i].high - data[i].low,

                    Math.abs(data[i].high - data[i - 1].close),

                    Math.abs(data[i].low - data[i - 1].close)

                );

                trArray.push(tr);

            }

        }

 

        // Generate Rolling ATR and VWMA values up to the latest bars

        for (let i = 0; i < totalBars; i++) {

            if (i < length - 1) {

                atrArray.push(null);

                vwmaArray.push(null);

                continue;

            }

 

            // Slice the active window

            const window = data.slice(i - length + 1, i + 1);

            const trWindow = trArray.slice(i - length + 1, i + 1);

 

            // Calculate ATR (Simple Moving Average of True Range over period)

            const atr = trWindow.reduce((sum, val) => sum + val, 0) / length;

            atrArray.push(atr);

 

            // Calculate VWMA = Sum(Price * Volume) / Sum(Volume)

            let pvSum = 0;

            let volSum = 0;

            window.forEach(bar => {

                pvSum += bar.close * bar.volume;

                volSum += bar.volume;

            });

            const vwma = volSum === 0
    ? window[window.length - 1].close
    : pvSum / volSum;

            vwmaArray.push(vwma);

        }

 

        // 3. Extract calculations for the final target variables

        const idx = totalBars - 1; // Current bar index

        const prevIdx = idx - 1;   // Previous bar index for momentum/signal states

 

        const currentPrice = data[idx].close;

        const currentVwma = vwmaArray[idx];

        const currentAtr = atrArray[idx];

 

        // Core metric: Volume-weighted price deviation normalized by current volatility

        const priceVsVwma = currentPrice - currentVwma;

        const trendStrength = Math.abs(priceVsVwma) / currentAtr;

 

        // Direction mapping based on price relationship to VWMA

        const direction = priceVsVwma > 0 ? "Bullish" : "Bearish";

 

        // Momentum checks the change rate of the trend strength

        const prevPriceVsVwma = data[prevIdx].close - vwmaArray[prevIdx];

        const prevTrendStrength = Math.abs(prevPriceVsVwma) / atrArray[prevIdx];

        const momentum = trendStrength > prevTrendStrength ? "Increasing" : "Decreasing";

 

        // Alpha Extract uses an entry threshold value (Typically 1.2) to confirm active signals

        const SIGNAL_THRESHOLD = 1.2;

        let lastSignal = "Neutral";

        if (trendStrength > SIGNAL_THRESHOLD) {

            lastSignal = direction === "Bullish" ? "Strong Buy" : "Strong Sell";

        } else if (prevTrendStrength > SIGNAL_THRESHOLD && trendStrength <= SIGNAL_THRESHOLD) {

            lastSignal = "Trend Weakening (Exit)";

        }

 

        // Return structured precise values mapping to your required fields

        return {

            "Current Strength": parseFloat(trendStrength.toFixed(4)),

            "Direction": direction,

            "Momentum": momentum,

            "Last Signal": lastSignal,

            "Price vs VWMA": parseFloat(priceVsVwma.toFixed(4)),

            "ATR": parseFloat(currentAtr.toFixed(4))

        };

 

    } catch (error) {

        console.error(`Failed to execute Alpha Extract extraction for ${ticker}:`, error.message);

        throw error;

    }

}
/*
const ticker = "AAPL";

try {
  const metrics = await getAlphaExtractMetrics(ticker);

  console.log(metrics);
} catch (err) {
  console.error(err);
}
*/

const ticker = "IOT";

try {
  const metrics = await getAlphaExtractMetrics(ticker);
  

  console.log("Current Strength :", metrics["Current Strength"]);
  console.log("Direction       :", metrics["Direction"]);
  console.log("Momentum        :", metrics["Momentum"]);
  console.log("Last Signal     :", metrics["Last Signal"]);
  console.log("Price vs VWMA   :", metrics["Price vs VWMA"]);
  console.log("ATR             :", metrics["ATR"]);
} catch (err) {
  console.error(err);
}

