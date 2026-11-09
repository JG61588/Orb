import React from 'react';
import { AVAILABLE_ASSETS, AssetProfile } from '../data/marketData';
import { Activity, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';

interface HeaderProps {
  currentAsset: AssetProfile;
  onSelectAsset: (asset: AssetProfile) => void;
  onRefreshLiveData: () => void;
  onAutoOptimize: () => void;
  activeTab: 'overview' | 'chart' | 'heatmap' | 'journal';
  onChangeTab: (tab: 'overview' | 'chart' | 'heatmap' | 'journal') => void;
  isLoading?: boolean;
  lastUpdated?: string;
  currentPrice?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentAsset,
  onSelectAsset,
  onRefreshLiveData,
  onAutoOptimize,
  activeTab,
  onChangeTab,
  isLoading = false,
  lastUpdated,
  currentPrice,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0d131f] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar: Strict 3-zone contract */}
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand title & live feed indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                ORB Quant Simulator
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Live Yahoo Finance
                </span>
                <span aria-hidden="true">·</span>
                <span>$100 Account</span>
                {lastUpdated && (
                  <>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline text-slate-400 font-mono text-[11px]">Synced {lastUpdated}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation links / View Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => onChangeTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard & Equity
            </button>
            <button
              onClick={() => onChangeTab('chart')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'chart'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Session Candlesticks
            </button>
            <button
              onClick={() => onChangeTab('heatmap')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'heatmap'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Optimizer Matrix
            </button>
            <button
              onClick={() => onChangeTab('journal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'journal'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trade Journal
            </button>
          </nav>

          {/* Zone 3: Primary Action & Asset selector */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Asset Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Ticker:</span>
              <select
                aria-label="Select Market Ticker"
                value={currentAsset.symbol}
                onChange={(e) => {
                  const found = AVAILABLE_ASSETS.find((a) => a.symbol === e.target.value);
                  if (found) onSelectAsset(found);
                }}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {AVAILABLE_ASSETS.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol} className="bg-slate-900 text-white">
                    {asset.symbol} - {asset.category}
                  </option>
                ))}
              </select>
              {currentPrice && (
                <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums ml-1 pl-1.5 border-l border-slate-800">
                  ${currentPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Quick Refresh Live Market Data */}
            <button
              onClick={onRefreshLiveData}
              disabled={isLoading}
              title="Refresh live 5-minute data directly from Yahoo Finance"
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Primary Action: Auto-Optimize */}
            <button
              onClick={onAutoOptimize}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Find Best SL/TP</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-800/60 overflow-x-auto gap-2">
          {(['overview', 'chart', 'heatmap', 'journal'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onChangeTab(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'overview' ? 'Dashboard' : tab === 'chart' ? 'Candles' : tab === 'heatmap' ? 'Matrix' : 'Journal'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
