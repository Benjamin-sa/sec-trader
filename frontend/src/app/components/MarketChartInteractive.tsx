'use client';

import { useState, useMemo } from 'react';
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

// Helper functions moved outside component for better performance
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, showMovingAverages }: { 
  active?: boolean; 
  payload?: Array<{ payload: { date: string; open: number; high: number; low: number; close: number; volume: number; sma20?: number; sma50?: number } }>; 
  showMovingAverages: boolean;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 sm:p-4 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{data.date}</p>
        <div className="space-y-1 text-xs sm:text-sm">
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

  // Memoize chart data calculation to prevent recalculation on every render
  // Must be called before any conditional returns
  const chartData = useMemo(() => {
    if (!bars || bars.length === 0) return [];
    
    return bars.map((bar, index) => {
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
  }, [bars]);

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Current Price</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatCurrency(analysis.currentPrice)}
            </div>
            <div className={`flex items-center text-xs sm:text-sm mt-1 ${
              parseFloat(analysis.priceChangePercent) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {parseFloat(analysis.priceChangePercent) >= 0 ? (
                <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              )}
              {analysis.priceChangePercent}%
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Period High / Low</div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {formatCurrency(analysis.periodHigh)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              {formatCurrency(analysis.periodLow)}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Avg Volume</div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
              {formatVolume(analysis.avgVolume)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              {analysis.totalBars} trading days
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Moving Averages</div>
            {analysis.sma20 && (
              <div className="text-xs sm:text-sm text-gray-900">
                SMA 20: ${analysis.sma20}
              </div>
            )}
            {analysis.sma50 && (
              <div className="text-xs sm:text-sm text-gray-900">
                SMA 50: ${analysis.sma50}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
        <div className="space-y-3">
          {/* Time Range and Interval - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Time Range Selection */}
            {onTimeRangeChange && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Period:</span>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.months}
                      onClick={() => onTimeRangeChange(range.months)}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm ${
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Interval:</span>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {TIMEFRAMES.map((tf, index) => (
                    <button
                      key={tf.value}
                      onClick={() => onTimeframeChange(tf.value)}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm ${
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
          </div>

          {/* Chart Type and Display Options */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Chart Type Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Chart:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setChartType('line')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm ${
                    chartType === 'line'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border-l ${
                    chartType === 'area'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('candlestick')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border-l ${
                    chartType === 'candlestick'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Candle
                </button>
                <button
                  onClick={() => setChartType('combined')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border-l ${
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
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMovingAverages}
                  onChange={(e) => setShowMovingAverages(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm text-gray-700">Moving Avg</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm text-gray-700">Volume</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white p-3 sm:p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {symbol} - Price Chart (Last {currentTimeRange} {currentTimeRange === 1 ? 'Month' : 'Months'})
          </h3>
          {bars.length > 0 && (
            <div className="text-xs text-gray-500">
              Data through: {formatDate(bars[bars.length - 1].timestamp)}
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
          {chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip showMovingAverages={showMovingAverages} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip showMovingAverages={showMovingAverages} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip showMovingAverages={showMovingAverages} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
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
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                yAxisId="price"
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip showMovingAverages={showMovingAverages} />} />
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
        <div className="bg-white p-3 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Volume</h3>
          <ResponsiveContainer width="100%" height={120} className="sm:h-[150px]">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => formatVolume(value)}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip 
                formatter={(value: number) => formatVolume(value)}
                labelStyle={{ color: '#374151', fontSize: '12px' }}
                contentStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="volume" fill="#6366f1" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Significant Moves */}
      {significantMoves && significantMoves.length > 0 && (
        <div className="bg-white p-3 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Significant Price Movements (±5%)
          </h3>
          <div className="space-y-2">
            {significantMoves.slice(0, 5).map((move, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(move.date)}
                  </div>
                  <div className={`flex items-center font-semibold text-sm sm:text-base ${
                    parseFloat(move.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(move.changePercent) >= 0 ? (
                      <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    )}
                    {move.changePercent}%
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
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
