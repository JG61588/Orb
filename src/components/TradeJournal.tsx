import React, { useState } from 'react';
import { Trade } from '../types/trading';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  XCircle,
} from 'lucide-react';

interface TradeJournalProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
}

export const TradeJournal: React.FC<TradeJournalProps> = ({ trades, onSelectTrade }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTrades = trades.filter((t) => {
    if (filterType === 'WINS' && t.pnlDollar <= 0) return false;
    if (filterType === 'LOSSES' && t.pnlDollar >= 0) return false;
    if (directionFilter !== 'ALL' && t.direction !== directionFilter) return false;
    if (searchTerm) {
      const matchSearch =
        t.dayLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.dayDate.includes(searchTerm) ||
        t.exitReason.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
    }
    return true;
  });

  const exportCsv = () => {
    const headers = [
      'Trade #',
      'Date',
      'Asset',
      'Direction',
      'Entry Time',
      'Entry Price',
      'Vol Surge Ratio',
      '15m ATR ($)',
      'ATR Body Ratio',
      'Intraday VWAP ($)',
      '1H 50 EMA ($)',
      'Exit Time',
      'Exit Price',
      'Exit Reason',
      'P&L ($)',
      'Return (%)',
      'Position Size ($)',
      'Account Balance ($)',
    ];

    const rows = trades.map((t, idx) => [
      idx + 1,
      t.dayDate,
      t.asset,
      t.direction,
      t.entryTime,
      t.entryPrice.toFixed(2),
      t.volumeRatio ?? 'N/A',
      t.entryAtr15m ? t.entryAtr15m.toFixed(2) : 'N/A',
      t.atrRatio ?? 'N/A',
      t.entryVwap ? t.entryVwap.toFixed(2) : 'N/A',
      t.entryEma50_1h ? t.entryEma50_1h.toFixed(2) : 'N/A',
      t.exitTime,
      t.exitPrice.toFixed(2),
      t.exitReason,
      t.pnlDollar.toFixed(2),
      t.pnlPercent.toFixed(2),
      t.positionSizeDollars.toFixed(2),
      t.balanceAfter.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orb_trades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header, Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Trade Execution Log
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({trades.length} simulated executions)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to inspect the full intraday candlestick chart and breakout lines
          </p>
        </div>

        {/* Action Buttons & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search date or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-44"
            />
          </div>

          {/* Win/Loss Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(['ALL', 'WINS', 'LOSSES'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  filterType === mode
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'ALL' ? 'All' : mode === 'WINS' ? 'Wins' : 'Losses'}
              </button>
            ))}
          </div>

          {/* Export to CSV */}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Trade Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3 font-mono">#</th>
              <th className="py-2.5 px-3">Date / Day</th>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3 text-right">Entry</th>
              <th className="py-2.5 px-3 text-right">Exit</th>
              <th className="py-2.5 px-3">Exit Reason</th>
              <th className="py-2.5 px-3 text-right">Return %</th>
              <th className="py-2.5 px-3 text-right">P&L ($)</th>
              <th className="py-2.5 px-3 text-right font-mono">Account Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 font-sans">
                  No trades match the selected filter.
                </td>
              </tr>
            ) : (
              filteredTrades.map((t, idx) => {
                const isWin = t.pnlDollar > 0;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrade(t)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-200 whitespace-nowrap">
                      {t.dayDate}
                      <span className="text-slate-500 text-[11px] block">{t.dayLabel}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-300">{t.asset}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          t.direction === 'LONG'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {t.direction === 'LONG' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      ${t.entryPrice.toFixed(2)}
                      <div className="flex items-center justify-end gap-1 flex-wrap text-[10px] mt-0.5">
                        <span className="text-slate-500">{t.entryTime}</span>
                        {t.volumeRatio !== undefined && (
                          <span className="px-1 py-0.2 bg-blue-500/10 text-blue-400 rounded">
                            {t.volumeRatio.toFixed(1)}x Vol
                          </span>
                        )}
                        {t.atrRatio !== undefined && (
                          <span className="px-1 py-0.2 bg-purple-500/10 text-purple-400 rounded">
                            {t.atrRatio.toFixed(1)}x ATR
                          </span>
                        )}
                        {t.entryVwap !== undefined && (
                          <span className="px-1 py-0.2 bg-cyan-500/10 text-cyan-400 rounded">
                            {t.entryPrice > t.entryVwap ? '>VWAP' : '<VWAP'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      ${t.exitPrice.toFixed(2)}
                      <span className="text-slate-500 text-[10px] block">{t.exitTime}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`text-[11px] font-medium ${
                          t.exitReason === 'TAKE_PROFIT'
                            ? 'text-emerald-400'
                            : t.exitReason === 'TRAILING_STOP'
                            ? isWin
                              ? 'text-teal-400'
                              : 'text-amber-400'
                            : t.exitReason === 'STOP_LOSS'
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {t.exitReason === 'TAKE_PROFIT'
                          ? 'Target Hit (TP)'
                          : t.exitReason === 'TRAILING_STOP'
                          ? `Trailing Stop (${isWin ? 'Profit Locked' : 'Ratchet Exit'})`
                          : t.exitReason === 'STOP_LOSS'
                          ? 'Stop Loss (SL)'
                          : 'Market Close'}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}
                      {t.pnlPercent.toFixed(2)}%
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}${t.pnlDollar.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                      ${t.balanceAfter.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
        <div>
          Showing {filteredTrades.length} of {trades.length} trades
        </div>
        <div className="flex items-center gap-4">
          <span>
            Net Sum:{' '}
            <span
              className={`font-bold tabular-nums ${
                trades.reduce((acc, t) => acc + t.pnlDollar, 0) >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              $
              {trades
                .reduce((acc, t) => acc + t.pnlDollar, 0)
                .toFixed(2)}
            </span>
          </span>
          <span>·</span>
          <span>Starting Base: $100.00</span>
        </div>
      </div>
    </div>
  );
};
