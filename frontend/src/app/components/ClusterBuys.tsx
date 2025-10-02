'use client';

import { useEffect, useState } from 'react';
import { ClusterBuy, db } from '../../lib/database';
import { Calendar, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';
import FilingLink from './FilingLink';
import { TradesModal } from './TradesModal';

export function ClusterBuys() {
  const [clusters, setClusters] = useState<ClusterBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysWindow, setDaysWindow] = useState(7);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCompanyFilter, setModalCompanyFilter] = useState<{ symbol?: string; cik?: string; name?: string } | undefined>();
  const [modalInsiderFilter, setModalInsiderFilter] = useState<{ cik?: string; name?: string } | undefined>();

  useEffect(() => {
    fetchClusterBuys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysWindow]);

  const fetchClusterBuys = async () => {
    try {
      setLoading(true);
      const data = await db.getClusterBuys(daysWindow);
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCompanyClick = (symbol?: string, cik?: string, name?: string) => {
    setModalTitle(`All Trades: ${name}`);
    setModalCompanyFilter({ symbol, cik, name });
    setModalInsiderFilter(undefined);
    setModalOpen(true);
  };

  const handleInsiderClick = (cik?: string, name?: string) => {
    setModalTitle(`All Trades: ${name}`);
    setModalInsiderFilter({ cik, name });
    setModalCompanyFilter(undefined);
    setModalOpen(true);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cluster Buy Activity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Coordinated buying patterns by multiple insiders from the same company
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="days-window" className="text-sm font-medium text-gray-700">
              Time Window:
            </label>
            <select
              id="days-window"
              value={daysWindow}
              onChange={(e) => setDaysWindow(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
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
        <div className="space-y-6">
          {clusters.map((cluster, index) => {
            const significance = getClusterSignificance(cluster);
            const executiveCount = getExecutiveCount(cluster);
            
            return (
              <div key={`${cluster.issuer_name}-${cluster.transaction_date}-${index}`} 
                   className={`border rounded-lg p-6 hover:shadow-lg transition-all bg-gradient-to-r from-white to-blue-50 ${significance.color.includes('border') ? `border-2 ${significance.color.split(' ').find(c => c.includes('border'))}` : 'border-gray-200'}`}>
                
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
            );
          })}
        </div>
      )}

      <TradesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        companyFilter={modalCompanyFilter}
        insiderFilter={modalInsiderFilter}
      />
    </div>
  );
}
