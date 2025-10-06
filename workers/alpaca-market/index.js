/**
 * Alpaca Market Worker v2.0
 *
 * Simplified market data service using Alpaca Markets API
 *
 * Endpoints:
 * - GET /health - Health check
 * - GET /api/market/snapshot/:symbol - Current market snapshot
 * - GET /api/market/snapshots - Multiple snapshots (query: symbols)
 * - GET /api/market/news - Latest market news (query: symbols, limit, days, hours)
 * - GET /api/market/news/:symbol - Latest news for specific symbol
 *
 * Documentation: https://alpaca.markets/docs/api-references/market-data-api/
 */

import { handlePreflight, addCorsHeaders } from "./src/middleware/cors.js";
import { withErrorHandler } from "./src/middleware/error-handler.js";
import { handleRoute } from "./src/routes/index.js";

/**
 * Main fetch handler
 */
async function fetch(request, env, ctx) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return handlePreflight(env);
  }

  // Route the request
  const response = await handleRoute(request, env);

  // Add CORS headers to response
  return addCorsHeaders(response, env);
}

// Export with error handling wrapper
export default {
  fetch: withErrorHandler(fetch),
};
