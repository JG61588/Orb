export interface Candle {
  time: string; // e.g. "09:30"
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma200?: number;
  vwap?: number; // Daily Intraday Volume-Weighted Average Price
  atr15m?: number; // 14-period Average True Range calculated on 15-minute timeframe
  ema50_1h?: number; // 50-period Exponential Moving Average on 1-hour timeframe
  is1hBullish?: boolean; // True if price >= 1h 50 EMA
  bodySize?: number; // Math.abs(close - open)
}

export interface DaySession {
  id: string;
  date: string; // e.g. "2026-10-01"
  dayIndex: number;
  dayLabel: string; // e.g. "Day 1 (Mon, Oct 1)"
  asset: string;
  candles: Candle[];
  dailyOpen: number;
  dailyHigh: number;
  dailyLow: number;
  dailyClose: number;
}

export type TradeDirection = 'LONG' | 'SHORT';
export type ExitReason = 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'END_OF_DAY';

export interface Trade {
  id: string;
  dayId: string;
  dayDate: string;
  dayLabel: string;
  asset: string;
  direction: TradeDirection;
  entryIndex: number;
  entryTime: string;
  entryPrice: number;
  exitIndex: number;
  exitTime: string;
  exitPrice: number;
  exitReason: ExitReason;
  pnlDollar: number;
  pnlPercent: number;
  positionSizeDollars: number;
  sharesOrContracts: number;
  balanceBefore: number;
  balanceAfter: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  highestPriceDuringTrade: number;
  lowestPriceDuringTrade: number;
  durationMinutes: number;
  entrySma200?: number;
  entryVolume?: number;
  priorAvgVolume?: number;
  volumeRatio?: number;
  trailingStopFinalPrice?: number;
  entryVwap?: number;
  entryAtr15m?: number;
  entryBodySize?: number;
  atrRatio?: number;
  entryEma50_1h?: number;
  is1hBullish?: boolean;
}

export type DirectionFilter = 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY';
export type PositionSizingMode = 'FULL_COMPOUND' | 'FIXED_PERCENT' | 'FIXED_100';

export interface StrategySettings {
  initialBalance: number; // default $100
  stopLossPercent: number; // default 2.0%
  takeProfitPercent: number; // default 4.0%
  orbMinutes: number; // 5, 15, or 30
  direction: DirectionFilter;
  sizingMode: PositionSizingMode;
  accountAllocationPercent: number; // e.g. 100% or 50%
  slippagePercent: number; // e.g. 0.02% or 0
  maxTradesPerDay: number; // 1 or 2
  useSma200Filter: boolean; // default true: Long only if price > 200 SMA
  useVolumeConfirmation: boolean; // default true: 1.2x volume surge vs prior 5 candles
  volumeMultiplier: number; // default 1.2
  useTrailingStop: boolean; // default true: ratchets stop-loss as price moves favorably
  useAtrFilter: boolean; // default true: 14 ATR on 15m, body size > 1.2x ATR
  atrMultiplier: number; // default 1.2
  useVwapFilter: boolean; // default true: Long > VWAP, Short < VWAP
  useHtfEmaFilter: boolean; // default false: optional 50 EMA on 1-hour chart trend filter
}

export const DEFAULT_STRATEGY_SETTINGS: StrategySettings = {
  initialBalance: 100,
  stopLossPercent: 2.0,
  takeProfitPercent: 4.0,
  orbMinutes: 15,
  direction: 'BOTH',
  sizingMode: 'FULL_COMPOUND',
  accountAllocationPercent: 100,
  slippagePercent: 0.02,
  maxTradesPerDay: 1,
  useSma200Filter: true,
  useVolumeConfirmation: true,
  volumeMultiplier: 1.2,
  useTrailingStop: true,
  useAtrFilter: true,
  atrMultiplier: 1.2,
  useVwapFilter: true,
  useHtfEmaFilter: false,
};

export interface EquityPoint {
  index: number;
  tradeNum: number;
  date: string;
  time: string;
  balance: number;
  netPnl: number;
  drawdownPercent: number;
  drawdownDollar: number;
  trade?: Trade;
}

export interface SimulationResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  startingBalance: number;
  endingBalance: number;
  netProfit: number;
  netReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  maxDrawdownDollar: number;
  averageWin: number;
  averageLoss: number;
  winLossRatio: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageTradeDurationMin: number;
  longTradesCount: number;
  longWinRate: number;
  shortTradesCount: number;
  shortWinRate: number;
}

export interface OptimizationCell {
  stopLossPercent: number;
  takeProfitPercent: number;
  endingBalance: number;
  netProfit: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdownPercent: number;
}
