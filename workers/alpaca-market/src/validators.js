/**
 * Validation utilities for API requests
 */

/**
 * Validate stock symbol format
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {object} Validation result { valid: boolean, error?: string }
 */
export function validateSymbol(symbol) {
  if (!symbol) {
    return { valid: false, error: "Symbol is required" };
  }

  if (typeof symbol !== "string") {
    return { valid: false, error: "Symbol must be a string" };
  }

  // Remove whitespace and convert to uppercase
  const cleanSymbol = symbol.trim().toUpperCase();

  // Check symbol format (1-5 uppercase letters)
  if (!/^[A-Z]{1,5}$/.test(cleanSymbol)) {
    return {
      valid: false,
      error: "Symbol must be 1-5 uppercase letters (e.g., AAPL, TSLA)",
    };
  }

  return { valid: true, symbol: cleanSymbol };
}

/**
 * Validate timeframe parameter
 *
 * @param {string} timeframe - Bar timeframe
 * @returns {object} Validation result
 */
export function validateTimeframe(timeframe) {
  const validTimeframes = [
    "1Min",
    "5Min",
    "15Min",
    "30Min",
    "1Hour",
    "2Hour",
    "4Hour",
    "1Day",
    "1Week",
    "1Month",
  ];

  if (!timeframe) {
    return { valid: true, timeframe: "1Day" }; // Default
  }

  if (!validTimeframes.includes(timeframe)) {
    return {
      valid: false,
      error: `Invalid timeframe. Must be one of: ${validTimeframes.join(", ")}`,
    };
  }

  return { valid: true, timeframe };
}

/**
 * Validate date range
 *
 * @param {string} start - Start date
 * @param {string} end - End date
 * @returns {object} Validation result
 */
export function validateDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime())) {
    return { valid: false, error: "Invalid start date" };
  }

  if (isNaN(endDate.getTime())) {
    return { valid: false, error: "Invalid end date" };
  }

  if (startDate >= endDate) {
    return { valid: false, error: "Start date must be before end date" };
  }

  // Check if range is too large (more than 1 year for intraday data)
  const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);

  return { valid: true, start, end, daysDiff };
}

/**
 * Validate months parameter
 *
 * @param {string|number} months - Number of months
 * @returns {object} Validation result
 */
export function validateMonths(months) {
  const monthsNum = parseInt(months);

  if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 12) {
    return {
      valid: false,
      error: "Months must be a number between 1 and 12",
    };
  }

  return { valid: true, months: monthsNum };
}
