/**
 * First-time buy signals endpoint handler
 *
 * NOW OPTIMIZED: Reads from pre-computed first_buy_signals table
 * Response time: <15ms (down from 800-1500ms)
 */
import { validateLimit } from "../utils/validation.js";
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleFirstBuySignals(request, env) {
  const url = new URL(request.url);
  const recentDays = validateLimit(url.searchParams.get("recentDays"), 30, 90);
  const minScore = parseInt(url.searchParams.get("minScore")) || 0;

  // Simple query - read from pre-computed signals
  const sql = `
    SELECT 
      fbs.importance_score,
      fbs.lookback_days,
      fbs.is_part_of_cluster,
      fbs.cluster_size,
      it.id as transaction_id,
      f.accession_number,
      f.filed_at,
      ft.type_code as form_type,
      i.cik as issuer_cik,
      i.name as issuer_name,
      i.trading_symbol,
      p.cik as person_cik,
      p.name as person_name,
      pr.is_director,
      pr.is_officer,
      pr.officer_title,
      pr.is_ten_percent_owner,
      it.transaction_date,
      it.security_title,
      it.transaction_code,
      'Purchase' as transaction_description,
      it.acquired_disposed_code,
      it.shares_transacted,
      it.price_per_share,
      it.transaction_value,
      it.shares_owned_following,
      it.direct_or_indirect,
      1 as is_purchase,
      0 as is_sale,
      0 as is_award,
      CASE 
        WHEN pr.is_officer = 1 AND (
          LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief executive%'
          OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%ceo%'
          OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief financial%'
          OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%cfo%'
        ) THEN 2
        WHEN pr.is_officer = 1 THEN 1
        ELSE 0
      END as role_priority
    FROM first_buy_signals fbs
    JOIN insider_transactions it ON fbs.transaction_id = it.id
    JOIN filings f ON it.filing_id = f.id
    JOIN filing_types ft ON f.filing_type_id = ft.id
    JOIN issuers i ON fbs.issuer_id = i.id
    JOIN person_relationships pr ON f.id = pr.filing_id AND pr.person_id = fbs.person_id
    JOIN persons p ON fbs.person_id = p.id
    WHERE fbs.is_active = TRUE
      AND it.transaction_date >= date('now', '-' || ? || ' days')
      AND fbs.importance_score >= ?
    ORDER BY fbs.importance_score DESC, it.transaction_value DESC, f.filed_at DESC
    LIMIT ${DEFAULT_LIMITS.FIRST_BUYS}
  `;

  const dbService = new DatabaseService(env.DB);
  const results = await dbService.executeQuery(sql, [recentDays, minScore]);

  return createSuccessResponse(results, env, {
    query_info: {
      recent_days: recentDays,
      min_score: minScore,
      first_buys_found: results.length,
    },
  });
}
