-- #############################################################################
-- # SIGNAL PROCESSING TABLES MIGRATION
-- # Adds pre-computed signal tables for faster API responses
-- # Run date: 2025-10-02
-- #############################################################################

-- -----------------------------------------------------------------------------
-- CLUSTER BUY SIGNALS
-- -----------------------------------------------------------------------------

-- Pre-computed cluster buy detections
CREATE TABLE IF NOT EXISTS cluster_buy_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id INTEGER NOT NULL REFERENCES issuers(id),
  transaction_date DATE NOT NULL,
  
  -- Aggregated metrics
  total_insiders INTEGER NOT NULL,           -- Number of distinct insiders buying
  total_shares REAL NOT NULL,                -- Total shares purchased
  total_value REAL NOT NULL,                 -- Total dollar value
  
  -- Signal analysis
  signal_strength INTEGER NOT NULL,          -- 1-100 score
  avg_role_priority REAL,                    -- Average seniority of buyers
  has_ceo_buy BOOLEAN DEFAULT FALSE,         -- CEO participated
  has_cfo_buy BOOLEAN DEFAULT FALSE,         -- CFO participated
  has_ten_percent_owner BOOLEAN DEFAULT FALSE, -- 10% owner participated
  
  -- Window analysis (±3 days)
  buy_window_start DATE NOT NULL,
  buy_window_end DATE NOT NULL,
  
  -- Metadata
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,            -- Set to false if amended/invalidated
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(issuer_id, transaction_date)
);

-- Individual trades that are part of a cluster
CREATE TABLE IF NOT EXISTS cluster_buy_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id INTEGER NOT NULL REFERENCES cluster_buy_signals(id) ON DELETE CASCADE,
  transaction_id INTEGER NOT NULL REFERENCES insider_transactions(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id),
  
  -- Quick access to key fields (denormalized for speed)
  person_name TEXT NOT NULL,
  shares_transacted REAL NOT NULL,
  price_per_share REAL,
  transaction_value REAL NOT NULL,
  is_officer BOOLEAN,
  is_director BOOLEAN,
  officer_title TEXT,
  
  UNIQUE(cluster_id, transaction_id)
);

-- -----------------------------------------------------------------------------
-- IMPORTANT TRADE SIGNALS
-- -----------------------------------------------------------------------------

-- Pre-computed important trades with scores
CREATE TABLE IF NOT EXISTS important_trade_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES insider_transactions(id) ON DELETE CASCADE,
  filing_id INTEGER NOT NULL REFERENCES filings(id),
  
  -- Importance scoring
  importance_score INTEGER NOT NULL,         -- Composite score (can be negative for sells)
  
  -- Signal components (for debugging/tuning)
  value_score INTEGER,                       -- Score from transaction value
  direction_score INTEGER,                   -- Buy vs sell
  role_score INTEGER,                        -- Insider seniority
  ownership_score INTEGER,                   -- % of holdings
  cluster_score INTEGER,                     -- Part of cluster?
  timing_score INTEGER,                      -- Unusual timing?
  
  -- Quick filters
  cluster_size INTEGER DEFAULT 0,            -- Number of insiders in cluster
  is_first_buy BOOLEAN DEFAULT FALSE,        -- First buy by this insider
  is_purchase BOOLEAN,
  is_sale BOOLEAN,
  is_10b5_1_plan BOOLEAN DEFAULT FALSE,      -- Rule 10b5-1 plan
  
  -- Metadata
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(transaction_id)
);


-- -----------------------------------------------------------------------------
-- HISTORICAL METRICS & TRENDS
-- -----------------------------------------------------------------------------

