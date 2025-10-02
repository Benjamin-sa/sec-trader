/**
 * News handler
 */

import { fetchNews } from "../services/alpaca-client.js";
import { formatNews } from "../utils/data-processor.js";
import {
  getDateRangeDays,
  getDateRangeHours,
  toRFC3339,
} from "../utils/date-utils.js";
import {
  validateSymbol,
  validateLimit,
  validateSort,
  validateDateRange,
} from "../utils/validators.js";
import { jsonResponse, errorResponse } from "../utils/responses.js";
import { DEFAULT_VALUES } from "../config/constants.js";

/**
 * Handle GET /api/market/news
 * Get latest news for symbols
 *
 * Query params:
 * - symbols: Comma-separated list of symbols (optional, if not provided returns general market news)
 * - limit: Maximum number of news items to return (1-50) [default: 50]
 * - start: Custom start date (RFC3339 format)
 * - end: Custom end date (RFC3339 format)
 * - days: Number of days to look back (if start/end not provided) [default: 7]
 * - hours: Number of hours to look back (overrides days if provided)
 * - sort: Sort order: 'asc' or 'desc' [default: 'desc']
 * - includeContent: Include full article content (true/false) [default: true]
 * - excludeContentless: Exclude news without content (true/false) [default: false]
 */
export async function handleGetNews(request, env) {
  const url = new URL(request.url);

  // Get and validate query parameters
  const symbolsParam = url.searchParams.get("symbols");
  const limitParam =
    url.searchParams.get("limit") || DEFAULT_VALUES.NEWS_LIMIT.toString();
  const customStart = url.searchParams.get("start");
  const customEnd = url.searchParams.get("end");
  const daysParam = url.searchParams.get("days") || "7";
  const hoursParam = url.searchParams.get("hours");
  const sortParam = url.searchParams.get("sort") || "desc";
  const includeContentParam = url.searchParams.get("includeContent");
  const excludeContentlessParam = url.searchParams.get("excludeContentless");

  // Validate symbols if provided
  let symbols = null;
  if (symbolsParam) {
    const symbolsList = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase());

    // Validate each symbol
    for (const symbol of symbolsList) {
      const validation = validateSymbol(symbol);
      if (!validation.valid) {
        return errorResponse(`Invalid symbol: ${symbol}`);
      }
    }

    symbols = symbolsList;
  }

  // Validate limit
  const limitValidation = validateLimit(limitParam, 50);
  if (!limitValidation.valid) {
    return errorResponse(limitValidation.error);
  }

  // Validate sort
  const sortValidation = validateSort(sortParam);
  if (!sortValidation.valid) {
    return errorResponse(sortValidation.error);
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
  } else if (hoursParam) {
    const hours = parseInt(hoursParam);
    if (isNaN(hours) || hours < 1 || hours > 720) {
      return errorResponse(
        "Hours must be a number between 1 and 720 (30 days)"
      );
    }
    const dateRange = getDateRangeHours(hours);
    start = dateRange.start;
    end = dateRange.end;
  } else {
    const days = parseInt(daysParam);
    if (isNaN(days) || days < 1 || days > 365) {
      return errorResponse("Days must be a number between 1 and 365");
    }
    const dateRange = getDateRangeDays(days);
    start = dateRange.start;
    end = dateRange.end;
  }

  // Prepare fetch parameters
  const fetchParams = {
    symbols,
    start,
    end,
    limit: limitValidation.limit,
    sort: sortValidation.sort,
    includeContent: includeContentParam !== "false",
    excludeContentless: excludeContentlessParam === "true",
  };

  try {
    // Fetch news from Alpaca
    const data = await fetchNews(fetchParams, env);

    if (!data.news || data.news.length === 0) {
      return jsonResponse({
        symbols,
        message: "No news available for the specified period",
        news: [],
        count: 0,
      });
    }

    // Format the news
    const formattedNews = formatNews(data.news);

    // Prepare response
    const response = {
      symbols,
      start,
      end,
      count: formattedNews.length,
      sort: sortValidation.sort,
      news: formattedNews,
      timestamp: new Date().toISOString(),
    };

    // Add next page token if available
    if (data.next_page_token) {
      response.nextPageToken = data.next_page_token;
    }

    return jsonResponse(response);
  } catch (error) {
    console.error("Error fetching news:", error);
    return errorResponse("Failed to fetch news", 500, {
      message: error.message,
    });
  }
}

/**
 * Handle GET /api/market/news/:symbol
 * Get latest news for a specific symbol
 */
export async function handleGetNewsBySymbol(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return errorResponse(symbolValidation.error);
  }

  // Create a new URL with the symbol as a query parameter
  const newUrl = new URL(request.url);
  newUrl.searchParams.set("symbols", symbolValidation.symbol);

  // Create a new request with the modified URL
  const newRequest = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  // Reuse the handleGetNews function
  return handleGetNews(newRequest, env);
}
