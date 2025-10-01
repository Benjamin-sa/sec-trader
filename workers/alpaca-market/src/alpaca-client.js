/**
 * Alpaca API Client
 * Handles all communication with Alpaca Markets API
 * Documentation: https://alpaca.markets/docs/api-references/market-data-api/
 */

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
 * Fetch stock bars (OHLCV data) for a given symbol and time range
 *
 * @param {string} symbol - Stock ticker symbol (e.g., "AAPL")
 * @param {string} timeframe - Bar timeframe: 1Min, 5Min, 15Min, 1Hour, 1Day
 * @param {string} start - Start date in RFC3339 format (YYYY-MM-DDTHH:MM:SSZ)
 * @param {string} end - End date in RFC3339 format (YYYY-MM-DDTHH:MM:SSZ)
 * @param {object} env - Environment variables
 * @returns {Promise<object>} Bars data
 */
export async function fetchStockBars(symbol, timeframe, start, end, env) {
  const baseUrl = env.ALPACA_BASE_URL || "https://data.alpaca.markets";

  // Build URL with query parameters
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/bars`);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("limit", "10000"); // Maximum allowed
  url.searchParams.set("adjustment", "split"); // Adjust for stock splits
  url.searchParams.set("feed", "iex"); // Use free IEX feed instead of paid SIP feed

  console.log(
    `Fetching bars for ${symbol} from ${start} to ${end} (feed: iex)`
  );

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching stock bars:", error);
    throw error;
  }
}

/**
 * Fetch latest trade for a given symbol
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {object} env - Environment variables
 * @returns {Promise<object>} Latest trade data
 */
export async function fetchLatestTrade(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || "https://data.alpaca.markets";
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/trades/latest`);
  url.searchParams.set("feed", "iex"); // Use free IEX feed

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching latest trade:", error);
    throw error;
  }
}

/**
 * Fetch latest quote for a given symbol
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {object} env - Environment variables
 * @returns {Promise<object>} Latest quote data (bid/ask)
 */
export async function fetchLatestQuote(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || "https://data.alpaca.markets";
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/quotes/latest`);
  url.searchParams.set("feed", "iex"); // Use free IEX feed

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching latest quote:", error);
    throw error;
  }
}

/**
 * Fetch snapshot for a given symbol (combines latest trade, quote, and other data)
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {object} env - Environment variables
 * @returns {Promise<object>} Snapshot data
 */
export async function fetchSnapshot(symbol, env) {
  const baseUrl = env.ALPACA_BASE_URL || "https://data.alpaca.markets";
  const url = new URL(`${baseUrl}/v2/stocks/${symbol}/snapshot`);
  url.searchParams.set("feed", "iex"); // Use free IEX feed

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    throw error;
  }
}

/**
 * Fetch multiple snapshots for multiple symbols at once
 *
 * @param {string[]} symbols - Array of stock ticker symbols
 * @param {object} env - Environment variables
 * @returns {Promise<object>} Snapshots data for all symbols
 */
export async function fetchMultipleSnapshots(symbols, env) {
  const baseUrl = env.ALPACA_BASE_URL || "https://data.alpaca.markets";
  const url = new URL(`${baseUrl}/v2/stocks/snapshots`);
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("feed", "iex"); // Use free IEX feed

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAlpacaHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching multiple snapshots:", error);
    throw error;
  }
}
