/**
 * Important Trade Signal Processor
 *
 * Calculates importance scores for all insider trades and stores
 * the most significant ones for fast API retrieval.
 */

/**
 * Process important trade signals
 *
 * Strategy:
 * 1. Find all trades in the last 90 days
 * 2. Calculate importance score for each based on multiple factors
 * 3. Filter to only "important" trades (score > threshold)
 * 4. Store results in important_trade_signals table
 */
export async function processImportantTrades(env, logger) {
  const startTime = Date.now();
  const LOOKBACK_DAYS = 7; // Reduced from 90 to 7 days for performance
  const MIN_IMPORTANCE_SCORE = 30; // Only store trades above this threshold

  try {
    logger.info("🎯 Starting important trade detection", {
      lookback_days: LOOKBACK_DAYS,
      min_score: MIN_IMPORTANCE_SCORE,
    });

    // Step 1: Mark all existing signals as potentially outdated
    await env.DB.prepare(
      `
      UPDATE important_trade_signals 
      SET is_active = FALSE
      WHERE is_active = TRUE
    `
    ).run();

    // Step 2: Find and score all trades
    // This is the complex query that was in the API - now it runs once every 30 min
    const tradesQuery = `
      SELECT 
        it.id as transaction_id,
        f.id as filing_id,
        it.transaction_date,
        it.transaction_code,
        it.acquired_disposed_code,
        it.transaction_value,
        pr.is_officer,
        pr.is_director,
        pr.is_ten_percent_owner,
        pr.officer_title,
        it.shares_transacted,
        it.shares_owned_following,
        it.direct_or_indirect,
        
        -- Calculate if it's a purchase or sale
        CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN 1 ELSE 0 END as is_purchase,
        CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN 1 ELSE 0 END as is_sale,
        
        -- Check if it's part of a cluster
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
        CAST(it.shares_transacted AS REAL) / NULLIF((it.shares_owned_following + 
          CASE WHEN it.acquired_disposed_code = 'D' THEN it.shares_transacted ELSE 0 END), 0) as pct_of_holdings,
        
        -- 10b5-1 plan flag (now stored in column, no subquery needed!)
        it.is_10b5_1_plan
        
      FROM insider_transactions it
      JOIN filings f ON it.filing_id = f.id
      JOIN person_relationships pr ON f.id = pr.filing_id
      WHERE f.status = 'completed'
        AND it.price_per_share IS NOT NULL 
        AND it.price_per_share > 0
        AND it.transaction_code != 'A' -- exclude grants/awards
        AND it.transaction_date >= date('now', '-${LOOKBACK_DAYS} days')
    `;

    const trades = await env.DB.prepare(tradesQuery).all();

    logger.info(`🔍 Found ${trades.results.length} trades to score`);

    let processedTrades = 0;
    let importantTrades = 0;

    // Step 3: Calculate scores and store important trades
    for (const trade of trades.results) {
      try {
        // Calculate importance score
        const scores = calculateImportanceScore(trade);
        const totalScore = scores.total;

        // Only store if above threshold
        if (totalScore >= MIN_IMPORTANCE_SCORE) {
          // Check if this trade signal already exists
          const existing = await env.DB.prepare(
            `
            SELECT id FROM important_trade_signals
            WHERE transaction_id = ?
          `
          )
            .bind(trade.transaction_id)
            .first();

          if (existing) {
            // Update existing
            await env.DB.prepare(
              `
              UPDATE important_trade_signals SET
                importance_score = ?,
                value_score = ?,
                direction_score = ?,
                role_score = ?,
                ownership_score = ?,
                cluster_score = ?,
                timing_score = ?,
                cluster_size = ?,
                is_purchase = ?,
                is_sale = ?,
                is_10b5_1_plan = ?,
                is_active = TRUE
              WHERE id = ?
            `
            )
              .bind(
                totalScore,
                scores.value,
                scores.direction,
                scores.role,
                scores.ownership,
                scores.cluster,
                scores.timing,
                trade.cluster_size || 0,
                trade.is_purchase,
                trade.is_sale,
                trade.is_10b5_1_plan,
                existing.id
              )
              .run();
          } else {
            // Insert new
            await env.DB.prepare(
              `
              INSERT INTO important_trade_signals (
                transaction_id, filing_id,
                importance_score, value_score, direction_score, role_score,
                ownership_score, cluster_score, timing_score,
                cluster_size, is_purchase, is_sale, is_10b5_1_plan
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            )
              .bind(
                trade.transaction_id,
                trade.filing_id,
                totalScore,
                scores.value,
                scores.direction,
                scores.role,
                scores.ownership,
                scores.cluster,
                scores.timing,
                trade.cluster_size || 0,
                trade.is_purchase,
                trade.is_sale,
                trade.is_10b5_1_plan
              )
              .run();
          }

          importantTrades++;
        }

        processedTrades++;
      } catch (error) {
        logger.error(`Failed to process trade ${trade.transaction_id}`, {
          error: error.message,
        });
      }
    }

    // Step 4: Clean up old inactive signals (keep 30 days of history)
    const cleanup = await env.DB.prepare(
      `
      DELETE FROM important_trade_signals
      WHERE is_active = FALSE
        AND detected_at < datetime('now', '-30 days')
    `
    ).run();

    const duration = Date.now() - startTime;

    const summary = {
      duration_ms: duration,
      processed: processedTrades,
      important_trades: importantTrades,
      cleaned_up: cleanup.meta.changes || 0,
    };

    logger.info("✅ Important trade processing complete", summary);

    return summary;
  } catch (error) {
    logger.error("❌ Important trade processing failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Calculate importance score for a trade
 * Returns breakdown of scores by component
 */
function calculateImportanceScore(trade) {
  const scores = {
    value: 0,
    direction: 0,
    role: 0,
    ownership: 0,
    cluster: 0,
    timing: 0,
  };

  // 1. Transaction Value Score (0-100 points)
  if (trade.transaction_value >= 10000000) {
    scores.value = 100; // $10M+
  } else if (trade.transaction_value >= 2500000) {
    scores.value = 60; // $2.5M+
  } else if (trade.transaction_value >= 1000000) {
    scores.value = 40; // $1M+
  } else if (trade.transaction_value >= 250000) {
    scores.value = 20; // $250K+
  } else {
    scores.value = 10; // Under $250K
  }

  // 2. Direction Score (±30 points)
  if (trade.is_purchase) {
    scores.direction = 30; // Buys are bullish
  } else if (trade.is_sale) {
    scores.direction = -10; // Sales are bearish
  }

  // 3. Role Score (0-30 points)
  const title = (trade.officer_title || "").toLowerCase();
  if (
    trade.is_officer &&
    (title.includes("chief executive") || title.includes("ceo"))
  ) {
    scores.role = 30; // CEO
  } else if (
    trade.is_officer &&
    (title.includes("chief financial") || title.includes("cfo"))
  ) {
    scores.role = 30; // CFO
  } else if (trade.is_officer) {
    scores.role = 15; // Other officers
  } else if (trade.is_director) {
    scores.role = 10; // Directors
  }

  // 4. Ownership Score (0-30 points)
  if (trade.pct_of_holdings >= 0.5) {
    scores.ownership = 30; // 50%+ of holdings
  } else if (trade.pct_of_holdings >= 0.25) {
    scores.ownership = 20; // 25%+ of holdings
  } else if (trade.pct_of_holdings >= 0.1) {
    scores.ownership = 10; // 10%+ of holdings
  }

  // Add bonus for 10% owners
  if (trade.is_ten_percent_owner) {
    scores.ownership += 20;
  }

  // 5. Cluster Score (0-25 points)
  if (trade.cluster_size >= 3) {
    scores.cluster = 25; // Part of large cluster
  } else if (trade.cluster_size >= 2) {
    scores.cluster = 15; // Part of small cluster
  }

  // 6. Timing/Plan Penalties (negative points)
  if (trade.direct_or_indirect === "I") {
    scores.timing = -10; // Indirect ownership less significant
  }

  if (trade.is_10b5_1_plan) {
    scores.timing -= 25; // Rule 10b5-1 plans are less meaningful
  }

  // Calculate total
  scores.total = Math.round(
    scores.value +
      scores.direction +
      scores.role +
      scores.ownership +
      scores.cluster +
      scores.timing
  );

  return scores;
}
