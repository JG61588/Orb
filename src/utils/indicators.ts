import { DaySession } from '../types/trading';

/**
 * Calculates all technical indicators across all trading sessions:
 * 1. 200-period Simple Moving Average (SMA) on 5m chart
 * 2. Daily Intraday Volume-Weighted Average Price (VWAP)
 * 3. 14-period Average True Range (ATR) on 15-minute timeframe
 * 4. 50-period Exponential Moving Average (EMA) on 1-hour timeframe + 1H trend bias
 */
export function enrichSessionsWithIndicators(sessions: DaySession[]): DaySession[] {
  if (sessions.length === 0) return sessions;

  // Flatten all 5m candles in chronological order for multi-timeframe aggregation
  const allCandlesWithSession: { candle: any; sessionIndex: number; candleIndex: number }[] = [];
  for (let s = 0; s < sessions.length; s++) {
    for (let c = 0; c < sessions[s].candles.length; c++) {
      allCandlesWithSession.push({
        candle: sessions[s].candles[c],
        sessionIndex: s,
        candleIndex: c,
      });
    }
  }

  if (allCandlesWithSession.length === 0) return sessions;

  // 1. Calculate Intraday VWAP for each session independently
  for (const session of sessions) {
    let cumVolume = 0;
    let cumTypicalPriceVolume = 0;

    for (const candle of session.candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumTypicalPriceVolume += typicalPrice * candle.volume;
      cumVolume += candle.volume;

      candle.vwap = Number((cumVolume > 0 ? cumTypicalPriceVolume / cumVolume : candle.close).toFixed(2));
      candle.bodySize = Number(Math.abs(candle.close - candle.open).toFixed(2));
    }
  }

  // 2. Calculate Continuous 200-period SMA on 5m candles
  const basePrice = sessions[0]?.dailyOpen || allCandlesWithSession[0].candle.open || 500;
  const smaWindow: number[] = [];
  for (let w = 0; w < 200; w++) {
    smaWindow.push(basePrice);
  }
  let smaSum = basePrice * 200;

  for (const item of allCandlesWithSession) {
    const popped = smaWindow.shift() || basePrice;
    smaWindow.push(item.candle.close);
    smaSum = smaSum - popped + item.candle.close;
    item.candle.sma200 = Number((smaSum / 200).toFixed(2));
  }

  // 3. Build 15-Minute Candles and calculate 14-period ATR
  interface Bar15m {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
    candlePointers: any[];
  }

  const bars15m: Bar15m[] = [];
  let current15m: Bar15m | null = null;
  let current15mKey = '';

  for (const item of allCandlesWithSession) {
    const c = item.candle;
    const dateObj = new Date(c.timestamp * 1000);
    // 15m bucket key: YYYY-MM-DD HH:(00|15|30|45)
    const minutes = dateObj.getMinutes();
    const bucketMin = Math.floor(minutes / 15) * 15;
    const key = `${dateObj.toDateString()}-${dateObj.getHours()}-${bucketMin}`;

    if (!current15m || current15mKey !== key) {
      if (current15m) {
        bars15m.push(current15m);
      }
      current15mKey = key;
      current15m = {
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        timestamp: c.timestamp,
        candlePointers: [c],
      };
    } else {
      if (c.high > current15m.high) current15m.high = c.high;
      if (c.low < current15m.low) current15m.low = c.low;
      current15m.close = c.close;
      current15m.volume += c.volume;
      current15m.candlePointers.push(c);
    }
  }
  if (current15m) {
    bars15m.push(current15m);
  }

  // Calculate 14 ATR on 15m bars
  const atrPeriod = 14;
  let runningAtr = 0;
  const trs: number[] = [];

  for (let b = 0; b < bars15m.length; b++) {
    const bar = bars15m[b];
    let tr = bar.high - bar.low;
    if (b > 0) {
      const prevClose = bars15m[b - 1].close;
      tr = Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
    }
    trs.push(tr);

    if (b < atrPeriod) {
      const sum = trs.reduce((acc, v) => acc + v, 0);
      runningAtr = sum / trs.length;
    } else {
      // Wilder's smoothing: (priorATR * 13 + currentTR) / 14
      runningAtr = (runningAtr * (atrPeriod - 1) + tr) / atrPeriod;
    }

    const roundedAtr = Number(Math.max(0.1, runningAtr).toFixed(2));
    // Assign ATR to each 5m candle in this 15m period
    for (const ptr of bar.candlePointers) {
      ptr.atr15m = roundedAtr;
    }
  }

  // 4. Build 1-Hour Candles and calculate 50-period EMA
  interface Bar1h {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
    candlePointers: any[];
  }

  const bars1h: Bar1h[] = [];
  let current1h: Bar1h | null = null;
  let current1hKey = '';

  for (const item of allCandlesWithSession) {
    const c = item.candle;
    const dateObj = new Date(c.timestamp * 1000);
    const key = `${dateObj.toDateString()}-${dateObj.getHours()}`;

    if (!current1h || current1hKey !== key) {
      if (current1h) {
        bars1h.push(current1h);
      }
      current1hKey = key;
      current1h = {
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        timestamp: c.timestamp,
        candlePointers: [c],
      };
    } else {
      if (c.high > current1h.high) current1h.high = c.high;
      if (c.low < current1h.low) current1h.low = c.low;
      current1h.close = c.close;
      current1h.volume += c.volume;
      current1h.candlePointers.push(c);
    }
  }
  if (current1h) {
    bars1h.push(current1h);
  }

  // Calculate 50 EMA on 1-hour closes
  const emaPeriod = 50;
  const emaMultiplier = 2 / (emaPeriod + 1); // 2 / 51 ≈ 0.0392
  let runningEma = bars1h[0]?.close || basePrice;

  for (let h = 0; h < bars1h.length; h++) {
    const bar = bars1h[h];
    if (h === 0) {
      runningEma = bar.close;
    } else {
      runningEma = bar.close * emaMultiplier + runningEma * (1 - emaMultiplier);
    }

    const roundedEma = Number(runningEma.toFixed(2));
    for (const ptr of bar.candlePointers) {
      ptr.ema50_1h = roundedEma;
      ptr.is1hBullish = ptr.close >= roundedEma;
    }
  }

  return sessions;
}
