/**
 * Notification Service Worker
 * 
 * Processes the notification queue and sends email alerts via Mailgun
 * Runs every 5 minutes to check for pending notifications
 */

export default {
  /**
   * Scheduled trigger - runs every 5 minutes
   */
  async scheduled(event, env, ctx) {
    console.log('🔔 Notification service started');
    
    try {
      // Process real-time notifications
      const realTimeResults = await processRealTimeNotifications(env);
      
      // Check for digest notifications (if it's the right time)
      const digestResults = await processDigestNotifications(env);
      
      console.log('✅ Notification service completed', {
        realTime: realTimeResults,
        digests: digestResults,
      });
      
      return { realTimeResults, digestResults };
    } catch (error) {
      console.error('❌ Notification service failed', error);
      return { error: error.message };
    }
  },

  /**
   * HTTP endpoint for manual triggers and testing
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        worker: 'notification-service',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger
    if (url.pathname === '/process' && request.method === 'POST') {
      try {
        const realTimeResults = await processRealTimeNotifications(env);
        
        return new Response(JSON.stringify({
          success: true,
          results: realTimeResults,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Test email endpoint
    if (url.pathname === '/test-email' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email } = body;
        
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Email address required',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const result = await sendTestEmail(env, email);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Test email sent',
          result,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Notification Service\n\nEndpoints:\n- GET /health\n- POST /process\n- POST /test-email', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

/**
 * Process real-time notifications (non-digest mode)
 */
async function processRealTimeNotifications(env) {
  const MAX_BATCH_SIZE = parseInt(env.MAX_BATCH_SIZE || '50');
  
  // Get pending notifications
  const notifications = await env.DB.prepare(`
    SELECT 
      nq.*,
      COALESCE(uap.notification_email, u.email) as delivery_email,
      u.name as user_name
    FROM notification_queue nq
    JOIN user_alert_preferences uap ON nq.user_id = uap.user_id
    JOIN user u ON nq.user_id = u.id
    WHERE nq.status = 'pending'
      AND uap.digest_mode = FALSE
      AND uap.notifications_enabled = TRUE
      AND u.emailVerified = TRUE
      AND nq.attempts < 3
    ORDER BY nq.priority DESC, nq.created_at ASC
    LIMIT ?
  `).bind(MAX_BATCH_SIZE).all();

  console.log(`📧 Processing ${notifications.results.length} real-time notifications`);

  let sent = 0;
  let failed = 0;

  for (const notification of notifications.results) {
    try {
      // Check daily limit for user
      const todayCount = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM notification_history
        WHERE user_id = ?
          AND date(sent_at) = date('now')
      `).bind(notification.user_id).first();

      const maxPerDay = await env.DB.prepare(`
        SELECT max_alerts_per_day
        FROM user_alert_preferences
        WHERE user_id = ?
      `).bind(notification.user_id).first();

      if (todayCount.count >= (maxPerDay?.max_alerts_per_day || 20)) {
        console.log(`⚠️ User ${notification.user_id} has reached daily limit`);
        
        // Mark as cancelled
        await env.DB.prepare(`
          UPDATE notification_queue
          SET status = 'cancelled',
              error_message = 'Daily limit reached'
          WHERE id = ?
        `).bind(notification.id).run();
        
        continue;
      }

      // Send email via Mailgun
      await sendEmail(env, {
        to: notification.delivery_email,
        subject: notification.subject,
        text: notification.body_text,
        html: notification.body_html,
      });

      // Mark as sent
      await env.DB.prepare(`
        UPDATE notification_queue
        SET status = 'sent',
            sent_at = datetime('now')
        WHERE id = ?
      `).bind(notification.id).run();

      // Add to history
      await env.DB.prepare(`
        INSERT INTO notification_history (
          user_id, notification_type, issuer_cik, issuer_name,
          subject, sent_at
        )
        SELECT 
          user_id, notification_type,
          i.cik, i.name,
          subject, datetime('now')
        FROM notification_queue nq
        JOIN issuers i ON nq.issuer_id = i.id
        WHERE nq.id = ?
      `).bind(notification.id).run();

      sent++;
      console.log(`✉️ Sent notification ${notification.id} to ${notification.delivery_email}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to send notification ${notification.id}:`, error);

      // Update attempt count and error
      await env.DB.prepare(`
        UPDATE notification_queue
        SET attempts = attempts + 1,
            last_attempt_at = datetime('now'),
            error_message = ?,
            status = CASE 
              WHEN attempts + 1 >= 3 THEN 'failed'
              ELSE 'pending'
            END
        WHERE id = ?
      `).bind(error.message, notification.id).run();
    }
  }

  return { sent, failed, total: notifications.results.length };
}

/**
 * Process daily digest notifications
 */
async function processDigestNotifications(env) {
  // Check current time (UTC)
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  // Find users who want digest at this time (±5 minutes)
  const users = await env.DB.prepare(`
    SELECT DISTINCT
      uap.user_id,
      uap.digest_time,
      COALESCE(uap.notification_email, u.email) as delivery_email,
      u.name as user_name
    FROM user_alert_preferences uap
    JOIN user u ON uap.user_id = u.id
    WHERE uap.digest_mode = TRUE
      AND uap.notifications_enabled = TRUE
      AND u.emailVerified = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM notification_digests
        WHERE user_id = uap.user_id
          AND digest_date = date('now')
      )
  `).all();

  let digestsSent = 0;

  for (const user of users.results) {
    // Check if it's the right time for this user (within 5 minute window)
    const [userHour, userMinute] = user.digest_time.split(':').map(Number);
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (userHour * 60 + userMinute));
    
    if (timeDiff > 5) continue; // Not in the 5-minute window

    try {
      // Get pending notifications for this user
      const notifications = await env.DB.prepare(`
        SELECT 
          nq.*,
          i.cik as issuer_cik,
          i.name as issuer_name,
          i.trading_symbol
        FROM notification_queue nq
        JOIN issuers i ON nq.issuer_id = i.id
        WHERE nq.user_id = ?
          AND nq.status = 'pending'
        ORDER BY nq.priority DESC, nq.created_at DESC
      `).bind(user.user_id).all();

      if (notifications.results.length === 0) continue;

      // Generate digest email
      const digestHtml = generateDigestHtml(notifications.results, user.user_name);
      const digestText = generateDigestText(notifications.results, user.user_name);

      // Send digest
      await sendEmail(env, {
        to: user.delivery_email,
        subject: `Daily Insider Trading Alert Digest - ${notifications.results.length} Signals`,
        text: digestText,
        html: digestHtml,
      });

      // Mark all notifications as sent
      for (const notification of notifications.results) {
        await env.DB.prepare(`
          UPDATE notification_queue
          SET status = 'sent',
              sent_at = datetime('now')
          WHERE id = ?
        `).bind(notification.id).run();
      }

      // Record digest
      await env.DB.prepare(`
        INSERT INTO notification_digests (user_id, digest_date, alerts_included, sent_at)
        VALUES (?, date('now'), ?, datetime('now'))
      `).bind(user.user_id, notifications.results.length).run();

      digestsSent++;
      console.log(`📬 Sent digest to ${user.delivery_email} (${notifications.results.length} alerts)`);
    } catch (error) {
      console.error(`❌ Failed to send digest to ${user.delivery_email}:`, error);
    }
  }

  return { digestsSent };
}

/**
 * Send email via Mailgun REST API
 */
async function sendEmail(env, { to, subject, text, html }) {
  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
    throw new Error('Mailgun credentials not configured');
  }

  // Create form data
  const formData = new FormData();
  formData.append('from', `${env.FROM_NAME || 'Insider Alerts'} <${env.FROM_EMAIL || 'alerts@yourdomain.com'}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('text', text);
  if (html) {
    formData.append('html', html);
  }
  formData.append('o:tracking', 'yes');
  formData.append('o:tracking-clicks', 'yes');
  formData.append('o:tracking-opens', 'yes');

  // Send via Mailgun API
  const response = await fetch(
    `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun API error: ${error}`);
  }

  return await response.json();
}

/**
 * Send test email
 */
async function sendTestEmail(env, email) {
  return sendEmail(env, {
    to: email,
    subject: 'Test Alert - SEC Insider Trading Notifications',
    text: 'This is a test email to verify your notification settings are working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🎉 Your Alerts Are Working!</h2>
        <p>This is a test email to verify your notification settings are configured correctly.</p>
        <p>You will receive alerts when insider trading signals match your preferences.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          SEC Insider Trading Alerts<br>
          <a href="https://sec-frontend.benjamin-sautersb.workers.dev" style="color: #2563eb;">Manage Preferences</a>
        </p>
      </div>
    `,
  });
}

/**
 * Generate HTML for digest email
 */
function generateDigestHtml(notifications, userName) {
  const alertsHtml = notifications.map(n => `
    <div style="background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2563eb;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">${n.subject}</h3>
      <div style="color: #4b5563; font-size: 14px;">
        ${n.body_html || n.body_text.replace(/\n/g, '<br>')}
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">📊 Your Daily Insider Trading Digest</h2>
      <p>Hi ${userName || 'there'},</p>
      <p>Here are <strong>${notifications.length}</strong> insider trading signals that match your preferences:</p>
      
      ${alertsHtml}
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 14px;">
        <a href="https://sec-frontend.benjamin-sautersb.workers.dev" style="color: #2563eb;">View Full Dashboard</a> |
        <a href="https://sec-frontend.benjamin-sautersb.workers.dev/settings/alerts" style="color: #2563eb;">Manage Preferences</a>
      </p>
    </div>
  `;
}

/**
 * Generate plain text for digest email
 */
function generateDigestText(notifications, userName) {
  const alertsText = notifications.map(n => 
    `\n---\n${n.subject}\n\n${n.body_text}`
  ).join('');

  return `
Your Daily Insider Trading Digest

Hi ${userName || 'there'},

Here are ${notifications.length} insider trading signals that match your preferences:

${alertsText}

---

View Full Dashboard: https://sec-frontend.benjamin-sautersb.workers.dev
Manage Preferences: https://sec-frontend.benjamin-sautersb.workers.dev/settings/alerts
  `.trim();
}
