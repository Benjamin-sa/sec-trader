-- #############################################################################
-- # INITIAL SEC FILING DATABASE SCHEMA
-- # This file is for FRESH database creation only - never run on existing data!
-- # Optimized for Performance, Data Integrity, and SaaS applications.
-- # Dialect: SQLite (easily adaptable to PostgreSQL/MySQL)
-- #############################################################################

-- -----------------------------------------------------------------------------
-- SETUP & LOOKUP TABLES
-- -----------------------------------------------------------------------------

-- Drop existing objects in reverse order of dependency (ONLY for fresh installs!)
DROP VIEW IF EXISTS vw_insider_trades_detailed;
DROP TABLE IF EXISTS transaction_footnotes;
DROP TABLE IF EXISTS footnotes;
DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS key_events;
DROP TABLE IF EXISTS financial_metrics;
DROP TABLE IF EXISTS filing_content;
DROP TABLE IF EXISTS insider_transactions;
DROP TABLE IF EXISTS person_relationships;
DROP TABLE IF EXISTS filings;
DROP TABLE IF EXISTS processed_filings;
DROP TABLE IF EXISTS persons;
DROP TABLE IF EXISTS issuers;
DROP TABLE IF EXISTS transaction_codes;
DROP TABLE IF EXISTS filing_types;
DROP TABLE IF EXISTS insider_ratings;

-- Self-documenting lookup table for filing types
CREATE TABLE filing_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_code TEXT UNIQUE NOT NULL,       -- "4", "3", "10-K", etc.
  type_name TEXT NOT NULL,              -- "Statement of Changes in Beneficial Ownership"
  category TEXT NOT NULL,               -- "insider_trading", "corporate_finance"
  description TEXT
);

INSERT OR IGNORE INTO filing_types (type_code, type_name, category, description) VALUES
('3', 'Initial Statement of Ownership', 'insider_trading', 'First disclosure of an insider''s holdings.'),
('4', 'Statement of Changes in Ownership', 'insider_trading', 'Report of a transaction (buy/sell) by an insider.'),
('5', 'Annual Statement of Changes', 'insider_trading', 'Annual report of transactions not required on a Form 4.'),
('10-K', 'Annual Report', 'corporate_finance', 'Comprehensive summary of a company''s financial performance.'),
('10-Q', 'Quarterly Report', 'corporate_finance', 'Quarterly financial report.'),
('8-K', 'Current Report', 'corporate_finance', 'Report of unscheduled material events or corporate changes.'),
('DEF 14A', 'Proxy Statement', 'corporate_finance', 'Materials for shareholder voting.');

-- Self-documenting lookup table for insider transaction codes
CREATE TABLE transaction_codes (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT -- e.g., 'Open Market', 'Award', 'Exercise'
);

INSERT OR IGNORE INTO transaction_codes (code, description, category) VALUES
('P', 'Open market or private purchase of securities', 'Open Market'),
('S', 'Open market or private sale of securities', 'Open Market'),
('A', 'Grant, award, or other acquisition', 'Award'),
('D', 'Disposition to the issuer', 'Issuer'),
('F', 'Payment of exercise price or tax liability by delivering or withholding securities', 'Issuer'),
('I', 'Discretionary transaction', 'Other'),
('M', 'Exercise or conversion of derivative security', 'Exercise'),
('G', 'Bona fide gift', 'Other'),
('J', 'Other acquisition', 'Other'),
('K', 'Transaction in equity swap or similar instrument', 'Other'),
('C', 'Conversion of derivative security', 'Exercise'),
('E', 'Expiration of short derivative position', 'Exercise'),
('H', 'Expiration of long derivative position', 'Exercise'),
('O', 'Exercise of out-of-the-money derivative security', 'Exercise'),
('X', 'Exercise of in-the-money or at-the-money derivative security', 'Exercise'),
('V', 'Transaction voluntarily reported earlier than required', 'Other');

-- -----------------------------------------------------------------------------
-- CORE ENTITY TABLES
-- -----------------------------------------------------------------------------

-- Simple tracking table for RSS monitor to avoid duplicate processing
CREATE TABLE processed_filings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accession_number TEXT UNIQUE NOT NULL,
  queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'queued',         -- "queued", "processing", "completed", "failed"
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Issuers (Companies)
CREATE TABLE issuers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cik TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  trading_symbol TEXT,
  sector TEXT,                          -- Enriched data, e.g., "Technology"
  industry TEXT,                        -- Enriched data, e.g., "Software - Infrastructure"
  sic_code TEXT,
  business_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Persons (Reporting Owners)
CREATE TABLE persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cik TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  history_imported BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Central Filings Table (The Hub)
CREATE TABLE filings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accession_number TEXT UNIQUE NOT NULL,
  filing_url TEXT NOT NULL,
  filed_at DATETIME NOT NULL,           -- Use DATETIME for proper queries
  period_of_report DATE,                -- Use DATE for the specific period
  
  filing_type_id INTEGER NOT NULL REFERENCES filing_types(id),
  issuer_id INTEGER NOT NULL REFERENCES issuers(id),

  -- Amendment tracking
  is_amendment BOOLEAN DEFAULT FALSE,
  amends_accession_number TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "processing", "completed", "failed"
  processed_at DATETIME,
  error_message TEXT,
  raw_xml TEXT,                         -- Store raw XML for re-processing
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- RELATIONSHIP & DATA TABLES
-- -----------------------------------------------------------------------------

