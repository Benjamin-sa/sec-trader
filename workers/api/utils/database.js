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

  async getLatestTrades(whereClause, params, limit) {
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
      LIMIT ?
    `;

    return this.executeQuery(sql, [...params, limit]);
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
