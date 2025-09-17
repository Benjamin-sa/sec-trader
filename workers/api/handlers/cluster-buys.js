/**
 * Cluster buys endpoint handler
 */
import { validateLimit } from "../utils/validation.js";
import { DatabaseService } from "../utils/database.js";
import { createSuccessResponse } from "../utils/responses.js";
import { DEFAULT_LIMITS } from "../config/constants.js";

export async function handleClusterBuys(request, env) {
  const url = new URL(request.url);
  const daysWindow = validateLimit(url.searchParams.get("days"), 7, 30);

  const sql = `
    SELECT 
      i.name as issuer_name,
      i.trading_symbol,
      it.transaction_date,
      COUNT(DISTINCT p.id) as total_insiders,
      SUM(it.shares_transacted) as total_shares,
      SUM(it.transaction_value) as total_value
    FROM insider_transactions it
    JOIN filings f ON it.filing_id = f.id
    JOIN issuers i ON f.issuer_id = i.id
    JOIN person_relationships pr ON f.id = pr.filing_id
    JOIN persons p ON pr.person_id = p.id
    WHERE f.status = 'completed'
      AND it.acquired_disposed_code = 'A'
      AND it.transaction_code = 'P'
      AND it.transaction_date >= date('now', '-' || ? || ' days')
      AND it.shares_transacted > 0
    GROUP BY i.id, it.transaction_date
    HAVING COUNT(DISTINCT p.id) > 1
    ORDER BY total_value DESC
    LIMIT ${DEFAULT_LIMITS.CLUSTERS}
  `;

  const dbService = new DatabaseService(env.DB);
  const clusters = await dbService.executeQuery(sql, [daysWindow]);

  // For each cluster, get the individual trades
  const clustersWithTrades = [];

  for (const cluster of clusters) {
    const trades = await dbService.getClusterBuysForIssuer(
      cluster.issuer_name,
      cluster.transaction_date
    );

    clustersWithTrades.push({
      issuer_name: cluster.issuer_name,
      trading_symbol: cluster.trading_symbol,
      transaction_date: cluster.transaction_date,
      total_insiders: cluster.total_insiders,
      total_shares: cluster.total_shares,
      total_value: cluster.total_value,
      trades: trades,
    });
  }

  return createSuccessResponse(clustersWithTrades, env, {
    query_info: {
      days_window: daysWindow,
      clusters_found: clustersWithTrades.length,
    },
  });
}
