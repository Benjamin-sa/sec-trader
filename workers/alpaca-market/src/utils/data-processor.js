/**
 * Data processing utilities for market data
 */

/**
 * Calculate technical indicators from OHLCV bars
 */
export function calculateTechnicalIndicators(bars) {
  if (!bars || bars.length === 0) {
    return null;
  }

  const closes = bars.map((bar) => bar.c);
  const volumes = bars.map((bar) => bar.v);

  // Calculate simple moving averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  // Calculate volume metrics
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  const maxVolume = Math.max(...volumes);
  const minVolume = Math.min(...volumes);

  // Calculate price metrics
  const currentPrice = closes[closes.length - 1];
  const startPrice = closes[0];
  const priceChange = currentPrice - startPrice;
  const priceChangePercent = ((priceChange / startPrice) * 100).toFixed(2);

  // Calculate high/low
  const highs = bars.map((bar) => bar.h);
  const lows = bars.map((bar) => bar.l);
  const periodHigh = Math.max(...highs);
  const periodLow = Math.min(...lows);

  return {
    currentPrice,
    startPrice,
    priceChange,
    priceChangePercent,
    periodHigh,
    periodLow,
    sma20: sma20 ? sma20.toFixed(2) : null,
    sma50: sma50 ? sma50.toFixed(2) : null,
    avgVolume: Math.round(avgVolume),
    maxVolume,
    minVolume,
    totalBars: bars.length,
  };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data, period) {
  if (data.length < period) {
    return null;
  }

  const recentData = data.slice(-period);
  const sum = recentData.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Format bar data for easier consumption
 */
export function formatBars(bars) {
  return bars.map((bar) => ({
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    tradeCount: bar.n || 0,
    vwap: bar.vw || null,
  }));
}

/**
 * Group bars by date for daily aggregation
 */
export function groupBarsByDate(bars) {
  const grouped = {};

  bars.forEach((bar) => {
    const date = new Date(bar.timestamp).toISOString().split("T")[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(bar);
  });

  return grouped;
}

/**
 * Calculate daily aggregates from intraday bars
 */
export function calculateDailyAggregate(bars) {
  if (!bars || bars.length === 0) {
    return null;
  }

  const opens = bars.map((b) => b.open);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  return {
    open: opens[0],
    high: Math.max(...highs),
    low: Math.min(...lows),
    close: closes[closes.length - 1],
    volume: volumes.reduce((sum, v) => sum + v, 0),
    barCount: bars.length,
  };
}

/**
 * Detect significant price movements
 */
export function detectSignificantMoves(bars, threshold = 5) {
  const movements = [];

  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    const currentClose = bars[i].close;
    const change = ((currentClose - prevClose) / prevClose) * 100;

    if (Math.abs(change) >= threshold) {
      movements.push({
        date: bars[i].timestamp,
        previousClose: prevClose,
        currentClose: currentClose,
        changePercent: change.toFixed(2),
        volume: bars[i].volume,
      });
    }
  }

  return movements;
}

/**
 * Format news data for easier consumption
 */
export function formatNews(newsItems) {
  return newsItems.map((item) => ({
    id: item.id,
    headline: item.headline,
    summary: item.summary || null,
    author: item.author || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    url: item.url,
    content: item.content || null,
    symbols: item.symbols || [],
    source: item.source || null,
    images: item.images || [],
  }));
}
