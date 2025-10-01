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
import {
  DEFAULT_LIMITS,
  RATING_REFRESH_THRESHOLD_HOURS,
} from "../config/constants.js";

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

  // Orchestrate background updates if CIK is provided
  if (cik) {
    await orchestrateBackgroundUpdates(cik, env);
  }

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

  // Get insider rating if CIK is available
  let insiderRating = null;
  if (cik) {
    try {
      insiderRating = await getInsiderRating(cik, env.DB);
    } catch (error) {
      console.error("Error fetching insider rating:", error);
    }
  }

  return createSuccessResponse(results, env, {
    query_info: {
      insider_filter: { cik, name },
      additional_filters: additionalFilters.filtersCount,
      total_results: results.length,
      limit_applied: limit,
    },
    insider_rating: insiderRating,
  });
}

/**
 * Orchestrate background updates for insider data
 */
async function orchestrateBackgroundUpdates(cik, env) {
  try {
    // Check if history needs to be imported
    const person = await getPersonByCik(cik, env.DB);
    if (person && !person.history_imported) {
      console.log(`Triggering history import for CIK: ${cik}`);
      // Fire-and-forget history import
      await env.HISTORY_QUEUE.send({
        cik: cik,
        source: "auto-trigger",
        requestedAt: new Date().toISOString(),
      });
    }

    // Check if rating needs to be refreshed
    if (person) {
      const rating = await getInsiderRating(cik, env.DB);
      if (shouldRefreshRating(rating)) {
        console.log(`Triggering rating refresh for CIK: ${cik}`);
        // Fire-and-forget rating calculation
        await env.RATING_QUEUE.send({
          cik: cik,
          source: "auto-trigger",
          requestedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    // Don't fail the main request if background orchestration fails
    console.error("Error in background orchestration:", error);
  }
}

/**
 * Get person by CIK
 */
async function getPersonByCik(cik, db) {
  try {
    const stmt = db.prepare("SELECT * FROM persons WHERE cik = ?");
    return await stmt.bind(cik).first();
  } catch (error) {
    console.error("Database error:", error);
    return null;
  }
}

/**
 * Get insider rating by CIK
 */
async function getInsiderRating(cik, db) {
  try {
    const stmt = db.prepare(`
      SELECT ir.*, p.name as person_name
      FROM insider_ratings ir
      JOIN persons p ON ir.person_id = p.id
      WHERE p.cik = ?
    `);
    return await stmt.bind(cik).first();
  } catch (error) {
    console.error("Database error:", error);
    return null;
  }
}

/**
 * Determine if rating should be refreshed
 */
function shouldRefreshRating(rating) {
  if (!rating || !rating.last_calculated) {
    return true; // No rating exists, needs calculation
  }

  const lastCalculated = new Date(rating.last_calculated);
  const now = new Date();
  const hoursSinceUpdate = (now - lastCalculated) / (1000 * 60 * 60);

  return hoursSinceUpdate > RATING_REFRESH_THRESHOLD_HOURS;
}
