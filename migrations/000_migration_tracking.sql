-- Migration tracking table
-- This table keeps track of which migrations have been applied
-- to prevent running the same migration twice

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  checksum TEXT
);

-- Insert initial migration record if this is the first time
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('001_initial_schema', 'Initial database schema creation');
