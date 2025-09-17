/**
 * First-time buy signals endpoint handler
 */
import { validateLimit } from "../utils/validation.js";
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleFirstBuySignals(request, env) {
  const url = new URL(request.url);
  const recentDays = validateLimit(url.searchParams.get("recentDays"), 30, 90);
  const lookbackDays = validateLimit(
    url.searchParams.get("lookbackDays"),
    365,
    730
  );

  const sql = `
    SELECT 
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
      END as role_priority,
      -- Cluster size calculation
      (
        SELECT COUNT(DISTINCT p2.id)
        FROM insider_transactions it2
        JOIN filings f2 ON it2.filing_id = f2.id
        JOIN person_relationships pr2 ON f2.id = pr2.filing_id
        JOIN persons p2 ON pr2.person_id = p2.id
        WHERE f2.status = 'completed'
          AND f2.issuer_id = f.issuer_id
          AND it2.acquired_disposed_code = 'A'
          AND it2.transaction_code = 'P'
          AND it2.price_per_share IS NOT NULL AND it2.price_per_share > 0
          AND it2.transaction_date BETWEEN date(it.transaction_date, '-3 days') AND date(it.transaction_date, '+3 days')
      ) as cluster_size,
      -- Percentage of holdings
      CAST(it.shares_transacted AS REAL) / NULLIF((it.shares_owned_following + CASE WHEN it.acquired_disposed_code = 'D' THEN it.shares_transacted ELSE 0 END), 0) as pct_of_holdings,
      -- 10b5-1 plan detection
      EXISTS (
        SELECT 1
        FROM transaction_footnotes tf
        JOIN footnotes fn ON fn.id = tf.footnote_id
        WHERE tf.transaction_id = it.id
          AND LOWER(fn.footnote_text) LIKE '%10b5-1%'
      ) as is_10b5_1_plan,
      -- Enhanced importance score with first-buy bonus
      (
        (CASE 
           WHEN it.transaction_value >= 10000000 THEN 100
           WHEN it.transaction_value >= 2500000 THEN 60
           WHEN it.transaction_value >= 1000000 THEN 40
           WHEN it.transaction_value >= 250000 THEN 20
           ELSE 10
         END)
        + 30 -- open market purchase bonus
        + (CASE 
             WHEN pr.is_officer = 1 AND (
               LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief executive%'
               OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%ceo%'
               OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief financial%'
               OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%cfo%'
             ) THEN 30
             WHEN pr.is_officer = 1 THEN 15
             WHEN pr.is_director = 1 THEN 10
             ELSE 0
           END)
        + (CASE WHEN pr.is_ten_percent_owner = 1 THEN 20 ELSE 0 END)
        + (CASE 
             WHEN (CAST(it.shares_transacted AS REAL) / NULLIF((it.shares_owned_following + CASE WHEN it.acquired_disposed_code = 'D' THEN it.shares_transacted ELSE 0 END), 0)) >= 0.5 THEN 30
             WHEN (CAST(it.shares_transacted AS REAL) / NULLIF((it.shares_owned_following + CASE WHEN it.acquired_disposed_code = 'D' THEN it.shares_transacted ELSE 0 END), 0)) >= 0.25 THEN 20
             ELSE 0
           END)
        + (CASE 
             WHEN (
               SELECT COUNT(DISTINCT p2.id)
               FROM insider_transactions it2
               JOIN filings f2 ON it2.filing_id = f2.id
               JOIN person_relationships pr2 ON f2.id = pr2.filing_id
               JOIN persons p2 ON pr2.person_id = p2.id
               WHERE f2.status = 'completed'
                 AND f2.issuer_id = f.issuer_id
                 AND it2.acquired_disposed_code = 'A'
                 AND it2.transaction_code = 'P'
                 AND it2.price_per_share IS NOT NULL AND it2.price_per_share > 0
                 AND it2.transaction_date BETWEEN date(it.transaction_date, '-3 days') AND date(it.transaction_date, '+3 days')
             ) >= 3 THEN 25
             WHEN (
               SELECT COUNT(DISTINCT p2.id)
               FROM insider_transactions it2
               JOIN filings f2 ON it2.filing_id = f2.id
               JOIN person_relationships pr2 ON f2.id = pr2.filing_id
               JOIN persons p2 ON pr2.person_id = p2.id
               WHERE f2.status = 'completed'
                 AND f2.issuer_id = f.issuer_id
                 AND it2.acquired_disposed_code = 'A'
                 AND it2.transaction_code = 'P'
                 AND it2.price_per_share IS NOT NULL AND it2.price_per_share > 0
                 AND it2.transaction_date BETWEEN date(it.transaction_date, '-3 days') AND date(it.transaction_date, '+3 days')
             ) >= 2 THEN 15
             ELSE 0
           END)
        + (CASE WHEN it.direct_or_indirect = 'I' THEN -10 ELSE 0 END)
        + (CASE WHEN (
              SELECT 1 FROM transaction_footnotes tf
              JOIN footnotes fn ON fn.id = tf.footnote_id
              WHERE tf.transaction_id = it.id AND LOWER(fn.footnote_text) LIKE '%10b5-1%'
            ) IS NOT NULL THEN -25 ELSE 0 END)
        + 40 -- first buy bonus
      ) as importance_score
    FROM insider_transactions it
    JOIN filings f ON it.filing_id = f.id
    JOIN filing_types ft ON f.filing_type_id = ft.id
    JOIN issuers i ON f.issuer_id = i.id
    JOIN person_relationships pr ON f.id = pr.filing_id
    JOIN persons p ON pr.person_id = p.id
    WHERE f.status = 'completed'
      AND ft.type_code = '4'
      AND it.acquired_disposed_code = 'A'
      AND it.transaction_code = 'P'
      AND it.price_per_share IS NOT NULL AND it.price_per_share > 0
      AND f.filed_at >= date('now', '-' || ? || ' days')
      AND NOT EXISTS (
        SELECT 1
        FROM insider_transactions it_prev
        JOIN filings f_prev ON it_prev.filing_id = f_prev.id
        JOIN person_relationships pr_prev ON f_prev.id = pr_prev.filing_id
        WHERE f_prev.status = 'completed'
          AND f_prev.issuer_id = f.issuer_id
          AND pr_prev.person_id = pr.person_id
          AND it_prev.acquired_disposed_code = 'A'
          AND it_prev.transaction_code = 'P'
          AND it_prev.price_per_share IS NOT NULL AND it_prev.price_per_share > 0
          AND it_prev.transaction_date BETWEEN date(it.transaction_date, '-' || ? || ' days') AND date(it.transaction_date, '-1 day')
      )
    ORDER BY importance_score DESC, it.transaction_value DESC, f.filed_at DESC
    LIMIT ${DEFAULT_LIMITS.FIRST_BUYS}
  `;

  const dbService = new DatabaseService(env.DB);
  const results = await dbService.executeQuery(sql, [recentDays, lookbackDays]);

  return createSuccessResponse(results, env, {
    query_info: {
      recent_days: recentDays,
      lookback_days: lookbackDays,
      first_buys_found: results.length,
    },
  });
}
