/**
 * CORS middleware for handling cross-origin requests
 */

export function getCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ORIGINS || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function handlePreflight(env) {
  return new Response(null, {
    headers: getCorsHeaders(env),
  });
}

export function addCorsHeaders(response, env) {
  const corsHeaders = getCorsHeaders(env);
  Object.keys(corsHeaders).forEach((key) => {
    response.headers.set(key, corsHeaders[key]);
  });
  return response;
}
