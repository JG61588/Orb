import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
import { enrichSessionsWithIndicators } from './src/utils/indicators.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

interface RawCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch real-world market data using yahoo-finance2 / direct Yahoo Finance API
async function fetchYahooFinanceData(symbol: string, range: string = '1mo', interval: string = '5m') {
  try {
    // 1. First try direct Yahoo Finance chart v8 API (very fast and reliable)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${interval}&range=${range}&includePrePost=false`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const timestamps: number[] = result.timestamp;
        const quote = result.indicators.quote[0];
        const meta = result.meta || {};

        const rawCandles: RawCandle[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const o = quote.open?.[i];
          const h = quote.high?.[i];
          const l = quote.low?.[i];
          const c = quote.close?.[i];
          const v = quote.volume?.[i];

          // Skip invalid / null candles
          if (o != null && h != null && l != null && c != null) {
            rawCandles.push({
              timestamp: timestamps[i],
              open: Number(o.toFixed(2)),
              high: Number(h.toFixed(2)),
              low: Number(l.toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: Math.round(v || 0),
            });
          }
        }

        return {
          symbol: meta.symbol || symbol,
          currency: meta.currency || 'USD',
          regularMarketPrice: meta.regularMarketPrice || rawCandles[rawCandles.length - 1]?.close,
          candles: rawCandles,
        };
      }
    }
  } catch (err) {
    console.warn(`Direct fetch failed for ${symbol}, trying yahooFinance library:`, err);
  }

  // 2. Fallback to yahooFinance library
  try {
    const queryOptions: any = {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
      interval: '5m',
    };
    const chart: any = await (yahooFinance as any).chart(symbol, queryOptions);
    if (chart && chart.quotes) {
      const rawCandles: RawCandle[] = chart.quotes
        .filter((q: any) => q.open != null && q.close != null && q.high != null && q.low != null)
        .map((q: any) => ({
          timestamp: Math.floor(new Date(q.date).getTime() / 1000),
          open: Number(q.open.toFixed(2)),
          high: Number(q.high.toFixed(2)),
          low: Number(q.low.toFixed(2)),
          close: Number(q.close.toFixed(2)),
          volume: Math.round(q.volume || 0),
        }));

      return {
        symbol,
        currency: 'USD',
        regularMarketPrice: rawCandles[rawCandles.length - 1]?.close,
        candles: rawCandles,
      };
    }
  } catch (err) {
    console.error(`yahoo-finance2 fallback failed for ${symbol}:`, err);
  }

  throw new Error(`Failed to fetch Yahoo Finance market data for ${symbol}`);
}

// Group raw 5-minute candles into structured trading day sessions (09:30 - 16:00 EST)
function processSessionsFromCandles(symbol: string, rawCandles: RawCandle[]) {
  // Sort chronologically
  rawCandles.sort((a, b) => a.timestamp - b.timestamp);

  // Group by date (using America/New_York market time)
  const daysMap = new Map<string, RawCandle[]>();

  for (const c of rawCandles) {
    // Format timestamp in US Eastern Time
    const dateObj = new Date(c.timestamp * 1000);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }); // MM/DD/YYYY

    // Extract hour and minute in New York timezone
    const timeParts = dateObj.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }); // HH:MM

    // Filter to standard trading day hours (09:30 to 16:00)
    const [hhStr, mmStr] = timeParts.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    const timeMinutes = hh * 60 + mm;

    // 09:30 is 570 mins, 16:00 is 960 mins
    if (timeMinutes >= 570 && timeMinutes < 960) {
      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, []);
      }
      daysMap.get(dateStr)!.push(c);
    }
  }

  // Convert to DaySession[]
  const sessions: any[] = [];
  let dayIndex = 1;

  for (const [dateStr, candles] of daysMap.entries()) {
    // Must have at least 10 candles to be a valid trading session
    if (candles.length < 10) continue;

    const [m, d, y] = dateStr.split('/');
    const isoDate = `${y}-${m}-${d}`;
    const dateObj = new Date(`${y}-${m}-${d}T12:00:00Z`);
    const dayLabel = `Day ${dayIndex} (${dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })})`;

    let dailyHigh = -Infinity;
    let dailyLow = Infinity;
    const dailyOpen = candles[0].open;
    const dailyClose = candles[candles.length - 1].close;

    const formattedCandles = candles.map((c, i) => {
      const dt = new Date(c.timestamp * 1000);
      const timeStr = dt.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      if (c.high > dailyHigh) dailyHigh = c.high;
      if (c.low < dailyLow) dailyLow = c.low;

      return {
        time: timeStr,
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      };
    });

    sessions.push({
      id: `session-${dayIndex}`,
      date: isoDate,
      dayIndex,
      dayLabel,
      asset: symbol,
      candles: formattedCandles,
      dailyOpen: Number(dailyOpen.toFixed(2)),
      dailyHigh: Number(dailyHigh.toFixed(2)),
      dailyLow: Number(dailyLow.toFixed(2)),
      dailyClose: Number(dailyClose.toFixed(2)),
    });

    dayIndex++;
  }

  // Calculate continuous 200 SMA, Intraday VWAP, 15m 14-ATR, and 1H 50-EMA
  return enrichSessionsWithIndicators(sessions);
}

// Real-world market data API route
app.get('/api/market-data', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string || 'SPY').toUpperCase();
  const range = (req.query.range as string || '1mo');
  const interval = (req.query.interval as string || '5m');

  try {
    const rawData = await fetchYahooFinanceData(symbol, range, interval);
    const sessions = processSessionsFromCandles(symbol, rawData.candles);

    res.json({
      success: true,
      symbol,
      dataFeed: 'Yahoo Finance Live Public Feed',
      requiresApiKey: false,
      lastUpdated: new Date().toISOString(),
      currentPrice: rawData.regularMarketPrice,
      totalSessions: sessions.length,
      sessions,
    });
  } catch (err: any) {
    console.error('Error fetching market data from Yahoo Finance:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Yahoo Finance live data',
    });
  }
});

// Mount Vite in dev, or serve static dist in prod
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
