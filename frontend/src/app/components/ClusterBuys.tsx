'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClusterBuy } from '../../lib/database';
import { cachedApiClient } from '../../lib/cached-api-client';
import { Calendar, Users, DollarSign, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';
import FilingLink from './FilingLink';

export function ClusterBuys() {
  const [clusters, setClusters] = useState<ClusterBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysWindow, setDaysWindow] = useState(7);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleCard = (clusterId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };
  useEffect(() => {
    fetchClusterBuys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysWindow]);

  const fetchClusterBuys = async () => {
    try {
      setLoading(true);
      const data = await cachedApiClient.getClusterBuys(daysWindow);
      setClusters(data);
      setError(null);
    } catch {
      setError('Failed to fetch cluster buys');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatNumberCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCompanyClick = (symbol?: string, cik?: string) => {
    if (cik) {
      router.push(`/company/${cik}`);
    }
  };

  const handleInsiderClick = (cik?: string) => {
    if (cik) {
      router.push(`/insider?cik=${cik}`);
    }
  };

  const getClusterSignificance = (cluster: ClusterBuy): { level: string; color: string; description: string } => {
    if (cluster.total_value > 50000000 || cluster.total_insiders >= 5) {
      return {
        level: 'Critical',
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Extremely significant coordinated buying activity'
      };
    } else if (cluster.total_value > 10000000 || cluster.total_insiders >= 3) {
      return {
        level: 'High',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Significant coordinated buying activity'
      };
    } else {
      return {
        level: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Notable coordinated buying activity'
      };
    }
  };

  const getExecutiveCount = (cluster: ClusterBuy): { directors: number; officers: number } => {
    const directors = cluster.trades.filter(trade => trade.is_director).length;
    const officers = cluster.trades.filter(trade => trade.is_officer).length;
    return { directors, officers };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-40"></div>
                  <div className="h-3 bg-gray-200 rounded w-60"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 bg-gray-200 rounded"></div>
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
            onClick={fetchClusterBuys}
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Cluster Buy Activity</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Coordinated buying patterns by multiple insiders
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="days-window" className="text-xs sm:text-sm font-medium text-gray-700">
              Time:
            </label>
            <select
              id="days-window"
              value={daysWindow}
              onChange={(e) => setDaysWindow(Number(e.target.value))}
              className="flex-1 sm:flex-none border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1 Day</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
          <button 
            onClick={fetchClusterBuys}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">👥</div>
          <p className="text-gray-500">No cluster buying activity found</p>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting the time window to find patterns
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-6">
          {clusters.map((cluster, index) => {
            const significance = getClusterSignificance(cluster);
            const executiveCount = getExecutiveCount(cluster);
            const clusterId = `${cluster.issuer_name}-${cluster.transaction_date}-${index}`;
            const isExpanded = expandedCards.has(clusterId);
            
            return (
              <div key={clusterId} 
                   className={`border rounded-lg hover:shadow-lg transition-all bg-gradient-to-r from-white to-blue-50 overflow-hidden ${significance.color.includes('border') ? `border-2 ${significance.color.split(' ').find(c => c.includes('border'))}` : 'border-gray-200'}`}>
                
                {/* Mobile: Compact Card */}
                <div className="sm:hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${significance.color.split(' ').slice(0, 2).join(' ')}`}>
                            {significance.level}
                          </span>
                        </div>
                        <div className="mb-1.5">
                          <ClickableCompany
                            name={cluster.issuer_name}
                            symbol={cluster.trading_symbol}
                            cik={cluster.trades[0]?.issuer_cik}
                            className="text-sm font-bold text-gray-900 leading-tight line-clamp-1"
                            onClick={handleCompanyClick}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 leading-tight line-clamp-2">{significance.description}</p>
                      </div>
                    </div>

                    {/* Key Metrics - Always Visible */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-white rounded-lg p-2">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <Users className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="text-sm font-bold text-blue-600 leading-tight">{cluster.total_insiders}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">Insiders</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        </div>
                        <div className="text-sm font-bold text-green-600 leading-tight">{formatNumberCompact(cluster.total_shares)}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">Shares</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <DollarSign className="h-3 w-3 text-purple-600" />
                        </div>
                        <div className="text-sm font-bold text-purple-600 leading-tight">{formatCurrencyCompact(cluster.total_value)}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">Value</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                      <span>{formatDate(cluster.transaction_date)}</span>
                      <button
                        onClick={() => toggleCard(clusterId)}
                        className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 active:text-blue-800 px-2 py-1 -mr-2 rounded"
                      >
                        {isExpanded ? (
                          <>Less <ChevronUp className="h-4 w-4" /></>
                        ) : (
                          <>Insiders <ChevronDown className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {/* Executive Breakdown */}
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Executive Mix:</div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-purple-700">{executiveCount.directors} Directors</span>
                          <span className="text-blue-700">{executiveCount.officers} Officers</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Avg: {formatCurrencyCompact(cluster.total_value / cluster.total_insiders)} per insider
                        </div>
                      </div>

                      {/* Individual Trades */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Individual Transactions:</h4>
                        <div className="space-y-2">
                          {cluster.trades.map((trade, tradeIndex) => (
                            <div key={`${trade.accession_number}-${tradeIndex}`} 
                                 className="flex justify-between items-start gap-2 p-2.5 bg-gray-50 rounded-md">
                              <div className="flex items-start gap-2 flex-1 min-w-0 overflow-hidden">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-blue-600">
                                    {trade.person_name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <ClickableInsider
                                    name={trade.person_name}
                                    cik={trade.person_cik}
                                    title={trade.officer_title}
                                    onClick={handleInsiderClick}
                                    className="text-xs font-medium truncate"
                                  />
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {trade.is_director && <span className="text-[10px] text-purple-600">Director</span>}
                                    {trade.is_officer && <span className="text-[10px] text-blue-600">Officer</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 min-w-[65px]">
                                <div className="text-xs font-semibold text-gray-900 leading-tight">
                                  {formatCurrencyCompact(trade.transaction_value || 0)}
                                </div>
                                <div className="text-[9px] text-gray-500 leading-tight mt-0.5">
                                  {formatNumberCompact(trade.shares_transacted || 0)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop: Full Card */}
                <div className="hidden sm:block p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${significance.color.split(' ').slice(0, 2).join(' ')}`}>
                          {significance.level} Alert
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <ClickableCompany
                          name={cluster.issuer_name}
                          symbol={cluster.trading_symbol}
                          cik={cluster.trades[0]?.issuer_cik}
                          className="text-xl font-bold"
                          onClick={handleCompanyClick}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{significance.description}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Transaction Date: {formatDate(cluster.transaction_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cluster Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Insiders</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {cluster.total_insiders}
                      </div>
                      <div className="text-xs text-gray-500">
                        {executiveCount.directors}D / {executiveCount.officers}O
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total Shares</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(cluster.total_shares)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total Value</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(cluster.total_value)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg per Insider</div>
                      <div className="text-lg font-bold text-gray-700">
                        {formatCurrency(cluster.total_value / cluster.total_insiders)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(Math.round(cluster.total_shares / cluster.total_insiders))} shares
                      </div>
                    </div>
                  </div>

                  {/* Individual Trades */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Individual Transactions:</h4>
                    <div className="space-y-2">
                      {cluster.trades.map((trade, tradeIndex) => (
                        <div key={`${trade.accession_number}-${tradeIndex}`} 
                             className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-blue-600">
                                {trade.person_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <ClickableInsider
                                name={trade.person_name}
                                cik={trade.person_cik}
                                title={trade.officer_title}
                                onClick={handleInsiderClick}
                                className="text-sm"
                              />
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>Filed: </span>
                                <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} />
                                {trade.is_director && <span className="ml-1 text-purple-600">• Director</span>}
                                {trade.is_officer && <span className="ml-1 text-blue-600">• Officer</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(trade.transaction_value || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatNumber(trade.shares_transacted || 0)} shares
                            </div>
                          </div>
                        </div>
                      ))}
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