-- Daily aggregated metrics for trend analysis
CREATE TABLE IF NOT EXISTS signal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  
  -- Cluster activity
  cluster_buys_count INTEGER DEFAULT 0,
  avg_cluster_size REAL DEFAULT 0,
  max_cluster_size INTEGER DEFAULT 0,
  total_cluster_value REAL DEFAULT 0,
  
  -- Overall insider activity
  total_insider_buys INTEGER DEFAULT 0,
  total_insider_sells INTEGER DEFAULT 0,
  total_buy_value REAL DEFAULT 0,
  total_sell_value REAL DEFAULT 0,
  buy_sell_ratio REAL DEFAULT 0,
  
  -- First buys
  first_buys_count INTEGER DEFAULT 0,
  
  -- Important trades
  important_trades_count INTEGER DEFAULT 0,
  avg_importance_score REAL DEFAULT 0,
  
  -- Metadata
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Issuer-specific metrics (for company pages)
CREATE TABLE IF NOT EXISTS issuer_signal_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id INTEGER NOT NULL REFERENCES issuers(id),
  date DATE NOT NULL,
  
  -- Activity counts
  insider_buys_count INTEGER DEFAULT 0,
  insider_sells_count INTEGER DEFAULT 0,
  cluster_events INTEGER DEFAULT 0,
  first_buy_events INTEGER DEFAULT 0,
  
  -- Value metrics
  total_buy_value REAL DEFAULT 0,
  total_sell_value REAL DEFAULT 0,
  
  -- Signal scores
  avg_buy_importance REAL DEFAULT 0,
  max_buy_importance INTEGER DEFAULT 0,
  
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(issuer_id, date)
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------

-- Cluster buy signals indexes
CREATE INDEX IF NOT EXISTS idx_cluster_signals_issuer ON cluster_buy_signals(issuer_id);
CREATE INDEX IF NOT EXISTS idx_cluster_signals_date ON cluster_buy_signals(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cluster_signals_active ON cluster_buy_signals(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cluster_signals_strength ON cluster_buy_signals(signal_strength DESC);

-- Cluster trades indexes
CREATE INDEX IF NOT EXISTS idx_cluster_trades_cluster ON cluster_buy_trades(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_trades_transaction ON cluster_buy_trades(transaction_id);

-- Important trade signals indexes
CREATE INDEX IF NOT EXISTS idx_important_signals_score ON important_trade_signals(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_important_signals_filing ON important_trade_signals(filing_id);
CREATE INDEX IF NOT EXISTS idx_important_signals_active ON important_trade_signals(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_important_signals_purchase ON important_trade_signals(is_purchase) WHERE is_purchase = TRUE;

-- History indexes
CREATE INDEX IF NOT EXISTS idx_signal_history_date ON signal_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_issuer_metrics_issuer_date ON issuer_signal_metrics(issuer_id, date DESC);

-- -----------------------------------------------------------------------------
-- VIEWS FOR CONVENIENT QUERYING
-- -----------------------------------------------------------------------------

-- Complete cluster view with all details
CREATE VIEW IF NOT EXISTS vw_cluster_buy_details AS
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
WHERE cbs.is_active = TRUE;

-- Complete important trades view
CREATE VIEW IF NOT EXISTS vw_important_trades_details AS
SELECT
    its.id as signal_id,
    its.importance_score,
    its.cluster_size,
    its.is_first_buy,
    its.is_purchase,
    its.is_sale,
    f.accession_number,
    f.filed_at,
    ft.type_code as form_type,
    i.cik as issuer_cik,
    i.name as issuer_name,
    i.trading_symbol,
    p.cik as person_cik,
    p.name as person_name,
    pr.is_director,
    pr.is_officer,
    pr.officer_title,
    pr.is_ten_percent_owner,
    it.transaction_date,
    it.security_title,
    it.transaction_code,
    it.acquired_disposed_code,
    it.shares_transacted,
    it.price_per_share,
    it.transaction_value,
    it.shares_owned_following,
    it.direct_or_indirect
FROM important_trade_signals its
JOIN insider_transactions it ON its.transaction_id = it.id
JOIN filings f ON its.filing_id = f.id
JOIN filing_types ft ON f.filing_type_id = ft.id
JOIN issuers i ON f.issuer_id = i.id
JOIN person_relationships pr ON f.id = pr.filing_id
JOIN persons p ON pr.person_id = p.id
WHERE its.is_active = TRUE;
