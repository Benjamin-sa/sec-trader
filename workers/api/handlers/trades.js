/**
 * Latest trades endpoint handler
 */
import { validateLimit } from "../utils/validation.js";
import { buildLatestTradesFilters } from "../utils/filters.js";
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleLatestTrades(request, env) {
  const url = new URL(request.url);
  const limit = validateLimit(
    url.searchParams.get("limit"),
    DEFAULT_LIMITS.LATEST_TRADES
  );

  console.log("Received filter params:", Object.fromEntries(url.searchParams));

  // Build dynamic filters
  const { whereClause, params, filtersCount } = buildLatestTradesFilters(
    url.searchParams
  );

  // Execute query
  const dbService = new DatabaseService(env.DB);
  const results = await dbService.getLatestTrades(whereClause, params, limit);

  // Return formatted response
  return createSuccessResponse(results, env, {
    query_info: {
      filters_applied: filtersCount,
      total_params: params.length,
      limit_applied: limit,
    },
  });
}
