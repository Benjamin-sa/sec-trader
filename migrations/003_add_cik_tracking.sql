-- Migration 003: Add CIK tracking to processed_filings
-- This enables the historical-importer to track imports by company

-- Add CIK column to processed_filings table
ALTER TABLE processed_filings ADD COLUMN cik TEXT;

-- Add completed_at timestamp for tracking when processing finished
ALTER TABLE processed_filings ADD COLUMN completed_at DATETIME;

-- Create index for CIK lookups (for status queries)
CREATE INDEX IF NOT EXISTS idx_processed_filings_cik ON processed_filings(cik);

-- Create composite index for CIK + status queries
CREATE INDEX IF NOT EXISTS idx_processed_filings_cik_status ON processed_filings(cik, status);

-- Update the schema_migrations table
INSERT INTO schema_migrations (version, description) 
VALUES ('003_add_cik_tracking', 'Add CIK tracking to processed_filings for historical imports');
