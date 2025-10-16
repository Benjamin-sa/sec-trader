/**
 * Database utilities for common database operations
 */

export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  async executeQuery(sql, params = []) {
    console.log("Executing SQL:", sql);
    console.log("With params:", params);

    try {
      const result = await this.db
        .prepare(sql)
        .bind(...params)
        .all();
      console.log("Query returned:", result.results?.length || 0, "results");
      return result.results || [];
    } catch (error) {
      console.error("Database query error:", error);
      console.error("SQL:", sql);
      console.error("Params:", params);
      throw error;
    }
  }

  async getLatestTrades(whereClause, params, limit, offset = 0) {
    const sql = `
      SELECT 
        accession_number,
        filed_at,
        form_type,
        issuer_cik,
        issuer_name,
        trading_symbol,
        person_cik,
        person_name,
        is_director,
        is_officer,
        officer_title,
        is_ten_percent_owner,
        transaction_date,
        security_title,
        transaction_code,
        transaction_description,
        acquired_disposed_code,
        shares_transacted,
        price_per_share,
        transaction_value,
        shares_owned_following,
        direct_or_indirect
      FROM vw_insider_trades_detailed
      ${whereClause}
      ORDER BY filed_at DESC, transaction_date DESC
      LIMIT ? OFFSET ?
    `;

    return this.executeQuery(sql, [...params, limit, offset]);
  }

  async getLatestTradesCount(whereClause, params, hasFilters = false) {
    // For unfiltered queries, use sqlite_sequence for instant count
    if (!hasFilters) {
      console.log("No filters applied, using sqlite_sequence for instant count");
      
      const sequenceResult = await this.executeQuery(`
        SELECT seq FROM sqlite_sequence WHERE name = 'insider_transactions'
      `);
      
      return sequenceResult[0]?.seq || 0;
    }
    
    // For filtered queries, we need the accurate count of matching records
    const sql = `
      SELECT COUNT(*) as total_count
      FROM vw_insider_trades_detailed
      ${whereClause}
    `;

    const result = await this.executeQuery(sql, params);
    return result[0]?.total_count || 0;
  }

  async getClusterBuysForIssuer(issuerName, transactionDate) {
    const sql = `
      SELECT 
        f.accession_number,
        f.filed_at,
        p.cik as person_cik,
        p.name as person_name,
        pr.is_director,
        pr.is_officer,
        pr.officer_title,
        it.shares_transacted,
        it.price_per_share,
        it.transaction_value
      FROM insider_transactions it
      JOIN filings f ON it.filing_id = f.id
      JOIN issuers i ON f.issuer_id = i.id
      JOIN person_relationships pr ON f.id = pr.filing_id
      JOIN persons p ON pr.person_id = p.id
      WHERE i.name = ?
        AND it.transaction_date = ?
        AND it.acquired_disposed_code = 'A'
        AND it.transaction_code = 'P'
        AND f.status = 'completed'
      ORDER BY it.transaction_value DESC
    `;

    return this.executeQuery(sql, [issuerName, transactionDate]);
  }
}
