/**
 * Important trades endpoint handler
 */
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleImportantTrades(request, env) {
  const sql = `
    SELECT 
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
      CASE 
        WHEN it.transaction_code = 'P' THEN 'Purchase'
        WHEN it.transaction_code = 'S' THEN 'Sale'
        WHEN it.transaction_code = 'A' THEN 'Grant/Award'
        ELSE 'Other'
      END as transaction_description,
      it.acquired_disposed_code,
      it.shares_transacted,
      it.price_per_share,
      it.transaction_value,
      it.shares_owned_following,
      it.direct_or_indirect,
      -- Derived signals
      CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN 1 ELSE 0 END as is_purchase,
      CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN 1 ELSE 0 END as is_sale,
      CASE WHEN it.transaction_code = 'A' THEN 1 ELSE 0 END as is_award,
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
      -- Importance score calculation
      (
        (CASE 
           WHEN it.transaction_value >= 10000000 THEN 100
           WHEN it.transaction_value >= 2500000 THEN 60
           WHEN it.transaction_value >= 1000000 THEN 40
           WHEN it.transaction_value >= 250000 THEN 20
           ELSE 10
         END)
        + (CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN 30 ELSE -10 END)
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
      ) as importance_score
    FROM insider_transactions it
    JOIN filings f ON it.filing_id = f.id
    JOIN filing_types ft ON f.filing_type_id = ft.id
    JOIN issuers i ON f.issuer_id = i.id
    JOIN person_relationships pr ON f.id = pr.filing_id
    JOIN persons p ON pr.person_id = p.id
    WHERE f.status = 'completed'
      AND it.price_per_share IS NOT NULL AND it.price_per_share > 0
      AND it.transaction_code != 'A' -- exclude grants/awards from 'important'
      AND (
        -- Prioritize open market purchases with meaningful signal
        (it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' AND (
           it.transaction_value >= 100000 OR
           pr.is_officer = 1 OR
           pr.is_ten_percent_owner = 1 OR
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
           ) >= 2
        ))
        OR
        -- Also include significant sales with strong signal
        (it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' AND (
           it.transaction_value >= 5000000 OR
           (pr.is_officer = 1 AND (
             LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief executive%'
             OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%ceo%'
             OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief financial%'
             OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%cfo%'
           )) OR
           (CAST(it.shares_transacted AS REAL) / NULLIF((it.shares_owned_following + it.shares_transacted), 0)) >= 0.25
        ))
        OR
        -- 10% owners with sizeable transactions
        (pr.is_ten_percent_owner = 1 AND it.transaction_value >= 1000000)
      )
    ORDER BY importance_score DESC, it.transaction_value DESC, f.filed_at DESC
    LIMIT ${DEFAULT_LIMITS.IMPORTANT_TRADES}
  `;

  const dbService = new DatabaseService(env.DB);
  const results = await dbService.executeQuery(sql);

  return createSuccessResponse(results, env);
}
