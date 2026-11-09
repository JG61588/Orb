import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AVAILABLE_ASSETS, AssetProfile, fetchLiveMarketData } from './data/marketData';
import { DEFAULT_STRATEGY_SETTINGS, DaySession, StrategySettings, Trade } from './types/trading';
import { runOrbSimulation } from './utils/orbSimulator';
import { runParameterOptimizationGrid } from './utils/optimizer';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { StrategyControls } from './components/StrategyControls';
import { EquityCurveChart } from './components/EquityCurveChart';
import { CandleSessionViewer } from './components/CandleSessionViewer';
import { OptimizationHeatmap } from './components/OptimizationHeatmap';
import { TradeJournal } from './components/TradeJournal';
import { StrategyGuide } from './components/StrategyGuide';
import { Check, Loader2, Sparkles } from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'orb_bot_strategy_settings_v4';

export default function App() {
  const [currentAsset, setCurrentAsset] = useState<AssetProfile>(AVAILABLE_ASSETS[0]); // SPY default
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'heatmap' | 'journal'>('overview');
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live market data states from Yahoo Finance
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [livePrice, setLivePrice] = useState<number | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  // Strategy parameters with $100 starting account - permanent defaults (2.0% SL, 4.0% TP, 200 SMA on, strict confluence rules) with auto-save
  const [settings, setSettings] = useState<StrategySettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STRATEGY_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_STRATEGY_SETTINGS;
  });

  // Automatically save any changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Auto-save error', err);
    }
  }, [settings]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Fetch real-world market sessions directly from Yahoo Finance public feed
  const loadMarketData = useCallback(async (_force: boolean = false) => {
    setIsLoading(true);
    try {
      const feed = await fetchLiveMarketData(currentAsset.symbol);
      setSessions(feed.sessions);
      setLivePrice(feed.currentPrice);
      setLastUpdated(feed.lastUpdated);
      setSelectedSessionIndex(0);
      showToast(`Loaded ${feed.sessions.length} live trading sessions from Yahoo Finance for ${currentAsset.symbol}`);
    } catch (err: any) {
      console.error('Failed to load Yahoo Finance data:', err);
      showToast(err.message || 'Failed to fetch live Yahoo Finance feed');
    } finally {
      setIsLoading(false);
    }
  }, [currentAsset.symbol, showToast]);

  // Load live data on asset change
  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // 1. Real-time deterministic simulation run using live Yahoo Finance sessions
  const simulationResults = useMemo(() => {
    if (sessions.length === 0) {
      return runOrbSimulation([], settings);
    }
    return runOrbSimulation(sessions, settings);
  }, [sessions, settings]);

  // 2. Parameter optimization grid (64 combinations evaluated on live data)
  const optimization = useMemo(() => {
    if (sessions.length === 0) {
      return runParameterOptimizationGrid([], settings);
    }
    return runParameterOptimizationGrid(sessions, settings);
  }, [
    sessions,
    settings.orbMinutes,
    settings.direction,
    settings.sizingMode,
    settings.useSma200Filter,
    settings.useVolumeConfirmation,
    settings.volumeMultiplier,
    settings.useTrailingStop,
    settings.useAtrFilter,
    settings.atrMultiplier,
    settings.useVwapFilter,
    settings.useHtfEmaFilter,
  ]);

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_STRATEGY_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_STRATEGY_SETTINGS));
    } catch {
      // ignore
    }
    showToast('Reset to calibrated defaults: 2.0% SL, 4.0% TP, 200 SMA on, 1.2x Volume & VWAP');
  };

  // Handler to apply the best backtested configuration
  const handleApplyOptimal = () => {
    const best = optimization.bestCell;
    setSettings((prev) => ({
      ...prev,
      stopLossPercent: best.stopLossPercent,
      takeProfitPercent: best.takeProfitPercent,
    }));
    showToast(
      `Applied Optimal Settings: SL ${best.stopLossPercent.toFixed(1)}% / TP ${best.takeProfitPercent.toFixed(
        1
      )}% (Ending Balance: $${best.endingBalance.toFixed(2)})`
    );
  };

  const handleSelectTrade = (trade: Trade) => {
    const dayIdx = sessions.findIndex((s) => s.date === trade.dayDate);
    if (dayIdx >= 0) {
      setSelectedSessionIndex(dayIdx);
      setActiveTab('chart');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Bar Navigation */}
      <Header
        currentAsset={currentAsset}
        onSelectAsset={(asset) => {
          setCurrentAsset(asset);
        }}
        onRefreshLiveData={() => loadMarketData(true)}
        onAutoOptimize={handleApplyOptimal}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        currentPrice={livePrice}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 font-mono animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Live Loading Indicator */}
        {isLoading && sessions.length === 0 && (
          <div className="bg-[#111827] border border-emerald-500/30 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            <div className="text-sm font-semibold text-white">
              Streaming Live Market Data from Yahoo Finance ({currentAsset.symbol})
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Fetching real 5-minute intraday bars directly via public market feed. No API keys required.
            </p>
          </div>
        )}

        {/* 1. Core Metrics Breakdown: Win Rate, Total Trades, Ending Balance */}
        <section aria-label="Key Performance Indicators">
          <MetricCards results={simulationResults} />
        </section>

        {/* 2. Interactive Strategy Tuning Sliders */}
        <section aria-label="Strategy Controls">
          <StrategyControls
            settings={settings}
            onChangeSettings={setSettings}
            onApplyOptimal={handleApplyOptimal}
            onResetToDefaults={handleResetToDefaults}
            optimalSL={optimization.bestCell.stopLossPercent}
            optimalTP={optimization.bestCell.takeProfitPercent}
            optimalEndingBalance={optimization.bestCell.endingBalance}
          />
        </section>

        {/* 3. Dynamic Main Content Area based on Active Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Equity Curve Chart */}
            <EquityCurveChart
              equityCurve={simulationResults.equityCurve}
              initialBalance={settings.initialBalance}
              onSelectTrade={handleSelectTrade}
            />

            {/* Parameter Optimization Preview Matrix */}
            <OptimizationHeatmap
              grid={optimization.grid}
              bestCell={optimization.bestCell}
              highestWinRateCell={optimization.highestWinRateCell}
              currentSL={settings.stopLossPercent}
              currentTP={settings.takeProfitPercent}
              onSelectCell={(cell) => {
                setSettings((prev) => ({
                  ...prev,
                  stopLossPercent: cell.stopLossPercent,
                  takeProfitPercent: cell.takeProfitPercent,
                }));
                showToast(
                  `Loaded settings: SL ${cell.stopLossPercent.toFixed(1)}% / TP ${cell.takeProfitPercent.toFixed(1)}%`
                );
              }}
              maxEndingBalance={optimization.maxEndingBalance}
              minEndingBalance={optimization.minEndingBalance}
            />

            {/* Quick Recent Trades Strip */}
            <TradeJournal
              trades={simulationResults.trades}
              onSelectTrade={handleSelectTrade}
            />

            {/* Educational Strategy Guide */}
            <StrategyGuide />
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="space-y-6">
            <CandleSessionViewer
              sessions={sessions}
              trades={simulationResults.trades}
              selectedSessionIndex={selectedSessionIndex}
              onSelectSessionIndex={setSelectedSessionIndex}
              orbMinutes={settings.orbMinutes}
            />

            <TradeJournal
              trades={simulationResults.trades}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            <OptimizationHeatmap
              grid={optimization.grid}
              bestCell={optimization.bestCell}
              highestWinRateCell={optimization.highestWinRateCell}
              currentSL={settings.stopLossPercent}
              currentTP={settings.takeProfitPercent}
              onSelectCell={(cell) => {
                setSettings((prev) => ({
                  ...prev,
                  stopLossPercent: cell.stopLossPercent,
                  takeProfitPercent: cell.takeProfitPercent,
                }));
                showToast(
                  `Loaded settings: SL ${cell.stopLossPercent.toFixed(1)}% / TP ${cell.takeProfitPercent.toFixed(1)}%`
                );
              }}
              maxEndingBalance={optimization.maxEndingBalance}
              minEndingBalance={optimization.minEndingBalance}
            />

            <EquityCurveChart
              equityCurve={simulationResults.equityCurve}
              initialBalance={settings.initialBalance}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="space-y-6">
            <TradeJournal
              trades={simulationResults.trades}
              onSelectTrade={handleSelectTrade}
            />

            <EquityCurveChart
              equityCurve={simulationResults.equityCurve}
              initialBalance={settings.initialBalance}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        )}
      </main>

      {/* Clean Quantitative Terminal Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d131f] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>ORB Quant Simulator</span>
            <span>·</span>
            <span>$100 Micro Capitalization Model</span>
            <span>·</span>
            <span className="text-emerald-400/90 font-medium">Yahoo Finance Live Feed (Zero API Keys)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Fractional Shares Enabled</span>
            <span>·</span>
            <span>0.02% Institutional Slippage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
