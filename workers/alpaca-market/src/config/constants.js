/**
 * Application constants and configuration
 */

export const ALPACA_CONFIG = {
  BASE_URL: "https://data.alpaca.markets",
  DEFAULT_FEED: "iex", // Free IEX feed
};

export const DEFAULT_VALUES = {
  NEWS_LIMIT: 50,
  MAX_SYMBOLS: 100,
};

export const VALIDATION_RULES = {
  SYMBOL_PATTERN: /^[A-Z]{1,5}$/,
  MIN_SYMBOLS: 1,
  MAX_SYMBOLS: 100,
};

export const API_ERRORS = {
  SYMBOL_REQUIRED: "Symbol is required",
  INVALID_SYMBOL_FORMAT:
    "Symbol must be 1-5 uppercase letters (e.g., AAPL, TSLA)",
  SYMBOLS_REQUIRED: "Missing required parameter: symbols",
  SYMBOLS_OUT_OF_RANGE: "Please provide between 1 and 100 symbols",
  NOT_FOUND: "Not found",
  INTERNAL_ERROR: "Internal server error",
  FETCH_FAILED: "Failed to fetch data",
};
