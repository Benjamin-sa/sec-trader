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
} from 'recharts';

interface MarketChartProps {
  symbol: string;
  bars: MarketBar[];
  analysis?: MarketAnalysis;
  significantMoves?: SignificantMove[];
  loading?: boolean;
  onTimeRangeChange?: (months: number) => void;
  currentTimeRange?: number;
  onTimeframeChange?: (timeframe: string) => void;
  currentTimeframe?: string;
}

type ChartType = 'line' | 'area' | 'candlestick' | 'combined';
type TimeRangeOption = { label: string; months: number };
type TimeframeOption = { label: string; value: string };

const TIME_RANGES: TimeRangeOption[] = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
];

const TIMEFRAMES: TimeframeOption[] = [
  { label: '1 Hour', value: '1Hour' },
  { label: '1 Day', value: '1Day' },
  { label: '1 Week', value: '1Week' },
];

export default function MarketChart({ 
  symbol, 
  bars, 
  analysis, 
  significantMoves, 
  loading,
  onTimeRangeChange,
  currentTimeRange = 3,
  onTimeframeChange,
  currentTimeframe = '1Day'
}: MarketChartProps) {
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

  // Prepare data for Recharts with moving averages
  const chartData = bars.map((bar, index) => {
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
    };
  });

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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; open: number; high: number; low: number; close: number; volume: number; sma20?: number; sma50?: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.date}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">Open: <span className="font-medium">{formatCurrency(data.open)}</span></p>
            <p className="text-gray-700">High: <span className="font-medium text-green-600">{formatCurrency(data.high)}</span></p>
            <p className="text-gray-700">Low: <span className="font-medium text-red-600">{formatCurrency(data.low)}</span></p>
            <p className="text-gray-700">Close: <span className="font-medium">{formatCurrency(data.close)}</span></p>
            <p className="text-gray-700">Volume: <span className="font-medium">{formatVolume(data.volume)}</span></p>
            {showMovingAverages && data.sma20 && (
              <p className="text-blue-600">SMA 20: {formatCurrency(data.sma20)}</p>
            )}
            {showMovingAverages && data.sma50 && (
              <p className="text-purple-600">SMA 50: {formatCurrency(data.sma50)}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
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

      {/* Chart Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Range Selection */}
          {onTimeRangeChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.months}
                    onClick={() => onTimeRangeChange(range.months)}
                    className={`px-3 py-1 text-sm ${
                      currentTimeRange === range.months
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } ${range.months !== TIME_RANGES[0].months ? 'border-l' : ''}`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeframe Selection */}
          {onTimeframeChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Interval:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {TIMEFRAMES.map((tf, index) => (
                  <button
                    key={tf.value}
                    onClick={() => onTimeframeChange(tf.value)}
                    className={`px-3 py-1 text-sm ${
                      currentTimeframe === tf.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } ${index > 0 ? 'border-l' : ''}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chart Type Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Chart Type:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-sm ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-sm border-l ${
                  chartType === 'area'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-3 py-1 text-sm border-l ${
                  chartType === 'candlestick'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Candlestick
              </button>
              <button
                onClick={() => setChartType('combined')}
                className={`px-3 py-1 text-sm border-l ${
                  chartType === 'combined'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Combined
              </button>
            </div>
          </div>

          {/* Display Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMovingAverages}
                onChange={(e) => setShowMovingAverages(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Moving Averages</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Volume</span>
            </label>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {symbol} - Price Chart (Last {currentTimeRange} {currentTimeRange === 1 ? 'Month' : 'Months'})
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Close Price"
              />
              {showMovingAverages && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="sma20" 
                    stroke="#10b981" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="SMA 20"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sma50" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="SMA 50"
                  />
                </>
              )}
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Close Price"
              />
              {showMovingAverages && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="sma20" 
                    stroke="#10b981" 
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA 20"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sma50" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA 50"
                  />
                </>
              )}
            </AreaChart>
          ) : chartType === 'candlestick' ? (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="high" fill="#10b981" opacity={0.3} name="High" />
              <Bar dataKey="low" fill="#ef4444" opacity={0.3} name="Low" />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Close"
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="price"
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                yAxisId="price"
                type="monotone" 
                dataKey="close" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.1}
                name="Close Price"
              />
              {showMovingAverages && (
                <>
                  <Line 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="sma20" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name="SMA 20"
                  />
                  <Line 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="sma50" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    name="SMA 50"
                  />
                </>
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => formatVolume(value)}
              />
              <Tooltip 
                formatter={(value: number) => formatVolume(value)}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="volume" fill="#6366f1" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
