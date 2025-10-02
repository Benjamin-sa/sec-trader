/**
 * Date utilities for market data requests
 */

/**
 * Get date range for the past N months in RFC3339 format
 */
export function getDateRangeMonths(months = 3) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get date range for the past N days in RFC3339 format
 */
export function getDateRangeDays(days = 90) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get date range for the past N hours in RFC3339 format
 */
export function getDateRangeHours(hours = 24) {
  const end = new Date();
  const start = new Date();
  start.setHours(start.getHours() - hours);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Parse and validate date string
 */
export function parseDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Convert date to RFC3339 format for Alpaca API
 */
export function toRFC3339(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Get market hours adjusted date range
 */
export function getMarketHoursRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Set to market open (9:30 AM ET)
  startDate.setUTCHours(14, 30, 0, 0); // 9:30 AM ET = 14:30 UTC (approximate)

  // Set to market close (4:00 PM ET)
  endDate.setUTCHours(21, 0, 0, 0); // 4:00 PM ET = 21:00 UTC (approximate)

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get the previous trading day (skips weekends)
 */
export function getPreviousTradingDay(date = new Date()) {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);

  while (isWeekend(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }

  return prevDay;
}
