/**
 * Health check endpoint handler
 */
import { createHealthResponse } from "../utils/responses.js";

export async function handleHealth(request, env) {
  return createHealthResponse(env);
}
