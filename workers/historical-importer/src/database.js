/**
 * Database utilities for tracking import status
 */

/**
 * Check if a filing has already been processed
 */
export async function isFilingAlreadyProcessed(accessionNumber, db) {
  const result = await db
    .prepare(
      "SELECT id, status FROM processed_filings WHERE accession_number = ?"
    )
    .bind(accessionNumber)
    .first();

  return result !== null;
}

/**
 * Mark a filing as queued for processing
 */
export async function markFilingAsQueued(accessionNumber, cik, db) {
  try {
    await db
      .prepare(
        `
        INSERT INTO processed_filings (accession_number, cik, queued_at, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, 'queued')
        ON CONFLICT(accession_number) DO UPDATE SET
          queued_at = CURRENT_TIMESTAMP,
          status = 'queued'
      `
      )
      .bind(accessionNumber, cik)
      .run();
  } catch (error) {
    console.error("Error marking filing as queued:", error);
    throw error;
  }
}

/**
 * Get import status for a CIK
 * Returns counts of filings by status
 */
export async function getImportStatus(cik, db) {
  try {
    // Get status breakdown
    const statusQuery = await db
      .prepare(
        `
        SELECT 
          status,
          COUNT(*) as count
        FROM processed_filings
        WHERE cik = ?
        GROUP BY status
      `
      )
      .bind(cik)
      .all();

    const statusCounts = {
      queued: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    if (statusQuery.results) {
      for (const row of statusQuery.results) {
        statusCounts[row.status] = row.count;
        statusCounts.total += row.count;
      }
    }

    // Get most recent filing date
    const recentQuery = await db
      .prepare(
        `
        SELECT 
          accession_number,
          queued_at,
          completed_at,
          status
        FROM processed_filings
        WHERE cik = ?
        ORDER BY queued_at DESC
        LIMIT 1
      `
      )
      .bind(cik)
      .first();

    return {
      ...statusCounts,
      lastFiling: recentQuery
        ? {
            accessionNumber: recentQuery.accession_number,
            queuedAt: recentQuery.queued_at,
            completedAt: recentQuery.completed_at,
            status: recentQuery.status,
          }
        : null,
    };
  } catch (error) {
    console.error("Error getting import status:", error);
    throw error;
  }
}

/**
 * Get list of recent filings for a CIK
 */
export async function getRecentFilings(cik, limit = 10, db) {
  try {
    const result = await db
      .prepare(
        `
        SELECT 
          accession_number,
          queued_at,
          completed_at,
          status
        FROM processed_filings
        WHERE cik = ?
        ORDER BY queued_at DESC
        LIMIT ?
      `
      )
      .bind(cik, limit)
      .all();

    return result.results || [];
  } catch (error) {
    console.error("Error getting recent filings:", error);
    throw error;
  }
}

/**
 * Mark a person's history as imported
 */
export async function markPersonHistoryImported(cik, personName, db) {
  try {
    await db
      .prepare(
        `
        INSERT INTO persons (cik, name, history_imported, updated_at)
        VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT(cik) DO UPDATE SET
          history_imported = TRUE,
          updated_at = CURRENT_TIMESTAMP
      `
      )
      .bind(cik, personName || "Unknown")
      .run();

    console.log(`Marked history as imported for CIK: ${cik}`);
  } catch (error) {
    console.error("Error marking person history as imported:", error);
    // Don't throw - this is not critical
  }
}

/**
 * Check if a person's history has been imported
 */
export async function isPersonHistoryImported(cik, db) {
  try {
    const result = await db
      .prepare("SELECT history_imported FROM persons WHERE cik = ?")
      .bind(cik)
      .first();

    return result ? result.history_imported === 1 : false;
  } catch (error) {
    console.error("Error checking person history:", error);
    return false;
  }
}
