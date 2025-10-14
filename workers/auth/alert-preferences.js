/**
 * User Alert Preferences API
 * 
 * Manages user notification preferences for insider trading alerts
 * Part of the auth worker since it needs user authentication
 */

/**
 * Get user alert preferences
 */
export async function getUserAlertPreferences(userId, env) {
  const prefs = await env.DB.prepare(`
    SELECT * FROM user_alert_preferences WHERE user_id = ?
  `).bind(userId).first();

  // Return defaults if not set
  if (!prefs) {
    return {
      notifications_enabled: false,
      email_verified: false,
      cluster_buy_alerts: true,
      important_trade_alerts: true,
      first_buy_alerts: true,
      cluster_min_insiders: 2,
      cluster_min_value: 1000000,
      cluster_min_strength: 60,
      important_trade_min_score: 70,
      digest_mode: false,
      digest_time: '09:00',
      max_alerts_per_day: 20,
    };
  }

  return prefs;
}

/**
 * Update user alert preferences
 */
export async function updateUserAlertPreferences(userId, preferences, env) {
  // Check if preferences exist
  const existing = await env.DB.prepare(`
    SELECT id FROM user_alert_preferences WHERE user_id = ?
  `).bind(userId).first();

  if (existing) {
    // Update existing
    const fields = [];
    const values = [];

    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(preferences[key]);
      }
    });

    if (fields.length > 0) {
      values.push(userId);
      await env.DB.prepare(`
        UPDATE user_alert_preferences
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(...values).run();
    }
  } else {
    // Insert new
    const fields = ['user_id', ...Object.keys(preferences)];
    const placeholders = fields.map(() => '?').join(', ');
    const values = [userId, ...Object.values(preferences)];

    await env.DB.prepare(`
      INSERT INTO user_alert_preferences (${fields.join(', ')})
      VALUES (${placeholders})
    `).bind(...values).run();
  }

  return getUserAlertPreferences(userId, env);
}

/**
 * Test user's email by sending a test notification
 */
export async function sendTestNotification(userId, env) {
  const user = await env.DB.prepare(`
    SELECT u.*, 
           COALESCE(uap.notification_email, u.email) as delivery_email
    FROM user u
    LEFT JOIN user_alert_preferences uap ON u.id = uap.user_id
    WHERE u.id = ?
  `).bind(userId).first();

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified');
  }

  // Create a test notification in the queue
  await env.DB.prepare(`
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      priority,
      issuer_id,
      subject,
      body_text,
      body_html,
      signal_fingerprint
    ) VALUES (?, 'test', 10, 1, ?, ?, ?, ?)
  `).bind(
    userId,
    'Test Alert - Your Notifications Are Working!',
    'This is a test notification to verify your alert settings are configured correctly.',
    '<p>This is a test notification to verify your alert settings are configured correctly.</p>',
    `test:${userId}:${Date.now()}`
  ).run();

  return { success: true, message: 'Test notification queued' };
}

/**
 * Get notification statistics for user
 */
export async function getUserNotificationStats(userId, env) {
  // Get counts
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE date(sent_at) = date('now')) as today,
      COUNT(*) FILTER (WHERE date(sent_at) >= date('now', '-7 days')) as week,
      COUNT(*) FILTER (WHERE date(sent_at) >= date('now', '-30 days')) as month,
      COUNT(*) as total
    FROM notification_history
    WHERE user_id = ?
  `).bind(userId).first();

  // Get recent notifications
  const recent = await env.DB.prepare(`
    SELECT 
      notification_type,
      issuer_cik,
      issuer_name,
      subject,
      sent_at
    FROM notification_history
    WHERE user_id = ?
    ORDER BY sent_at DESC
    LIMIT 10
  `).bind(userId).all();

  return {
    counts: stats,
    recent: recent.results,
  };
}

/**
 * Add/remove companies from watchlist
 */
export async function updateWatchlist(userId, action, companies, env) {
  const prefs = await getUserAlertPreferences(userId, env);
  
  const watchlist = prefs.watched_companies 
    ? new Set(prefs.watched_companies.split(',').map(c => c.trim().toUpperCase()))
    : new Set();

  companies.forEach(company => {
    const normalized = company.trim().toUpperCase();
    if (action === 'add') {
      watchlist.add(normalized);
    } else if (action === 'remove') {
      watchlist.delete(normalized);
    }
  });

  const updated = Array.from(watchlist).join(',');
  
  await updateUserAlertPreferences(userId, {
    watched_companies: updated || null,
  }, env);

  return { watchlist: Array.from(watchlist) };
}
