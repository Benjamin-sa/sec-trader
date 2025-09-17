/**
 * Error handling middleware
 */
import { createErrorResponse } from "../utils/responses.js";

export function handleError(error, env) {
  console.error("API Error:", error);

  return createErrorResponse(
    {
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    },
    500,
    env
  );
}

export function handleNotFound(env) {
  return createErrorResponse(
    {
      error: "Not found",
      available_endpoints: [
        "/api/trades/latest",
        "/api/trades/important",
        "/api/trades/first-buys",
        "/api/trades/clusters",
        "/api/health",
      ],
    },
    404,
    env
  );
}
