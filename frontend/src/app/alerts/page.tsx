'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { 
  BellIcon, 
  Cog6ToothIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';

interface AlertPreferences {
  notifications_enabled: boolean;
  email_verified: boolean;
  notification_email?: string;
  cluster_buy_alerts: boolean;
  important_trade_alerts: boolean;
  first_buy_alerts: boolean;
  cluster_min_insiders: number;
  cluster_min_value: number;
  cluster_min_strength: number;
  important_trade_min_score: number;
  digest_mode: boolean;
  digest_time: string;
  max_alerts_per_day: number;
  watched_companies?: string;
  watched_sectors?: string;
  excluded_companies?: string;
}

interface NotificationStats {
  counts: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  recent: Array<{
    notification_type: string;
    issuer_cik: string;
    issuer_name: string;
    subject: string;
    sent_at: string;
  }>;
}

export default function AlertsPage() {
  const { data: session, isPending } = useSession();
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [watchlistInput, setWatchlistInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  useEffect(() => {
    if (!isPending && session?.user) {
      loadPreferences();
      loadStats();
    } else if (!isPending) {
      setLoading(false);
    }
  }, [session, isPending]);

  const loadPreferences = async () => {
    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/preferences', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const savePreferences = async (updates: Partial<AlertPreferences>) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const sendTestEmail = async () => {
    setTestingEmail(true);
    setMessage(null);

    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/test', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent! Check your inbox.' });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      setMessage({ type: 'error', text: 'Failed to send test email. Please try again.' });
    } finally {
      setTestingEmail(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const addToWatchlist = async () => {
    if (!watchlistInput.trim()) return;

    const companies = watchlistInput.split(',').map(c => c.trim()).filter(Boolean);
    
    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'add', companies }),
      });

      if (response.ok) {
        setWatchlistInput('');
        await loadPreferences();
        setMessage({ type: 'success', text: 'Watchlist updated!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    }
  };

  const removeFromWatchlist = async (company: string) => {
    try {
      const response = await fetch('https://auth-worker.benjamin-sautersb.workers.dev/api/alerts/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'remove', companies: [company] }),
      });

      if (response.ok) {
        await loadPreferences();
        setMessage({ type: 'success', text: 'Removed from watchlist' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alert settings...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BellIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to manage your alert preferences and receive notifications about insider trading activity.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const watchlist = preferences?.watched_companies 
    ? preferences.watched_companies.split(',').filter(Boolean) 
    : [];

  const excludeList = preferences?.excluded_companies 
    ? preferences.excluded_companies.split(',').filter(Boolean) 
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
              <BellAlertIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Alert Settings</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Configure how you want to be notified about important insider trading activity
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-2xl font-bold text-blue-600">{stats.counts.today}</div>
              <div className="text-sm text-gray-600">Today</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-2xl font-bold text-blue-600">{stats.counts.week}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-2xl font-bold text-blue-600">{stats.counts.month}</div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-2xl font-bold text-blue-600">{stats.counts.total}</div>
              <div className="text-sm text-gray-600">All Time</div>
            </div>
          </div>
        )}

        {/* Main Settings */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Enable Notifications */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BellIcon className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences?.notifications_enabled || false}
                    onChange={(e) => savePreferences({ notifications_enabled: e.target.checked })}
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Receive email alerts when insider trading signals match your preferences
              </p>
              
              {preferences?.notifications_enabled && (
                <>
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={session.user.email}
                      value={preferences?.notification_email || ''}
                      onChange={(e) => setPreferences({ ...preferences!, notification_email: e.target.value })}
                      onBlur={(e) => e.target.value && savePreferences({ notification_email: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to use your account email
                    </p>
                  </div>

                  <button
                    onClick={sendTestEmail}
                    disabled={testingEmail || saving}
                    className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingEmail ? 'Sending...' : 'Send Test Email'}
                  </button>
                </>
              )}
            </div>

            {/* Alert Types */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                Alert Types
              </h3>
              
              <div className="space-y-4">
                {/* Cluster Buys */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="cluster_alerts"
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={preferences?.cluster_buy_alerts || false}
                    onChange={(e) => savePreferences({ cluster_buy_alerts: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="cluster_alerts" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-purple-600" />
                      Cluster Buy Alerts
                    </div>
                    <div className="text-sm text-gray-600">
                      When multiple insiders buy at the same time
                    </div>
                  </label>
                </div>

                {/* Important Trades */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="important_alerts"
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={preferences?.important_trade_alerts || false}
                    onChange={(e) => savePreferences({ important_trade_alerts: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="important_alerts" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                      Important Trade Alerts
                    </div>
                    <div className="text-sm text-gray-600">
                      High-value trades by executives and key insiders
                    </div>
                  </label>
                </div>

                {/* First Buys */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="first_buy_alerts"
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={preferences?.first_buy_alerts || false}
                    onChange={(e) => savePreferences({ first_buy_alerts: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="first_buy_alerts" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <ChartBarIcon className="h-5 w-5 text-amber-600" />
                      First Buy Alerts
                    </div>
                    <div className="text-sm text-gray-600">
                      When an insider buys for the first time in 12+ months
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon className="h-6 w-6 text-blue-600" />
                Delivery Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="digest_mode"
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={preferences?.digest_mode || false}
                    onChange={(e) => savePreferences({ digest_mode: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="digest_mode" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">Daily Digest Mode</div>
                    <div className="text-sm text-gray-600">
                      Receive one email per day with all alerts instead of real-time notifications
                    </div>
                  </label>
                </div>

                {preferences?.digest_mode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Digest Time (UTC)
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={preferences?.digest_time || '09:00'}
                      onChange={(e) => savePreferences({ digest_time: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Alerts Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={preferences?.max_alerts_per_day || 20}
                    onChange={(e) => savePreferences({ max_alerts_per_day: parseInt(e.target.value) })}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Prevents spam by limiting daily notifications
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Thresholds */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                Alert Thresholds
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cluster: Min Insiders
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={preferences?.cluster_min_insiders || 2}
                    onChange={(e) => savePreferences({ cluster_min_insiders: parseInt(e.target.value) })}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cluster: Min Total Value ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={preferences?.cluster_min_value || 1000000}
                    onChange={(e) => savePreferences({ cluster_min_value: parseFloat(e.target.value) })}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: $1,000,000
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cluster: Min Signal Strength (0-100)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full"
                    value={preferences?.cluster_min_strength || 60}
                    onChange={(e) => savePreferences({ cluster_min_strength: parseInt(e.target.value) })}
                    disabled={saving}
                  />
                  <div className="text-sm text-gray-600 text-center">
                    {preferences?.cluster_min_strength || 60}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Important Trade: Min Score (0-100)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full"
                    value={preferences?.important_trade_min_score || 70}
                    onChange={(e) => savePreferences({ important_trade_min_score: parseInt(e.target.value) })}
                    disabled={saving}
                  />
                  <div className="text-sm text-gray-600 text-center">
                    {preferences?.important_trade_min_score || 70}
                  </div>
                </div>
              </div>
            </div>

            {/* Watchlist */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Company Watchlist
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Only receive alerts for these companies (leave empty for all companies)
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="AAPL, MSFT, or CIK numbers"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
                />
                <button
                  onClick={addToWatchlist}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!watchlistInput.trim()}
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {watchlist.map((company) => (
                  <span
                    key={company}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {company}
                    <button
                      onClick={() => removeFromWatchlist(company)}
                      className="hover:text-blue-900"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
                {watchlist.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No companies in watchlist</p>
                )}
              </div>
            </div>

            {/* Recent Notifications */}
            {stats && stats.recent.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Notifications
                </h3>
                <div className="space-y-3">
                  {stats.recent.map((notif, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="text-sm font-medium text-gray-900">{notif.subject}</div>
                      <div className="text-xs text-gray-500">
                        {notif.issuer_name} • {new Date(notif.sent_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
