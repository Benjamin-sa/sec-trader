/**
 * Error handling middleware
 */

import { internalErrorResponse } from "../utils/responses.js";

/**
 * Global error handler wrapper
 */
export function withErrorHandler(handler) {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      console.error("Unhandled error:", error);
      return internalErrorResponse(error);
    }
  };
}

/**
 * Async handler wrapper with error catching
 */
export async function safeHandler(fn, ...args) {
  try {
    return await fn(...args);
  } catch (error) {
    console.error("Handler error:", error);
    throw error;
  }
}
