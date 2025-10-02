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

    // Generate a list of dates to process (last 90 days)
    const dates = [];
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      dates.push(`date('now', '-${i} days')`);
    }

    // Process each date
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      const dateOffset = i;

      try {
        // Get the date value
        const dateResult = await env.DB.prepare(
          `
          SELECT date('now', '-${dateOffset} days') as date
        `
        ).first();

        const targetDate = dateResult.date;

        // Calculate cluster metrics for this date
        const clusterMetrics = await env.DB.prepare(
          `
          SELECT 
            COUNT(*) as cluster_buys_count,
            AVG(total_insiders) as avg_cluster_size,
            MAX(total_insiders) as max_cluster_size,
            SUM(total_value) as total_cluster_value
          FROM cluster_buy_signals
          WHERE transaction_date = ?
            AND is_active = TRUE
        `
        )
          .bind(targetDate)
          .first();

        // Calculate overall insider activity for this date
        const insiderActivity = await env.DB.prepare(
          `
          SELECT 
            COUNT(CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN 1 END) as total_insider_buys,
            COUNT(CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN 1 END) as total_insider_sells,
            SUM(CASE WHEN it.acquired_disposed_code = 'A' AND it.transaction_code = 'P' THEN it.transaction_value ELSE 0 END) as total_buy_value,
            SUM(CASE WHEN it.acquired_disposed_code = 'D' AND it.transaction_code = 'S' THEN it.transaction_value ELSE 0 END) as total_sell_value
          FROM insider_transactions it
          JOIN filings f ON it.filing_id = f.id
          WHERE f.status = 'completed'
            AND it.transaction_date = ?
            AND it.price_per_share IS NOT NULL
            AND it.price_per_share > 0
        `
        )
          .bind(targetDate)
          .first();

        // Calculate buy/sell ratio
        const buyValue = insiderActivity.total_buy_value || 0;
        const sellValue = insiderActivity.total_sell_value || 0;
        const buySellRatio =
          sellValue > 0 ? buyValue / sellValue : buyValue > 0 ? 999 : 0;

        // Count first buys for this date
        const firstBuysCount = await env.DB.prepare(
          `
          SELECT COUNT(*) as count
          FROM first_buy_signals fbs
          JOIN insider_transactions it ON fbs.transaction_id = it.id
          WHERE it.transaction_date = ?
            AND fbs.is_active = TRUE
        `
        )
          .bind(targetDate)
          .first();

        // Count important trades for this date
        const importantTrades = await env.DB.prepare(
          `
          SELECT 
            COUNT(*) as count,
            AVG(importance_score) as avg_score
          FROM important_trade_signals its
          JOIN insider_transactions it ON its.transaction_id = it.id
          WHERE it.transaction_date = ?
            AND its.is_active = TRUE
        `
        )
          .bind(targetDate)
          .first();

        // Check if record exists
        const existing = await env.DB.prepare(
          `
          SELECT id FROM signal_history WHERE date = ?
        `
        )
          .bind(targetDate)
          .first();

        if (existing) {
          // Update existing record
          await env.DB.prepare(
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
          )
            .bind(
              clusterMetrics.cluster_buys_count || 0,
              clusterMetrics.avg_cluster_size || 0,
              clusterMetrics.max_cluster_size || 0,
              clusterMetrics.total_cluster_value || 0,
              insiderActivity.total_insider_buys || 0,
              insiderActivity.total_insider_sells || 0,
              buyValue,
              sellValue,
              buySellRatio,
              firstBuysCount.count || 0,
              importantTrades.count || 0,
              importantTrades.avg_score || 0,
              existing.id
            )
            .run();

          updatedDays++;
        } else {
          // Insert new record
          await env.DB.prepare(
            `
            INSERT INTO signal_history (
              date,
              cluster_buys_count, avg_cluster_size, max_cluster_size, total_cluster_value,
              total_insider_buys, total_insider_sells,
              total_buy_value, total_sell_value, buy_sell_ratio,
              first_buys_count, important_trades_count, avg_importance_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
            .bind(
              targetDate,
              clusterMetrics.cluster_buys_count || 0,
              clusterMetrics.avg_cluster_size || 0,
              clusterMetrics.max_cluster_size || 0,
              clusterMetrics.total_cluster_value || 0,
              insiderActivity.total_insider_buys || 0,
              insiderActivity.total_insider_sells || 0,
              buyValue,
              sellValue,
              buySellRatio,
              firstBuysCount.count || 0,
              importantTrades.count || 0,
              importantTrades.avg_score || 0
            )
            .run();

          newDays++;
        }
      } catch (error) {
        logger.error(`Failed to process metrics for day offset ${dateOffset}`, {
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
