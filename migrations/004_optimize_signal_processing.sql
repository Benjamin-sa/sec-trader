-- Migration 004: Optimize Signal Processing Performance
-- This migration adds strategic indexes to dramatically reduce query time
-- Expected impact: 70-80% reduction in reads for signal processor queries

-- 1. Composite index for the main signal processing query
-- Covers: transaction_date filter, transaction_code filter, and price_per_share checks
CREATE INDEX IF NOT EXISTS idx_insider_transactions_signal_processing 
ON insider_transactions(transaction_date DESC, transaction_code, acquired_disposed_code, price_per_share)
WHERE price_per_share IS NOT NULL AND price_per_share > 0 AND transaction_code != 'A';

-- 2. Index for cluster detection subquery (the most expensive part)
-- This index specifically optimizes the correlated subquery that counts cluster participants
CREATE INDEX IF NOT EXISTS idx_transactions_cluster_detection
ON insider_transactions(filing_id, transaction_date, acquired_disposed_code, transaction_code)
WHERE acquired_disposed_code = 'A' AND transaction_code = 'P' AND price_per_share IS NOT NULL AND price_per_share > 0;

-- 3. Index for filing status and issuer lookup
-- Speeds up joins to filings table with status='completed' filter
CREATE INDEX IF NOT EXISTS idx_filings_issuer_status
ON filings(issuer_id, status, id)
WHERE status = 'completed';

-- 4. Index for transaction date range queries
-- Helps with the date window searches in cluster detection
CREATE INDEX IF NOT EXISTS idx_insider_transactions_date_range
ON insider_transactions(transaction_date, filing_id);

-- 5. Index for person relationships lookup
-- Speeds up the joins to get insider roles
CREATE INDEX IF NOT EXISTS idx_person_relationships_filing
ON person_relationships(filing_id, person_id, is_officer, is_director, is_ten_percent_owner);

-- 6. Index for issuer-based queries in cluster detection
CREATE INDEX IF NOT EXISTS idx_filings_issuer_id
ON filings(issuer_id, id)
WHERE status = 'completed';

-- Analyze tables to update query planner statistics
ANALYZE insider_transactions;
ANALYZE filings;
ANALYZE person_relationships;
