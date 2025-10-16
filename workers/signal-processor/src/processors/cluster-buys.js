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
  const LOOKBACK_DAYS = 14; // Increased back to 14 days to catch more clusters
  const CLUSTER_WINDOW_DAYS = 3;

  try {
    logger.info("🔍 Starting optimized cluster buy detection", {
      lookback_days: LOOKBACK_DAYS,
      cluster_window: `±${CLUSTER_WINDOW_DAYS} days`,
    });

    // Step 1: Efficient cleanup - mark existing signals as potentially outdated
    await env.DB.prepare(
      `UPDATE cluster_buy_signals SET is_active = FALSE, last_updated = datetime('now') WHERE is_active = TRUE`
    ).run();

    // Step 2: More lenient cluster detection query to avoid losing existing clusters
    const clusterQuery = `
      SELECT 
        f.issuer_id,
        it.transaction_date,
        COUNT(DISTINCT p.id) as total_insiders,
        SUM(it.shares_transacted) as total_shares,
        SUM(it.transaction_value) as total_value,
        ROUND(AVG(CASE 
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
        END), 2) as avg_role_priority,
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
      LIMIT 1000  -- Increased limit to catch more clusters
    `;

    const clusters = await env.DB.prepare(clusterQuery).all();

    logger.info(`📦 Found ${clusters.results.length} potential clusters to process`);

    let processedClusters = 0;
    let newClusters = 0;
    let updatedClusters = 0;

    // Step 3: Process clusters in optimized mega-batches to reduce API calls
    const BATCH_SIZE = 100; // Increased batch size for better efficiency
    const MAX_DB_BATCH = 50; // D1 has limits on batch size
    
    for (let i = 0; i < clusters.results.length; i += BATCH_SIZE) {
      const batch = clusters.results.slice(i, i + BATCH_SIZE);
      
      try {
        // Pre-calculate all signal strengths (CPU operation, no API calls)
        const clustersWithScores = batch.map(cluster => ({
          ...cluster,
          signalStrength: calculateSignalStrength(cluster)
        }));

        // Single query to check which clusters already exist
        const issuerDatePairs = batch.map(c => `('${c.issuer_id}', '${c.transaction_date}')`).join(',');
        const existingClusters = await env.DB.prepare(
          `
          SELECT id, issuer_id, transaction_date, signal_strength
          FROM cluster_buy_signals
          WHERE (issuer_id, transaction_date) IN (${issuerDatePairs})
        `
        ).all();

        const existingMap = new Map(
          existingClusters.results.map(e => [`${e.issuer_id}_${e.transaction_date}`, e])
        );

        // Separate updates and inserts for more efficient batching
        const updateStatements = [];
        const insertStatements = [];
        const clusterOperations = [];

        for (const cluster of clustersWithScores) {
          const key = `${cluster.issuer_id}_${cluster.transaction_date}`;
          const existing = existingMap.get(key);

          if (existing) {
            // Always update to mark as active, but only do full update if data changed significantly
            const needsFullUpdate = Math.abs(existing.signal_strength - cluster.signalStrength) > 5;
            
            if (needsFullUpdate) {
              updateStatements.push(
                env.DB.prepare(
                  `
                  UPDATE cluster_buy_signals SET
                    total_insiders = ?, total_shares = ?, total_value = ?,
                    signal_strength = ?, avg_role_priority = ?,
                    has_ceo_buy = ?, has_cfo_buy = ?, has_ten_percent_owner = ?,
                    buy_window_start = ?, buy_window_end = ?,
                    is_active = TRUE, last_updated = datetime('now')
                  WHERE id = ?
                `
                ).bind(
                  cluster.total_insiders, cluster.total_shares, cluster.total_value,
                  cluster.signalStrength, cluster.avg_role_priority,
                  cluster.has_ceo_buy, cluster.has_cfo_buy, cluster.has_ten_percent_owner,
                  cluster.buy_window_start, cluster.buy_window_end, existing.id
                )
              );
              updatedClusters++;
            } else {
              // Just mark as active without full update
              updateStatements.push(
                env.DB.prepare(
                  `UPDATE cluster_buy_signals SET is_active = TRUE, last_updated = datetime('now') WHERE id = ?`
                ).bind(existing.id)
              );
              updatedClusters++;
            }
            
            clusterOperations.push({ 
              clusterId: existing.id, 
              cluster, 
              signalStrength: cluster.signalStrength, 
              isNew: false 
            });
          } else {
            // New cluster
            insertStatements.push(
              env.DB.prepare(
                `
                INSERT INTO cluster_buy_signals (
                  issuer_id, transaction_date, total_insiders, total_shares, total_value,
                  signal_strength, avg_role_priority, has_ceo_buy, has_cfo_buy, 
                  has_ten_percent_owner, buy_window_start, buy_window_end
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `
              ).bind(
                cluster.issuer_id, cluster.transaction_date, cluster.total_insiders,
                cluster.total_shares, cluster.total_value, cluster.signalStrength,
                cluster.avg_role_priority, cluster.has_ceo_buy, cluster.has_cfo_buy,
                cluster.has_ten_percent_owner, cluster.buy_window_start, cluster.buy_window_end
              )
            );
            clusterOperations.push({ 
              clusterId: null, 
              cluster, 
              signalStrength: cluster.signalStrength, 
              isNew: true 
            });
            newClusters++;
          }
        }

        // Execute in smaller sub-batches to respect D1 limits
        const results = [];
        const allStatements = [...updateStatements, ...insertStatements];
        
        for (let j = 0; j < allStatements.length; j += MAX_DB_BATCH) {
          const subBatch = allStatements.slice(j, j + MAX_DB_BATCH);
          if (subBatch.length > 0) {
            const subResults = await env.DB.batch(subBatch);
            results.push(...subResults);
          }
        }

        // Map cluster IDs for new clusters from batch results
        let insertResultIndex = updateStatements.length; // Inserts come after updates
        for (let j = 0; j < clusterOperations.length; j++) {
          const op = clusterOperations[j];
          if (op.isNew && insertResultIndex < results.length) {
            op.clusterId = results[insertResultIndex].meta.last_row_id;
            insertResultIndex++;
          }
        }

        // Batch delete old trades for all clusters in one operation
        if (clusterOperations.length > 0) {
          const clusterIds = clusterOperations.map(op => op.clusterId).filter(id => id);
          if (clusterIds.length > 0) {
            // Use WHERE IN for more efficient deletion
            const placeholders = clusterIds.map(() => '?').join(',');
            await env.DB.prepare(`DELETE FROM cluster_buy_trades WHERE cluster_id IN (${placeholders})`)
              .bind(...clusterIds).run();
          }
        }

        // Store cluster trades in one mega-batch
        if (clusterOperations.length > 0) {
          await storeClusterTradesBatch(env, clusterOperations, CLUSTER_WINDOW_DAYS);
        }

        // Queue notifications efficiently (only for high-value clusters)
        const notificationPromises = clusterOperations
          .filter(op => op.isNew || op.signalStrength >= 75) // Increased threshold to reduce noise
          .map(op => queueClusterBuyNotifications(env, op.clusterId, logger));
        
        if (notificationPromises.length > 0) {
          // Process notifications in parallel batches of 10 to avoid overwhelming
          const NOTIFICATION_BATCH = 10;
          for (let k = 0; k < notificationPromises.length; k += NOTIFICATION_BATCH) {
            const notificationBatch = notificationPromises.slice(k, k + NOTIFICATION_BATCH);
            await Promise.all(notificationBatch);
          }
        }

        processedClusters += clusterOperations.length;

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
 * Store individual trades for multiple clusters in optimized mega-batch
 * Dramatically reduces API calls by processing all clusters together with intelligent batching
 */
async function storeClusterTradesBatch(env, clusterOperations, windowDays) {
  if (clusterOperations.length === 0) return;

  // Build optimized query using parameterized conditions to avoid SQL injection
  const conditions = [];
  const params = [];
  
  clusterOperations.forEach(op => {
    conditions.push(`(f.issuer_id = ? AND it.transaction_date BETWEEN date(?, '-${windowDays} days') AND date(?, '+${windowDays} days'))`);
    params.push(op.cluster.issuer_id, op.cluster.transaction_date, op.cluster.transaction_date);
  });

  const tradesQuery = `
    SELECT 
      f.issuer_id, it.transaction_date, it.id as transaction_id,
      p.id as person_id, p.name as person_name,
      it.shares_transacted, it.price_per_share, it.transaction_value,
      pr.is_officer, pr.is_director, pr.officer_title
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
      AND (${conditions.join(' OR ')})
    ORDER BY it.transaction_value DESC
  `;

  const allTrades = await env.DB.prepare(tradesQuery).bind(...params).all();

  if (allTrades.results.length === 0) return;

  // Pre-compute cluster date maps for faster matching
  const clusterDateMap = new Map();
  clusterOperations.forEach(op => {
    const clusterDate = new Date(op.cluster.transaction_date);
    clusterDateMap.set(op.clusterId, {
      issuer_id: op.cluster.issuer_id,
      date: clusterDate,
      windowDays: windowDays
    });
  });

  // Group trades by cluster more efficiently
  const tradesByCluster = new Map();
  
  for (const trade of allTrades.results) {
    const tradeDate = new Date(trade.transaction_date);
    
    // Find matching cluster(s) for this trade
    for (const [clusterId, clusterInfo] of clusterDateMap) {
      if (trade.issuer_id === clusterInfo.issuer_id) {
        const daysDiff = Math.abs((tradeDate - clusterInfo.date) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= clusterInfo.windowDays) {
          if (!tradesByCluster.has(clusterId)) {
            tradesByCluster.set(clusterId, []);
          }
          tradesByCluster.get(clusterId).push(trade);
          break; // Trade assigned to this cluster
        }
      }
    }
  }

  // Build all INSERT statements with intelligent batching
  const allInsertStatements = [];
  
  for (const [clusterId, trades] of tradesByCluster) {
    for (const trade of trades) {
      allInsertStatements.push(
        env.DB.prepare(
          `
          INSERT OR IGNORE INTO cluster_buy_trades (
            cluster_id, transaction_id, person_id, person_name,
            shares_transacted, price_per_share, transaction_value,
            is_officer, is_director, officer_title
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).bind(
          clusterId, trade.transaction_id, trade.person_id, trade.person_name,
          trade.shares_transacted, trade.price_per_share, trade.transaction_value,
          trade.is_officer, trade.is_director, trade.officer_title
        )
      );
    }
  }

  // Execute in optimized batches respecting D1 limits
  if (allInsertStatements.length > 0) {
    const OPTIMAL_BATCH_SIZE = 75; // Optimal size for D1 performance
    for (let i = 0; i < allInsertStatements.length; i += OPTIMAL_BATCH_SIZE) {
      const batchSlice = allInsertStatements.slice(i, i + OPTIMAL_BATCH_SIZE);
      await env.DB.batch(batchSlice);
    }
  }
}
