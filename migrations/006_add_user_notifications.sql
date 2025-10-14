-- #############################################################################
-- # USER NOTIFICATIONS & ALERT PREFERENCES MIGRATION
-- # Adds tables for managing user notification preferences and tracking sent alerts
-- # Run date: 2025-10-14
-- #############################################################################

-- -----------------------------------------------------------------------------
-- USER ALERT PREFERENCES
-- -----------------------------------------------------------------------------

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,  -- References user.id from better-auth
  
  -- Global notification settings
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  notification_email TEXT,  -- Can override user.email if they want alerts elsewhere
  
  -- Alert type preferences
  cluster_buy_alerts BOOLEAN DEFAULT TRUE,
  important_trade_alerts BOOLEAN DEFAULT TRUE,
  first_buy_alerts BOOLEAN DEFAULT TRUE,
  
  -- Threshold settings
  cluster_min_insiders INTEGER DEFAULT 2,        -- Minimum insiders in cluster
  cluster_min_value REAL DEFAULT 1000000,        -- Minimum cluster value ($1M default)
  cluster_min_strength INTEGER DEFAULT 60,       -- Minimum signal strength
  important_trade_min_score INTEGER DEFAULT 70,  -- Minimum importance score
  
  -- Delivery preferences
  digest_mode BOOLEAN DEFAULT FALSE,             -- Send daily digest vs real-time
  digest_time TEXT DEFAULT '09:00',              -- Time for daily digest (HH:MM UTC)
  max_alerts_per_day INTEGER DEFAULT 20,         -- Prevent spam
  
  -- Watchlist filters (comma-separated CIKs or tickers)
  watched_companies TEXT,                        -- Only alert for these companies
  watched_sectors TEXT,                          -- Only alert for these sectors
  excluded_companies TEXT,                       -- Never alert for these companies
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- NOTIFICATION QUEUE & HISTORY
-- -----------------------------------------------------------------------------

-- Queue for pending notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  
  -- Notification details
  notification_type TEXT NOT NULL,  -- 'cluster_buy', 'important_trade', 'first_buy'
  priority INTEGER DEFAULT 0,       -- Higher = more urgent
  
  -- Reference to the signal
  cluster_id INTEGER REFERENCES cluster_buy_signals(id),
  important_trade_id INTEGER REFERENCES important_trade_signals(id),
  issuer_id INTEGER NOT NULL REFERENCES issuers(id),
  
  -- Notification content (pre-rendered)
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  
  -- Metadata (for deduplication and tracking)
  signal_fingerprint TEXT NOT NULL,  -- Hash to prevent duplicate alerts
  
  -- Status
  status TEXT DEFAULT 'pending',     -- pending, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  last_attempt_at DATETIME,
  sent_at DATETIME,
  error_message TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate alerts for same signal to same user
  UNIQUE(user_id, signal_fingerprint)
);

-- Notification history (for analytics and debugging)
CREATE TABLE IF NOT EXISTS notification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  
  issuer_cik TEXT,
  issuer_name TEXT,
  
  subject TEXT,
  sent_at DATETIME NOT NULL,
  
  -- Engagement tracking (could be expanded with click tracking)
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily digest tracking (prevent multiple digests)
CREATE TABLE IF NOT EXISTS notification_digests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  digest_date DATE NOT NULL,
  
  alerts_included INTEGER DEFAULT 0,
  sent_at DATETIME NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, digest_date)
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------

-- Alert preferences indexes
CREATE INDEX IF NOT EXISTS idx_alert_prefs_user ON user_alert_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_prefs_enabled ON user_alert_preferences(notifications_enabled) 
  WHERE notifications_enabled = TRUE;

-- Notification queue indexes
CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_queue_created ON notification_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue(status, priority DESC) 
  WHERE status = 'pending';

-- Notification history indexes
CREATE INDEX IF NOT EXISTS idx_notif_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_history_sent ON notification_history(sent_at DESC);

-- Digest tracking indexes
CREATE INDEX IF NOT EXISTS idx_digests_user_date ON notification_digests(user_id, digest_date DESC);

-- -----------------------------------------------------------------------------
-- VIEWS FOR CONVENIENT QUERYING
-- -----------------------------------------------------------------------------

-- Active users with alert preferences
CREATE VIEW IF NOT EXISTS vw_active_alert_users AS
SELECT 
    uap.*,
    u.email as user_email,
    u.name as user_name,
    COALESCE(uap.notification_email, u.email) as delivery_email
FROM user_alert_preferences uap
JOIN user u ON uap.user_id = u.id
WHERE uap.notifications_enabled = TRUE
  AND u.emailVerified = TRUE;

-- Pending notifications ready to send
CREATE VIEW IF NOT EXISTS vw_pending_notifications AS
SELECT 
    nq.*,
    i.cik as issuer_cik,
    i.name as issuer_name,
    i.trading_symbol,
    uap.notification_email,
    u.email as user_email,
    COALESCE(uap.notification_email, u.email) as delivery_email
FROM notification_queue nq
JOIN user_alert_preferences uap ON nq.user_id = uap.user_id
JOIN user u ON nq.user_id = u.id
JOIN issuers i ON nq.issuer_id = i.id
WHERE nq.status = 'pending'
  AND uap.notifications_enabled = TRUE
ORDER BY nq.priority DESC, nq.created_at ASC;
