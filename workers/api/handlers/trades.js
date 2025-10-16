/**
 * Latest trades endpoint handler
 */
import { validateLimit, validatePage, calculatePagination } from "../utils/validation.js";
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
  const page = validatePage(url.searchParams.get("page"), 1);
  
  console.log("Received filter params:", Object.fromEntries(url.searchParams));

  // Calculate pagination
  const { offset } = calculatePagination(page, limit);

  // Build dynamic filters
  const { whereClause, params, filtersCount } = buildLatestTradesFilters(
    url.searchParams
  );

  // Execute queries
  const dbService = new DatabaseService(env.DB);
  
  // Get both the data and total count for pagination metadata
  const [results, totalCount] = await Promise.all([
    dbService.getLatestTrades(whereClause, params, limit, offset),
    dbService.getLatestTradesCount(whereClause, params, filtersCount > 0)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Return formatted response with pagination metadata
  return createSuccessResponse(results, env, {
    query_info: {
      filters_applied: filtersCount,
      total_params: params.length,
      limit_applied: limit,
      count_source: filtersCount > 0 ? "filtered_query" : "sqlite_sequence",
    },
    pagination: {
      page,
      limit,
      offset,
      total_count: totalCount,
      total_pages: totalPages,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
      next_page: hasNextPage ? page + 1 : null,
      prev_page: hasPrevPage ? page - 1 : null,
    },
  });
}
