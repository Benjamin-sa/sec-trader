/**
 * Notification Queue Service
 * 
 * Handles creating notification queue entries when signals are detected
 * This is called by the signal processors after they find interesting signals
 */

import crypto from 'crypto';

/**
 * Queue notifications for cluster buy signals
 */
export async function queueClusterBuyNotifications(env, clusterId, logger) {
  try {
    // Get cluster details
    const cluster = await env.DB.prepare(`
      SELECT 
        cbs.*,
        i.cik as issuer_cik,
        i.name as issuer_name,
        i.trading_symbol,
        i.sector,
        i.industry
      FROM cluster_buy_signals cbs
      JOIN issuers i ON cbs.issuer_id = i.id
      WHERE cbs.id = ?
    `).bind(clusterId).first();

    if (!cluster) {
      logger.warn(`Cluster ${clusterId} not found`);
      return;
    }

    // Get users who want cluster buy alerts
    const users = await env.DB.prepare(`
      SELECT 
        uap.user_id,
        uap.cluster_min_insiders,
        uap.cluster_min_value,
        uap.cluster_min_strength,
        uap.watched_companies,
        uap.watched_sectors,
        uap.excluded_companies,
        COALESCE(uap.notification_email, u.email) as email
      FROM user_alert_preferences uap
      JOIN user u ON uap.user_id = u.id
      WHERE uap.cluster_buy_alerts = TRUE
        AND uap.notifications_enabled = TRUE
        AND u.emailVerified = TRUE
    `).all();

    let queued = 0;

    for (const user of users.results) {
      // Check if cluster meets user's thresholds
      if (cluster.total_insiders < user.cluster_min_insiders) continue;
      if (cluster.total_value < user.cluster_min_value) continue;
      if (cluster.signal_strength < user.cluster_min_strength) continue;

      // Check watchlist filters
      if (user.watched_companies) {
        const watchlist = user.watched_companies.split(',').map(c => c.trim().toUpperCase());
        const matches = watchlist.some(w => 
          w === cluster.issuer_cik || 
          w === cluster.trading_symbol?.toUpperCase()
        );
        if (!matches) continue;
      }

      if (user.watched_sectors && cluster.sector) {
        const sectors = user.watched_sectors.split(',').map(s => s.trim().toLowerCase());
        if (!sectors.includes(cluster.sector.toLowerCase())) continue;
      }

      if (user.excluded_companies) {
        const excluded = user.excluded_companies.split(',').map(c => c.trim().toUpperCase());
        const isExcluded = excluded.some(e => 
          e === cluster.issuer_cik || 
          e === cluster.trading_symbol?.toUpperCase()
        );
        if (isExcluded) continue;
      }

      // Get cluster trades for email content
      const trades = await env.DB.prepare(`
        SELECT 
          person_name,
          shares_transacted,
          price_per_share,
          transaction_value,
          officer_title,
          is_officer,
          is_director
        FROM cluster_buy_trades
        WHERE cluster_id = ?
        ORDER BY transaction_value DESC
      `).bind(clusterId).all();

      // Generate email content
      const { subject, bodyText, bodyHtml } = generateClusterBuyEmail(cluster, trades.results);

      // Create fingerprint for deduplication
      const fingerprint = createFingerprint('cluster_buy', cluster.id, cluster.transaction_date);

      // Queue notification
      try {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO notification_queue (
            user_id,
            notification_type,
            priority,
            cluster_id,
            issuer_id,
            subject,
            body_text,
            body_html,
            signal_fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          user.user_id,
          'cluster_buy',
          calculatePriority(cluster.signal_strength),
          cluster.id,
          cluster.issuer_id,
          subject,
          bodyText,
          bodyHtml,
          fingerprint
        ).run();

        queued++;
      } catch (error) {
        logger.error(`Failed to queue notification for user ${user.user_id}:`, error);
      }
    }

    logger.info(`📬 Queued ${queued} cluster buy notifications for cluster ${clusterId}`);
    return queued;
  } catch (error) {
    logger.error('Failed to queue cluster buy notifications:', error);
    return 0;
  }
}

