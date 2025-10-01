/**
 * Insider Backfill Handler
 *
 * Handles requests to backfill historical data for insiders.
 */

import { validateCik, standardizeCik } from "../utils/validation.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";

/**
 * POST /api/insider/backfill
 * Trigger historical data import for an insider
 */
export async function handleInsiderBackfill(request, env) {
  if (request.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, env);
  }

  try {
    const body = await request.json();
    const { cik: rawCik } = body;

    // Standardize and validate CIK (adds .0 if not present)
    const cik = standardizeCik(rawCik);
    if (!cik) {
      return createErrorResponse("Valid CIK is required", 400, env);
    }

    // Check if person exists
    const person = await getPersonByCik(cik, env.DB);
    if (!person) {
      return createErrorResponse(`Person with CIK ${cik} not found`, 404, env);
    }

    // Check if history was already imported
    if (person.history_imported) {
      return createSuccessResponse(
        {
          message: `History already imported for ${person.name}`,
          cik: cik,
          person: person.name,
          status: "already_imported",
        },
        env
      );
    }

    // Queue historical import job
    await env.HISTORY_QUEUE.send({
      cik: cik,
      requestedAt: new Date().toISOString(),
    });

    return createSuccessResponse(
      {
        message: `Historical import queued for ${person.name}`,
        cik: cik,
        person: person.name,
        status: "queued",
      },
      env
    );
  } catch (error) {
    console.error("Error in insider backfill:", error);

    if (error.message.includes("JSON")) {
      return createErrorResponse("Invalid JSON in request body", 400, env);
    }

    return createErrorResponse("Internal server error", 500, env);
  }
}

/**
 * Get person by CIK from database (standardized .0 format)
 */
async function getPersonByCik(cik, db) {
  try {
    // CIK should already be in standardized .0 format
    const stmt = db.prepare("SELECT * FROM persons WHERE cik = ?");
    let result = await stmt.bind(cik).first();

    // Fallback: try without .0 suffix (during transition period)
    if (!result && cik.endsWith(".0")) {
      const cleanCik = cik.slice(0, -2);
      const fallbackStmt = db.prepare("SELECT * FROM persons WHERE cik = ?");
      result = await fallbackStmt.bind(cleanCik).first();
    }

    return result;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}
