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

export function validatePage(page, defaultPage = 1) {
  const parsedPage = parseInt(page);
  if (isNaN(parsedPage) || parsedPage < 1) {
    return defaultPage;
  }
  return parsedPage;
}

export function validateOffset(offset, defaultOffset = 0) {
  const parsedOffset = parseInt(offset);
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    return defaultOffset;
  }
  return parsedOffset;
}

export function calculatePagination(page, limit) {
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * limit;
  return { page: currentPage, offset, limit };
}

export function sanitizeString(str) {
  return str ? str.trim() : "";
}

export function validateCik(cik) {
  // CIK should be a string of 1-10 digits, optionally followed by .0
  return cik && /^\d{1,10}(\.0)?$/.test(cik);
}

export function standardizeCik(cik) {
  if (!cik) return null;

  // Convert to string and trim
  let standardized = cik.toString().trim();

  // Add .0 suffix if not already present
  if (!standardized.endsWith(".0")) {
    standardized = standardized + ".0";
  }

  // Validate the standardized CIK
  return validateCik(standardized) ? standardized : null;
}

export function validateAccessionNumber(accessionNumber) {
  // SEC accession number format: 0000000000-00-000000 (10 digits, dash, 2 digits, dash, 6 digits)
  const accessionRegex = /^\d{10}-\d{2}-\d{6}$/;
  return accessionNumber && accessionRegex.test(accessionNumber);
}
