/**
 * Configuration constants for the API
 */

export const API_ROUTES = {
  TRADES_LATEST: "/api/trades/latest",
  TRADES_IMPORTANT: "/api/trades/important",
  TRADES_FIRST_BUYS: "/api/trades/first-buys",
  TRADES_CLUSTERS: "/api/trades/clusters",
  TRADES_BY_COMPANY: "/api/trades/company",
  TRADES_BY_INSIDER: "/api/trades/insider",
  HEALTH: "/api/health",
};

export const TRANSACTION_CODES = {
  PURCHASE: "P",
  SALE: "S",
  AWARD: "A",
};

export const ACQUIRED_DISPOSED_CODES = {
  ACQUIRED: "A",
  DISPOSED: "D",
};

export const OWNERSHIP_TYPES = {
  DIRECT: "D",
  INDIRECT: "I",
};

export const DEFAULT_LIMITS = {
  LATEST_TRADES: 50,
  IMPORTANT_TRADES: 50,
  FIRST_BUYS: 50,
  CLUSTERS: 20,
};

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const IMPORTANCE_THRESHOLDS = {
  CRITICAL: 130,
  HIGH: 95,
  ELEVATED: 70,
  MEDIUM: 45,
};

export const VALUE_THRESHOLDS = {
  VERY_HIGH: 10000000,
  HIGH: 2500000,
  MEDIUM: 1000000,
  LOW: 250000,
  MINIMUM: 100000,
};
