/**
 * Input validation utilities
 */

/**
 * Validate and normalize CIK
 */
export function validateCIK(cik) {
  if (!cik) {
    return { valid: false, error: "CIK parameter is required" };
  }

  // Remove any non-digit characters
  const cleanCIK = cik.replace(/\D/g, "");

  if (cleanCIK.length === 0) {
    return { valid: false, error: "Invalid CIK format" };
  }

  if (cleanCIK.length > 10) {
    return { valid: false, error: "CIK must be 10 digits or less" };
  }

  return { valid: true, cik: cleanCIK };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return { valid: true };
  }

  if (startDate && !isValidDate(startDate)) {
    return { valid: false, error: "Invalid startDate format. Use YYYY-MM-DD" };
  }

  if (endDate && !isValidDate(endDate)) {
    return { valid: false, error: "Invalid endDate format. Use YYYY-MM-DD" };
  }

  if (startDate && endDate && startDate > endDate) {
    return { valid: false, error: "startDate must be before endDate" };
  }

  return { valid: true };
}

/**
 * Validate limit parameter
 */
export function validateLimit(limit) {
  const num = parseInt(limit, 10);

  if (isNaN(num)) {
    return { valid: false, error: "Limit must be a number" };
  }

  if (num < 1) {
    return { valid: false, error: "Limit must be at least 1" };
  }

  if (num > 1000) {
    return { valid: false, error: "Limit cannot exceed 1000" };
  }

  return { valid: true, limit: num };
}

/**
 * Check if a string is a valid date in YYYY-MM-DD format
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}
