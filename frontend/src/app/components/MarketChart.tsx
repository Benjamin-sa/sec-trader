'use client';

import { useState } from 'react';
import { MarketBar, MarketAnalysis, SignificantMove } from '@/lib/api-client';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MarketChartProps {
  symbol: string;
  bars: MarketBar[];
  analysis?: MarketAnalysis;
  significantMoves?: SignificantMove[];
  loading?: boolean;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'volume' | 'combined';
type TimeRange = '1M' | '3M' | '6M' | '1Y';

export default function MarketChart({ symbol, bars, analysis, significantMoves, loading }: MarketChartProps) {
  const [chartType, setChartType] = useState<ChartType>('combined');
  const [showMovingAverages, setShowMovingAverages] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!bars || bars.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No market data available for {symbol}
      </div>
    );
  }

  // Prepare data for Recharts
  const chartData = bars.map((bar, index) => {
    // Calculate simple moving averages
    let sma20 = null;
    let sma50 = null;

    if (index >= 19) {
      const last20 = bars.slice(index - 19, index + 1);
      sma20 = last20.reduce((sum, b) => sum + b.close, 0) / 20;
    }

    if (index >= 49) {
      const last50 = bars.slice(index - 49, index + 1);
      sma50 = last50.reduce((sum, b) => sum + b.close, 0) / 50;
    }

    return {
      date: new Date(bar.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      sma20: sma20 ? Number(sma20.toFixed(2)) : null,
      sma50: sma50 ? Number(sma50.toFixed(2)) : null,
      range: [bar.low, bar.high],
    };
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Current Price</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(analysis.currentPrice)}
            </div>
            <div className={`flex items-center text-sm mt-1 ${
              parseFloat(analysis.priceChangePercent) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {parseFloat(analysis.priceChangePercent) >= 0 ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {analysis.priceChangePercent}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Period High / Low</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(analysis.periodHigh)}
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(analysis.periodLow)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Avg Volume</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatVolume(analysis.avgVolume)}
            </div>
            <div className="text-sm text-gray-600">
              {analysis.totalBars} trading days
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Moving Averages</div>
            {analysis.sma20 && (
              <div className="text-sm text-gray-900">
                SMA 20: ${analysis.sma20}
              </div>
            )}
            {analysis.sma50 && (
              <div className="text-sm text-gray-900">
                SMA 50: ${analysis.sma50}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Price Chart - Last 3 Months
        </h3>
        <div className="overflow-x-auto">
          <svg 
            width={chartWidth} 
            height={chartHeight} 
            className="border border-gray-200 rounded"
            style={{ minWidth: '600px' }}
          >
            {/* Grid lines */}
            <g className="grid-lines">
              {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
                const y = chartHeight * fraction;
                const price = maxPrice + padding - (priceRange + 2 * padding) * fraction;
                return (
                  <g key={i}>
                    <line
                      x1="0"
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <text
                      x="5"
                      y={y - 5}
                      fontSize="10"
                      fill="#6b7280"
                    >
                      {formatCurrency(price)}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Candlesticks */}
            {bars.map((bar, index) => createCandlestick(bar, index))}

            {/* Date labels */}
            <g className="date-labels">
              {bars
                .filter((_, i) => i % Math.ceil(bars.length / 10) === 0)
                .map((bar, i, arr) => {
                  const index = bars.indexOf(bar);
                  const x = scaleX(index);
                  return (
                    <text
                      key={i}
                      x={x}
                      y={chartHeight - 5}
                      fontSize="10"
                      fill="#6b7280"
                      textAnchor="middle"
                    >
                      {formatDate(bar.timestamp)}
                    </text>
                  );
                })}
            </g>
          </svg>
        </div>
      </div>

      {/* Significant Moves */}
      {significantMoves && significantMoves.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Significant Price Movements (±5%)
          </h3>
          <div className="space-y-2">
            {significantMoves.slice(0, 5).map((move, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {formatDate(move.date)}
                  </div>
                  <div className={`flex items-center font-semibold ${
                    parseFloat(move.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(move.changePercent) >= 0 ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                    )}
                    {move.changePercent}%
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(move.previousClose)} → {formatCurrency(move.currentClose)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
