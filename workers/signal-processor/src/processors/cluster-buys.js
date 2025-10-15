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

    // Step 3: Process clusters in batches to reduce API calls
    const BATCH_SIZE = 50; // Process 50 clusters at a time
    
    for (let i = 0; i < clusters.results.length; i += BATCH_SIZE) {
      const batch = clusters.results.slice(i, i + BATCH_SIZE);
      
      try {
        // First, check which clusters already exist (single query)
        const issuerDatePairs = batch.map(c => `('${c.issuer_id}', '${c.transaction_date}')`).join(',');
        const existingClusters = await env.DB.prepare(
          `
          SELECT id, issuer_id, transaction_date 
          FROM cluster_buy_signals
          WHERE (issuer_id, transaction_date) IN (${issuerDatePairs})
        `
        ).all();

        const existingMap = new Map(
          existingClusters.results.map(e => [`${e.issuer_id}_${e.transaction_date}`, e.id])
        );

        // Prepare batch statements for updates and inserts
        const statements = [];
        const clusterOperations = []; // Track what we're doing for each cluster

        for (const cluster of batch) {
          const signalStrength = calculateSignalStrength(cluster);
          const key = `${cluster.issuer_id}_${cluster.transaction_date}`;
          const existingId = existingMap.get(key);

          if (existingId) {
            // Update existing cluster
            statements.push(
              env.DB.prepare(
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
              ).bind(
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
                existingId
              )
            );
            clusterOperations.push({ 
              clusterId: existingId, 
              cluster, 
              signalStrength, 
              isNew: false 
            });
            updatedClusters++;
          } else {
            // Insert new cluster
            statements.push(
              env.DB.prepare(
                `
                INSERT INTO cluster_buy_signals (
                  issuer_id, transaction_date,
                  total_insiders, total_shares, total_value,
                  signal_strength, avg_role_priority,
                  has_ceo_buy, has_cfo_buy, has_ten_percent_owner,
                  buy_window_start, buy_window_end
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `
              ).bind(
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
            );
            clusterOperations.push({ 
              clusterId: null, // Will be determined after insert
              cluster, 
              signalStrength, 
              isNew: true 
            });
            newClusters++;
          }
        }

        // Execute all updates/inserts in a single batch
        const results = await env.DB.batch(statements);

        // Step 4: Prepare cluster operations with IDs
        // For new clusters, get their IDs from the batch results
        for (let j = 0; j < clusterOperations.length; j++) {
          const op = clusterOperations[j];
          
          if (op.isNew) {
            // Get the ID from the batch result
            op.clusterId = results[j].meta.last_row_id;
          }
        }

        // Step 5: Batch delete old trades for all clusters
        const deleteStatements = clusterOperations.map(op =>
          env.DB.prepare('DELETE FROM cluster_buy_trades WHERE cluster_id = ?').bind(op.clusterId)
        );
        await env.DB.batch(deleteStatements);

        // Step 6: Batch fetch all trades for all clusters in this batch
        await storeClusterTradesBatch(env, clusterOperations, CLUSTER_WINDOW_DAYS);

        // Step 7: Queue notifications for new or significantly updated clusters
        const notificationPromises = [];
        for (const op of clusterOperations) {
          if (op.isNew || op.signalStrength >= 70) {
            notificationPromises.push(queueClusterBuyNotifications(env, op.clusterId, logger));
          }
          processedClusters++;
        }
        
        // Execute all notifications in parallel (they're independent)
        if (notificationPromises.length > 0) {
          await Promise.all(notificationPromises);
        }

      } catch (error) {
        logger.error(
          `Failed to process batch starting at index ${i}`,
          {
            error: error.message,
            stack: error.stack,
          }
        );
        // Continue with next batch instead of failing entirely
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
 * Store individual trades for multiple clusters in batch
 * This dramatically reduces API calls by processing all clusters together
 */
async function storeClusterTradesBatch(env, clusterOperations, windowDays) {
  if (clusterOperations.length === 0) return;

  // Build a single query to fetch trades for ALL clusters at once
  const conditions = clusterOperations.map(op => 
    `(f.issuer_id = '${op.cluster.issuer_id}' AND it.transaction_date BETWEEN date('${op.cluster.transaction_date}', '-${windowDays} days') AND date('${op.cluster.transaction_date}', '+${windowDays} days'))`
  ).join(' OR ');

  const tradesQuery = `
    SELECT 
      f.issuer_id,
      it.transaction_date,
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
      AND it.acquired_disposed_code = 'A'
      AND it.transaction_code = 'P'
      AND it.shares_transacted > 0
      AND it.price_per_share IS NOT NULL
      AND it.price_per_share > 0
      AND (${conditions})
    ORDER BY it.transaction_value DESC
  `;

  const allTrades = await env.DB.prepare(tradesQuery).all();

  if (allTrades.results.length === 0) return;

  // Group trades by cluster
  const tradesByCluster = new Map();
  
  for (const trade of allTrades.results) {
    // Find which cluster this trade belongs to
    for (const op of clusterOperations) {
      if (trade.issuer_id === op.cluster.issuer_id) {
        // Check if trade is within the window
        const tradeDate = new Date(trade.transaction_date);
        const clusterDate = new Date(op.cluster.transaction_date);
        const daysDiff = Math.abs((tradeDate - clusterDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= windowDays) {
          if (!tradesByCluster.has(op.clusterId)) {
            tradesByCluster.set(op.clusterId, []);
          }
          tradesByCluster.get(op.clusterId).push(trade);
          break; // Trade assigned to this cluster
        }
      }
    }
  }

  // Build all INSERT statements for all trades across all clusters
  const insertStatements = [];
  
  for (const [clusterId, trades] of tradesByCluster) {
    for (const trade of trades) {
      insertStatements.push(
        env.DB.prepare(
          `
          INSERT OR IGNORE INTO cluster_buy_trades (
            cluster_id, transaction_id, person_id,
            person_name, shares_transacted, price_per_share,
            transaction_value, is_officer, is_director, officer_title
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).bind(
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
      );
    }
  }

  // Execute all inserts in one batch (or multiple if needed due to size limits)
  if (insertStatements.length > 0) {
    // D1 batch limit is typically around 100 statements
    const MAX_BATCH_SIZE = 100;
    for (let i = 0; i < insertStatements.length; i += MAX_BATCH_SIZE) {
      const batchSlice = insertStatements.slice(i, i + MAX_BATCH_SIZE);
      await env.DB.batch(batchSlice);
    }
  }
}
