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


    // Import with streaming endpoint - real-time progress updates
    if (pathname === "/import/stream" && request.method === "POST") {
      return handleImportWithStreaming(request, env);
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
        wouldBeProcessed: wouldBeQueued,
        wouldBeSkipped,
        filings: filingsWithStatus,
        message: `Found ${filings.length} filings. ${wouldBeQueued} would be processed directly, ${wouldBeSkipped} would be skipped.`,
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

/**
 * Handle POST /import/stream
 * Import historical filings with real-time progress updates via Server-Sent Events
 */
async function handleImportWithStreaming(request, env) {
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

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper function to send SSE message
  const sendEvent = async (event, data) => {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error('Error writing to stream:', error);
    }
  };

  // Start the import process in the background
  (async () => {
    try {
      await sendEvent('status', { 
        message: 'Starting historical import...', 
        phase: 'init',
        cik: normalizedCIK 
      });

      // Fetch historical filings from SEC
      await sendEvent('status', { 
        message: 'Fetching filings from SEC...', 
        phase: 'fetching' 
      });

      const filings = await fetchHistoricalFilings(
        normalizedCIK,
        startDate,
        endDate,
        limitValidation.limit,
        env
      );

      await sendEvent('found', { 
        totalFound: filings.length,
        message: `Found ${filings.length} Form 4 filings` 
      });

      // Track statistics
      let processed = 0;
      let skipped = 0;
      let errors = 0;
      const processedFilings = [];
      const skippedFilings = [];
      const failedFilings = [];

      const BATCH_SIZE = 5;
      const startTime = Date.now();

      await sendEvent('status', { 
        message: 'Processing filings...', 
        phase: 'processing',
        totalFilings: filings.length 
      });

      for (let i = 0; i < filings.length; i += BATCH_SIZE) {
        const batch = filings.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.allSettled(
          batch.map(async (filing) => {
            try {
              // Check if already processed
              const alreadyProcessed = await isFilingAlreadyProcessed(
                filing.accessionNumber,
                env.DB
              );

              if (alreadyProcessed) {
                return { 
                  status: 'skipped', 
                  filing,
                  accessionNumber: filing.accessionNumber,
                  filingDate: filing.filingDate
                };
              }

              // Mark as queued in database before processing
              await markFilingAsQueued(filing.accessionNumber, normalizedCIK, env.DB);

              // Process directly via form4-processor service binding
              const processingRequest = new Request('https://dummy/process', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  filing_url: filing.filingUrl,
                  filing_type: "4",
                  entry_id: filing.accessionNumber,
                  accession_number: filing.accessionNumber,
                  published_date: filing.filingDate,
                  title: filing.title,
                  summary: filing.summary || `Form 4 filing by ${filing.reportingOwner || "unknown"}`,
                  historical_import: true,
                  cik: normalizedCIK,
                }),
              });

              const response = await env.FORM4_PROCESSOR.fetch(processingRequest);
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Processing failed: ${response.status}`);
              }

              return { 
                status: 'processed', 
                filing,
                accessionNumber: filing.accessionNumber,
                filingDate: filing.filingDate
              };
            } catch (error) {
              return { 
                status: 'error', 
                filing,
                accessionNumber: filing.accessionNumber,
                filingDate: filing.filingDate,
                error: error.message 
              };
            }
          })
        );

        // Process results and send progress updates
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.status === 'processed') {
              processed++;
              processedFilings.push({
                accessionNumber: result.value.accessionNumber,
                filingDate: result.value.filingDate,
              });
            } else if (result.value.status === 'skipped') {
              skipped++;
              skippedFilings.push({
                accessionNumber: result.value.accessionNumber,
                filingDate: result.value.filingDate,
                reason: 'Already processed'
              });
            } else if (result.value.status === 'error') {
              errors++;
              failedFilings.push({
                accessionNumber: result.value.accessionNumber,
                filingDate: result.value.filingDate,
                error: result.value.error
              });
            }
          } else {
            errors++;
            failedFilings.push({
              error: result.reason?.message || 'Unknown error'
            });
          }
        });

        // Send progress update after each batch
        const progress = Math.round(((processed + skipped + errors) / filings.length) * 100);
        await sendEvent('progress', {
          processed,
          skipped,
          errors,
          total: filings.length,
          remaining: filings.length - (processed + skipped + errors),
          progress,
          message: `Progress: ${processed + skipped + errors}/${filings.length} filings`
        });
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      // Mark person's history as imported if we processed any filings
      if (processed > 0) {
        await markPersonHistoryImported(
          normalizedCIK,
          filings[0]?.reportingOwner,
          env.DB
        );
      }

      // Send completion event
      await sendEvent('complete', {
        success: true,
        cik: normalizedCIK,
        totalFound: filings.length,
        processed,
        skipped,
        errors,
        duration,
        message: `Completed in ${duration}s: ${processed} processed, ${skipped} skipped, ${errors} failed`,
        details: {
          processedFilings: processedFilings.slice(0, 10),
          skippedFilings: skippedFilings.slice(0, 10),
          failedFilings: failedFilings.slice(0, 10),
        },
        summary: {
          successRate: filings.length > 0 ? Math.round((processed / filings.length) * 100) : 0,
          avgTimePerFiling: processed > 0 ? Math.round(duration / processed * 100) / 100 : 0,
        }
      });

    } catch (error) {
      console.error('Error in streaming import:', error);
      await sendEvent('error', {
        error: error.message,
        message: `Import failed: ${error.message}`
      });
    } finally {
      try {
        await writer.close();
      } catch (e) {
        console.error('Error closing writer:', e);
      }
    }
  })();

  // Return SSE response
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
