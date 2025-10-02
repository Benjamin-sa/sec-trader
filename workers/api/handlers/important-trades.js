/**
 * Important trades endpoint handler
 *
 * NOW OPTIMIZED: Reads from pre-computed important_trade_signals table
 * Response time: <20ms (down from 500-1000ms)
 */
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleImportantTrades(request, env) {
  const url = new URL(request.url);
  const minScore = parseInt(url.searchParams.get("minScore")) || 30;
  const onlyPurchases = url.searchParams.get("onlyPurchases") === "true";

  // Simple query - read from pre-computed signals with view
  const sql = `
    SELECT 
      its.signal_id,
      its.importance_score,
      its.cluster_size,
      its.is_first_buy,
      its.is_purchase,
      its.is_sale,
      its.accession_number,
      its.filed_at,
      its.form_type,
      its.issuer_cik,
      its.issuer_name,
      its.trading_symbol,
      its.person_cik,
      its.person_name,
      its.is_director,
      its.is_officer,
      its.officer_title,
      its.is_ten_percent_owner,
      its.transaction_date,
      its.security_title,
      its.transaction_code,
      its.acquired_disposed_code,
      its.shares_transacted,
      its.price_per_share,
      its.transaction_value,
      its.shares_owned_following,
      its.direct_or_indirect,
      CASE 
        WHEN its.transaction_code = 'P' THEN 'Purchase'
        WHEN its.transaction_code = 'S' THEN 'Sale'
        ELSE 'Other'
      END as transaction_description,
      CASE WHEN its.is_purchase = 1 THEN 1 ELSE 0 END as is_purchase_flag,
      CASE WHEN its.is_sale = 1 THEN 1 ELSE 0 END as is_sale_flag,
      CASE 
        WHEN its.is_officer = 1 AND (
          LOWER(COALESCE(its.officer_title, '')) LIKE '%chief executive%'
          OR LOWER(COALESCE(its.officer_title, '')) LIKE '%ceo%'
          OR LOWER(COALESCE(its.officer_title, '')) LIKE '%chief financial%'
          OR LOWER(COALESCE(its.officer_title, '')) LIKE '%cfo%'
        ) THEN 2
        WHEN its.is_officer = 1 THEN 1
        ELSE 0
      END as role_priority
    FROM vw_important_trades_details its
    WHERE its.importance_score >= ?
      ${onlyPurchases ? "AND its.is_purchase = 1" : ""}
    ORDER BY its.importance_score DESC, its.transaction_value DESC, its.filed_at DESC
    LIMIT ${DEFAULT_LIMITS.IMPORTANT_TRADES}
  `;

  const dbService = new DatabaseService(env.DB);
  const results = await dbService.executeQuery(sql, [minScore]);

  return createSuccessResponse(results, env, {
    query_info: {
      min_score: minScore,
      only_purchases: onlyPurchases,
      trades_found: results.length,
    },
  });
}
