'use client';

import { useEffect, useState } from 'react';
import { TradeData, db } from '../../lib/database';
import { Calendar, Building2, User, DollarSign, AlertTriangle, Crown } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';

export function ImportantTrades() {
  // Importance definition (finance-savvy):
  // - Prefer open‑market purchases (A/P). Exclude most awards/grants.
  // - Rank by transaction value, role (CEO/CFO > other officers > directors), and 10% owner.
  // - Boost when cluster buying (>=2 insiders in ±3 days for same issuer).
  // - Boost when trade size is a large fraction of insider's holdings (>=25%, >=50%).
  // - Penalize indirect ownership and 10b5‑1 plans on sales (pre‑planned, less signal).
  // Backend computes importance_score, pct_of_holdings, cluster_size, is_10b5_1_plan; frontend falls back if absent.
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImportantTrades();
  }, []);

  const fetchImportantTrades = async () => {
    try {
      setLoading(true);
      const data = await db.getImportantTrades();
      setTrades(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch important trades');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getImportanceLevel = (trade: TradeData): { level: string; color: string; reasons: string[] } => {
    const reasons: string[] = [];

    // Prefer server-provided importance_score if present
    const score = typeof trade.importance_score === 'number' ? trade.importance_score : (() => {
      let s = 0;
      const tv = trade.transaction_value || 0;
      if (tv >= 10000000) s += 100; else if (tv >= 2500000) s += 60; else if (tv >= 1000000) s += 40; else if (tv >= 250000) s += 20; else if (tv > 0) s += 10;
      if (trade.acquired_disposed_code === 'A' && trade.transaction_code === 'P') s += 30; else if (trade.acquired_disposed_code === 'D' && trade.transaction_code === 'S') s -= 10;
      if (trade.is_officer && trade.officer_title) {
        const t = trade.officer_title.toLowerCase();
        if (t.includes('chief executive') || t.includes('ceo') || t.includes('chief financial') || t.includes('cfo')) s += 30; else s += 15;
      } else if (trade.is_director) {
        s += 10;
      }
      if (trade.is_ten_percent_owner) s += 20;
      if (trade.shares_transacted && trade.shares_owned_following) {
        const denom = trade.shares_owned_following + (trade.acquired_disposed_code === 'D' ? (trade.shares_transacted || 0) : 0);
        if (denom > 0) {
          const pct = (trade.shares_transacted || 0) / denom;
          if (pct >= 0.5) s += 30; else if (pct >= 0.25) s += 20;
          if (pct >= 0.25) reasons.push(`${Math.round(pct * 100)}% of holdings`);
        }
      }
      return s;
    })();

    // Reasons
    if (trade.acquired_disposed_code === 'A' && trade.transaction_code === 'P') {
      reasons.push('Open-market purchase');
    } else if (trade.acquired_disposed_code === 'D' && trade.transaction_code === 'S') {
      reasons.push('Open-market sale');
    }
    if (trade.transaction_value && trade.transaction_value >= 10000000) reasons.push('Very high value (>$10M)');
    else if (trade.transaction_value && trade.transaction_value >= 2500000) reasons.push('Large value (>$2.5M)');
    else if (trade.transaction_value && trade.transaction_value >= 1000000) reasons.push('High value (>$1M)');

    if (trade.is_ten_percent_owner) reasons.push('10%+ Owner');
    if (trade.is_officer && trade.officer_title) reasons.push(trade.officer_title);
    else if (trade.is_director) reasons.push('Board Director');

    if (typeof trade.cluster_size === 'number' && trade.cluster_size >= 2) {
      reasons.push(`Cluster buying (${trade.cluster_size} insiders)`);
    }

    // Levels by score (tightened thresholds)
    let level = 'low';
    let color = 'bg-gray-100 text-gray-800';
    // Grants/awards should never be prioritized
    if (trade.transaction_code === 'A') {
      reasons.push('Grant/Award');
      return { level, color, reasons };
    }
    if (score >= 130) { level = 'critical'; color = 'bg-red-100 text-red-800'; }
    else if (score >= 95) { level = 'high'; color = 'bg-orange-100 text-orange-800'; }
    else if (score >= 70) { level = 'elevated'; color = 'bg-amber-100 text-amber-800'; }
    else if (score >= 45) { level = 'medium'; color = 'bg-yellow-100 text-yellow-800'; }

    return { level, color, reasons };
  };

  const getTransactionTypeColor = (code: string, acquired: string) => {
    if (acquired === 'A') {
      return code === 'P' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    } else {
      return code === 'S' ? 'bg-red-100 text-red-800' : 'bg-pink-100 text-pink-800';
    }
  };

  const getTransactionTypeIcon = (disposedCode: string) => {
    return disposedCode === 'A' ? '📈' : '📉';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">❌ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchImportantTrades}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Important Insider Trades</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            High-value transactions, executive trades, and significant ownership changes
          </p>
        </div>
        <button
          onClick={fetchImportantTrades}
          className="self-start sm:self-auto px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">🚨</div>
          <p className="text-gray-500">No important trades found</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {trades.map((trade, index) => {
            const importance = getImportanceLevel(trade);
            
            return (
              <div key={trade.transaction_id || `${trade.accession_number}-${trade.person_cik}-${trade.transaction_code}-${trade.shares_transacted}-${index}`} className="border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium uppercase tracking-wide ${importance.color}`}>
                        {importance.level} Priority
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {trade.issuer_name}
                        {trade.trading_symbol && (
                          <span className="ml-1 sm:ml-2 text-sm sm:text-base font-normal text-gray-600">
                            ({trade.trading_symbol})
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm sm:text-base font-medium text-gray-700">{trade.person_name}</span>
                      {trade.officer_title && (
                        <span className="text-xs sm:text-sm text-gray-600">• {trade.officer_title}</span>
                      )}
                      {(trade.is_director || trade.is_officer || trade.is_ten_percent_owner) && (
                        <Crown className="h-4 w-4 text-purple-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Filed: {formatDate(trade.filed_at)}
                      </div>
                      <div>Transaction: {formatDate(trade.transaction_date)}</div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end gap-2">
                    <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getTransactionTypeColor(trade.transaction_code, trade.acquired_disposed_code)}`}>
                      {getTransactionTypeIcon(trade.acquired_disposed_code)} {trade.transaction_description}
                    </span>
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {formatCurrency(trade.transaction_value)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {formatNumber(trade.shares_transacted)} shares @ {formatCurrency(trade.price_per_share)}
                      </div>
                      {typeof trade.pct_of_holdings === 'number' && trade.pct_of_holdings > 0 ? (
                        <div className="text-[11px] sm:text-xs text-gray-500">~{Math.round(trade.pct_of_holdings * 100)}% of holdings</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Importance Reasons */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {importance.reasons.map((reason, index) => (
                      <span key={index} className="px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 text-[11px] sm:text-xs rounded-full">
                        {reason}
                      </span>
                    ))}
                    {trade.direct_or_indirect === 'I' && (
                      <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-[11px] sm:text-xs rounded-full">Indirect ownership</span>
                    )}
                    {Boolean((trade as unknown as { is_10b5_1_plan?: boolean | number }).is_10b5_1_plan) && (
                      <span className="px-2 py-0.5 sm:py-1 bg-yellow-50 text-yellow-800 text-[11px] sm:text-xs rounded-full">10b5-1 Plan</span>
                    )}
                  </div>
                </div>

                {/* Executive Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {trade.is_director && (
                      <span className="px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-800 text-[11px] sm:text-xs font-medium rounded">
                        Board Director
                      </span>
                    )}
                    {trade.is_officer && (
                      <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 text-[11px] sm:text-xs font-medium rounded">
                        {trade.officer_title || 'C-Suite Officer'}
                      </span>
                    )}
                    {trade.is_ten_percent_owner && (
                      <span className="px-2 py-0.5 sm:py-1 bg-red-100 text-red-800 text-[11px] sm:text-xs font-medium rounded">
                        10%+ Owner
                      </span>
                    )}
                    {typeof trade.cluster_size === 'number' && trade.cluster_size >= 2 && (
                      <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-[11px] sm:text-xs font-medium rounded">
                        Cluster Buy: {trade.cluster_size}
                      </span>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Owns After Transaction</div>
                    <div className="text-sm sm:text-base font-medium text-gray-900">
                      {formatNumber(trade.shares_owned_following)} shares
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
