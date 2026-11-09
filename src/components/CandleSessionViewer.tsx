import React, { useState } from 'react';
import { Candle, DaySession, Trade } from '../types/trading';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Crosshair,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface CandleSessionViewerProps {
  sessions: DaySession[];
  trades: Trade[];
  selectedSessionIndex: number;
  onSelectSessionIndex: (index: number) => void;
  orbMinutes: number;
}

export const CandleSessionViewer: React.FC<CandleSessionViewerProps> = ({
  sessions,
  trades,
  selectedSessionIndex,
  onSelectSessionIndex,
  orbMinutes,
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const session = sessions[selectedSessionIndex] || sessions[0];
  if (!session) return null;

  const dayTrades = trades.filter((t) => t.dayDate === session.date);
  const trade = dayTrades[0]; // primary trade for this session

  const candles = session.candles;
  const orbCandleCount = Math.max(1, Math.floor(orbMinutes / 5));

  // Compute Opening Range High & Low for selected ORB window
  let orh = -Infinity;
  let orl = Infinity;
  for (let i = 0; i < Math.min(candles.length, orbCandleCount); i++) {
    if (candles[i].high > orh) orh = candles[i].high;
    if (candles[i].low < orl) orl = candles[i].low;
  }

  // SVG Chart Geometry
  const width = 900;
  const height = 360;
  const padding = { top: 30, right: 65, bottom: 40, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Price bounds
  const prices = candles.flatMap((c) => [
    c.high,
    c.low,
    ...(c.sma200 ? [c.sma200] : []),
    ...(c.vwap ? [c.vwap] : []),
    ...(c.ema50_1h ? [c.ema50_1h] : []),
  ]);
  if (trade) {
    prices.push(trade.stopLossPrice, trade.takeProfitPrice);
  }
  const minPrice = Math.min(...prices) * 0.998;
  const maxPrice = Math.max(...prices) * 1.002;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (price: number) => {
    return padding.top + plotHeight - ((price - minPrice) / priceRange) * plotHeight;
  };

  const candleSpacing = plotWidth / candles.length;
  const candleBodyWidth = Math.max(2, Math.min(8, candleSpacing * 0.7));

  const orhY = getY(orh);
  const orlY = getY(orl);
  const orbBoxWidth = orbCandleCount * candleSpacing;

  // 200 SMA curve
  const smaPoints = candles
    .map((c, i) => {
      if (c.sma200 === undefined) return null;
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const y = getY(c.sma200);
      return `${x},${y}`;
    })
    .filter(Boolean);
  const smaPath = smaPoints.length > 0 ? `M ${smaPoints.join(' L ')}` : '';

  // Daily Intraday VWAP curve
  const vwapPoints = candles
    .map((c, i) => {
      if (c.vwap === undefined) return null;
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const y = getY(c.vwap);
      return `${x},${y}`;
    })
    .filter(Boolean);
  const vwapPath = vwapPoints.length > 0 ? `M ${vwapPoints.join(' L ')}` : '';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Session Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {session.dayLabel} · {session.asset}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {orbMinutes}m ORB Session
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>Open: ${session.dailyOpen.toFixed(2)}</span>
              <span>·</span>
              <span>High: ${session.dailyHigh.toFixed(2)}</span>
              <span>·</span>
              <span>Low: ${session.dailyLow.toFixed(2)}</span>
              <span>·</span>
              <span>Close: ${session.dailyClose.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectSessionIndex(Math.max(0, selectedSessionIndex - 1))}
            disabled={selectedSessionIndex === 0}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev Day</span>
          </button>

          <select
            value={selectedSessionIndex}
            onChange={(e) => onSelectSessionIndex(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
          >
            {sessions.map((s, idx) => {
              const hasWin = trades.some((t) => t.dayDate === s.date && t.pnlDollar > 0);
              const hasLoss = trades.some((t) => t.dayDate === s.date && t.pnlDollar < 0);
              const statusTag = hasWin ? '✓ WIN' : hasLoss ? '✗ LOSS' : '— NO TRADE';
              return (
                <option key={s.id} value={idx}>
                  Day {s.dayIndex} ({s.date}) [{statusTag}]
                </option>
              );
            })}
          </select>

          <button
            onClick={() => onSelectSessionIndex(Math.min(sessions.length - 1, selectedSessionIndex + 1))}
            disabled={selectedSessionIndex === sessions.length - 1}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
          >
            <span>Next Day</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trade Outcome Status Banner for this Day */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs">
        {trade ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-semibold">
              {trade.pnlDollar > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">WINNING TRADE</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">STOPPED OUT</span>
                </>
              )}
            </div>

            <div className="text-slate-300 font-mono flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-slate-800 rounded font-bold text-white">
                {trade.direction}
              </span>
              <span>Entry: ${trade.entryPrice.toFixed(2)} ({trade.entryTime})</span>
              <span>→</span>
              <span>Exit: ${trade.exitPrice.toFixed(2)} ({trade.exitTime})</span>
              <span>·</span>
              <span className="font-bold">
                {trade.exitReason === 'TAKE_PROFIT'
                  ? 'Target Hit (TP)'
                  : trade.exitReason === 'TRAILING_STOP'
                  ? `Trailing Stop Locked (${trade.pnlDollar > 0 ? 'Profit' : 'Exit'})`
                  : trade.exitReason === 'STOP_LOSS'
                  ? 'Stop Hit (SL)'
                  : 'Market Close Exit'}
              </span>
              {trade.volumeRatio !== undefined && (
                <span className="text-[11px] text-blue-400">
                  · Vol: {trade.volumeRatio.toFixed(1)}x
                </span>
              )}
              {trade.atrRatio !== undefined && (
                <span className="text-[11px] text-purple-400">
                  · ATR: {trade.atrRatio.toFixed(1)}x
                </span>
              )}
              {trade.entryVwap !== undefined && (
                <span className="text-[11px] text-cyan-400">
                  · {trade.entryPrice > trade.entryVwap ? '> VWAP' : '< VWAP'}
                </span>
              )}
              {trade.entryEma50_1h !== undefined && (
                <span className="text-[11px] text-rose-400">
                  · 1H {trade.is1hBullish ? 'Bullish' : 'Bearish'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>No breakout triggered today within parameter filters.</span>
          </div>
        )}

        {trade && (
          <div className="font-mono font-bold text-sm">
            <span
              className={`tabular-nums ${
                trade.pnlDollar > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trade.pnlDollar > 0 ? '+' : ''}${trade.pnlDollar.toFixed(2)} ({trade.pnlPercent > 0 ? '+' : ''}
              {trade.pnlPercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Candlestick SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[420px] overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const price = minPrice + pct * priceRange;
            const y = getY(price);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="#1f2937"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left + plotWidth + 6}
                  y={y + 3}
                  className="text-[10px] fill-slate-500 font-mono tabular-nums"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Opening Range Shaded Window */}
          <rect
            x={padding.left}
            y={Math.min(orhY, orlY)}
            width={orbBoxWidth}
            height={Math.max(2, Math.abs(orlY - orhY))}
            fill="#3b82f6"
            fillOpacity="0.12"
            stroke="#3b82f6"
            strokeOpacity="0.4"
            strokeDasharray="3 3"
          />

          {/* ORH Line across entire day */}
          <line
            x1={padding.left}
            y1={orhY}
            x2={padding.left + plotWidth}
            y2={orhY}
            stroke="#3b82f6"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={orhY - 2}
            className="text-[9px] fill-blue-400 font-mono font-semibold"
          >
            ORH: ${orh.toFixed(2)}
          </text>

          {/* ORL Line across entire day */}
          <line
            x1={padding.left}
            y1={orlY}
            x2={padding.left + plotWidth}
            y2={orlY}
            stroke="#3b82f6"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={orlY + 10}
            className="text-[9px] fill-blue-400 font-mono font-semibold"
          >
            ORL: ${orl.toFixed(2)}
          </text>

          {/* Stop Loss Line (if trade exists) */}
          {trade && (
            <>
              <line
                x1={padding.left + trade.entryIndex * candleSpacing}
                y1={getY(trade.stopLossPrice)}
                x2={padding.left + (trade.exitIndex + 1) * candleSpacing}
                y2={getY(trade.stopLossPrice)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <text
                x={padding.left + (trade.exitIndex + 1) * candleSpacing + 4}
                y={getY(trade.stopLossPrice) + 3}
                className="text-[9px] fill-rose-400 font-mono font-bold"
              >
                SL: ${trade.stopLossPrice.toFixed(2)}
              </text>
            </>
          )}

          {/* Ratcheted Trailing Stop Line (if ratcheted) */}
          {trade &&
            trade.trailingStopFinalPrice &&
            trade.trailingStopFinalPrice !== trade.stopLossPrice && (
              <>
                <line
                  x1={padding.left + trade.entryIndex * candleSpacing}
                  y1={getY(trade.trailingStopFinalPrice)}
                  x2={padding.left + (trade.exitIndex + 1) * candleSpacing}
                  y2={getY(trade.trailingStopFinalPrice)}
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  strokeDasharray="4 2"
                />
                <text
                  x={padding.left + (trade.exitIndex + 1) * candleSpacing + 4}
                  y={getY(trade.trailingStopFinalPrice) + 3}
                  className="text-[9px] fill-amber-400 font-mono font-bold"
                >
                  Trail SL: ${trade.trailingStopFinalPrice.toFixed(2)}
                </text>
              </>
            )}

          {/* Take Profit Line (if trade exists) */}
          {trade && (
            <>
              <line
                x1={padding.left + trade.entryIndex * candleSpacing}
                y1={getY(trade.takeProfitPrice)}
                x2={padding.left + (trade.exitIndex + 1) * candleSpacing}
                y2={getY(trade.takeProfitPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <text
                x={padding.left + (trade.exitIndex + 1) * candleSpacing + 4}
                y={getY(trade.takeProfitPrice) + 3}
                className="text-[9px] fill-emerald-400 font-mono font-bold"
              >
                TP: ${trade.takeProfitPrice.toFixed(2)}
              </text>
            </>
          )}

          {/* 200 SMA Continuous Trend Curve */}
          {smaPath && (
            <g>
              <path
                d={smaPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.6"
                strokeDasharray="4 3"
                opacity="0.9"
              />
              <text
                x={padding.left + plotWidth + 6}
                y={getY(candles[candles.length - 1].sma200 || candles[candles.length - 1].close) + 3}
                className="text-[9px] fill-amber-400 font-mono font-bold"
              >
                200 SMA
              </text>
            </g>
          )}

          {/* Daily Intraday VWAP Curve */}
          {vwapPath && (
            <g>
              <path
                d={vwapPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
                opacity="0.95"
              />
              <text
                x={padding.left + plotWidth + 6}
                y={getY(candles[candles.length - 1].vwap || candles[candles.length - 1].close) - 6}
                className="text-[9px] fill-cyan-400 font-mono font-bold"
              >
                VWAP
              </text>
            </g>
          )}

          {/* Render All Candlesticks */}
          {candles.map((c, i) => {
            const xCenter = padding.left + i * candleSpacing + candleSpacing / 2;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);
            const isBullish = c.close >= c.open;
            const color = isBullish ? '#10b981' : '#f43f5e';
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            const isOrbCandle = i < orbCandleCount;

            return (
              <g
                key={i}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setHoveredCandle(c)}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* Candle Wick */}
                <line
                  x1={xCenter}
                  y1={highY}
                  x2={xCenter}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={xCenter - candleBodyWidth / 2}
                  y={bodyY}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />

                {/* Opening Range Indicator dot at top for first candles */}
                {isOrbCandle && (
                  <circle
                    cx={xCenter}
                    cy={padding.top - 8}
                    r="2"
                    fill="#3b82f6"
                  />
                )}
              </g>
            );
          })}

          {/* Trade Entry & Exit Markers */}
          {trade && (
            <g>
              {/* Entry Arrow */}
              {trade.direction === 'LONG' ? (
                <polygon
                  points={`${padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2},${
                    getY(trade.entryPrice) + 14
                  } ${
                    padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2 - 6
                  },${getY(trade.entryPrice) + 24} ${
                    padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2 + 6
                  },${getY(trade.entryPrice) + 24}`}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ) : (
                <polygon
                  points={`${padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2},${
                    getY(trade.entryPrice) - 14
                  } ${
                    padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2 - 6
                  },${getY(trade.entryPrice) - 24} ${
                    padding.left + trade.entryIndex * candleSpacing + candleSpacing / 2 + 6
                  },${getY(trade.entryPrice) - 24}`}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              )}

              {/* Exit Circle */}
              <circle
                cx={padding.left + trade.exitIndex * candleSpacing + candleSpacing / 2}
                cy={getY(trade.exitPrice)}
                r="5"
                fill={trade.pnlDollar > 0 ? '#10b981' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Time markers on X-Axis */}
          <text
            x={padding.left}
            y={height - 12}
            className="text-[10px] fill-slate-500 font-mono"
          >
            09:30 (Open)
          </text>
          <text
            x={padding.left + orbBoxWidth}
            y={height - 12}
            className="text-[10px] fill-blue-400 font-mono"
          >
            {candles[orbCandleCount - 1]?.time || 'ORB'}
          </text>
          <text
            x={padding.left + plotWidth * 0.5}
            y={height - 12}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 font-mono"
          >
            12:45
          </text>
          <text
            x={padding.left + plotWidth}
            y={height - 12}
            textAnchor="end"
            className="text-[10px] fill-slate-500 font-mono"
          >
            16:00 (Close)
          </text>
        </svg>

        {/* Hover Candle Data Box */}
        {hoveredCandle && (
          <div className="absolute top-2 left-4 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-200 flex flex-wrap items-center gap-3 pointer-events-none shadow-lg z-10 max-w-full">
            <span className="text-slate-400">{hoveredCandle.time}</span>
            <span>O: ${hoveredCandle.open.toFixed(2)}</span>
            <span>H: ${hoveredCandle.high.toFixed(2)}</span>
            <span>L: ${hoveredCandle.low.toFixed(2)}</span>
            <span
              className={
                hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'
              }
            >
              C: ${hoveredCandle.close.toFixed(2)}
            </span>
            {hoveredCandle.vwap !== undefined && (
              <span className="text-cyan-400">
                VWAP: ${hoveredCandle.vwap.toFixed(2)}{' '}
                <span className="text-[10px] text-slate-400">
                  ({hoveredCandle.close >= hoveredCandle.vwap ? '> VWAP ✓' : '< VWAP ✗'})
                </span>
              </span>
            )}
            {hoveredCandle.sma200 !== undefined && (
              <span className="text-amber-400">
                200 SMA: ${hoveredCandle.sma200.toFixed(2)}
              </span>
            )}
            {hoveredCandle.atr15m !== undefined && (
              <span className="text-purple-400">
                15m ATR: ${hoveredCandle.atr15m.toFixed(2)}{' '}
                <span className="text-[10px] text-slate-400">
                  (Body: ${hoveredCandle.bodySize?.toFixed(2) || '0.00'})
                </span>
              </span>
            )}
            {hoveredCandle.ema50_1h !== undefined && (
              <span className="text-rose-400">
                1H 50 EMA: ${hoveredCandle.ema50_1h.toFixed(2)}{' '}
                <span className="text-[10px] text-slate-400">
                  (1H {hoveredCandle.is1hBullish ? 'Bullish ✓' : 'Bearish ✗'})
                </span>
              </span>
            )}
            <span className="text-slate-400">Vol: {hoveredCandle.volume.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-blue-500/20 border border-blue-400 inline-block rounded-sm" />
          <span>Opening Range ({orbMinutes}m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-400 inline-block" />
          <span>ORH / ORL Levels</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
          <span>Daily VWAP Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-amber-400 border-dashed inline-block" />
          <span>200-Period SMA Filter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-emerald-400 border-dashed inline-block" />
          <span>Take-Profit Target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-rose-400 border-dashed inline-block" />
          <span>Stop-Loss Level</span>
        </div>
      </div>
    </div>
  );
};
