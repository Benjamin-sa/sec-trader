/**
 * Route definitions and handlers
 */

import { handleHealth } from "../handlers/health.js";
import {
  handleGetSnapshot,
  handleGetMultipleSnapshots,
} from "../handlers/snapshots.js";
import { handleGetNews, handleGetNewsBySymbol } from "../handlers/news.js";
import { notFoundResponse } from "../utils/responses.js";

/**
 * Route matcher
 */
export function matchRoute(pathname) {
  // Exact matches
  if (pathname === "/health") {
    return { handler: handleHealth, params: {} };
  }

  if (pathname === "/api/market/snapshots") {
    return { handler: handleGetMultipleSnapshots, params: {} };
  }

  if (pathname === "/api/market/news") {
    return { handler: handleGetNews, params: {} };
  }

  // Pattern matches with parameters
  const routes = [
    {
      pattern: /^\/api\/market\/snapshot\/([A-Z]+)$/,
      handler: handleGetSnapshot,
    },
    {
      pattern: /^\/api\/market\/news\/([A-Z]+)$/,
      handler: handleGetNewsBySymbol,
    },
  ];

  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (match) {
      return {
        handler: route.handler,
        params: { symbol: match[1] },
      };
    }
  }

  return null;
}

/**
 * Route handler
 */
export async function handleRoute(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const route = matchRoute(pathname);

  if (!route) {
    return notFoundResponse();
  }

  return route.handler(request, env);
}
