/**
 * Alpaca API Client Service
 * Handles all communication with Alpaca Markets API
 * Documentation: https://alpaca.markets/docs/api-references/market-data-api/
 */

import { ALPACA_CONFIG } from "../config/constants.js";

/**
 * Create authentication headers for Alpaca API
 */
function getAlpacaHeaders(env) {
  return {
    "APCA-API-KEY-ID": env.ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": env.ALPACA_API_SECRET,
    Accept: "application/json",
  };
}

/**
 * Generic fetch wrapper for Alpaca API
 */
async function alpacaFetch(url, env, errorContext = "Alpaca API") {
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${errorContext} error (${response.status}): ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`${errorContext} error:`, error);
    throw error;
  }
}

/**
 * Fetch stock bars (OHLCV data) for a given symbol and time range
 */
export async function fetchStockBars(symbol, timeframe, start, end, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/bars`);

  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("limit", ALPACA_CONFIG.MAX_LIMIT.toString());
  url.searchParams.set("adjustment", ALPACA_CONFIG.ADJUSTMENT);
  url.searchParams.set("feed", ALPACA_CONFIG.DEFAULT_FEED);

  console.log(`Fetching bars for ${symbol} from ${start} to ${end}`);
  return alpacaFetch(url, env, "Stock bars");
}

/**
 * Fetch latest trade for a given symbol
 */
export async function fetchLatestTrade(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/trades/latest`);
  url.searchParams.set("feed", ALPACA_CONFIG.DEFAULT_FEED);

  return alpacaFetch(url, env, "Latest trade");
}

/**
 * Fetch latest quote for a given symbol
 */
export async function fetchLatestQuote(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/quotes/latest`);
  url.searchParams.set("feed", ALPACA_CONFIG.DEFAULT_FEED);

  return alpacaFetch(url, env, "Latest quote");
}

/**
 * Fetch snapshot for a given symbol
 */
export async function fetchSnapshot(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/snapshot`);
  url.searchParams.set("feed", ALPACA_CONFIG.DEFAULT_FEED);

  return alpacaFetch(url, env, "Snapshot");
}

/**
 * Fetch multiple snapshots for multiple symbols at once
 */
export async function fetchMultipleSnapshots(symbols, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v2/stocks/snapshots`);
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("feed", ALPACA_CONFIG.DEFAULT_FEED);

  return alpacaFetch(url, env, "Multiple snapshots");
}

/**
 * Fetch news for a given symbol or multiple symbols
 *
 * @param {object} params - Query parameters
 * @param {string[]} params.symbols - Array of stock symbols
 * @param {string} params.start - Start date in RFC3339 format (optional)
 * @param {string} params.end - End date in RFC3339 format (optional)
 * @param {number} params.limit - Maximum number of news items to return
 * @param {string} params.sort - Sort order: 'asc' or 'desc' (default: 'desc')
 * @param {object} env - Environment variables
 * @returns {Promise<object>} News data
 */
export async function fetchNews(params, env) {
  const baseUrl = env.ALPACA_BASE_URL || ALPACA_CONFIG.BASE_URL;
  const url = new URL(`${baseUrl}/v1beta1/news`);

  // Add query parameters
  if (params.symbols && params.symbols.length > 0) {
    url.searchParams.set("symbols", params.symbols.join(","));
  }
  if (params.start) {
    url.searchParams.set("start", params.start);
  }
  if (params.end) {
    url.searchParams.set("end", params.end);
  }
  if (params.limit) {
    url.searchParams.set("limit", params.limit.toString());
  }
  if (params.sort) {
    url.searchParams.set("sort", params.sort);
  }
  if (params.includeContent === false) {
    url.searchParams.set("include_content", "false");
  }
  if (params.excludeContentless === true) {
    url.searchParams.set("exclude_contentless", "true");
  }

  console.log(
    `Fetching news for symbols: ${params.symbols?.join(",") || "all"}`
  );
  return alpacaFetch(url, env, "News");
}
