import React, { useState, useId } from 'react';
import { EquityPoint, Trade } from '../types/trading';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';

interface EquityCurveChartProps {
  equityCurve: EquityPoint[];
  initialBalance: number;
  onSelectTrade?: (trade: Trade) => void;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  equityCurve,
  initialBalance,
  onSelectTrade,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const gradientId = useId();

  if (equityCurve.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        No equity curve data available.
      </div>
    );
  }

  // Calculate dimensions and scales
  const svgWidth = 800;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Min / max balances with safety margins
  const balances = equityCurve.map((p) => p.balance);
  const rawMin = Math.min(initialBalance * 0.9, ...balances);
  const rawMax = Math.max(initialBalance * 1.1, ...balances);
  const range = rawMax - rawMin || 1;
  const minVal = Math.floor(rawMin - range * 0.05);
  const maxVal = Math.ceil(rawMax + range * 0.05);

  const getX = (index: number) => {
    if (equityCurve.length <= 1) return padding.left;
    return padding.left + (index / (equityCurve.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  };

  const initialY = getY(initialBalance);

  // Build path data
  const points = equityCurve.map((p, idx) => `${getX(idx)},${getY(p.balance)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(equityCurve.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  // Ending state
  const lastPoint = equityCurve[equityCurve.length - 1];
  const isProfitable = lastPoint.balance >= initialBalance;

  // Horizontal grid lines (4-5 levels)
  const ySteps = 5;
  const gridLevels = Array.from({ length: ySteps }).map((_, i) => {
    const val = minVal + (i / (ySteps - 1)) * (maxVal - minVal);
    return {
      value: val,
      y: getY(val),
    };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratioX = clientX / rect.width;
    const virtualX = ratioX * svgWidth;

    const clampedX = Math.max(padding.left, Math.min(padding.left + chartWidth, virtualX));
    const normalizedPos = (clampedX - padding.left) / chartWidth;
    const targetIdx = Math.round(normalizedPos * (equityCurve.length - 1));

    if (equityCurve[targetIdx]) {
      setHoveredPoint(equityCurve[targetIdx]);
      setMousePos({
        x: getX(targetIdx),
        y: getY(equityCurve[targetIdx].balance),
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePos(null);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Account Equity Curve ($100 Starting Capital)
          </h3>
          <span className="text-xs text-slate-400">· Trade by trade growth</span>
        </div>

        {/* Hover detail or Ending status */}
        <div className="text-xs font-mono">
          {hoveredPoint ? (
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-400">Trade #{hoveredPoint.tradeNum}:</span>
              <span className="font-bold text-white tabular-nums">${hoveredPoint.balance.toFixed(2)}</span>
              <span
                className={`tabular-nums ${
                  hoveredPoint.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({hoveredPoint.netPnl >= 0 ? '+' : ''}${hoveredPoint.netPnl.toFixed(2)})
              </span>
              <span className="text-slate-400 text-[11px]">DD: -{hoveredPoint.drawdownPercent.toFixed(1)}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <span>Start: <span className="text-slate-300">$100.00</span></span>
              <span>→</span>
              <span>
                Ending:{' '}
                <span
                  className={`font-bold tabular-nums ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${lastPoint.balance.toFixed(2)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[320px] overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isProfitable ? '#10b981' : '#f43f5e'}
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor={isProfitable ? '#10b981' : '#f43f5e'}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLevels.map((lvl, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={lvl.y}
                x2={padding.left + chartWidth}
                y2={lvl.y}
                stroke="#1f2937"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={lvl.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono tabular-nums"
              >
                ${lvl.value.toFixed(0)}
              </text>
            </g>
          ))}

          {/* $100 Initial Balance Benchmark Line */}
          <line
            x1={padding.left}
            y1={initialY}
            x2={padding.left + chartWidth}
            y2={initialY}
            stroke="#64748b"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
          <text
            x={padding.left + chartWidth + 5}
            y={initialY + 3}
            className="text-[10px] fill-slate-400 font-mono font-medium"
          >
            $100 Base
          </text>

          {/* Area under curve */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Main Equity Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isProfitable ? '#10b981' : '#f43f5e'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair */}
          {mousePos && hoveredPoint && (
            <g>
              {/* Vertical line */}
              <line
                x1={mousePos.x}
                y1={padding.top}
                x2={mousePos.x}
                y2={padding.top + chartHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Point on curve */}
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="4.5"
                fill={isProfitable ? '#10b981' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-axis trade step markers */}
          <text
            x={padding.left}
            y={svgHeight - 8}
            className="text-[10px] fill-slate-400 font-mono"
          >
            Start
          </text>
          <text
            x={padding.left + chartWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-[10px] fill-slate-400 font-mono"
          >
            Trade #{Math.floor(equityCurve.length / 2)}
          </text>
          <text
            x={padding.left + chartWidth}
            y={svgHeight - 8}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono"
          >
            Trade #{equityCurve.length - 1}
          </text>
        </svg>

        {/* Hover Tooltip Floating Card */}
        {hoveredPoint && hoveredPoint.trade && (
          <div
            onClick={() => hoveredPoint.trade && onSelectTrade?.(hoveredPoint.trade)}
            className="mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-between gap-4 text-xs cursor-pointer hover:border-emerald-500/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              {hoveredPoint.trade.pnlDollar > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-semibold text-white">
                  Trade #{hoveredPoint.tradeNum} ({hoveredPoint.trade.dayLabel})
                </span>
                <span className="text-slate-400 ml-2 font-mono">
                  {hoveredPoint.trade.direction} @ ${hoveredPoint.trade.entryPrice.toFixed(2)} → $
                  {hoveredPoint.trade.exitPrice.toFixed(2)} ({hoveredPoint.trade.exitReason})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <span
                className={`font-bold tabular-nums ${
                  hoveredPoint.trade.pnlDollar > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoveredPoint.trade.pnlDollar > 0 ? '+' : ''}$
                {hoveredPoint.trade.pnlDollar.toFixed(2)} ({hoveredPoint.trade.pnlPercent > 0 ? '+' : ''}
                {hoveredPoint.trade.pnlPercent.toFixed(1)}%)
              </span>
              <span className="text-slate-400 text-[11px] underline">
                View session chart →
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
