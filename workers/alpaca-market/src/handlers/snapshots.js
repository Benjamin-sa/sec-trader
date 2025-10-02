/**
 * Snapshots handlers
 */

import {
  fetchSnapshot,
  fetchMultipleSnapshots,
} from "../services/alpaca-client.js";
import { validateSymbol, validateSymbols } from "../utils/validators.js";
import { jsonResponse, errorResponse } from "../utils/responses.js";

/**
 * Handle GET /api/market/snapshot/:symbol
 * Get current market snapshot for a symbol
 */
export async function handleGetSnapshot(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return errorResponse(symbolValidation.error);
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
    return errorResponse("Failed to fetch snapshot", 500, {
      message: error.message,
    });
  }
}

/**
 * Handle GET /api/market/snapshots
 * Get snapshots for multiple symbols
 *
 * Query params:
 * - symbols: Comma-separated list of symbols (e.g., AAPL,TSLA,MSFT)
 */
export async function handleGetMultipleSnapshots(request, env) {
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get("symbols");

  if (!symbolsParam) {
    return errorResponse("Missing required parameter: symbols");
  }

  // Split and validate symbols
  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
  const validation = validateSymbols(symbols);

  if (!validation.valid) {
    return errorResponse(validation.error);
  }

  try {
    const snapshots = await fetchMultipleSnapshots(validation.symbols, env);

    return jsonResponse({
      symbols: validation.symbols,
      count: validation.symbols.length,
      snapshots,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching multiple snapshots:", error);
    return errorResponse("Failed to fetch snapshots", 500, {
      message: error.message,
    });
  }
}
