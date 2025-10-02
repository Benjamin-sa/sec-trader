/**
 * CORS middleware for API responses
 */

/**
 * Handle CORS preflight requests
 */
export function handlePreflight(env) {
  const corsOrigins = env.CORS_ORIGINS || "*";

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": corsOrigins,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response, env) {
  const corsOrigins = env.CORS_ORIGINS || "*";

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", corsOrigins);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
