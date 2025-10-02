/**
 * Stock bars handler
 */

import { fetchStockBars } from "../services/alpaca-client.js";
import {
  calculateTechnicalIndicators,
  formatBars,
  detectSignificantMoves,
} from "../utils/data-processor.js";
import { getDateRangeMonths, toRFC3339 } from "../utils/date-utils.js";
import {
  validateSymbol,
  validateTimeframe,
  validateDateRange,
  validateMonths,
} from "../utils/validators.js";
import { jsonResponse, errorResponse } from "../utils/responses.js";

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
export async function handleGetBars(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return errorResponse(symbolValidation.error);
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
    return errorResponse(timeframeValidation.error);
  }

  // Determine date range
  let start, end;
  if (customStart && customEnd) {
    const dateValidation = validateDateRange(customStart, customEnd);
    if (!dateValidation.valid) {
      return errorResponse(dateValidation.error);
    }
    start = toRFC3339(customStart);
    end = toRFC3339(customEnd);
  } else {
    const monthsValidation = validateMonths(months);
    if (!monthsValidation.valid) {
      return errorResponse(monthsValidation.error);
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
    return errorResponse("Failed to fetch market data", 500, {
      message: error.message,
    });
  }
}
