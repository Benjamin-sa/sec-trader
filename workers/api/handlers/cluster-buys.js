/**
 * Cluster buys endpoint handler
 *
 * NOW OPTIMIZED: Reads from pre-computed cluster_buy_signals table
 * Response time: <20ms (down from 200-500ms)
 */
import { validateLimit } from "../utils/validation.js";
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleClusterBuys(request, env) {
  const url = new URL(request.url);
  const daysWindow = validateLimit(url.searchParams.get("days"), 7, 30);
  const minScore = parseInt(url.searchParams.get("minScore")) || 0;

  // Simple query - just read from pre-computed signals table
  const sql = `
    SELECT 
      cbs.id as cluster_id,
      cbs.transaction_date,
      cbs.total_insiders,
      cbs.total_shares,
      cbs.total_value,
      cbs.signal_strength,
      cbs.has_ceo_buy,
      cbs.has_cfo_buy,
      cbs.has_ten_percent_owner,
      i.cik as issuer_cik,
      i.name as issuer_name,
      i.trading_symbol,
      i.sector,
      i.industry,
      cbs.detected_at
    FROM cluster_buy_signals cbs
    JOIN issuers i ON cbs.issuer_id = i.id
    WHERE cbs.is_active = TRUE
      AND cbs.transaction_date >= date('now', '-' || ? || ' days')
      AND cbs.signal_strength >= ?
    ORDER BY cbs.signal_strength DESC, cbs.total_value DESC
    LIMIT ${DEFAULT_LIMITS.CLUSTERS}
  `;

  const dbService = new DatabaseService(env.DB);
  const clusters = await dbService.executeQuery(sql, [daysWindow, minScore]);

  // Get individual trades for each cluster
  const clustersWithTrades = [];

  for (const cluster of clusters) {
    // Get trades from the cluster_buy_trades table (also pre-computed)
    const trades = await dbService.executeQuery(
      `
      SELECT 
        cbt.person_name,
        cbt.shares_transacted,
        cbt.price_per_share,
        cbt.transaction_value,
        cbt.is_officer,
        cbt.is_director,
        cbt.officer_title
      FROM cluster_buy_trades cbt
      WHERE cbt.cluster_id = ?
      ORDER BY cbt.transaction_value DESC
      `,
      [cluster.cluster_id]
    );

    clustersWithTrades.push({
      cluster_id: cluster.cluster_id,
      issuer_cik: cluster.issuer_cik,
      issuer_name: cluster.issuer_name,
      trading_symbol: cluster.trading_symbol,
      sector: cluster.sector,
      industry: cluster.industry,
      transaction_date: cluster.transaction_date,
      total_insiders: cluster.total_insiders,
      total_shares: cluster.total_shares,
      total_value: cluster.total_value,
      signal_strength: cluster.signal_strength,
      has_ceo_buy: cluster.has_ceo_buy === 1,
      has_cfo_buy: cluster.has_cfo_buy === 1,
      has_ten_percent_owner: cluster.has_ten_percent_owner === 1,
      detected_at: cluster.detected_at,
      trades: trades,
    });
  }

  return createSuccessResponse(clustersWithTrades, env, {
    query_info: {
      days_window: daysWindow,
      min_score: minScore,
      clusters_found: clustersWithTrades.length,
    },
  });
}
