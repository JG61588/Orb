import React from 'react';
import { SimulationResult } from '../types/trading';
import { ArrowDownRight, ArrowUpRight, DollarSign, Percent, ShieldAlert, Target } from 'lucide-react';

interface MetricCardsProps {
  results: SimulationResult;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ results }) => {
  const isProfit = results.netProfit >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ending Balance Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Ending Balance</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${results.endingBalance.toFixed(2)}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center font-mono font-medium tabular-nums ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? (
                <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 inline mr-0.5" />
              )}
              {isProfit ? '+' : ''}${results.netProfit.toFixed(2)} ({isProfit ? '+' : ''}
              {results.netReturnPercent.toFixed(1)}%)
            </span>
            <span className="text-slate-500">from $100.00</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Max Drawdown</span>
          <span className="font-mono text-slate-300 tabular-nums">
            -{results.maxDrawdownPercent.toFixed(1)}% (-${results.maxDrawdownDollar.toFixed(2)})
          </span>
        </div>
      </div>

      {/* 2. Win Rate % Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Win Rate %</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-white">
              {results.winRate.toFixed(1)}%
            </span>
          </div>

          {/* Visual Win/Loss split bar */}
          <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, results.winRate))}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${100 - Math.min(100, Math.max(0, results.winRate))}%` }}
            />
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-mono font-medium tabular-nums">
              {results.winningTrades} Wins
            </span>
            <span>·</span>
            <span className="text-rose-400 font-mono font-medium tabular-nums">
              {results.losingTrades} Losses
            </span>
            {results.breakevenTrades > 0 && (
              <>
                <span>·</span>
                <span className="text-slate-400 font-mono font-medium tabular-nums">
                  {results.breakevenTrades} Flat
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Avg Win / Loss</span>
          <span className="font-mono text-slate-300 tabular-nums">
            +${results.averageWin.toFixed(2)} / -${results.averageLoss.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 3. Total Trades Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Trades</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums text-white">
              {results.totalTrades}
            </span>
            <span className="text-xs text-slate-400">signals</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-300 font-mono tabular-nums">
              {results.longTradesCount} Long
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300 font-mono tabular-nums">
              {results.shortTradesCount} Short
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Avg Duration</span>
          <span className="font-mono text-slate-300 tabular-nums">
            {results.averageTradeDurationMin} min / trade
          </span>
        </div>
      </div>

      {/* 4. Profit Factor & Edge Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Profit Factor</span>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums ${
                results.profitFactor >= 1.5
                  ? 'text-emerald-400'
                  : results.profitFactor >= 1.0
                  ? 'text-slate-200'
                  : 'text-rose-400'
              }`}
            >
              {results.profitFactor >= 99 ? '∞' : results.profitFactor.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">
              {results.profitFactor >= 1.5
                ? 'Strong Edge'
                : results.profitFactor >= 1.0
                ? 'Marginal Edge'
                : 'Sub-Optimal'}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Expectancy:</span>
            <span
              className={`font-mono font-medium tabular-nums ${
                results.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {results.expectancy >= 0 ? '+' : ''}${results.expectancy.toFixed(2)} / trade
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Max Streaks</span>
          <span className="font-mono text-slate-300 tabular-nums">
            {results.maxConsecutiveWins}W max · {results.maxConsecutiveLosses}L max
          </span>
        </div>
      </div>
    </div>
  );
};
