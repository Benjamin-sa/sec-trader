-- #############################################################################
-- # DROP AUTHENTICATION TABLES MIGRATION
-- # Removes all authentication and notification tables since auth system is disabled
-- # Run date: 2025-10-15
-- #############################################################################

-- Drop auth-related tables in order (views first, then tables with dependencies)

-- Drop views that might reference user tables
DROP VIEW IF EXISTS vw_active_alert_users;
DROP VIEW IF EXISTS vw_pending_notifications;

-- Drop auth-dependent tables (in dependency order)
DROP TABLE IF EXISTS notification_queue;
DROP TABLE IF EXISTS notification_history;
DROP TABLE IF EXISTS notification_digests;
DROP TABLE IF EXISTS user_alert_preferences;

-- Drop Better Auth core tables
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user;

-- Drop issuer signal metrics table (mentioned as empty)
DROP TABLE IF EXISTS issuer_signal_metrics;

-- Drop any indexes that might remain
DROP INDEX IF EXISTS idx_user_email;
DROP INDEX IF EXISTS idx_session_userId;
DROP INDEX IF EXISTS idx_account_userId;
DROP INDEX IF EXISTS idx_verification_identifier;
DROP INDEX IF EXISTS idx_alert_prefs_user;
DROP INDEX IF EXISTS idx_alert_prefs_enabled;
DROP INDEX IF EXISTS idx_notif_queue_status;
DROP INDEX IF EXISTS idx_notif_queue_user;
DROP INDEX IF EXISTS idx_notif_queue_created;
DROP INDEX IF EXISTS idx_notif_queue_pending;
DROP INDEX IF EXISTS idx_notif_history_user;
DROP INDEX IF EXISTS idx_notif_history_sent;
DROP INDEX IF EXISTS idx_digests_user_date;
DROP INDEX IF EXISTS idx_issuer_metrics_issuer_date;

-- Log the cleanup in migration tracking
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('007_drop_auth_tables', 'Dropped all authentication and notification tables');

-- Success message
SELECT 'Authentication tables successfully dropped' as status;