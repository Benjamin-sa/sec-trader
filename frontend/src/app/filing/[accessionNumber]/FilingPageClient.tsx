'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Database, TradeData } from '@/lib/database';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function FilingPageClient() {
  const params = useParams();
  const router = useRouter();
  const accessionNumber = params.accessionNumber as string;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilingData = async () => {
      if (!accessionNumber) return;
      
      try {
        setLoading(true);
        const db = new Database();
        
        // Fetch all trades with this accession number
        const allTrades = await db.getLatestTrades(1000);
        const filingTrades = allTrades.filter(
          trade => trade.accession_number === accessionNumber
        );
        
        setTrades(filingTrades);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch filing data');
      } finally {
        setLoading(false);
      }
    };

    fetchFilingData();
  }, [accessionNumber]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShares = (shares: number | null) => {
    if (shares === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(shares);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate SEC filing URL
  const getSecFilingUrl = (cik: string) => {
    // Get CIK from first trade
    return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=4&dateb=&owner=include&count=100&search_text=`;
  };

  const getTransactionCodeExplanation = (code: string): { title: string; description: string; isPositive: boolean } => {
    const codes: Record<string, { title: string; description: string; isPositive: boolean }> = {
      'P': { 
        title: 'Open Market Purchase', 
        description: 'The insider bought shares on the open market, showing confidence in the company.',
        isPositive: true
      },
      'S': { 
        title: 'Open Market Sale', 
        description: 'The insider sold shares on the open market. Could be for personal reasons or lack of confidence.',
        isPositive: false
      },
      'A': { 
        title: 'Grant/Award', 
        description: 'Shares awarded to the insider as part of compensation (stock grants, restricted stock, etc.).',
        isPositive: true
      },
      'M': { 
        title: 'Exercise of Options', 
        description: 'The insider exercised stock options to acquire shares.',
        isPositive: true
      },
      'F': { 
        title: 'Payment of Exercise Price or Tax', 
        description: 'Shares withheld or sold to cover exercise price or taxes.',
        isPositive: false
      },
      'D': { 
        title: 'Sale to Issuer', 
        description: 'Shares sold back to the company.',
        isPositive: false
      },
      'G': { 
        title: 'Gift', 
        description: 'Shares transferred as a gift.',
        isPositive: false
      },
      'J': { 
        title: 'Other Acquisition', 
        description: 'Shares acquired through means other than a transaction.',
        isPositive: true
      },
    };
    
    return codes[code] || { 
      title: `Transaction Code: ${code}`, 
      description: 'See SEC documentation for details.',
      isPositive: false
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading filing details...</p>
        </div>
      </div>
    );
  }

  if (error || trades.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <div className="text-red-600 text-xl mb-4">
            {error || 'Filing Not Found'}
          </div>
          <p className="text-gray-600 mb-4">
            {error || 'The requested filing could not be found.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const primaryTrade = trades[0];
  const totalValue = trades.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
  const totalShares = trades.reduce((sum, t) => sum + (t.shares_transacted || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      SEC Form 4 Filing
                    </h1>
                    <p className="text-sm text-gray-500">
                      Accession: {accessionNumber}
                    </p>
                  </div>
                </div>
              </div>
              <a
                href={getSecFilingUrl(accessionNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>View on SEC.gov</span>
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* What is Form 4? */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                What is SEC Form 4?
              </h2>
              <p className="text-blue-800 text-sm leading-relaxed">
                Form 4 is a document that must be filed with the SEC by company insiders (officers, directors, and 
                beneficial owners of more than 10% of company stock) whenever they buy or sell company shares. 
                These filings must be submitted within <strong>two business days</strong> of the transaction, providing 
                transparency into insider trading activity. Analyzing these filings can help investors understand 
                insider sentiment and potential company developments.
              </p>
            </div>
          </div>
        </div>

        {/* Filing Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Company</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <button
                  onClick={() => router.push(`/company/${primaryTrade.issuer_cik}`)}
                  className="text-base font-medium text-blue-600 hover:text-blue-700"
                >
                  {primaryTrade.issuer_name}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-500">CIK</p>
                <p className="text-base font-medium text-gray-900">{primaryTrade.issuer_cik}</p>
              </div>
              {primaryTrade.trading_symbol && (
                <div>
                  <p className="text-sm text-gray-500">Ticker Symbol</p>
                  <p className="text-base font-medium text-gray-900">{primaryTrade.trading_symbol}</p>
                </div>
              )}
            </div>
          </div>

          {/* Insider Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserIcon className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Insider</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <button
                  onClick={() => router.push(`/insider?cik=${primaryTrade.person_cik}`)}
                  className="text-base font-medium text-blue-600 hover:text-blue-700"
                >
                  {primaryTrade.person_name}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-500">CIK</p>
                <p className="text-base font-medium text-gray-900">{primaryTrade.person_cik}</p>
              </div>
              {primaryTrade.officer_title && (
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="text-base font-medium text-gray-900">{primaryTrade.officer_title}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {primaryTrade.is_director && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Director
                  </span>
                )}
                {primaryTrade.is_officer && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Officer
                  </span>
                )}
                {primaryTrade.is_ten_percent_owner && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    10% Owner
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filing Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filing Details</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Form Type</p>
                <p className="text-base font-medium text-gray-900">{primaryTrade.form_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Filed On</p>
                <p className="text-base font-medium text-gray-900">{formatDateTime(primaryTrade.filed_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transaction Date</p>
                <p className="text-base font-medium text-gray-900">{formatDate(primaryTrade.transaction_date)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-900">{trades.length}</p>
              </div>
              <DocumentTextIcon className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Shares</p>
                <p className="text-3xl font-bold text-gray-900">{formatShares(totalShares)}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Value</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Transactions Detail */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transactions in This Filing</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {trades.map((trade, index) => {
              const codeInfo = getTransactionCodeExplanation(trade.transaction_code);
              const isAcquired = trade.acquired_disposed_code === 'A';
              
              return (
                <div 
                  key={`${trade.transaction_id || index}`}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  {/* Transaction Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {trade.security_title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${
                          isAcquired 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isAcquired ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : (
                            <XCircleIcon className="h-4 w-4" />
                          )}
                          {isAcquired ? 'Acquired' : 'Disposed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{trade.transaction_description}</p>
                    </div>
                  </div>

                  {/* Transaction Code Explanation */}
                  <div className={`rounded-lg p-4 mb-4 ${
                    codeInfo.isPositive ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <InformationCircleIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        codeInfo.isPositive ? 'text-green-600' : 'text-orange-600'
                      }`} />
                      <div>
                        <p className={`font-semibold text-sm mb-1 ${
                          codeInfo.isPositive ? 'text-green-900' : 'text-orange-900'
                        }`}>
                          {codeInfo.title}
                        </p>
                        <p className={`text-sm ${
                          codeInfo.isPositive ? 'text-green-800' : 'text-orange-800'
                        }`}>
                          {codeInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shares</p>
                      <p className="text-lg font-semibold text-gray-900">{formatShares(trade.shares_transacted)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Price per Share</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {trade.price_per_share !== null ? `$${trade.price_per_share.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(trade.transaction_value)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shares Owned After</p>
                      <p className="text-lg font-semibold text-gray-900">{formatShares(trade.shares_owned_following)}</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Ownership: </span>
                        <span className="font-medium text-gray-900">
                          {trade.direct_or_indirect === 'D' ? 'Direct' : 'Indirect'}
                        </span>
                      </div>
                      {trade.is_10b5_1_plan && (
                        <div>
                          <span className="text-gray-500">10b5-1 Plan: </span>
                          <span className="font-medium text-gray-900">Yes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Educational Footer */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            How to Interpret Insider Transactions
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">✓ Bullish Signals</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Multiple insiders buying</li>
                <li>Open market purchases (Code P)</li>
                <li>Large purchases relative to salary</li>
                <li>C-suite executives buying</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">⚠ Bearish Signals</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Multiple insiders selling</li>
                <li>Large sales not part of 10b5-1 plans</li>
                <li>Unusual selling patterns</li>
                <li>Selling soon after grants/awards</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-600 italic">
            Note: Not all insider selling is negative. Insiders may sell for personal financial reasons, 
            diversification, or predetermined trading plans (10b5-1). Always consider the context and broader market conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
