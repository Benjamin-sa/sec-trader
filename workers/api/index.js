/**
 * API Worker - Modular and Maintainable REST API
 *
 * This refactored version provides:
 * - Clean separation of concerns
 * - Modular handler structure
 * - Reusable utilities
 * - Better error handling
 * - Improved maintainability
 */

import { handlePreflight, addCorsHeaders } from "./middleware/cors.js";
import { handleError, handleNotFound } from "./middleware/error-handler.js";
import { API_ROUTES } from "./config/constants.js";

// Import route handlers
import { handleHealth } from "./handlers/health.js";
import { handleLatestTrades } from "./handlers/trades.js";
import { handleImportantTrades } from "./handlers/important-trades.js";
import { handleClusterBuys } from "./handlers/cluster-buys.js";
import { handleTradesByCompany } from "./handlers/company-trades.js";
import { handleTradesByInsider } from "./handlers/insider-trades.js";
import { handleFilingByAccessionNumber } from "./handlers/filing.js";
import {
  handleInsiderBackfill,
  handleInsiderBackfillStatus,
} from "./handlers/insider-backfill.js";

/**
 * Main worker entry point
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return handlePreflight(env);
    }

    try {
      let response = await routeRequest(url.pathname, request, env);
      return addCorsHeaders(response, env);
    } catch (error) {
      return handleError(error, env);
    }
  },
};

/**
 * Route requests to appropriate handlers
 */
async function routeRequest(pathname, request, env) {
  const routeMap = {
    [API_ROUTES.HEALTH]: handleHealth,
    [API_ROUTES.TRADES_LATEST]: handleLatestTrades,
    [API_ROUTES.TRADES_IMPORTANT]: handleImportantTrades,
    [API_ROUTES.TRADES_CLUSTERS]: handleClusterBuys,
    [API_ROUTES.TRADES_BY_COMPANY]: handleTradesByCompany,
    [API_ROUTES.TRADES_BY_INSIDER]: handleTradesByInsider,
    [API_ROUTES.INSIDER_BACKFILL]: handleInsiderBackfill,
  };

  // Special handling for filing endpoint with dynamic accession number
  if (pathname.startsWith("/api/filing/")) {
    return await handleFilingByAccessionNumber(request, env);
  }

  // Special handling for status endpoint (GET only)
  if (pathname === "/api/insider/backfill/status" && request.method === "GET") {
    return await handleInsiderBackfillStatus(request, env);
  }

  const handler = routeMap[pathname];

  if (handler) {
    return await handler(request, env);
  }

  return handleNotFound(env);
}
