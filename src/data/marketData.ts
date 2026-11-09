import { Candle, DaySession } from '../types/trading';
import { enrichSessionsWithIndicators } from '../utils/indicators';

export interface AssetProfile {
  symbol: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
}

export const AVAILABLE_ASSETS: AssetProfile[] = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    category: 'Broad Market ETF',
    basePrice: 735.3,
    description: 'Real-world benchmark S&P 500 ETF. High liquidity, institutional ORB breakouts.',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    category: 'Tech Index ETF',
    basePrice: 656.1,
    description: 'Real-world Nasdaq 100 tech ETF. Strong morning opening volume and volatility follow-through.',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    category: 'Mega Tech',
    basePrice: 135.5,
    description: 'High-beta semiconductor leader with explosive morning opening range moves.',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc',
    category: 'Momentum Beta',
    basePrice: 245.0,
    description: 'High-volatility momentum equity with aggressive opening whipsaws and runner trends.',
  },
];

export interface MarketFeedResponse {
  symbol: string;
  dataFeed: string;
  currentPrice: number;
  lastUpdated: string;
  sessions: DaySession[];
  isLive: boolean;
}

// In-memory cache to prevent duplicate network calls when switching between SPY and QQQ
const marketDataCache = new Map<string, { data: MarketFeedResponse; cachedAt: number }>();

// Process raw candles from Yahoo Finance v8 / yahoo-finance2 into structured DaySession[]
export function parseYahooFinanceCandles(
  symbol: string,
  timestamps: number[],
  quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] },
  regularMarketPrice: number
): MarketFeedResponse {
  const rawCandles: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];

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

  // Group by date (America/New_York)
  const daysMap = new Map<string, typeof rawCandles>();

  for (const c of rawCandles) {
    const dateObj = new Date(c.timestamp * 1000);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeParts = dateObj.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [hhStr, mmStr] = timeParts.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    const timeMinutes = hh * 60 + mm;

    // Filter to standard trading day hours (09:30 to 16:00 EST)
    if (timeMinutes >= 570 && timeMinutes < 960) {
      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, []);
      }
      daysMap.get(dateStr)!.push(c);
    }
  }

  const sessions: DaySession[] = [];
  let dayIndex = 1;

  for (const [dateStr, dayCandles] of daysMap.entries()) {
    if (dayCandles.length < 10) continue; // Skip partial half-days or holidays with <10 candles

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
    const dailyOpen = dayCandles[0].open;
    const dailyClose = dayCandles[dayCandles.length - 1].close;

    const formattedCandles: Candle[] = dayCandles.map((c) => {
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
  const enrichedSessions = enrichSessionsWithIndicators(sessions);
  const fallbackPrice = enrichedSessions[0]?.dailyOpen || regularMarketPrice || 500;

  return {
    symbol,
    dataFeed: 'Yahoo Finance Live Public Feed (No API Key Required)',
    currentPrice: regularMarketPrice || enrichedSessions[enrichedSessions.length - 1]?.dailyClose || fallbackPrice,
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sessions: enrichedSessions,
    isLive: true,
  };
}

// Fetch real-world live market data from Yahoo Finance backend proxy or direct feed
export async function fetchLiveMarketData(symbol: string): Promise<MarketFeedResponse> {
  const cached = marketDataCache.get(symbol);
  // Cache for 2 minutes to prevent spamming
  if (cached && Date.now() - cached.cachedAt < 120000) {
    return cached.data;
  }

  // 1. Try our Express backend endpoint `/api/market-data`
  try {
    const apiBase = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const res = await fetch(`${apiBase}/api/market-data?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=5m`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.sessions && data.sessions.length > 0) {
        const enriched = enrichSessionsWithIndicators(data.sessions);
        const feedData: MarketFeedResponse = {
          symbol: data.symbol || symbol,
          dataFeed: data.dataFeed || 'Yahoo Finance Live Feed',
          currentPrice: data.currentPrice || enriched[enriched.length - 1]?.dailyClose,
          lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          sessions: enriched,
          isLive: true,
        };
        marketDataCache.set(symbol, { data: feedData, cachedAt: Date.now() });
        return feedData;
      }
    }
  } catch (err) {
    console.warn(`Local backend /api/market-data request failed for ${symbol}, trying direct Yahoo Finance query:`, err);
  }

  // 2. Direct Yahoo Finance Public Chart v8 Query
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=5m&range=1mo&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const feedData = parseYahooFinanceCandles(
          symbol,
          result.timestamp,
          result.indicators.quote[0],
          result.meta?.regularMarketPrice
        );
        marketDataCache.set(symbol, { data: feedData, cachedAt: Date.now() });
        return feedData;
      }
    }
  } catch (err) {
    console.error(`Direct Yahoo Finance fetch error for ${symbol}:`, err);
  }

  // If cache exists even if expired, return it
  if (cached) {
    return cached.data;
  }

  throw new Error(`Unable to connect to Yahoo Finance public feed for ${symbol}. Please check your connection.`);
}
