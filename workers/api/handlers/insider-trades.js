/**
 * Insider-specific trades endpoint handler
 */
import {
  validateLimit,
  sanitizeString,
  standardizeCik,
} from "../utils/validation.js";
import { buildLatestTradesFilters } from "../utils/filters.js";
import { DatabaseService } from "../utils/database.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleTradesByInsider(request, env) {
  const url = new URL(request.url);
  const limit = validateLimit(
    url.searchParams.get("limit"),
    DEFAULT_LIMITS.LATEST_TRADES
  );

  // Get insider identifier (CIK or name)
  const cikParam = url.searchParams.get("cik");
  let cik = cikParam ? standardizeCik(cikParam) : null;
  const name = sanitizeString(url.searchParams.get("name"));

  if (!cik && !name) {
    return createErrorResponse(
      {
        error: "Missing required parameter",
        message: "Please provide either 'cik' or 'name' parameter",
      },
      400,
      env
    );
  }

  console.log("Fetching trades for insider:", { cik, name });
  console.log("Original CIK param:", cikParam);

  // Build insider-specific conditions
  let insiderConditions = [];
  let insiderParams = [];

  if (cik) {
    // CIK is already standardized to .0 format
    insiderConditions.push("person_cik = ?");
    insiderParams.push(cik);
    console.log("Added CIK condition with standardized param:", cik);
  } else if (name) {
    insiderConditions.push("LOWER(person_name) LIKE ?");
    insiderParams.push(`%${name.toLowerCase()}%`);
  }

  // Get additional filters
  const additionalFilters = buildLatestTradesFilters(url.searchParams);

  // Combine insider conditions with additional filters
  let allConditions = ["1=1"];
  let allParams = [];

  if (insiderConditions.length > 0) {
    allConditions.push(...insiderConditions);
    allParams.push(...insiderParams);
  }

  // Extract conditions from additional filters (remove the WHERE 1=1 part)
  const additionalConditionsStr = additionalFilters.whereClause
    .replace("WHERE 1=1", "")
    .trim();
  if (additionalConditionsStr && additionalConditionsStr.startsWith("AND ")) {
    const additionalConditions = additionalConditionsStr.substring(4).trim();
    if (additionalConditions) {
      allConditions.push(additionalConditions);
      allParams.push(...additionalFilters.params);
    }
  }

  const whereClause = `WHERE ${allConditions.join(" AND ")}`;
  console.log("Final WHERE clause:", whereClause);
  console.log("Final params:", allParams);

  // Execute query
  const dbService = new DatabaseService(env.DB);
  const results = await dbService.getLatestTrades(
    whereClause,
    allParams,
    limit
  );

  return createSuccessResponse(results, env, {
    query_info: {
      insider_filter: { cik, name },
      additional_filters: additionalFilters.filtersCount,
      total_results: results.length,
      limit_applied: limit,
    },
  });
}
