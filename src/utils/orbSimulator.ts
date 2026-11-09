import {
  DaySession,
  EquityPoint,
  ExitReason,
  SimulationResult,
  StrategySettings,
  Trade,
  TradeDirection,
} from '../types/trading';

export function runOrbSimulation(
  sessions: DaySession[],
  settings: StrategySettings
): SimulationResult {
  const trades: Trade[] = [];
  let currentBalance = settings.initialBalance;
  let peakBalance = settings.initialBalance;
  let maxDrawdownPercent = 0;
  let maxDrawdownDollar = 0;

  const equityCurve: EquityPoint[] = [
    {
      index: 0,
      tradeNum: 0,
      date: sessions[0]?.date || 'Start',
      time: '09:30',
      balance: Number(currentBalance.toFixed(2)),
      netPnl: 0,
      drawdownPercent: 0,
      drawdownDollar: 0,
    },
  ];

  // Number of 5-min candles for opening range
  const orbCandleCount = Math.max(1, Math.floor(settings.orbMinutes / 5));

  for (const session of sessions) {
    if (currentBalance <= 0.5) {
      // Account wiped out (margin stop)
      break;
    }

    const candles = session.candles;
    if (candles.length <= orbCandleCount + 2) continue;

    // 1. Establish Opening Range
    let orh = -Infinity;
    let orl = Infinity;
    for (let i = 0; i < orbCandleCount; i++) {
      if (candles[i].high > orh) orh = candles[i].high;
      if (candles[i].low < orl) orl = candles[i].low;
    }

    let tradesToday = 0;
    let i = orbCandleCount;

    while (i < candles.length && tradesToday < settings.maxTradesPerDay) {
      const candle = candles[i];
      let triggeredDirection: TradeDirection | null = null;
      let breakoutPrice = 0;

      // Check breakout conditions
      const canGoLong = settings.direction === 'BOTH' || settings.direction === 'LONG_ONLY';
      const canGoShort = settings.direction === 'BOTH' || settings.direction === 'SHORT_ONLY';

      const breaksHigh = candle.high > orh;
      const breaksLow = candle.low < orl;

      // 1. 200-period SMA Filter: only take long trades if price is above 200 SMA
      const candleSma = candle.sma200;
      let smaPassLong = true;
      let smaPassShort = true;

      if (settings.useSma200Filter && candleSma !== undefined) {
        smaPassLong = candle.close > candleSma;
        smaPassShort = candle.close < candleSma;
      }

      // 2. Breakout Volume Confirmation:
      // Breakout candle must have volume >= 1.5x of the previous 5 candles' average volume
      const priorStart = Math.max(0, i - 5);
      const priorCount = i - priorStart;
      let priorVolSum = 0;
      for (let v = priorStart; v < i; v++) {
        priorVolSum += candles[v].volume;
      }
      const priorAvgVolume = priorCount > 0 ? priorVolSum / priorCount : candle.volume;
      const volumeRatio = priorAvgVolume > 0 ? Number((candle.volume / priorAvgVolume).toFixed(2)) : 1.0;

      let volumePass = true;
      if (settings.useVolumeConfirmation) {
        volumePass = candle.volume >= settings.volumeMultiplier * priorAvgVolume;
      }

      // 3. Average True Range (ATR) Volatility Filter:
      // Breakout candle's body size must be > 1.2x of the 14-period ATR on 15m chart
      const currentAtr15m = candle.atr15m || Math.max(0.2, candle.high - candle.low);
      const candleBody = candle.bodySize !== undefined ? candle.bodySize : Math.abs(candle.close - candle.open);
      const atrThreshold = (settings.atrMultiplier || 1.2) * currentAtr15m;
      const atrRatio = currentAtr15m > 0 ? Number((candleBody / currentAtr15m).toFixed(2)) : 1.0;
      let atrPass = true;
      if (settings.useAtrFilter) {
        atrPass = candleBody > atrThreshold;
      }

      // 4. Volume-Weighted Average Price (VWAP) Bias:
      // Long: price > daily VWAP line; Short: price < daily VWAP line
      const currentVwap = candle.vwap || candle.close;
      let vwapPassLong = true;
      let vwapPassShort = true;
      if (settings.useVwapFilter && candle.vwap !== undefined) {
        vwapPassLong = candle.close > currentVwap;
        vwapPassShort = candle.close < currentVwap;
      }

      // 5. Multi-Timeframe Trend Protection (1-Hour 50 EMA):
      // Forbid Long entries if 1-hour trend is bearish; forbid Short if 1-hour trend is bullish
      const current1hEma = candle.ema50_1h || candle.close;
      const is1hBullish = candle.is1hBullish !== undefined ? candle.is1hBullish : candle.close >= current1hEma;
      let htfPassLong = true;
      let htfPassShort = true;
      if (settings.useHtfEmaFilter && candle.ema50_1h !== undefined) {
        htfPassLong = is1hBullish; // Long forbidden if bearish
        htfPassShort = !is1hBullish; // Short forbidden if bullish
      }

      // Check all confluences strictly
      if (
        breaksHigh &&
        canGoLong &&
        smaPassLong &&
        volumePass &&
        atrPass &&
        vwapPassLong &&
        htfPassLong &&
        (!breaksLow || candle.open >= (orh + orl) / 2)
      ) {
        triggeredDirection = 'LONG';
        breakoutPrice = orh;
      } else if (
        breaksLow &&
        canGoShort &&
        smaPassShort &&
        volumePass &&
        atrPass &&
        vwapPassShort &&
        htfPassShort
      ) {
        triggeredDirection = 'SHORT';
        breakoutPrice = orl;
      }

      if (!triggeredDirection) {
        i++;
        continue;
      }

      // Enter trade
      const slippageFactor = settings.slippagePercent / 100;
      const entryPrice =
        triggeredDirection === 'LONG'
          ? Number((breakoutPrice * (1 + slippageFactor)).toFixed(2))
          : Number((breakoutPrice * (1 - slippageFactor)).toFixed(2));

      // Calculate position size for $100 account
      let positionSizeDollars = 0;
      if (settings.sizingMode === 'FULL_COMPOUND') {
        positionSizeDollars = currentBalance * (settings.accountAllocationPercent / 100);
      } else if (settings.sizingMode === 'FIXED_100') {
        positionSizeDollars = Math.min(currentBalance, settings.initialBalance);
      } else {
        positionSizeDollars = currentBalance * (settings.accountAllocationPercent / 100);
      }
      positionSizeDollars = Number(Math.max(1, positionSizeDollars).toFixed(2));

      const sharesOrContracts = Number((positionSizeDollars / entryPrice).toFixed(4));

      // Stop Loss & Take Profit targets
      const slPct = settings.stopLossPercent / 100;
      const tpPct = settings.takeProfitPercent / 100;

      const initialStopLossPrice =
        triggeredDirection === 'LONG'
          ? Number((entryPrice * (1 - slPct)).toFixed(2))
          : Number((entryPrice * (1 + slPct)).toFixed(2));

      const takeProfitPrice =
        triggeredDirection === 'LONG'
          ? Number((entryPrice * (1 + tpPct)).toFixed(2))
          : Number((entryPrice * (1 - tpPct)).toFixed(2));

      let exitPrice = entryPrice;
      let exitReason: ExitReason = 'END_OF_DAY';
      let exitIndex = candles.length - 1;
      let highestDuring = entryPrice;
      let lowestDuring = entryPrice;
      let currentTrailingStop = initialStopLossPrice;

      // Track subsequent candles to find exit using Trailing Stop Engine
      for (let j = i; j < candles.length; j++) {
        const c = candles[j];
        const isEntryCandle = j === i;

        if (triggeredDirection === 'LONG') {
          const effectiveHigh = c.high;
          const effectiveLow = isEntryCandle ? Math.min(entryPrice, c.close) : c.low;

          if (effectiveHigh > highestDuring) highestDuring = effectiveHigh;
          if (effectiveLow < lowestDuring) lowestDuring = effectiveLow;

          // Trailing Stop Engine for LONG: ratchets up with new highs
          if (settings.useTrailingStop) {
            const candidateStop = Number((highestDuring * (1 - slPct)).toFixed(2));
            if (candidateStop > currentTrailingStop) {
              currentTrailingStop = candidateStop;
            }
          }

          const hitStop = isEntryCandle ? c.close <= currentTrailingStop : c.low <= currentTrailingStop;
          const hitTarget = c.high >= takeProfitPrice;

          if (hitStop && hitTarget) {
            exitPrice = currentTrailingStop;
            exitReason = settings.useTrailingStop && currentTrailingStop > entryPrice ? 'TRAILING_STOP' : 'STOP_LOSS';
            exitIndex = j;
            break;
          } else if (hitStop) {
            exitPrice = currentTrailingStop;
            exitReason = settings.useTrailingStop && currentTrailingStop > entryPrice ? 'TRAILING_STOP' : 'STOP_LOSS';
            exitIndex = j;
            break;
          } else if (hitTarget) {
            exitPrice = takeProfitPrice;
            exitReason = 'TAKE_PROFIT';
            exitIndex = j;
            break;
          }
        } else {
          // Trailing Stop Engine for SHORT: ratchets down with new lows
          const effectiveLow = c.low;
          const effectiveHigh = isEntryCandle ? Math.max(entryPrice, c.close) : c.high;

          if (effectiveHigh > highestDuring) highestDuring = effectiveHigh;
          if (effectiveLow < lowestDuring) lowestDuring = effectiveLow;

          if (settings.useTrailingStop) {
            const candidateStop = Number((lowestDuring * (1 + slPct)).toFixed(2));
            if (candidateStop < currentTrailingStop) {
              currentTrailingStop = candidateStop;
            }
          }

          const hitStop = isEntryCandle ? c.close >= currentTrailingStop : c.high >= currentTrailingStop;
          const hitTarget = c.low <= takeProfitPrice;

          if (hitStop && hitTarget) {
            exitPrice = currentTrailingStop;
            exitReason = settings.useTrailingStop && currentTrailingStop < entryPrice ? 'TRAILING_STOP' : 'STOP_LOSS';
            exitIndex = j;
            break;
          } else if (hitStop) {
            exitPrice = currentTrailingStop;
            exitReason = settings.useTrailingStop && currentTrailingStop < entryPrice ? 'TRAILING_STOP' : 'STOP_LOSS';
            exitIndex = j;
            break;
          } else if (hitTarget) {
            exitPrice = takeProfitPrice;
            exitReason = 'TAKE_PROFIT';
            exitIndex = j;
            break;
          }
        }

        // If at the end of the day and still in position
        if (j === candles.length - 1) {
          exitPrice = c.close;
          exitReason = 'END_OF_DAY';
          exitIndex = j;
          break;
        }
      }

      // Compute P&L
      const returnRatio =
        triggeredDirection === 'LONG'
          ? (exitPrice - entryPrice) / entryPrice
          : (entryPrice - exitPrice) / entryPrice;

      const pnlDollar = Number((positionSizeDollars * returnRatio).toFixed(2));
      const pnlPercent = Number((returnRatio * 100).toFixed(2));

      const balanceBefore = Number(currentBalance.toFixed(2));
      currentBalance = Number(Math.max(0, currentBalance + pnlDollar).toFixed(2));

      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
      const ddDollar = Number((peakBalance - currentBalance).toFixed(2));
      const ddPercent = peakBalance > 0 ? Number(((ddDollar / peakBalance) * 100).toFixed(2)) : 0;
      if (ddPercent > maxDrawdownPercent) maxDrawdownPercent = ddPercent;
      if (ddDollar > maxDrawdownDollar) maxDrawdownDollar = ddDollar;

      const durationMinutes = (exitIndex - i + 1) * 5;

      const trade: Trade = {
        id: `trade-${trades.length + 1}`,
        dayId: session.id,
        dayDate: session.date,
        dayLabel: session.dayLabel,
        asset: session.asset,
        direction: triggeredDirection,
        entryIndex: i,
        entryTime: candles[i].time,
        entryPrice,
        exitIndex,
        exitTime: candles[exitIndex].time,
        exitPrice,
        exitReason,
        pnlDollar,
        pnlPercent,
        positionSizeDollars,
        sharesOrContracts,
        balanceBefore,
        balanceAfter: currentBalance,
        stopLossPrice: initialStopLossPrice,
        takeProfitPrice,
        highestPriceDuringTrade: Number(highestDuring.toFixed(2)),
        lowestPriceDuringTrade: Number(lowestDuring.toFixed(2)),
        durationMinutes,
        entrySma200: candle.sma200,
        entryVolume: candle.volume,
        priorAvgVolume: Math.round(priorAvgVolume),
        volumeRatio,
        trailingStopFinalPrice: currentTrailingStop,
        entryVwap: candle.vwap,
        entryAtr15m: candle.atr15m,
        entryBodySize: candle.bodySize,
        atrRatio,
        entryEma50_1h: candle.ema50_1h,
        is1hBullish,
      };

      trades.push(trade);
      tradesToday++;

      equityCurve.push({
        index: equityCurve.length,
        tradeNum: trades.length,
        date: session.date,
        time: trade.exitTime,
        balance: currentBalance,
        netPnl: Number((currentBalance - settings.initialBalance).toFixed(2)),
        drawdownPercent: ddPercent,
        drawdownDollar: ddDollar,
        trade,
      });

      // Advance candle loop past the trade exit
      i = exitIndex + 1;
    }
  }

  // Aggregate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnlDollar > 0).length;
  const losingTrades = trades.filter((t) => t.pnlDollar < 0).length;
  const breakevenTrades = trades.filter((t) => t.pnlDollar === 0).length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const grossProfit = trades
    .filter((t) => t.pnlDollar > 0)
    .reduce((sum, t) => sum + t.pnlDollar, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnlDollar < 0).reduce((sum, t) => sum + t.pnlDollar, 0)
  );

  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? 99.9
        : 1.0
      : Number((grossProfit / grossLoss).toFixed(2));

  const averageWin = winningTrades > 0 ? Number((grossProfit / winningTrades).toFixed(2)) : 0;
  const averageLoss = losingTrades > 0 ? Number((grossLoss / losingTrades).toFixed(2)) : 0;
  const winLossRatio = averageLoss > 0 ? Number((averageWin / averageLoss).toFixed(2)) : averageWin;

  const lossRate = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const winRateFrac = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const expectancy = Number((winRateFrac * averageWin - lossRate * averageLoss).toFixed(2));

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentConsecWins = 0;
  let currentConsecLosses = 0;

  for (const t of trades) {
    if (t.pnlDollar > 0) {
      currentConsecWins++;
      currentConsecLosses = 0;
      if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;
    } else if (t.pnlDollar < 0) {
      currentConsecLosses++;
      currentConsecWins = 0;
      if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;
    }
  }

  const largestWin =
    trades.length > 0 ? Math.max(0, ...trades.map((t) => t.pnlDollar)) : 0;
  const largestLoss =
    trades.length > 0 ? Math.min(0, ...trades.map((t) => t.pnlDollar)) : 0;

  const avgDuration =
    totalTrades > 0
      ? Math.round(trades.reduce((sum, t) => sum + t.durationMinutes, 0) / totalTrades)
      : 0;

  const longTrades = trades.filter((t) => t.direction === 'LONG');
  const shortTrades = trades.filter((t) => t.direction === 'SHORT');
  const longWins = longTrades.filter((t) => t.pnlDollar > 0).length;
  const shortWins = shortTrades.filter((t) => t.pnlDollar > 0).length;

  const netProfit = Number((currentBalance - settings.initialBalance).toFixed(2));
  const netReturnPercent = Number(
    (((currentBalance - settings.initialBalance) / settings.initialBalance) * 100).toFixed(2)
  );

  return {
    trades,
    equityCurve,
    startingBalance: settings.initialBalance,
    endingBalance: currentBalance,
    netProfit,
    netReturnPercent,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    profitFactor,
    maxDrawdownPercent,
    maxDrawdownDollar,
    averageWin,
    averageLoss,
    winLossRatio,
    expectancy,
    largestWin,
    largestLoss,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    averageTradeDurationMin: avgDuration,
    longTradesCount: longTrades.length,
    longWinRate: longTrades.length > 0 ? Number(((longWins / longTrades.length) * 100).toFixed(1)) : 0,
    shortTradesCount: shortTrades.length,
    shortWinRate: shortTrades.length > 0 ? Number(((shortWins / shortTrades.length) * 100).toFixed(1)) : 0,
  };
}