/**
 * Queue notifications for important trade signals
 */
export async function queueImportantTradeNotifications(env, importantTradeId, logger) {
  try {
    // Get important trade details
    const trade = await env.DB.prepare(`
      SELECT 
        its.*,
        i.cik as issuer_cik,
        i.name as issuer_name,
        i.trading_symbol,
        p.name as person_name,
        pr.officer_title,
        pr.is_officer,
        pr.is_director,
        pr.is_ten_percent_owner,
        it.transaction_date,
        it.shares_transacted,
        it.price_per_share,
        it.transaction_value,
        it.shares_owned_following,
        it.acquired_disposed_code,
        f.accession_number
      FROM important_trade_signals its
      JOIN insider_transactions it ON its.transaction_id = it.id
      JOIN filings f ON its.filing_id = f.id
      JOIN issuers i ON f.issuer_id = i.id
      JOIN person_relationships pr ON f.id = pr.filing_id
      JOIN persons p ON pr.person_id = p.id
      WHERE its.id = ?
    `).bind(importantTradeId).first();

    if (!trade) {
      logger.warn(`Important trade ${importantTradeId} not found`);
      return;
    }

    // Get users who want important trade alerts
    const users = await env.DB.prepare(`
      SELECT 
        uap.user_id,
        uap.important_trade_min_score,
        uap.watched_companies,
        uap.watched_sectors,
        uap.excluded_companies,
        COALESCE(uap.notification_email, u.email) as email
      FROM user_alert_preferences uap
      JOIN user u ON uap.user_id = u.id
      WHERE uap.important_trade_alerts = TRUE
        AND uap.notifications_enabled = TRUE
        AND u.emailVerified = TRUE
    `).all();

    let queued = 0;

    for (const user of users.results) {
      // Check if trade meets user's threshold
      if (trade.importance_score < user.important_trade_min_score) continue;

      // Check watchlist filters (same logic as cluster buys)
      if (user.watched_companies) {
        const watchlist = user.watched_companies.split(',').map(c => c.trim().toUpperCase());
        const matches = watchlist.some(w => 
          w === trade.issuer_cik || 
          w === trade.trading_symbol?.toUpperCase()
        );
        if (!matches) continue;
      }

      if (user.excluded_companies) {
        const excluded = user.excluded_companies.split(',').map(c => c.trim().toUpperCase());
        const isExcluded = excluded.some(e => 
          e === trade.issuer_cik || 
          e === trade.trading_symbol?.toUpperCase()
        );
        if (isExcluded) continue;
      }

      // Generate email content
      const { subject, bodyText, bodyHtml } = generateImportantTradeEmail(trade);

      // Create fingerprint
      const fingerprint = createFingerprint('important_trade', trade.transaction_id, trade.transaction_date);

      // Queue notification
      try {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO notification_queue (
            user_id,
            notification_type,
            priority,
            important_trade_id,
            issuer_id,
            subject,
            body_text,
            body_html,
            signal_fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          user.user_id,
          'important_trade',
          calculatePriority(trade.importance_score),
          trade.id,
          trade.issuer_id,
          subject,
          bodyText,
          bodyHtml,
          fingerprint
        ).run();

        queued++;
      } catch (error) {
        logger.error(`Failed to queue notification for user ${user.user_id}:`, error);
      }
    }

    logger.info(`📬 Queued ${queued} important trade notifications for trade ${importantTradeId}`);
    return queued;
  } catch (error) {
    logger.error('Failed to queue important trade notifications:', error);
    return 0;
  }
}

/**
 * Generate email content for cluster buy alerts
 */
