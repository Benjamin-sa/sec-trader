/**
 * Historical Importer Worker
 *
 * Fetches historical Form 4 filings for a given CIK from the SEC
 * and queues them for processing by the form4-processor worker.
 *
 * Usage:
 * POST /import?cik=0001234567
 * POST /import?cik=0001234567&limit=100
 * POST /import?cik=0001234567&startDate=2020-01-01&endDate=2023-12-31
 *
 * GET /status?cik=0001234567 - Check import status
 */

import { fetchHistoricalFilings } from "./src/sec-api.js";
import {
  validateCIK,
  validateDateRange,
  validateLimit,
} from "./src/validators.js";
import {
  markFilingAsQueued,
  getImportStatus,
  isFilingAlreadyProcessed,
  markPersonHistoryImported,
  isPersonHistoryImported,
} from "./src/database.js";
import { jsonResponse, errorResponse } from "./src/responses.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Health check
    if (pathname === "/health") {
      return jsonResponse({ status: "healthy", worker: "historical-importer" });
    }

    // Import endpoint - trigger historical import
    if (pathname === "/import" && request.method === "POST") {
      return handleImport(request, env);
    }

    // Status endpoint - check import progress
    if (pathname === "/status" && request.method === "GET") {
      return handleStatus(request, env);
    }

    // Test endpoint - preview filings without queuing
    if (pathname === "/test" && request.method === "GET") {
      return handleTest(request, env);
    }

    return errorResponse("Not found", 404);
  },
};

/**
 * Handle POST /import
 * Start importing historical filings for a CIK
 */
async function handleImport(request, env) {
  const url = new URL(request.url);

  // Get and validate CIK
  const cik = url.searchParams.get("cik");
  const cikValidation = validateCIK(cik);
  if (!cikValidation.valid) {
    return errorResponse(cikValidation.error, 400);
  }
  const normalizedCIK = cikValidation.cik;

  // Get optional parameters
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const limit = url.searchParams.get("limit") || "100";

  // Validate date range if provided
  if (startDate || endDate) {
    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return errorResponse(dateValidation.error, 400);
    }
  }

  // Validate limit
  const limitValidation = validateLimit(limit);
  if (!limitValidation.valid) {
    return errorResponse(limitValidation.error, 400);
  }

  try {
    console.log(`Starting historical import for CIK: ${normalizedCIK}`);

    // Fetch historical filings from SEC
    const filings = await fetchHistoricalFilings(
      normalizedCIK,
      startDate,
      endDate,
      limitValidation.limit,
      env
    );

    console.log(
      `Found ${filings.length} Form 4 filings for CIK ${normalizedCIK}`
    );

    // Track statistics
    let queued = 0;
    let skipped = 0;
    let errors = 0;

    // Queue each filing for processing
    for (const filing of filings) {
      try {
        // Check if already processed
        const alreadyProcessed = await isFilingAlreadyProcessed(
          filing.accessionNumber,
          env.DB
        );

        if (alreadyProcessed) {
          console.log(
            `Skipping already processed filing: ${filing.accessionNumber}`
          );
          skipped++;
          continue;
        }

        // Queue for processing
        await env.filing_processing_queue.send({
          filing_url: filing.filingUrl,
          filing_type: "4",
          entry_id: filing.accessionNumber,
          accession_number: filing.accessionNumber,
          published_date: filing.filingDate,
          title: filing.title,
          summary:
            filing.summary ||
            `Form 4 filing by ${filing.reportingOwner || "unknown"}`,
          historical_import: true, // Flag to indicate this is from historical import
          cik: normalizedCIK,
        });

        // Mark as queued in database
        await markFilingAsQueued(filing.accessionNumber, normalizedCIK, env.DB);

        console.log(`Queued filing: ${filing.accessionNumber}`);
        queued++;
      } catch (error) {
        console.error(`Error queuing filing ${filing.accessionNumber}:`, error);
        errors++;
      }
    }

    // Mark person's history as imported if we queued any filings
    if (queued > 0) {
      await markPersonHistoryImported(
        normalizedCIK,
        filings[0]?.reportingOwner,
        env.DB
      );
    }

    return jsonResponse(
      {
        success: true,
        cik: normalizedCIK,
        totalFound: filings.length,
        queued,
        skipped,
        errors,
        message: `Successfully queued ${queued} filings for processing`,
      },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      }
    );
  } catch (error) {
    console.error("Error in historical import:", error);
    return errorResponse(
      `Failed to import historical filings: ${error.message}`,
      500,
      {
        "Access-Control-Allow-Origin": "*",
      }
    );
  }
}

