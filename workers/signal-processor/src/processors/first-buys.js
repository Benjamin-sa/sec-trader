/**
 * First Buy Signal Processor
 *
 * Identifies first-time purchases by insiders in a company.
 * These are strong bullish signals as they indicate new conviction.
 */

/**
 * Process first buy signals
 *
 * Strategy:
 * 1. Find all open market purchases in recent days
 * 2. For each, check if the person has bought this stock before (in lookback period)
 * 3. If it's their first buy, calculate importance score
 * 4. Store results in first_buy_signals table
 */
export async function processFirstBuys(env, logger) {
  const startTime = Date.now();
  const RECENT_DAYS = 30; // Look for purchases in last 30 days
  const LOOKBACK_DAYS = 365; // Check this far back for previous buys

  try {
    logger.info("🆕 Starting first buy detection", {
      recent_days: RECENT_DAYS,
      lookback_days: LOOKBACK_DAYS,
    });

    // Step 1: Mark all existing signals as potentially outdated
    await env.DB.prepare(
      `
      UPDATE first_buy_signals 
      SET is_active = FALSE
      WHERE is_active = TRUE
    `
    ).run();

    // Step 2: Find all recent purchases
    const recentPurchases = await env.DB.prepare(
      `
      SELECT 
        it.id as transaction_id,
        f.issuer_id,
        pr.person_id,
        it.transaction_date,
        it.transaction_value,
        it.shares_transacted,
        pr.is_officer,
        pr.is_director,
        pr.officer_title,
        pr.is_ten_percent_owner,
        
        -- Cluster size
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
        ) as cluster_size
        
      FROM insider_transactions it
      JOIN filings f ON it.filing_id = f.id
      JOIN person_relationships pr ON f.id = pr.filing_id
      WHERE f.status = 'completed'
        AND it.acquired_disposed_code = 'A'
        AND it.transaction_code = 'P'
        AND it.price_per_share IS NOT NULL 
        AND it.price_per_share > 0
        AND f.filed_at >= date('now', '-${RECENT_DAYS} days')
      ORDER BY it.transaction_date DESC
    `
    ).all();

    logger.info(
      `🔍 Found ${recentPurchases.results.length} recent purchases to check`
    );

    let processedPurchases = 0;
    let firstBuys = 0;

    // Step 3: Check each purchase to see if it's a first buy
    for (const purchase of recentPurchases.results) {
      try {
        // Check for previous purchases by this person for this issuer
        const previousPurchase = await env.DB.prepare(
          `
          SELECT 1
          FROM insider_transactions it_prev
          JOIN filings f_prev ON it_prev.filing_id = f_prev.id
          JOIN person_relationships pr_prev ON f_prev.id = pr_prev.filing_id
          WHERE f_prev.status = 'completed'
            AND f_prev.issuer_id = ?
            AND pr_prev.person_id = ?
            AND it_prev.acquired_disposed_code = 'A'
            AND it_prev.transaction_code = 'P'
            AND it_prev.price_per_share IS NOT NULL 
            AND it_prev.price_per_share > 0
            AND it_prev.transaction_date BETWEEN date(?, '-${LOOKBACK_DAYS} days') AND date(?, '-1 day')
          LIMIT 1
        `
        )
          .bind(
            purchase.issuer_id,
            purchase.person_id,
            purchase.transaction_date,
            purchase.transaction_date
          )
          .first();

        // If no previous purchase found, it's a first buy!
        if (!previousPurchase) {
          // Calculate importance score with first-buy bonus
          const importanceScore = calculateFirstBuyScore(purchase);

          // Check if this signal already exists
          const existing = await env.DB.prepare(
            `
            SELECT id FROM first_buy_signals
            WHERE transaction_id = ?
          `
          )
            .bind(purchase.transaction_id)
            .first();

          if (existing) {
            // Update existing
            await env.DB.prepare(
              `
              UPDATE first_buy_signals SET
                lookback_days = ?,
                importance_score = ?,
                is_part_of_cluster = ?,
                cluster_size = ?,
                is_active = TRUE
              WHERE id = ?
            `
            )
              .bind(
                LOOKBACK_DAYS,
                importanceScore,
                purchase.cluster_size >= 2,
                purchase.cluster_size || 0,
                existing.id
              )
              .run();
          } else {
            // Insert new
            await env.DB.prepare(
              `
              INSERT INTO first_buy_signals (
                transaction_id, person_id, issuer_id,
                lookback_days, importance_score,
                is_part_of_cluster, cluster_size
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `
            )
              .bind(
                purchase.transaction_id,
                purchase.person_id,
                purchase.issuer_id,
                LOOKBACK_DAYS,
                importanceScore,
                purchase.cluster_size >= 2,
                purchase.cluster_size || 0
              )
              .run();
          }

          firstBuys++;
        }

        processedPurchases++;
      } catch (error) {
        logger.error(`Failed to process purchase ${purchase.transaction_id}`, {
          error: error.message,
        });
      }
    }

    // Step 4: Clean up old inactive signals
    const cleanup = await env.DB.prepare(
      `
      DELETE FROM first_buy_signals
      WHERE is_active = FALSE
        AND detected_at < datetime('now', '-90 days')
    `
    ).run();

    const duration = Date.now() - startTime;

    const summary = {
      duration_ms: duration,
      processed: processedPurchases,
      first_buys: firstBuys,
      cleaned_up: cleanup.meta.changes || 0,
    };

    logger.info("✅ First buy processing complete", summary);

    return summary;
  } catch (error) {
    logger.error("❌ First buy processing failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Calculate importance score for a first buy
 * Similar to important trades but with first-buy bonus
 */
function calculateFirstBuyScore(purchase) {
  let score = 0;

  // 1. Transaction value (0-60 points)
  if (purchase.transaction_value >= 10000000) {
    score += 60;
  } else if (purchase.transaction_value >= 2500000) {
    score += 50;
  } else if (purchase.transaction_value >= 1000000) {
    score += 40;
  } else if (purchase.transaction_value >= 250000) {
    score += 20;
  } else {
    score += 10;
  }

  // 2. First buy bonus (40 points)
  score += 40;

  // 3. Role significance (0-30 points)
  const title = (purchase.officer_title || "").toLowerCase();
  if (
    purchase.is_officer &&
    (title.includes("chief executive") || title.includes("ceo"))
  ) {
    score += 30;
  } else if (
    purchase.is_officer &&
    (title.includes("chief financial") || title.includes("cfo"))
  ) {
    score += 30;
  } else if (purchase.is_officer) {
    score += 15;
  } else if (purchase.is_director) {
    score += 10;
  }

  // 4. 10% owner bonus (20 points)
  if (purchase.is_ten_percent_owner) {
    score += 20;
  }

  // 5. Cluster bonus (0-25 points)
  if (purchase.cluster_size >= 3) {
    score += 25;
  } else if (purchase.cluster_size >= 2) {
    score += 15;
  }

  return Math.round(score);
}
