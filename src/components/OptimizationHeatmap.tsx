import React, { useState } from 'react';
import { OptimizationCell } from '../types/trading';
import { SL_STEPS, TP_STEPS } from '../utils/optimizer';
import { Award, Check, Grid, Sparkles, TrendingUp } from 'lucide-react';

interface OptimizationHeatmapProps {
  grid: OptimizationCell[][];
  bestCell: OptimizationCell;
  highestWinRateCell: OptimizationCell;
  currentSL: number;
  currentTP: number;
  onSelectCell: (cell: OptimizationCell) => void;
  maxEndingBalance: number;
  minEndingBalance: number;
}

export const OptimizationHeatmap: React.FC<OptimizationHeatmapProps> = ({
  grid,
  bestCell,
  highestWinRateCell,
  currentSL,
  currentTP,
  onSelectCell,
  maxEndingBalance,
  minEndingBalance,
}) => {
  const [metricMode, setMetricMode] = useState<'balance' | 'winrate' | 'profitFactor'>('balance');
  const [hoveredCell, setHoveredCell] = useState<OptimizationCell | null>(null);

  // Helper to color cells
  const getCellColor = (cell: OptimizationCell) => {
    if (metricMode === 'balance') {
      const net = cell.endingBalance - 100;
      if (net > 0) {
        const intensity = Math.min(1, net / Math.max(1, maxEndingBalance - 100));
        return `rgba(16, 185, 129, ${0.15 + intensity * 0.75})`;
      } else if (net < 0) {
        const intensity = Math.min(1, Math.abs(net) / Math.max(1, 100 - minEndingBalance));
        return `rgba(244, 63, 94, ${0.15 + intensity * 0.7})`;
      }
      return 'rgba(30, 41, 59, 0.8)';
    } else if (metricMode === 'winrate') {
      // 30% to 75%
      const normalized = Math.max(0, Math.min(1, (cell.winRate - 30) / 45));
      return `rgba(59, 130, 246, ${0.15 + normalized * 0.75})`;
    } else {
      // Profit factor: 0.8 to 2.5
      const pf = cell.profitFactor;
      if (pf >= 1.0) {
        const normalized = Math.min(1, (pf - 1.0) / 1.5);
        return `rgba(16, 185, 129, ${0.2 + normalized * 0.7})`;
      } else {
        const normalized = Math.min(1, (1.0 - pf) / 0.6);
        return `rgba(244, 63, 94, ${0.2 + normalized * 0.6})`;
      }
    }
  };

  const reversedTp = [...TP_STEPS].reverse();

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header & Metric Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Parameter Optimization Matrix (SL % vs TP %)
            </h3>
            <span className="text-xs text-slate-400 hidden sm:inline">
              · 64 backtested combinations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any cell to immediately load those settings into your strategy sliders
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setMetricMode('balance')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              metricMode === 'balance'
                ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ending Balance ($)
          </button>
          <button
            onClick={() => setMetricMode('winrate')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              metricMode === 'winrate'
                ? 'bg-slate-800 text-blue-400 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Win Rate %
          </button>
          <button
            onClick={() => setMetricMode('profitFactor')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              metricMode === 'profitFactor'
                ? 'bg-slate-800 text-purple-400 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profit Factor
          </button>
        </div>
      </div>

      {/* Quick Best Strategy Callout Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-lg border border-emerald-500/30 text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-white">Most Profitable Configuration:</span>
          <span className="text-emerald-400 font-mono font-bold">
            SL {bestCell.stopLossPercent.toFixed(1)}% · TP {bestCell.takeProfitPercent.toFixed(1)}%
          </span>
          <span className="text-slate-400">yields</span>
          <span className="font-mono font-bold text-white tabular-nums">
            ${bestCell.endingBalance.toFixed(2)}
          </span>
          <span className="text-emerald-400 font-mono">
            (+{((bestCell.endingBalance - 100) / 100 * 100).toFixed(1)}%)
          </span>
        </div>

        <button
          onClick={() => onSelectCell(bestCell)}
          className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply Peak Profit</span>
        </button>
      </div>

      {/* Heatmap Grid Table */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          {/* Top Label for X-Axis (Stop Loss) */}
          <div className="text-center text-xs font-semibold text-slate-400 mb-1">
            Stop-Loss % (Risk Threshold) →
          </div>

          <div className="flex">
            {/* Left Label for Y-Axis (Take Profit) */}
            <div className="w-16 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-400 -rotate-90 whitespace-nowrap">
                Take-Profit % ↑
              </span>
            </div>

            {/* Matrix Container */}
            <div className="flex-1">
              {/* Header row: SL values */}
              <div className="grid grid-cols-8 gap-1 mb-1">
                {SL_STEPS.map((sl) => (
                  <div
                    key={sl}
                    className="text-center text-[11px] font-mono font-semibold text-slate-400 py-1"
                  >
                    {sl.toFixed(1)}%
                  </div>
                ))}
              </div>

              {/* Rows: Each row is a TP value */}
              <div className="space-y-1">
                {grid.map((row, rowIdx) => {
                  const tpVal = reversedTp[rowIdx];
                  return (
                    <div key={tpVal} className="flex items-center gap-1">
                      {/* Row Header: TP label */}
                      <div className="w-12 text-right pr-2 text-[11px] font-mono font-semibold text-slate-400">
                        {tpVal.toFixed(1)}%
                      </div>

                      {/* Row Cells */}
                      <div className="flex-1 grid grid-cols-8 gap-1">
                        {row.map((cell) => {
                          const isCurrent =
                            Math.abs(cell.stopLossPercent - currentSL) < 0.05 &&
                            Math.abs(cell.takeProfitPercent - currentTP) < 0.05;

                          const isBest =
                            Math.abs(cell.stopLossPercent - bestCell.stopLossPercent) < 0.05 &&
                            Math.abs(cell.takeProfitPercent - bestCell.takeProfitPercent) < 0.05;

                          return (
                            <button
                              key={`${cell.stopLossPercent}-${cell.takeProfitPercent}`}
                              onClick={() => onSelectCell(cell)}
                              onMouseEnter={() => setHoveredCell(cell)}
                              onMouseLeave={() => setHoveredCell(null)}
                              style={{ backgroundColor: getCellColor(cell) }}
                              className={`relative h-11 rounded flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                                isCurrent
                                  ? 'ring-2 ring-white z-10 scale-105 shadow-md'
                                  : isBest
                                  ? 'ring-2 ring-amber-400 shadow-sm'
                                  : 'hover:scale-102 hover:z-5'
                              }`}
                            >
                              {/* Best Badge */}
                              {isBest && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold">
                                  ★
                                </span>
                              )}

                              {/* Value Display */}
                              <span className="font-mono text-xs font-bold text-white tabular-nums drop-shadow-sm">
                                {metricMode === 'balance' && `$${cell.endingBalance.toFixed(0)}`}
                                {metricMode === 'winrate' && `${cell.winRate.toFixed(0)}%`}
                                {metricMode === 'profitFactor' &&
                                  (cell.profitFactor >= 90 ? '∞' : cell.profitFactor.toFixed(1))}
                              </span>

                              <span className="text-[10px] text-slate-200/80 font-mono">
                                {cell.totalTrades}t
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Cell Detail Box */}
      {hoveredCell ? (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              SL {hoveredCell.stopLossPercent.toFixed(1)}% / TP {hoveredCell.takeProfitPercent.toFixed(1)}%
            </span>
            <span className="text-slate-400">·</span>
            <span>
              Balance:{' '}
              <span
                className={`font-bold tabular-nums ${
                  hoveredCell.endingBalance >= 100 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${hoveredCell.endingBalance.toFixed(2)}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <span>Win Rate: <b className="text-white">{hoveredCell.winRate.toFixed(1)}%</b></span>
            <span>·</span>
            <span>Trades: <b className="text-white">{hoveredCell.totalTrades}</b></span>
            <span>·</span>
            <span>Profit Factor: <b className="text-white">{hoveredCell.profitFactor.toFixed(2)}</b></span>
            <span>·</span>
            <span>Max DD: <b className="text-rose-400">-{hoveredCell.maxDrawdownPercent.toFixed(1)}%</b></span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-rose-500/40" />
            <span>Drawdown (&lt;$100)</span>
            <span className="inline-block w-3 h-3 rounded bg-slate-800 ml-2" />
            <span>Break-even ($100)</span>
            <span className="inline-block w-3 h-3 rounded bg-emerald-500/70 ml-2" />
            <span>High Profit</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">★</span>
            <span>Peak Backtest Performer</span>
            <span className="w-2.5 h-2.5 ring-1 ring-white inline-block rounded-xs ml-2" />
            <span>Your Current Sliders</span>
          </div>
        </div>
      )}
    </div>
  );
};