/**
 * Handle GET /status
 * Check import/processing status for a CIK
 */
async function handleStatus(request, env) {
  const url = new URL(request.url);

  const cik = url.searchParams.get("cik");
  const cikValidation = validateCIK(cik);
  if (!cikValidation.valid) {
    return errorResponse(cikValidation.error, 400);
  }

  try {
    const status = await getImportStatus(cikValidation.cik, env.DB);
    const historyImported = await isPersonHistoryImported(
      cikValidation.cik,
      env.DB
    );

    return jsonResponse(
      {
        cik: cikValidation.cik,
        historyImported,
        ...status,
      },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      }
    );
  } catch (error) {
    console.error("Error fetching status:", error);
    return errorResponse(`Failed to fetch status: ${error.message}`, 500, {
      "Access-Control-Allow-Origin": "*",
    });
  }
}

/**
 * Handle GET /test
 * Preview filings that would be imported without actually queuing them
 */
async function handleTest(request, env) {
  const url = new URL(request.url);

  // Get and validate CIK
  const cik = url.searchParams.get("cik");
  const cikValidation = validateCIK(cik);
  if (!cikValidation.valid) {
    return errorResponse(cikValidation.error, 400);
  }
  const normalizedCIK = cikValidation.cik;

  // Get optional parameters
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const limit = url.searchParams.get("limit") || "100";

  // Validate date range if provided
  if (startDate || endDate) {
    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return errorResponse(dateValidation.error, 400);
    }
  }

  // Validate limit
  const limitValidation = validateLimit(limit);
  if (!limitValidation.valid) {
    return errorResponse(limitValidation.error, 400);
  }

  try {
    console.log(`Test endpoint: Fetching filings for CIK: ${normalizedCIK}`);

    // Fetch historical filings from SEC
    const filings = await fetchHistoricalFilings(
      normalizedCIK,
      startDate,
      endDate,
      limitValidation.limit,
      env
    );

    console.log(
      `Found ${filings.length} Form 4 filings for CIK ${normalizedCIK}`
    );

    // Check which filings are already processed
    const filingsWithStatus = await Promise.all(
      filings.map(async (filing) => {
        const alreadyProcessed = await isFilingAlreadyProcessed(
          filing.accessionNumber,
          env.DB
        );
        return {
          ...filing,
          alreadyProcessed,
          wouldBeQueued: !alreadyProcessed,
        };
      })
    );

    const wouldBeQueued = filingsWithStatus.filter(
      (f) => f.wouldBeQueued
    ).length;
    const wouldBeSkipped = filingsWithStatus.filter(
      (f) => f.alreadyProcessed
    ).length;

    return jsonResponse(
      {
        test: true,
        cik: normalizedCIK,
        totalFound: filings.length,
        wouldBeQueued,
        wouldBeSkipped,
        filings: filingsWithStatus,
        message: `Found ${filings.length} filings. ${wouldBeQueued} would be queued, ${wouldBeSkipped} would be skipped.`,
      },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      }
    );
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return errorResponse(`Failed to fetch filings: ${error.message}`, 500, {
      "Access-Control-Allow-Origin": "*",
    });
  }
}
