/**
 * Insider backfill handler - triggers historical import for an insider's filings
 */

import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";

const HISTORICAL_IMPORTER_URL =
  "https://historical-importer.benjamin-sautersb.workers.dev";

/**
 * Handle POST /api/insider/backfill
 * Trigger historical import of Form 4 filings for an insider
 *
 * Query params:
 * - cik: Insider's CIK (required)
 * - limit: Max number of filings to import (default: 50, max: 500)
 * - test: If true, preview without importing (default: false)
 */
export async function handleInsiderBackfill(request, env) {
  const url = new URL(request.url);
  const cik = url.searchParams.get("cik");
  const limit = url.searchParams.get("limit") || "50";
  const isTest = url.searchParams.get("test") === "true";

  // Validate CIK
  if (!cik) {
    return createErrorResponse(
      {
        error: "Missing required parameter",
        message: "CIK parameter is required",
      },
      400,
      env
    );
  }

  // Clean and validate CIK format
  const cleanCIK = cik.replace(/\D/g, "");
  if (cleanCIK.length === 0 || cleanCIK.length > 10) {
    return createErrorResponse(
      {
        error: "Invalid parameter",
        message: "Invalid CIK format",
      },
      400,
      env
    );
  }

  // Validate limit
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
    return createErrorResponse(
      {
        error: "Invalid parameter",
        message: "Limit must be between 1 and 500",
      },
      400,
      env
    );
  }

  try {
    // Determine endpoint based on test flag
    const endpoint = isTest ? "/test" : "/import/stream"; // Use streaming endpoint
    const method = isTest ? "GET" : "POST";

    console.log(
      `Calling historical-importer: ${method} ${endpoint}?cik=${cleanCIK}&limit=${limitNum}`
    );

    // Use service binding if available, otherwise fall back to HTTP fetch
    let response;
    if (env.HISTORICAL_IMPORTER) {
      // Use service binding for direct worker-to-worker communication
      const importerRequest = new Request(
        `https://dummy${endpoint}?cik=${cleanCIK}&limit=${limitNum}`,
        {
          method,
          headers: {
            Accept: isTest ? "application/json" : "text/event-stream",
          },
        }
      );
      response = await env.HISTORICAL_IMPORTER.fetch(importerRequest);
    } else {
      // Fallback to HTTP fetch
      const importerUrl = `${HISTORICAL_IMPORTER_URL}${endpoint}?cik=${cleanCIK}&limit=${limitNum}`;
      response = await fetch(importerUrl, {
        method,
        headers: {
          Accept: isTest ? "application/json" : "text/event-stream",
        },
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Historical importer returned ${response.status}`
      );
    }

    // For streaming responses, pass through directly
    if (endpoint === "/import/stream") {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const data = await response.json();

    // Return the result from the historical-importer
    return createSuccessResponse(data, env);
  } catch (error) {
    console.error("Error triggering historical import:", error);
    return createErrorResponse(
      {
        error: "Import failed",
        message: `Failed to trigger historical import: ${error.message}`,
      },
      500,
      env
    );
  }
}

/**
 * Handle GET /api/insider/backfill/status
 * Check status of historical import for an insider
 *
 * Query params:
 * - cik: Insider's CIK (required)
 */
export async function handleInsiderBackfillStatus(request, env) {
  const url = new URL(request.url);
  const cik = url.searchParams.get("cik");

  // Validate CIK
  if (!cik) {
    return createErrorResponse(
      {
        error: "Missing required parameter",
        message: "CIK parameter is required",
      },
      400,
      env
    );
  }

  // Clean and validate CIK format
  const cleanCIK = cik.replace(/\D/g, "");
  if (cleanCIK.length === 0 || cleanCIK.length > 10) {
    return createErrorResponse(
      {
        error: "Invalid parameter",
        message: "Invalid CIK format",
      },
      400,
      env
    );
  }

  try {
    console.log(`Checking import status for CIK: ${cleanCIK}`);

    // Use service binding if available, otherwise fall back to HTTP fetch
    let response;
    if (env.HISTORICAL_IMPORTER) {
      // Use service binding for direct worker-to-worker communication
      const importerRequest = new Request(
        `https://dummy/status?cik=${cleanCIK}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      response = await env.HISTORICAL_IMPORTER.fetch(importerRequest);
    } else {
      // Fallback to HTTP fetch
      const statusUrl = `${HISTORICAL_IMPORTER_URL}/status?cik=${cleanCIK}`;
      response = await fetch(statusUrl, {
        headers: {
          Accept: "application/json",
        },
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Historical importer returned ${response.status}`
      );
    }

    const data = await response.json();

    // Return the status
    return createSuccessResponse(data, env);
  } catch (error) {
    console.error("Error fetching import status:", error);
    return createErrorResponse(
      {
        error: "Status check failed",
        message: `Failed to fetch import status: ${error.message}`,
      },
      500,
      env
    );
  }
}
