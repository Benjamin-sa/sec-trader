/**
 * Alpaca Market Worker - Handles market data retrieval from Alpaca Markets API
 *
 * This worker provides endpoints to fetch stock market data for companies
 * including historical price data, technical indicators, and real-time snapshots.
 *
 * Endpoints:
 * - GET /health - Health check
 * - GET /api/market/bars/:symbol - Get historical bars (OHLCV) data
 * - GET /api/market/snapshot/:symbol - Get current snapshot
 * - GET /api/market/snapshots - Get multiple snapshots
 * - GET /api/market/quote/:symbol - Get latest quote
 */

import {
  fetchStockBars,
  fetchSnapshot,
  fetchMultipleSnapshots,
  fetchLatestQuote,
} from "./src/alpaca-client.js";
import {
  calculateTechnicalIndicators,
  formatBars,
  groupBarsByDate,
  detectSignificantMoves,
} from "./src/data-processor.js";
import {
  getDateRangeMonths,
  getDateRangeDays,
  parseDate,
  toRFC3339,
} from "./src/date-utils.js";
import {
  validateSymbol,
  validateTimeframe,
  validateDateRange,
  validateMonths,
} from "./src/validators.js";
import { handlePreflight, addCorsHeaders } from "./src/cors.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handlePreflight(env);
    }

    try {
      let response;

      // Route handling
      if (pathname === "/health") {
        response = handleHealth();
      } else if (pathname.startsWith("/api/market/bars/")) {
        response = await handleGetBars(request, env);
      } else if (pathname.startsWith("/api/market/snapshot/")) {
        response = await handleGetSnapshot(request, env);
      } else if (pathname === "/api/market/snapshots") {
        response = await handleGetMultipleSnapshots(request, env);
      } else if (pathname.startsWith("/api/market/quote/")) {
        response = await handleGetQuote(request, env);
      } else {
        response = jsonResponse({ error: "Not found" }, 404);
      }

      return addCorsHeaders(response, env);
    } catch (error) {
      console.error("Worker error:", error);
      return addCorsHeaders(
        jsonResponse(
          {
            error: "Internal server error",
            message: error.message,
          },
          500
        ),
        env
      );
    }
  },
};

/**
 * Health check endpoint
 */
function handleHealth() {
  return jsonResponse({
    status: "healthy",
    service: "alpaca-market-worker",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle GET /api/market/bars/:symbol
 * Fetch historical OHLCV data for a stock symbol
 *
 * Query params:
 * - timeframe: Bar timeframe (1Min, 5Min, 15Min, 1Hour, 1Day) [default: 1Day]
 * - months: Number of months to look back (1-12) [default: 3]
 * - start: Custom start date (RFC3339 format)
 * - end: Custom end date (RFC3339 format)
 * - analysis: Include technical analysis (true/false) [default: true]
 */
async function handleGetBars(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return jsonResponse({ error: symbolValidation.error }, 400);
  }

  // Get query parameters
  const timeframe = url.searchParams.get("timeframe") || "1Day";
  const months = url.searchParams.get("months") || "3";
  const customStart = url.searchParams.get("start");
  const customEnd = url.searchParams.get("end");
  const includeAnalysis = url.searchParams.get("analysis") !== "false";

  // Validate timeframe
  const timeframeValidation = validateTimeframe(timeframe);
  if (!timeframeValidation.valid) {
    return jsonResponse({ error: timeframeValidation.error }, 400);
  }

  // Determine date range
  let start, end;
  if (customStart && customEnd) {
    // Use custom date range
    const dateValidation = validateDateRange(customStart, customEnd);
    if (!dateValidation.valid) {
      return jsonResponse({ error: dateValidation.error }, 400);
    }
    start = toRFC3339(customStart);
    end = toRFC3339(customEnd);
  } else {
    // Use months parameter
    const monthsValidation = validateMonths(months);
    if (!monthsValidation.valid) {
      return jsonResponse({ error: monthsValidation.error }, 400);
    }
    const dateRange = getDateRangeMonths(monthsValidation.months);
    start = dateRange.start;
    end = dateRange.end;
  }

  try {
    // Fetch data from Alpaca
    const data = await fetchStockBars(
      symbolValidation.symbol,
      timeframeValidation.timeframe,
      start,
      end,
      env
    );

    if (!data.bars || data.bars.length === 0) {
      return jsonResponse({
        symbol: symbolValidation.symbol,
        message: "No data available for the specified period",
        bars: [],
      });
    }

    // Format the bars
    const formattedBars = formatBars(data.bars);

    // Prepare response
    const response = {
      symbol: symbolValidation.symbol,
      timeframe: timeframeValidation.timeframe,
      start,
      end,
      barCount: formattedBars.length,
      bars: formattedBars,
    };

    // Add technical analysis if requested
    if (includeAnalysis) {
      response.analysis = calculateTechnicalIndicators(data.bars);
      response.significantMoves = detectSignificantMoves(formattedBars, 5);
    }

    return jsonResponse(response);
  } catch (error) {
    console.error("Error fetching bars:", error);
    return jsonResponse(
      {
        error: "Failed to fetch market data",
        message: error.message,
      },
      500
    );
  }
}

/**
 * Handle GET /api/market/snapshot/:symbol
 * Get current market snapshot for a symbol
 */
async function handleGetSnapshot(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return jsonResponse({ error: symbolValidation.error }, 400);
  }

  try {
    const snapshot = await fetchSnapshot(symbolValidation.symbol, env);

    return jsonResponse({
      symbol: symbolValidation.symbol,
      snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return jsonResponse(
      {
        error: "Failed to fetch snapshot",
        message: error.message,
      },
      500
    );
  }
}

/**
 * Handle GET /api/market/snapshots
 * Get snapshots for multiple symbols
 *
 * Query params:
 * - symbols: Comma-separated list of symbols (e.g., AAPL,TSLA,MSFT)
 */
async function handleGetMultipleSnapshots(request, env) {
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get("symbols");

  if (!symbolsParam) {
    return jsonResponse(
      {
        error: "Missing required parameter: symbols",
      },
      400
    );
  }

  // Split and validate symbols
  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());

  if (symbols.length === 0 || symbols.length > 100) {
    return jsonResponse(
      {
        error: "Please provide between 1 and 100 symbols",
      },
      400
    );
  }

  // Validate each symbol
  for (const symbol of symbols) {
    const validation = validateSymbol(symbol);
    if (!validation.valid) {
      return jsonResponse(
        {
          error: `Invalid symbol: ${symbol}`,
        },
        400
      );
    }
  }

  try {
    const snapshots = await fetchMultipleSnapshots(symbols, env);

    return jsonResponse({
      symbols,
      count: symbols.length,
      snapshots,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching multiple snapshots:", error);
    return jsonResponse(
      {
        error: "Failed to fetch snapshots",
        message: error.message,
      },
      500
    );
  }
}

/**
 * Handle GET /api/market/quote/:symbol
 * Get latest quote (bid/ask) for a symbol
 */
async function handleGetQuote(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return jsonResponse({ error: symbolValidation.error }, 400);
  }

  try {
    const quote = await fetchLatestQuote(symbolValidation.symbol, env);

    return jsonResponse({
      symbol: symbolValidation.symbol,
      quote,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return jsonResponse(
      {
        error: "Failed to fetch quote",
        message: error.message,
      },
      500
    );
  }
}

/**
 * Helper function to create JSON responses
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
