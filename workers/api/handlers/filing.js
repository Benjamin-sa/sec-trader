/**
 * Filing Handler
 * 
 * Handles requests for specific SEC filing data by accession number.
 * This provides a more efficient way to fetch filing data than
 * fetching all trades and filtering client-side.
 */

import { createSuccessResponse, createErrorResponse } from "../utils/responses.js";
import { DatabaseService } from "../utils/database.js";
import { validateAccessionNumber } from "../utils/validation.js";

/**
 * Handle GET /api/filing/{accessionNumber}
 * 
 * Returns all trades associated with a specific SEC filing
 */
export async function handleFilingByAccessionNumber(request, env) {
  if (request.method !== "GET") {
    return createErrorResponse({ error: "Method not allowed" }, 405, env);
  }

  try {
    // Extract accession number from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const accessionNumber = pathParts[pathParts.length - 1];

    // Validate accession number format
    if (!accessionNumber || !validateAccessionNumber(accessionNumber)) {
      return createErrorResponse({ 
        error: "Invalid accession number format. Expected format: 0000000000-00-000000" 
      }, 400, env);
    }

    const db = new DatabaseService(env.DB);

    // Query to get all trades for this filing
    const query = `
      SELECT 
        accession_number,
        filed_at,
        form_type,
        issuer_cik,
        issuer_name,
        trading_symbol,
        person_cik,
        person_name,
        is_director,
        is_officer,
        officer_title,
        is_ten_percent_owner,
        transaction_date,
        security_title,
        transaction_code,
        transaction_description,
        acquired_disposed_code,
        shares_transacted,
        price_per_share,
        transaction_value,
        shares_owned_following,
        direct_or_indirect,
        is_10b5_1_plan,
        transaction_id
      FROM vw_insider_trades_detailed 
      WHERE accession_number = ?
      ORDER BY transaction_date DESC, transaction_id ASC
    `;

    const results = await db.executeQuery(query, [accessionNumber]);

    // If no trades found for this accession number
    if (!results || results.length === 0) {
      return createErrorResponse({ 
        error: "No trades found for this filing",
        accession_number: accessionNumber 
      }, 404, env);
    }

    // Add computed fields for consistency with other endpoints
    const enrichedTrades = results.map(trade => ({
      ...trade,
      // Convert boolean flags from integers
      is_director: Boolean(trade.is_director),
      is_officer: Boolean(trade.is_officer),
      is_ten_percent_owner: Boolean(trade.is_ten_percent_owner),
      is_10b5_1_plan: Boolean(trade.is_10b5_1_plan),
      // Add computed fields for frontend compatibility
      is_purchase: trade.transaction_code === 'P' && trade.acquired_disposed_code === 'A' ? 1 : 0,
      is_sale: trade.transaction_code === 'S' && trade.acquired_disposed_code === 'D' ? 1 : 0,
      is_award: trade.transaction_code === 'A' ? 1 : 0,
    }));

    // Get filing metadata from the first trade
    const filingMeta = {
      accession_number: accessionNumber,
      filed_at: enrichedTrades[0].filed_at,
      form_type: enrichedTrades[0].form_type,
      issuer_cik: enrichedTrades[0].issuer_cik,
      issuer_name: enrichedTrades[0].issuer_name,
      trading_symbol: enrichedTrades[0].trading_symbol,
      person_cik: enrichedTrades[0].person_cik,
      person_name: enrichedTrades[0].person_name,
      transaction_count: enrichedTrades.length,
      total_value: enrichedTrades.reduce((sum, trade) => sum + (trade.transaction_value || 0), 0),
      total_shares: enrichedTrades.reduce((sum, trade) => sum + (trade.shares_transacted || 0), 0),
    };

    return createSuccessResponse({
      filing: filingMeta,
      trades: enrichedTrades,
      count: enrichedTrades.length
    }, env);

  } catch (error) {
    console.error("Filing handler error:", error);
    return createErrorResponse({ 
      error: "Internal server error",
      details: error.message 
    }, 500, env);
  }
}