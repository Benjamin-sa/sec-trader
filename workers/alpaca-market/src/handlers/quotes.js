/**
 * Quotes handler
 */

import { fetchLatestQuote } from "../services/alpaca-client.js";
import { validateSymbol } from "../utils/validators.js";
import { jsonResponse, errorResponse } from "../utils/responses.js";

/**
 * Handle GET /api/market/quote/:symbol
 * Get latest quote (bid/ask) for a symbol
 */
export async function handleGetQuote(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const symbol = pathParts[pathParts.length - 1];

  // Validate symbol
  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return errorResponse(symbolValidation.error);
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
    return errorResponse("Failed to fetch quote", 500, {
      message: error.message,
    });
  }
}
