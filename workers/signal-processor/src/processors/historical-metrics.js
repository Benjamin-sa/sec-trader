/**
 * Historical Metrics Processor
 *
 * Aggregates daily metrics for trend analysis and charts
 */

/**
 * Process historical metrics
 * Updates signal_history table with daily aggregated stats
 */
export async function processHistoricalMetrics(env, logger) {
  const startTime = Date.now();

  try {
    logger.info("📊 Starting historical metrics calculation");

    // Calculate metrics for the last 90 days
    const LOOKBACK_DAYS = 90;

    let updatedDays = 0;
    let newDays = 0;

    // Use a single large query with CTEs to calculate all metrics at once
    const metricsQuery = `
      WITH date_series AS (
        SELECT date('now', '-' || value || ' days') as target_date
        FROM (
          WITH RECURSIVE cnt(x) AS (
            SELECT 0
            UNION ALL
            SELECT x+1 FROM cnt
            LIMIT ${LOOKBACK_DAYS}
          )
          SELECT x as value FROM cnt
        )
      ),
      cluster_metrics AS (
        SELECT 
          transaction_date as date,
          COUNT(*) as cluster_buys_count,
          AVG(total_insiders) as avg_cluster_size,
          MAX(total_insiders) as max_cluster_size,
          SUM(total_value) as total_cluster_value
        FROM cluster_buy_signals
        WHERE is_active = TRUE
          AND transaction_date >= date('now', '-${LOOKBACK_DAYS} days')
        GROUP BY transaction_date
      ),
      insider_activity AS (
        SELECT 
          it.transaction_date as date,
          COUNT(CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN 1 END) as total_insider_buys,
          COUNT(CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN 1 END) as total_insider_sells,
          SUM(CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN it.transaction_value ELSE 0 END) as total_buy_value,
          SUM(CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN it.transaction_value ELSE 0 END) as total_sell_value
        FROM insider_transactions it
        JOIN filings f ON it.filing_id = f.id
        WHERE f.status = 'completed'
          AND it.transaction_date >= date('now', '-${LOOKBACK_DAYS} days')
          AND it.price_per_share IS NOT NULL
          AND it.price_per_share > 0
        GROUP BY it.transaction_date
      ),
      important_trades AS (
        SELECT 
          it.transaction_date as date,
          COUNT(*) as important_trades_count,
          AVG(its.importance_score) as avg_importance_score
        FROM important_trade_signals its
        JOIN insider_transactions it ON its.transaction_id = it.id
        WHERE its.is_active = TRUE
          AND it.transaction_date >= date('now', '-${LOOKBACK_DAYS} days')
        GROUP BY it.transaction_date
      )
      SELECT 
        ds.target_date as date,
        COALESCE(cm.cluster_buys_count, 0) as cluster_buys_count,
        COALESCE(cm.avg_cluster_size, 0) as avg_cluster_size,
        COALESCE(cm.max_cluster_size, 0) as max_cluster_size,
        COALESCE(cm.total_cluster_value, 0) as total_cluster_value,
        COALESCE(ia.total_insider_buys, 0) as total_insider_buys,
        COALESCE(ia.total_insider_sells, 0) as total_insider_sells,
        COALESCE(ia.total_buy_value, 0) as total_buy_value,
        COALESCE(ia.total_sell_value, 0) as total_sell_value,
        CASE 
          WHEN COALESCE(ia.total_sell_value, 0) > 0 
          THEN COALESCE(ia.total_buy_value, 0) / ia.total_sell_value
          WHEN COALESCE(ia.total_buy_value, 0) > 0 
          THEN 999
          ELSE 0
        END as buy_sell_ratio,
        0 as first_buys_count,
        COALESCE(imt.important_trades_count, 0) as important_trades_count,
        COALESCE(imt.avg_importance_score, 0) as avg_importance_score
      FROM date_series ds
      LEFT JOIN cluster_metrics cm ON ds.target_date = cm.date
      LEFT JOIN insider_activity ia ON ds.target_date = ia.date
      LEFT JOIN important_trades imt ON ds.target_date = imt.date
      ORDER BY ds.target_date DESC
    `;

    // Get all metrics in one query
    const metrics = await env.DB.prepare(metricsQuery).all();

    // Check which dates already exist in signal_history
    const existingDates = await env.DB.prepare(
      `
      SELECT date, id 
      FROM signal_history 
      WHERE date >= date('now', '-${LOOKBACK_DAYS} days')
    `
    ).all();

    const existingMap = new Map(
      existingDates.results.map(e => [e.date, e.id])
    );

    // Batch upsert all metrics
    const BATCH_SIZE = 100;
    for (let i = 0; i < metrics.results.length; i += BATCH_SIZE) {
      const batch = metrics.results.slice(i, i + BATCH_SIZE);
      const statements = [];

      for (const metric of batch) {
        const existingId = existingMap.get(metric.date);

        if (existingId) {
          // Update existing record
          statements.push(
            env.DB.prepare(
              `
              UPDATE signal_history SET
                cluster_buys_count = ?,
                avg_cluster_size = ?,
                max_cluster_size = ?,
                total_cluster_value = ?,
                total_insider_buys = ?,
                total_insider_sells = ?,
                total_buy_value = ?,
                total_sell_value = ?,
                buy_sell_ratio = ?,
                first_buys_count = ?,
                important_trades_count = ?,
                avg_importance_score = ?,
                calculated_at = datetime('now')
              WHERE id = ?
            `
            ).bind(
              metric.cluster_buys_count,
              metric.avg_cluster_size,
              metric.max_cluster_size,
              metric.total_cluster_value,
              metric.total_insider_buys,
              metric.total_insider_sells,
              metric.total_buy_value,
              metric.total_sell_value,
              metric.buy_sell_ratio,
              metric.first_buys_count,
              metric.important_trades_count,
              metric.avg_importance_score,
              existingId
            )
          );
          updatedDays++;
        } else {
          // Insert new record
          statements.push(
            env.DB.prepare(
              `
              INSERT INTO signal_history (
                date,
                cluster_buys_count, avg_cluster_size, max_cluster_size, total_cluster_value,
                total_insider_buys, total_insider_sells,
                total_buy_value, total_sell_value, buy_sell_ratio,
                first_buys_count, important_trades_count, avg_importance_score
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            ).bind(
              metric.date,
              metric.cluster_buys_count,
              metric.avg_cluster_size,
              metric.max_cluster_size,
              metric.total_cluster_value,
              metric.total_insider_buys,
              metric.total_insider_sells,
              metric.total_buy_value,
              metric.total_sell_value,
              metric.buy_sell_ratio,
              metric.first_buys_count,
              metric.important_trades_count,
              metric.avg_importance_score
            )
          );
          newDays++;
        }
      }

      // Execute batch
      try {
        await env.DB.batch(statements);
      } catch (error) {
        logger.error(`Failed to process metrics batch starting at index ${i}`, {
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    const summary = {
      duration_ms: duration,
      days_processed: LOOKBACK_DAYS,
      updated: updatedDays,
      new: newDays,
    };

    logger.info("✅ Historical metrics processing complete", summary);

    return summary;
  } catch (error) {
    logger.error("❌ Historical metrics processing failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Process issuer-specific metrics
 * This can be added later for company-specific trend analysis
 */
export async function processIssuerMetrics(env, logger, issuerIds = null) {
  // TODO: Implement per-issuer metrics calculation
  // Useful for company pages showing historical insider activity
  logger.info("Issuer metrics processing not yet implemented");
  return { status: "skipped" };
}