function generateClusterBuyEmail(cluster, trades) {
  const symbol = cluster.trading_symbol || cluster.issuer_cik;
  const strengthLabel = getStrengthLabel(cluster.signal_strength);
  
  const subject = `🎯 ${strengthLabel} Cluster Buy Alert: ${cluster.total_insiders} Insiders Buying ${symbol}`;

  const bodyText = `
CLUSTER BUY ALERT - ${strengthLabel}

${cluster.issuer_name} (${symbol})
${cluster.total_insiders} insiders purchased shares on ${cluster.transaction_date}

Total Value: $${formatNumber(cluster.total_value)}
Total Shares: ${formatNumber(cluster.total_shares)}
Signal Strength: ${cluster.signal_strength}/100

KEY BUYERS:
${trades.slice(0, 5).map(t => 
  `• ${t.person_name}${t.officer_title ? ` (${t.officer_title})` : ''}: $${formatNumber(t.transaction_value)}`
).join('\n')}

${cluster.has_ceo_buy ? '🔥 CEO participated in this cluster buy!\n' : ''}
${cluster.has_cfo_buy ? '🔥 CFO participated in this cluster buy!\n' : ''}

View full details: https://sec-frontend.benjamin-sautersb.workers.dev/company/${cluster.issuer_cik}
  `.trim();

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🎯 Cluster Buy Alert</h2>
        <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">${strengthLabel}</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${cluster.issuer_name}</h3>
        <p style="color: #6b7280; margin: 0 0 15px 0;">Symbol: <strong>${symbol}</strong></p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 5px 0; color: #374151;"><strong>${cluster.total_insiders}</strong> insiders purchased shares on <strong>${cluster.transaction_date}</strong></p>
          <p style="margin: 5px 0; color: #374151;">Total Value: <strong>$${formatNumber(cluster.total_value)}</strong></p>
          <p style="margin: 5px 0; color: #374151;">Total Shares: <strong>${formatNumber(cluster.total_shares)}</strong></p>
          <p style="margin: 5px 0; color: #374151;">Signal Strength: <strong>${cluster.signal_strength}/100</strong></p>
        </div>
        
        <h4 style="color: #1f2937; margin: 20px 0 10px 0;">Key Buyers:</h4>
        <ul style="list-style: none; padding: 0;">
          ${trades.slice(0, 5).map(t => `
            <li style="padding: 8px; background: white; margin: 5px 0; border-radius: 4px; border-left: 3px solid #2563eb;">
              <strong>${t.person_name}</strong>${t.officer_title ? ` (${t.officer_title})` : ''}<br>
              <span style="color: #059669; font-weight: bold;">$${formatNumber(t.transaction_value)}</span>
            </li>
          `).join('')}
        </ul>
        
        ${cluster.has_ceo_buy || cluster.has_cfo_buy ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; border-radius: 4px;">
            ${cluster.has_ceo_buy ? '<p style="margin: 5px 0;">🔥 CEO participated in this cluster buy!</p>' : ''}
            ${cluster.has_cfo_buy ? '<p style="margin: 5px 0;">🔥 CFO participated in this cluster buy!</p>' : ''}
          </div>
        ` : ''}
        
        <a href="https://sec-frontend.benjamin-sautersb.workers.dev/company/${cluster.issuer_cik}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
          View Full Details →
        </a>
      </div>
      
      <div style="padding: 15px; background: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
        <p>SEC Insider Trading Alerts | <a href="https://sec-frontend.benjamin-sautersb.workers.dev/settings/alerts" style="color: #2563eb;">Manage Preferences</a></p>
      </div>
    </div>
  `;

  return { subject, bodyText, bodyHtml };
}

/**
 * Generate email content for important trade alerts
 */
function generateImportantTradeEmail(trade) {
  const symbol = trade.trading_symbol || trade.issuer_cik;
  const action = trade.acquired_disposed_code === 'A' ? 'BUY' : 'SELL';
  const actionEmoji = action === 'BUY' ? '📈' : '📉';
  
  const subject = `${actionEmoji} Important Insider ${action}: ${trade.person_name} @ ${symbol}`;

  const roleInfo = [];
  if (trade.is_officer && trade.officer_title) roleInfo.push(trade.officer_title);
  if (trade.is_director) roleInfo.push('Director');
  if (trade.is_ten_percent_owner) roleInfo.push('10% Owner');
  
  const bodyText = `
IMPORTANT INSIDER ${action}

${trade.person_name}
${roleInfo.join(', ')}

Company: ${trade.issuer_name} (${symbol})
Transaction Date: ${trade.transaction_date}

Amount: $${formatNumber(trade.transaction_value)}
Shares: ${formatNumber(trade.shares_transacted)} @ $${trade.price_per_share?.toFixed(2) || 'N/A'}
Importance Score: ${trade.importance_score}/100

${trade.is_first_buy ? '🎯 This is a FIRST BUY by this insider!\n' : ''}
${trade.cluster_size > 1 ? `👥 Part of a cluster with ${trade.cluster_size} insiders\n` : ''}

View filing: https://sec-frontend.benjamin-sautersb.workers.dev/filing/${trade.accession_number}
  `.trim();

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${action === 'BUY' ? '#10b981' : '#ef4444'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${actionEmoji} Important Insider ${action}</h2>
        <p style="margin: 5px 0 0 0; font-size: 16px;">Score: ${trade.importance_score}/100</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <h3 style="margin: 0 0 5px 0; color: #1f2937;">${trade.person_name}</h3>
        <p style="color: #6b7280; margin: 0 0 15px 0;">${roleInfo.join(', ')}</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 5px 0; color: #374151;">Company: <strong>${trade.issuer_name}</strong> (${symbol})</p>
          <p style="margin: 5px 0; color: #374151;">Date: <strong>${trade.transaction_date}</strong></p>
          <p style="margin: 5px 0; color: #374151;">Amount: <strong style="color: ${action === 'BUY' ? '#059669' : '#dc2626'};">$${formatNumber(trade.transaction_value)}</strong></p>
          <p style="margin: 5px 0; color: #374151;">Shares: <strong>${formatNumber(trade.shares_transacted)}</strong> @ $${trade.price_per_share?.toFixed(2) || 'N/A'}</p>
        </div>
        
        ${trade.is_first_buy || trade.cluster_size > 1 ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; border-radius: 4px;">
            ${trade.is_first_buy ? '<p style="margin: 5px 0;">🎯 This is a FIRST BUY by this insider!</p>' : ''}
            ${trade.cluster_size > 1 ? `<p style="margin: 5px 0;">👥 Part of a cluster with ${trade.cluster_size} insiders</p>` : ''}
          </div>
        ` : ''}
        
        <a href="https://sec-frontend.benjamin-sautersb.workers.dev/filing/${trade.accession_number}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
          View Full Filing →
        </a>
      </div>
      
      <div style="padding: 15px; background: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
        <p>SEC Insider Trading Alerts | <a href="https://sec-frontend.benjamin-sautersb.workers.dev/settings/alerts" style="color: #2563eb;">Manage Preferences</a></p>
      </div>
    </div>
  `;

  return { subject, bodyText, bodyHtml };
}

/**
 * Helper functions
 */
function createFingerprint(type, id, date) {
  const data = `${type}:${id}:${date}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

function calculatePriority(score) {
  if (score >= 90) return 10; // Critical
  if (score >= 80) return 8;  // High
  if (score >= 70) return 6;  // Medium-high
  if (score >= 60) return 4;  // Medium
  return 2; // Low
}

function getStrengthLabel(strength) {
  if (strength >= 90) return '🔥 EXTREME';
  if (strength >= 80) return '🔥 VERY HIGH';
  if (strength >= 70) return '🚀 HIGH';
  if (strength >= 60) return '⚡ MODERATE';
  return '📊 NOTABLE';
}

function formatNumber(num) {
  if (!num) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);
}
