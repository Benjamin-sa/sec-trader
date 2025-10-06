/**
 * Validation utilities for API requests
 */

import { VALIDATION_RULES, API_ERRORS } from "../config/constants.js";

/**
 * Validate stock symbol format
 */
export function validateSymbol(symbol) {
  if (!symbol) {
    return { valid: false, error: API_ERRORS.SYMBOL_REQUIRED };
  }

  if (typeof symbol !== "string") {
    return { valid: false, error: API_ERRORS.INVALID_SYMBOL_FORMAT };
  }

  const cleanSymbol = symbol.trim().toUpperCase();

  if (!VALIDATION_RULES.SYMBOL_PATTERN.test(cleanSymbol)) {
    return { valid: false, error: API_ERRORS.INVALID_SYMBOL_FORMAT };
  }

  return { valid: true, symbol: cleanSymbol };
}

/**
 * Validate multiple symbols
 */
export function validateSymbols(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return { valid: false, error: API_ERRORS.SYMBOLS_REQUIRED };
  }

  if (
    symbols.length < VALIDATION_RULES.MIN_SYMBOLS ||
    symbols.length > VALIDATION_RULES.MAX_SYMBOLS
  ) {
    return { valid: false, error: API_ERRORS.SYMBOLS_OUT_OF_RANGE };
  }

  const validatedSymbols = [];
  for (const symbol of symbols) {
    const validation = validateSymbol(symbol);
    if (!validation.valid) {
      return { valid: false, error: `Invalid symbol: ${symbol}` };
    }
    validatedSymbols.push(validation.symbol);
  }

  return { valid: true, symbols: validatedSymbols };
}

/**
 * Validate date range
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

  const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);

  return { valid: true, start, end, daysDiff };
}

/**
 * Validate limit parameter
 */
export function validateLimit(limit, maxLimit = 1000) {
  if (!limit) {
    return { valid: true, limit: maxLimit };
  }

  const limitNum = parseInt(limit);

  if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) {
    return {
      valid: false,
      error: `Limit must be a number between 1 and ${maxLimit}`,
    };
  }

  return { valid: true, limit: limitNum };
}

/**
 * Validate sort parameter
 */
export function validateSort(sort) {
  if (!sort) {
    return { valid: true, sort: "desc" }; // Default
  }

  const validSorts = ["asc", "desc"];
  const lowerSort = sort.toLowerCase();

  if (!validSorts.includes(lowerSort)) {
    return {
      valid: false,
      error: `Sort must be one of: ${validSorts.join(", ")}`,
    };
  }

  return { valid: true, sort: lowerSort };
}
