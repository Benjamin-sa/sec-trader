/**
 * Cluster Buy Signal Processor
 *
 * Detects and stores cluster buying activity where multiple insiders
 * purchase shares of the same company within a short time window.
 *
 * This is computationally expensive so we do it once every 30 minutes
 * instead of on every API request.
 */

import { queueClusterBuyNotifications } from '../services/notification-queue.js';

/**
 * Process cluster buy signals
 *
 * Strategy:
 * 1. Find all open market purchases in the last 90 days
 * 2. Group by issuer and transaction date (±3 day window)
 * 3. Identify clusters (2+ distinct insiders buying)
 * 4. Calculate signal strength based on multiple factors
 * 5. Store results in cluster_buy_signals table
 * 6. Store individual trades in cluster_buy_trades table
 */
export async function processClusterBuys(env, logger) {
  const startTime = Date.now();
  const LOOKBACK_DAYS = 7; // Reduced from 90 to 7 days for performance
  const CLUSTER_WINDOW_DAYS = 3;

  try {
    logger.info("🔍 Starting cluster buy detection", {
      lookback_days: LOOKBACK_DAYS,
      cluster_window: `±${CLUSTER_WINDOW_DAYS} days`,
    });

    // Step 1: Mark all existing signals as potentially outdated
    // We'll reactivate the ones we find
    await env.DB.prepare(
      `
      UPDATE cluster_buy_signals 
      SET is_active = FALSE, 
          last_updated = datetime('now')
      WHERE is_active = TRUE
    `
    ).run();

    // Step 2: Find all potential cluster buy transactions
    // This query groups purchases by issuer and finds dates with multiple buyers
    const clusterQuery = `
      SELECT 
        f.issuer_id,
        it.transaction_date,
        COUNT(DISTINCT p.id) as total_insiders,
        SUM(it.shares_transacted) as total_shares,
        SUM(it.transaction_value) as total_value,
        AVG(CASE 
          WHEN pr.is_officer = 1 AND (
            LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief executive%'
            OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%ceo%'
          ) THEN 3
          WHEN pr.is_officer = 1 AND (
            LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief financial%'
            OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%cfo%'
          ) THEN 2
          WHEN pr.is_officer = 1 THEN 1
          ELSE 0
        END) as avg_role_priority,
        MAX(CASE 
          WHEN pr.is_officer = 1 AND (
            LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief executive%'
            OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%ceo%'
          ) THEN 1 ELSE 0 
        END) as has_ceo_buy,
        MAX(CASE 
          WHEN pr.is_officer = 1 AND (
            LOWER(COALESCE(pr.officer_title, '')) LIKE '%chief financial%'
            OR LOWER(COALESCE(pr.officer_title, '')) LIKE '%cfo%'
          ) THEN 1 ELSE 0 
        END) as has_cfo_buy,
        MAX(pr.is_ten_percent_owner) as has_ten_percent_owner,
        date(it.transaction_date, '-${CLUSTER_WINDOW_DAYS} days') as buy_window_start,
        date(it.transaction_date, '+${CLUSTER_WINDOW_DAYS} days') as buy_window_end
      FROM insider_transactions it
      JOIN filings f ON it.filing_id = f.id
      JOIN person_relationships pr ON f.id = pr.filing_id
      JOIN persons p ON pr.person_id = p.id
      WHERE f.status = 'completed'
        AND it.acquired_disposed_code = 'A'
        AND it.transaction_code = 'P'
        AND it.transaction_date >= date('now', '-${LOOKBACK_DAYS} days')
        AND it.shares_transacted > 0
        AND it.price_per_share IS NOT NULL
        AND it.price_per_share > 0
      GROUP BY f.issuer_id, it.transaction_date
      HAVING COUNT(DISTINCT p.id) >= 2
      ORDER BY total_value DESC
    `;

    const clusters = await env.DB.prepare(clusterQuery).all();

    logger.info(`📦 Found ${clusters.results.length} potential clusters`);

    let processedClusters = 0;
    let newClusters = 0;
    let updatedClusters = 0;

    // Step 3: Process each cluster
    for (const cluster of clusters.results) {
      try {
        // Calculate signal strength (0-100)
        const signalStrength = calculateSignalStrength(cluster);

        // Check if this cluster already exists
        const existing = await env.DB.prepare(
          `
          SELECT id FROM cluster_buy_signals
          WHERE issuer_id = ? AND transaction_date = ?
        `
        )
          .bind(cluster.issuer_id, cluster.transaction_date)
          .first();

        let clusterId;

        if (existing) {
          // Update existing cluster
          await env.DB.prepare(
            `
            UPDATE cluster_buy_signals SET
              total_insiders = ?,
              total_shares = ?,
              total_value = ?,
              signal_strength = ?,
              avg_role_priority = ?,
              has_ceo_buy = ?,
              has_cfo_buy = ?,
              has_ten_percent_owner = ?,
              buy_window_start = ?,
              buy_window_end = ?,
              is_active = TRUE,
              last_updated = datetime('now')
            WHERE id = ?
          `
          )
            .bind(
              cluster.total_insiders,
              cluster.total_shares,
              cluster.total_value,
              signalStrength,
              cluster.avg_role_priority,
              cluster.has_ceo_buy,
              cluster.has_cfo_buy,
              cluster.has_ten_percent_owner,
              cluster.buy_window_start,
              cluster.buy_window_end,
              existing.id
            )
            .run();

          clusterId = existing.id;
          updatedClusters++;
        } else {
          // Insert new cluster
          const result = await env.DB.prepare(
            `
            INSERT INTO cluster_buy_signals (
              issuer_id, transaction_date,
              total_insiders, total_shares, total_value,
              signal_strength, avg_role_priority,
              has_ceo_buy, has_cfo_buy, has_ten_percent_owner,
              buy_window_start, buy_window_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
            .bind(
              cluster.issuer_id,
              cluster.transaction_date,
              cluster.total_insiders,
              cluster.total_shares,
              cluster.total_value,
              signalStrength,
              cluster.avg_role_priority,
              cluster.has_ceo_buy,
              cluster.has_cfo_buy,
              cluster.has_ten_percent_owner,
              cluster.buy_window_start,
              cluster.buy_window_end
            )
            .run();

          clusterId = result.meta.last_row_id;
          newClusters++;
        }

        // Step 4: Store individual trades for this cluster
        await storeClusterTrades(
          env,
          clusterId,
          cluster.issuer_id,
          cluster.transaction_date,
          CLUSTER_WINDOW_DAYS
        );

        // Step 5: Queue notifications for new or significantly updated clusters
        if (!existing || (existing && signalStrength >= 70)) {
          await queueClusterBuyNotifications(env, clusterId, logger);
        }

        processedClusters++;
      } catch (error) {
        logger.error(
          `Failed to process cluster for issuer ${cluster.issuer_id}`,
          {
            error: error.message,
            cluster,
          }
        );
      }
    }

    // Step 5: Clean up old inactive signals (older than 30 days to keep some history)
    const cleanup = await env.DB.prepare(
      `
      DELETE FROM cluster_buy_signals
      WHERE is_active = FALSE
        AND transaction_date < date('now', '-30 days')
    `
    ).run();

    const duration = Date.now() - startTime;

    const summary = {
      duration_ms: duration,
      processed: processedClusters,
      new: newClusters,
      updated: updatedClusters,
      cleaned_up: cleanup.meta.changes || 0,
    };

    logger.info("✅ Cluster buy processing complete", summary);

    return summary;
  } catch (error) {
    logger.error("❌ Cluster buy processing failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Calculate signal strength for a cluster
 * Returns a score from 0-100 based on multiple factors
 */
function calculateSignalStrength(cluster) {
  let score = 0;

  // Factor 1: Number of insiders (0-30 points)
  if (cluster.total_insiders >= 5) {
    score += 30;
  } else if (cluster.total_insiders >= 4) {
    score += 25;
  } else if (cluster.total_insiders >= 3) {
    score += 20;
  } else if (cluster.total_insiders >= 2) {
    score += 15;
  }

  // Factor 2: Total transaction value (0-25 points)
  if (cluster.total_value >= 10000000) {
    score += 25; // $10M+
  } else if (cluster.total_value >= 5000000) {
    score += 20; // $5M+
  } else if (cluster.total_value >= 2500000) {
    score += 15; // $2.5M+
  } else if (cluster.total_value >= 1000000) {
    score += 10; // $1M+
  } else if (cluster.total_value >= 250000) {
    score += 5; // $250K+
  }

  // Factor 3: Insider seniority (0-25 points)
  if (cluster.has_ceo_buy) {
    score += 15; // CEO buying is very significant
  }
  if (cluster.has_cfo_buy) {
    score += 10; // CFO buying is significant
  }
  if (cluster.avg_role_priority >= 2) {
    score += 10; // Multiple senior officers
  } else if (cluster.avg_role_priority >= 1) {
    score += 5; // Some officers
  }

  // Factor 4: 10% owner participation (0-10 points)
  if (cluster.has_ten_percent_owner) {
    score += 10;
  }

  // Factor 5: Concentration bonus (0-10 points)
  // If many insiders buying at once (same day = tight cluster)
  if (cluster.total_insiders >= 4) {
    score += 10;
  } else if (cluster.total_insiders >= 3) {
    score += 5;
  }

  // Cap at 100
  return Math.min(Math.round(score), 100);
}

/**
 * Store individual trades that make up a cluster
 */
async function storeClusterTrades(
  env,
  clusterId,
  issuerId,
  transactionDate,
  windowDays
) {
  // First, clear existing trades for this cluster
  await env.DB.prepare(
    `
    DELETE FROM cluster_buy_trades WHERE cluster_id = ?
  `
  )
    .bind(clusterId)
    .run();

  // Find all trades in the window
  const trades = await env.DB.prepare(
    `
    SELECT 
      it.id as transaction_id,
      p.id as person_id,
      p.name as person_name,
      it.shares_transacted,
      it.price_per_share,
      it.transaction_value,
      pr.is_officer,
      pr.is_director,
      pr.officer_title
    FROM insider_transactions it
    JOIN filings f ON it.filing_id = f.id
    JOIN person_relationships pr ON f.id = pr.filing_id
    JOIN persons p ON pr.person_id = p.id
    WHERE f.status = 'completed'
      AND f.issuer_id = ?
      AND it.acquired_disposed_code = 'A'
      AND it.transaction_code = 'P'
      AND it.transaction_date BETWEEN date(?, '-${windowDays} days') AND date(?, '+${windowDays} days')
      AND it.shares_transacted > 0
      AND it.price_per_share IS NOT NULL
      AND it.price_per_share > 0
    ORDER BY it.transaction_value DESC
  `
  )
    .bind(issuerId, transactionDate, transactionDate)
    .all();

  // Insert all trades
  for (const trade of trades.results) {
    await env.DB.prepare(
      `
      INSERT OR IGNORE INTO cluster_buy_trades (
        cluster_id, transaction_id, person_id,
        person_name, shares_transacted, price_per_share,
        transaction_value, is_officer, is_director, officer_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        clusterId,
        trade.transaction_id,
        trade.person_id,
        trade.person_name,
        trade.shares_transacted,
        trade.price_per_share,
        trade.transaction_value,
        trade.is_officer,
        trade.is_director,
        trade.officer_title
      )
      .run();
  }
}
