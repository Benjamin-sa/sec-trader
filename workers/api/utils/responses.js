/**
 * Response utilities for standardized API responses
 */
import { getCorsHeaders } from "../middleware/cors.js";

export function createSuccessResponse(data, env, additionalData = {}) {
  const responseData = {
    success: true,
    data: data || [],
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env),
    },
  });
}

export function createErrorResponse(errorData, status = 500, env) {
  return new Response(JSON.stringify(errorData), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env),
    },
  });
}

export function createHealthResponse(env) {
  return createSuccessResponse(
    {
      status: "healthy",
      version: "2.0",
      endpoints: [
        "/api/trades/latest",
        "/api/trades/important",
        "/api/trades/first-buys",
        "/api/trades/clusters",
        "/api/trades/company",
        "/api/trades/insider",
        "/api/health",
      ],
    },
    env
  );
}
