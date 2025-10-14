/**
 * HTTP response utilities
 */

/**
 * Create a JSON response
 */
export function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(message, status = 400, additionalHeaders = {}) {
  return jsonResponse(
    {
      error: message,
      status,
    },
    status,
    additionalHeaders
  );
}
