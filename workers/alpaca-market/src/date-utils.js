/**
 * Date utilities for market data requests
 */

/**
 * Get date range for the past N months in RFC3339 format
 *
 * @param {number} months - Number of months to look back
 * @returns {object} Object with start and end dates in RFC3339 format
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
 *
 * @param {number} days - Number of days to look back
 * @returns {object} Object with start and end dates in RFC3339 format
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
 * Parse and validate date string
 *
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
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
 *
 * @param {Date|string} date - Date object or string
 * @returns {string} RFC3339 formatted date string
 */
export function toRFC3339(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Get market hours adjusted date range
 * Ensures dates are within market trading hours
 *
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {object} Adjusted start and end dates
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
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get the previous trading day (skips weekends)
 *
 * @param {Date} date - Starting date
 * @returns {Date} Previous trading day
 */
export function getPreviousTradingDay(date = new Date()) {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);

  while (isWeekend(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }

  return prevDay;
}
