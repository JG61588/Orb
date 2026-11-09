import React from 'react';
import { StrategySettings } from '../types/trading';
import { Activity, BarChart2, Filter, Minus, Plus, Settings2, ShieldCheck, Sliders, TrendingUp, Zap } from 'lucide-react';

interface StrategyControlsProps {
  settings: StrategySettings;
  onChangeSettings: (newSettings: StrategySettings) => void;
  onApplyOptimal: () => void;
  onResetToDefaults?: () => void;
  optimalSL: number;
  optimalTP: number;
  optimalEndingBalance: number;
}

export const StrategyControls: React.FC<StrategyControlsProps> = ({
  settings,
  onChangeSettings,
  onApplyOptimal,
  onResetToDefaults,
  optimalSL,
  optimalTP,
  optimalEndingBalance,
}) => {
  // Calculated Risk/Reward Ratio
  const rrRatio = settings.stopLossPercent > 0
    ? Number((settings.takeProfitPercent / settings.stopLossPercent).toFixed(2))
    : 1;

  // Theoretical break-even win rate needed for this R:R
  const breakEvenWinRate = Number(((1 / (1 + rrRatio)) * 100).toFixed(1));

  const updateField = <K extends keyof StrategySettings>(field: K, value: StrategySettings[K]) => {
    onChangeSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleSlChange = (val: number) => {
    const clamped = Math.max(0.2, Math.min(4.0, Number(val.toFixed(2))));
    updateField('stopLossPercent', clamped);
  };

  const handleTpChange = (val: number) => {
    const clamped = Math.max(0.4, Math.min(8.0, Number(val.toFixed(2))));
    updateField('takeProfitPercent', clamped);
  };

  const presets = [
    {
      label: 'Strict Confluence (Win Rate Max)',
      sl: 2.0,
      tp: 4.0,
      orb: 15,
      sma: true,
      vol: true,
      trail: true,
      atr: true,
      vwap: true,
      htf: true,
    },
    {
      label: 'High Probability Runner (1.5% SL / 4.0% TP)',
      sl: 1.5,
      tp: 4.0,
      orb: 15,
      sma: true,
      vol: true,
      trail: true,
      atr: true,
      vwap: true,
      htf: true,
    },
    {
      label: 'Quick Scalp (0.75% / 1.5%)',
      sl: 0.75,
      tp: 1.5,
      orb: 5,
      sma: true,
      vol: true,
      trail: false,
      atr: true,
      vwap: true,
      htf: false,
    },
    {
      label: 'Baseline Classic ORB',
      sl: 2.0,
      tp: 4.0,
      orb: 15,
      sma: false,
      vol: false,
      trail: false,
      atr: false,
      vwap: false,
      htf: false,
    },
  ];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Title & Quick Presets Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">
            ORB Strategy & Strict Quality Confluence Filters
          </h2>
          <span className="text-[11px] text-emerald-400/90 font-mono hidden sm:inline">
            · Auto-saves automatically
          </span>
        </div>

        {/* Quick Presets & Reset to Default */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
          {presets.map((p) => {
            const isActive =
              Math.abs(settings.stopLossPercent - p.sl) < 0.04 &&
              Math.abs(settings.takeProfitPercent - p.tp) < 0.04 &&
              settings.orbMinutes === p.orb &&
              settings.useSma200Filter === p.sma &&
              settings.useVolumeConfirmation === p.vol &&
              settings.useTrailingStop === p.trail &&
              settings.useAtrFilter === p.atr &&
              settings.useVwapFilter === p.vwap &&
              settings.useHtfEmaFilter === p.htf;
            return (
              <button
                key={p.label}
                onClick={() => {
                  onChangeSettings({
                    ...settings,
                    stopLossPercent: p.sl,
                    takeProfitPercent: p.tp,
                    orbMinutes: p.orb,
                    useSma200Filter: p.sma,
                    useVolumeConfirmation: p.vol,
                    useTrailingStop: p.trail,
                    useAtrFilter: p.atr,
                    useVwapFilter: p.vwap,
                    useHtfEmaFilter: p.htf,
                  });
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          {onResetToDefaults && (
            <button
              onClick={onResetToDefaults}
              title="Reset to permanent defaults: 2.0% SL, 4.0% TP, 200 SMA on, Volume 1.5x on, Trailing Stop on, ATR 15m on, VWAP on, 1H EMA on"
              className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors ml-1 cursor-pointer"
            >
              Reset Defaults
            </button>
          )}
        </div>
      </div>

      {/* Strict Quality Confluence Engine Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Active Institutional Confluence Rules (Eliminating False Breakouts & Losing Trades)
          </span>
          <span className="text-[11px] font-mono text-emerald-400/90">
            {[
              settings.useSma200Filter,
              settings.useVolumeConfirmation,
              settings.useTrailingStop,
              settings.useAtrFilter,
              settings.useVwapFilter,
              settings.useHtfEmaFilter,
            ].filter(Boolean).length} of 6 Quality Guards Active
          </span>
        </div>

        {/* 6 Confluence Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Rule 1: 14 ATR 15m Volatility Filter */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useAtrFilter
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">15m ATR Volatility Filter</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useAtrFilter
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useAtrFilter ? '>1.2x ATR' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Breakout candle body size must exceed 1.2x the 14-period 15m ATR to guarantee genuine expansion.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useAtrFilter', !settings.useAtrFilter)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useAtrFilter
                  ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useAtrFilter ? '✓ 1.2x ATR Filter Active' : 'Enable 15m ATR'}
            </button>
          </div>

          {/* Rule 2: Daily VWAP Money Flow Bias */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useVwapFilter
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">Daily VWAP Bias</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useVwapFilter
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useVwapFilter ? 'MONEY FLOW' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Longs strictly above intraday VWAP; Shorts strictly below VWAP, trading with institutional volume flow.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useVwapFilter', !settings.useVwapFilter)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useVwapFilter
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useVwapFilter ? '✓ VWAP Alignment Active' : 'Enable VWAP Filter'}
            </button>
          </div>

          {/* Rule 3: 1-Hour 50 EMA Trend Protection */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useHtfEmaFilter
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">1-Hour 50 EMA Protection</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useHtfEmaFilter
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useHtfEmaFilter ? 'HTF GUARD' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Strictly forbids Longs when 1-hour trend is bearish, and forbids Shorts when 1-hour trend is bullish.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useHtfEmaFilter', !settings.useHtfEmaFilter)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useHtfEmaFilter
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useHtfEmaFilter ? '✓ 1H Trend Guard Active' : 'Enable 1H 50 EMA'}
            </button>
          </div>

          {/* Rule 4: 200 SMA Filter */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useSma200Filter
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">200 SMA Trend Filter</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useSma200Filter
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useSma200Filter ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Longs only execute when 5m price &gt; 200 SMA to avoid counter-trend bear traps.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useSma200Filter', !settings.useSma200Filter)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useSma200Filter
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useSma200Filter ? '✓ Filter Enabled' : 'Enable 200 SMA'}
            </button>
          </div>

          {/* Rule 5: Breakout Volume Confirmation */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useVolumeConfirmation
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">Volume Confirmation</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useVolumeConfirmation
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useVolumeConfirmation ? '1.5x SURGE' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Requires breakout candle volume &ge; 1.5x of previous 5-candle average to weed out fakeouts.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useVolumeConfirmation', !settings.useVolumeConfirmation)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useVolumeConfirmation
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useVolumeConfirmation ? '✓ 1.5x Volume Active' : 'Enable Volume Surge'}
            </button>
          </div>

          {/* Rule 6: Trailing Stop Engine */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.useTrailingStop
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">Trailing Stop Engine</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      settings.useTrailingStop
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.useTrailingStop ? 'RATCHETING' : 'STATIC SL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Dynamically raises stop-loss with favorable price expansion, locking in profit automatically.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateField('useTrailingStop', !settings.useTrailingStop)}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                settings.useTrailingStop
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.useTrailingStop ? '✓ Trailing Engine Active' : 'Enable Trailing Stop'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLIDER 1: Stop-Loss % */}
        <div className="space-y-3 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="sl-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Stop-Loss (SL) %
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maximum risk threshold before closing position
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSlChange(settings.stopLossPercent - 0.05)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                title="Decrease SL 0.05%"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono text-sm font-bold text-rose-400 tabular-nums px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded">
                {settings.stopLossPercent.toFixed(2)}%
              </span>
              <button
                onClick={() => handleSlChange(settings.stopLossPercent + 0.05)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                title="Increase SL 0.05%"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <input
            id="sl-slider"
            type="range"
            min="0.2"
            max="4.0"
            step="0.05"
            value={settings.stopLossPercent}
            onChange={(e) => handleSlChange(parseFloat(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>0.2% (Ultra-Tight)</span>
            <span className="font-mono text-slate-300 tabular-nums">
              -${(settings.stopLossPercent * (settings.initialBalance / 100)).toFixed(2)} risk on $100 base
            </span>
            <span>4.0% (Wide)</span>
          </div>
        </div>

        {/* SLIDER 2: Take-Profit % */}
        <div className="space-y-3 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="tp-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Take-Profit (TP) %
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target exit point to lock in trading gains
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleTpChange(settings.takeProfitPercent - 0.05)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                title="Decrease TP 0.05%"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                {settings.takeProfitPercent.toFixed(2)}%
              </span>
              <button
                onClick={() => handleTpChange(settings.takeProfitPercent + 0.05)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                title="Increase TP 0.05%"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <input
            id="tp-slider"
            type="range"
            min="0.4"
            max="8.0"
            step="0.05"
            value={settings.takeProfitPercent}
            onChange={(e) => handleTpChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>0.4% (Quick Target)</span>
            <span className="font-mono text-slate-300 tabular-nums">
              +${(settings.takeProfitPercent * (settings.initialBalance / 100)).toFixed(2)} gain on $100 base
            </span>
            <span>8.0% (Multi-day Runner)</span>
          </div>
        </div>
      </div>

      {/* Real-time Risk/Reward Math Strip */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium">Risk/Reward Profile:</span>
          <span className="font-mono font-bold text-white tabular-nums">
            1 : {rrRatio.toFixed(2)}
          </span>
          <span className="text-slate-400">
            ({settings.stopLossPercent.toFixed(1)}% SL vs {settings.takeProfitPercent.toFixed(1)}% TP)
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span>Required Break-Even Win Rate:</span>
          <span className="font-mono font-semibold text-emerald-400 tabular-nums">
            {breakEvenWinRate}%
          </span>
        </div>

        {/* Optimal Setting Shortcut Callout */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Best Backtested:</span>
          <button
            onClick={onApplyOptimal}
            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer"
            title="Click to apply highest profit settings"
          >
            {optimalSL.toFixed(1)}% SL / {optimalTP.toFixed(1)}% TP → ${optimalEndingBalance.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Secondary Strategic Settings: ORB Timeframe, Direction, Sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* ORB Window */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Opening Range Window
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {[5, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => updateField('orbMinutes', mins)}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  settings.orbMinutes === mins
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mins}m ORB
              </button>
            ))}
          </div>
        </div>

        {/* Direction Filter */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Allowed Directions
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(
              [
                { id: 'BOTH', label: 'Long & Short' },
                { id: 'LONG_ONLY', label: 'Long Only' },
                { id: 'SHORT_ONLY', label: 'Short Only' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => updateField('direction', d.id)}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  settings.direction === d.id
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Capital Compounding Mode on $100 */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            $100 Account Sizing
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => updateField('sizingMode', 'FULL_COMPOUND')}
              className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                settings.sizingMode === 'FULL_COMPOUND'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compound (100%)
            </button>
            <button
              onClick={() => updateField('sizingMode', 'FIXED_100')}
              className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                settings.sizingMode === 'FIXED_100'
                  ? 'bg-slate-800 text-slate-200 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fixed $100
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
