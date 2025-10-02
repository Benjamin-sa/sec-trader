/**
 * Application constants and configuration
 */

export const ALPACA_CONFIG = {
  BASE_URL: "https://data.alpaca.markets",
  MAX_LIMIT: 10000,
  DEFAULT_FEED: "iex", // Free IEX feed
  ADJUSTMENT: "split", // Adjust for stock splits
};

export const TIMEFRAMES = [
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

export const DEFAULT_VALUES = {
  TIMEFRAME: "1Day",
  MONTHS: 3,
  INCLUDE_ANALYSIS: true,
  NEWS_LIMIT: 50,
  MAX_SYMBOLS: 100,
};

export const VALIDATION_RULES = {
  SYMBOL_PATTERN: /^[A-Z]{1,5}$/,
  MIN_MONTHS: 1,
  MAX_MONTHS: 12,
  MIN_SYMBOLS: 1,
  MAX_SYMBOLS: 100,
};

export const API_ERRORS = {
  SYMBOL_REQUIRED: "Symbol is required",
  INVALID_SYMBOL_FORMAT:
    "Symbol must be 1-5 uppercase letters (e.g., AAPL, TSLA)",
  INVALID_TIMEFRAME: "Invalid timeframe",
  INVALID_DATE_RANGE: "Invalid date range",
  INVALID_MONTHS: "Months must be a number between 1 and 12",
  SYMBOLS_REQUIRED: "Missing required parameter: symbols",
  SYMBOLS_OUT_OF_RANGE: "Please provide between 1 and 100 symbols",
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal server error",
  FETCH_FAILED: "Failed to fetch data",
};
