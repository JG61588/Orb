import { DaySession, OptimizationCell, StrategySettings } from '../types/trading';
import { runOrbSimulation } from './orbSimulator';

export const SL_STEPS = [0.3, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5];
export const TP_STEPS = [0.6, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

export function runParameterOptimizationGrid(
  sessions: DaySession[],
  baseSettings: StrategySettings
): {
  cells: OptimizationCell[];
  grid: OptimizationCell[][]; // rows: TP, cols: SL
  bestCell: OptimizationCell;
  highestWinRateCell: OptimizationCell;
  maxEndingBalance: number;
  minEndingBalance: number;
} {
  const cells: OptimizationCell[] = [];
  const grid: OptimizationCell[][] = [];

  let bestCell: OptimizationCell | null = null;
  let highestWinRateCell: OptimizationCell | null = null;
  let maxEndingBalance = -Infinity;
  let minEndingBalance = Infinity;

  // We arrange grid with TP on rows (descending for intuitive chart layout: high TP at top)
  const reversedTp = [...TP_STEPS].reverse();

  for (const tp of reversedTp) {
    const row: OptimizationCell[] = [];
    for (const sl of SL_STEPS) {
      const sim = runOrbSimulation(sessions, {
        ...baseSettings,
        stopLossPercent: sl,
        takeProfitPercent: tp,
      });

      const cell: OptimizationCell = {
        stopLossPercent: sl,
        takeProfitPercent: tp,
        endingBalance: sim.endingBalance,
        netProfit: sim.netProfit,
        winRate: sim.winRate,
        totalTrades: sim.totalTrades,
        profitFactor: sim.profitFactor,
        maxDrawdownPercent: sim.maxDrawdownPercent,
      };

      cells.push(cell);
      row.push(cell);

      if (cell.endingBalance > maxEndingBalance) {
        maxEndingBalance = cell.endingBalance;
        bestCell = cell;
      }
      if (cell.endingBalance < minEndingBalance) {
        minEndingBalance = cell.endingBalance;
      }

      if (
        !highestWinRateCell ||
        (cell.totalTrades >= 2 && cell.winRate > highestWinRateCell.winRate) ||
        (cell.totalTrades >= 2 &&
          cell.winRate === highestWinRateCell.winRate &&
          cell.endingBalance > highestWinRateCell.endingBalance)
      ) {
        highestWinRateCell = cell;
      }
    }
    grid.push(row);
  }

  return {
    cells,
    grid,
    bestCell: bestCell || cells[0],
    highestWinRateCell: highestWinRateCell || cells[0],
    maxEndingBalance,
    minEndingBalance,
  };
}
