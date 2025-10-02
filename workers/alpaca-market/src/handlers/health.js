/**
 * Health check handler
 */

import { successResponse } from "../utils/responses.js";

/**
 * Handle GET /health
 */
export function handleHealth() {
  return successResponse({
    status: "healthy",
    service: "alpaca-market-worker",
    version: "2.0.0",
  });
}
