/**
 * Validation utilities for request parameters
 */
import {
  TRANSACTION_CODES,
  ACQUIRED_DISPOSED_CODES,
  OWNERSHIP_TYPES,
  DATE_REGEX,
} from "../config/constants.js";

export function validateTransactionType(type) {
  return type && Object.values(TRANSACTION_CODES).includes(type);
}

export function validateAcquiredDisposed(acquired) {
  return acquired && Object.values(ACQUIRED_DISPOSED_CODES).includes(acquired);
}

export function validateOwnership(ownership) {
  return ownership && Object.values(OWNERSHIP_TYPES).includes(ownership);
}

export function validateDate(dateString) {
  return dateString && DATE_REGEX.test(dateString);
}

export function validateNumber(value, min = 0) {
  const num = parseFloat(value);
  return !isNaN(num) && num > min;
}

export function validateBoolean(value) {
  return value === "1" || value === "true";
}

export function validateLimit(limit, defaultLimit, maxLimit = 100) {
  const parsedLimit = parseInt(limit);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    return defaultLimit;
  }
  return Math.min(parsedLimit, maxLimit);
}

export function sanitizeString(str) {
  return str ? str.trim() : "";
}
