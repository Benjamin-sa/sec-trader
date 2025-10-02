/**
 * Response utilities for consistent API responses
 */

/**
 * Create JSON response
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create success response
 */
export function successResponse(data, meta = {}) {
  return jsonResponse({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

/**
 * Create error response
 */
export function errorResponse(error, status = 400, details = null) {
  const response = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return jsonResponse(response, status);
}

/**
 * Create not found response
 */
export function notFoundResponse(message = "Not found") {
  return errorResponse(message, 404);
}

/**
 * Create validation error response
 */
export function validationErrorResponse(errors) {
  return errorResponse("Validation failed", 400, { errors });
}

/**
 * Create internal error response
 */
export function internalErrorResponse(
  error,
  message = "Internal server error"
) {
  console.error("Internal error:", error);
  return errorResponse(message, 500, {
    message: error.message,
  });
}
