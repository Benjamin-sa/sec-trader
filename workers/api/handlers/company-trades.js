/**
 * Company-specific trades endpoint handler
 */
import { validateLimit, sanitizeString } from "../utils/validation.js";
import { buildLatestTradesFilters } from "../utils/filters.js";
import { DatabaseService } from "../utils/database.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleTradesByCompany(request, env) {
  const url = new URL(request.url);
  const limit = validateLimit(
    url.searchParams.get("limit"),
    DEFAULT_LIMITS.LATEST_TRADES
  );

  // Get company identifier (symbol or CIK)
  const symbol = sanitizeString(url.searchParams.get("symbol"));
  let cik = sanitizeString(url.searchParams.get("cik"));
  // Normalize CIK values that might come as floats (e.g., "1057706.0")
  if (cik && cik.endsWith(".0")) {
    cik = cik.slice(0, -2);
  }
  const name = sanitizeString(url.searchParams.get("name"));

  if (!symbol && !cik && !name) {
    return createErrorResponse(
      {
        error: "Missing required parameter",
        message: "Please provide either 'symbol', 'cik', or 'name' parameter",
      },
      400,
      env
    );
  }

  console.log("Fetching trades for company:", { symbol, cik, name });

  // Build base conditions for company filtering
  const conditions = ["1=1"];
  const params = [];

  if (symbol) {
    conditions.push("UPPER(COALESCE(trading_symbol,'')) = UPPER(?)");
    params.push(symbol);
  } else if (cik) {
    // Match both cleaned and potential '.0' variants in DB
    conditions.push("(issuer_cik = ? OR issuer_cik = ?)");
    params.push(cik.toString(), `${cik}.0`);
  } else if (name) {
    conditions.push("LOWER(issuer_name) LIKE ?");
    params.push(`%${name.toLowerCase()}%`);
  }

  // Apply additional filters if provided
  const additionalFilters = buildLatestTradesFilters(url.searchParams);
  // Extract conditions from additional filters (remove the WHERE 1=1 prefix safely)
  const af = additionalFilters.whereClause
    .replace(/^WHERE\s+1=1\s*/i, "")
    .trim();
  if (af) {
    const parts = af.split(/\s+AND\s+/i).filter((c) => c && c !== "1=1");
    if (parts.length > 0) {
      conditions.push(...parts);
      params.push(...additionalFilters.params);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Execute query
  const dbService = new DatabaseService(env.DB);
  const results = await dbService.getLatestTrades(whereClause, params, limit);

  return createSuccessResponse(results, env, {
    query_info: {
      company_filter: { symbol, cik, name },
      additional_filters: additionalFilters.filtersCount,
      total_results: results.length,
      limit_applied: limit,
    },
  });
}
