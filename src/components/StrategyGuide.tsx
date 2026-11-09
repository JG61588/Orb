import React from 'react';
import { Activity, BookOpen, CheckCircle, ShieldCheck, Target, Zap } from 'lucide-react';

export const StrategyGuide: React.FC = () => {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <BookOpen className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white tracking-tight">
          Strict Institutional Confluence Playbook for $100 Accounts
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Step 1 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <Target className="w-4 h-4" />
            <span>1. Range Definition</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            At 09:30 AM EST market open, opening volatility measures the High (ORH) and Low (ORL) of the initial range.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • 15m benchmark window
            <br />
            • Establishes baseline boundaries
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <Activity className="w-4 h-4" />
            <span>2. 15m ATR Volatility Filter</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Breakout candle body size must exceed 1.2x the 14-period ATR calculated on the 15-minute timeframe.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • Body &gt; 1.2x 15m ATR
            <br />
            • Eliminates random market noise
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Zap className="w-4 h-4" />
            <span>3. Daily VWAP Money Flow</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Longs must trade strictly above the daily VWAP line; Shorts must trade strictly below VWAP.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • Long &gt; Daily VWAP
            <br />
            • Aligns with institutional flow
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>4. 1-Hour 50 EMA Guard</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Multi-timeframe guard strictly forbids Longs if the 1-hour trend is bearish, or Shorts if 1-hour trend is bullish.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • 1-Hour 50 EMA Trend Guard
            <br />
            • Prevents counter-macro traps
          </div>
        </div>

        {/* Step 5 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <CheckCircle className="w-4 h-4" />
            <span>5. Volume Surge Confirmation</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Breakout 5-minute candle volume must be &ge; 1.5x of the rolling average of the prior 5 candles.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • 1.5x volume expansion
            <br />
            • Weeds out low-liquidity chop
          </div>
        </div>

        {/* Step 6 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>6. Trailing Stop Engine</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Dynamically ratchets the stop-loss price higher as profits expand, protecting capital automatically.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            • Asymmetric 2:1 R:R profile
            <br />
            • Ratchets stops into profit
          </div>
        </div>
      </div>
    </div>
  );
};
