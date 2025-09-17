'use client';

import { useEffect, useState } from 'react';
import { TradeData, db } from '../../lib/database';
import { Calendar, Building2, User, Sparkles } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';
import { TradesModal } from './TradesModal';

export function FirstBuys() {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCompanyFilter, setModalCompanyFilter] = useState<{symbol?: string; cik?: string; name?: string} | undefined>();
  const [modalInsiderFilter, setModalInsiderFilter] = useState<{cik?: string; name?: string} | undefined>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await db.getFirstBuys(45, 365);
      setTrades(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch first-time buys');
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
      day: 'numeric',
    });
  };

  const handleCompanyClick = (symbol?: string, cik?: string, name?: string) => {
    setModalTitle(`First Buys for ${name}${symbol ? ` (${symbol})` : ''}`);
    setModalCompanyFilter({ symbol, cik, name });
    setModalInsiderFilter(undefined);
    setModalOpen(true);
  };

  const handleInsiderClick = (cik?: string, name?: string) => {
    setModalTitle(`First Buys for ${name}`);
    setModalInsiderFilter({ cik, name });
    setModalCompanyFilter(undefined);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
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
      <div className="p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">❌ Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchData}
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
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">First Buys (12M)</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Open-market insider purchases where the insider hadn’t bought in the prior 12 months
          </p>
        </div>
        <button
          onClick={fetchData}
          className="self-start sm:self-auto px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">🛎️</div>
          <p className="text-gray-500">No first-time buys in this window</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {trades.map((t) => (
            <div key={t.transaction_id || `${t.accession_number}-${t.person_cik}-${t.transaction_code}-${t.shares_transacted}`} className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium uppercase tracking-wide bg-green-100 text-green-800">
                  First Buy (12M)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 min-w-0">
                    <ClickableCompany
                      name={t.issuer_name}
                      symbol={t.trading_symbol}
                      cik={t.issuer_cik}
                      onClick={handleCompanyClick}
                      className="text-base sm:text-lg font-semibold"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <ClickableInsider
                      name={t.person_name}
                      cik={t.person_cik}
                      title={t.officer_title}
                      onClick={handleInsiderClick}
                      className="text-sm sm:text-base font-medium"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Filed: {formatDate(t.filed_at)}
                    </div>
                    <div>Transaction: {formatDate(t.transaction_date)}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {formatCurrency(t.transaction_value)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {formatNumber(t.shares_transacted)} shares @ {formatCurrency(t.price_per_share)}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