-- Defines who the reporting owner is for a given filing and their role
CREATE TABLE person_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_id INTEGER NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id),
  is_director BOOLEAN DEFAULT FALSE,
  is_officer BOOLEAN DEFAULT FALSE,
  is_ten_percent_owner BOOLEAN DEFAULT FALSE,
  is_other BOOLEAN DEFAULT FALSE,
  officer_title TEXT,
  UNIQUE(filing_id, person_id) -- A person can only be one entity per filing
);

-- Insider Transactions (Form 4/5 specific data)
CREATE TABLE insider_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_id INTEGER NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  
  -- Security Details
  security_title TEXT NOT NULL,
  transaction_type TEXT NOT NULL,       -- "non_derivative" or "derivative"
  
  -- Transaction Details
  transaction_code TEXT NOT NULL REFERENCES transaction_codes(code),
  shares_transacted REAL,
  price_per_share REAL,
  acquired_disposed_code TEXT NOT NULL, -- "A" (Acquired) or "D" (Disposed)
  
  -- Calculated Value
  transaction_value REAL,               -- shares_transacted * price_per_share
  
  -- Post-Transaction State
  shares_owned_following REAL NOT NULL,
  direct_or_indirect TEXT NOT NULL,     -- "D" (Direct) or "I" (Indirect)
  nature_of_ownership TEXT
);

-- Footnotes with links to specific transactions
CREATE TABLE footnotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_id INTEGER NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  footnote_id_in_xml TEXT NOT NULL,      -- "F1", "F2", etc.
  footnote_text TEXT NOT NULL,
  UNIQUE(filing_id, footnote_id_in_xml)
);

CREATE TABLE transaction_footnotes (
  transaction_id INTEGER NOT NULL REFERENCES insider_transactions(id) ON DELETE CASCADE,
  footnote_id INTEGER NOT NULL REFERENCES footnotes(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, footnote_id)
);

-- Signatures table (for Form 4 signature information)
CREATE TABLE signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filing_id INTEGER NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  signature_name TEXT NOT NULL,
  signature_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insider Ratings (Alpha Score analytics)
CREATE TABLE insider_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  rating_score REAL,                    -- Overall combined rating score
  alpha_1m REAL,                        -- 1-month alpha vs SPY
  trades_for_1m INTEGER DEFAULT 0,      -- Number of trades used for 1m calculation
  alpha_3m REAL,                        -- 3-month alpha vs SPY
  trades_for_3m INTEGER DEFAULT 0,      -- Number of trades used for 3m calculation
  alpha_6m REAL,                        -- 6-month alpha vs SPY
  trades_for_6m INTEGER DEFAULT 0,      -- Number of trades used for 6m calculation
  alpha_1y REAL,                        -- 1-year alpha vs SPY
  trades_for_1y INTEGER DEFAULT 0,      -- Number of trades used for 1y calculation
  win_rate_3m REAL,                     -- 3-month win rate percentage
  last_calculated DATETIME,             -- When this rating was last updated
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(person_id)                     -- One rating record per person
);

-- -----------------------------------------------------------------------------
-- PERFORMANCE & ANALYTICS
-- -----------------------------------------------------------------------------

-- Indexes for common query patterns
CREATE INDEX idx_filings_filed_at ON filings(filed_at);
CREATE INDEX idx_filings_issuer_id ON filings(issuer_id);
CREATE INDEX idx_filings_type_id ON filings(filing_type_id);

CREATE INDEX idx_issuers_cik ON issuers(cik);
CREATE INDEX idx_issuers_symbol ON issuers(trading_symbol);

CREATE INDEX idx_persons_cik ON persons(cik);

CREATE INDEX idx_insider_trans_filing_id ON insider_transactions(filing_id);
CREATE INDEX idx_insider_trans_date ON insider_transactions(transaction_date);

CREATE INDEX idx_insider_ratings_person_id ON insider_ratings(person_id);
CREATE INDEX idx_insider_ratings_score ON insider_ratings(rating_score);
CREATE INDEX idx_insider_ratings_last_calculated ON insider_ratings(last_calculated);

-- A powerful VIEW to simplify querying insider trades for your application
CREATE VIEW vw_insider_trades_detailed AS
SELECT
    f.accession_number,
    f.filed_at,
    ft.type_code AS form_type,
    i.cik AS issuer_cik,
    i.name AS issuer_name,
    i.trading_symbol,
    p.cik AS person_cik,
    p.name AS person_name,
    pr.is_director,
    pr.is_officer,
    pr.officer_title,
    pr.is_ten_percent_owner,
    it.transaction_date,
    it.security_title,
    it.transaction_code,
    tc.description AS transaction_description,
    it.acquired_disposed_code,
    it.shares_transacted,
    it.price_per_share,
    it.transaction_value,
    it.shares_owned_following,
    it.direct_or_indirect
FROM filings f
JOIN filing_types ft ON f.filing_type_id = ft.id
JOIN issuers i ON f.issuer_id = i.id
JOIN person_relationships pr ON f.id = pr.filing_id
JOIN persons p ON pr.person_id = p.id
JOIN insider_transactions it ON f.id = it.filing_id
LEFT JOIN transaction_codes tc ON it.transaction_code = tc.code
WHERE ft.category = 'insider_trading';
