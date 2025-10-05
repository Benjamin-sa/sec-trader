'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TradeData } from '@/lib/database';
import { MarketBarsResponse, NewsArticle } from '@/lib/api-client';
import { cachedApiClient, cachedAlpacaClient } from '@/lib/cached-api-client';
import { 
  ArrowLeftIcon, 
  BuildingOfficeIcon, 
  ChartBarIcon, 
  NewspaperIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import MarketChart from '@/app/components/MarketChartInteractive';
import CompanyNews from '@/app/components/CompanyNews';
import FilingLink from '@/app/components/FilingLink';

export default function CompanyPageClient() {
  const params = useParams();
  const router = useRouter();
  const cik = params.cik as string;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [tradingSymbol, setTradingSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketBarsResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'market' | 'news'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(3); // Default 3 months
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1Day'); // Default daily bars

  useEffect(() => {
    const fetchCompanyTrades = async () => {
      if (!cik) return;
      
      try {
        setLoading(true);
        const result = await cachedApiClient.getTradesByCompany(undefined, cik, undefined, 100);
        setTrades(result);
        
        // Set company name and symbol from first trade
        if (result.length > 0) {
          setCompanyName(result[0].issuer_name);
          setTradingSymbol(result[0].trading_symbol);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch company trades');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyTrades();
  }, [cik]);

  // Fetch news when symbol is available
  useEffect(() => {
    const fetchNews = async () => {
      if (!tradingSymbol) return;
      
      try {
        setNewsLoading(true);
        setNewsError(null);
        const response = await cachedAlpacaClient.getNewsBySymbol(tradingSymbol, 20, 30);
        setNews(response.news);
      } catch (err) {
        console.error('Error fetching news:', err);
        setNewsError(err instanceof Error ? err.message : 'Failed to fetch news');
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [tradingSymbol]);

  useEffect(() => {
    const fetchMarketData = async () => {
      if (!tradingSymbol || activeTab !== 'market') return;
      
      try {
        setMarketLoading(true);
        setMarketError(null);
        const data = await cachedAlpacaClient.getMarketBars(tradingSymbol, selectedTimeframe, selectedTimeRange, true);
        setMarketData(data);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setMarketError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setMarketLoading(false);
      }
    };

    fetchMarketData();
  }, [tradingSymbol, activeTab, selectedTimeRange, selectedTimeframe]);

  const handleTimeRangeChange = (months: number) => {
    setSelectedTimeRange(months);
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

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
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate insider activity statistics
  const calculateInsiderStats = () => {
    const recentTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.transaction_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return tradeDate >= thirtyDaysAgo;
    });

    const buys = trades.filter(t => t.acquired_disposed_code === 'A');
    const sells = trades.filter(t => t.acquired_disposed_code === 'D');
    
    const totalBuyValue = buys.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
    const totalSellValue = sells.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
    
    const uniqueInsiders = new Set(trades.map(t => t.person_cik)).size;
    
    return {
      recentTradesCount: recentTrades.length,
      totalBuys: buys.length,
      totalSells: sells.length,
      totalBuyValue,
      totalSellValue,
      netValue: totalBuyValue - totalSellValue,
      uniqueInsiders,
    };
  };

  const insiderStats = trades.length > 0 ? calculateInsiderStats() : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company trades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading company data</div>
          <p className="text-gray-600 mb-4">{error}</p>
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

  if (trades.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">No trades found for this company.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Breadcrumb & Company Info */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              <BuildingOfficeIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words mb-1">
                {companyName || 'Company Profile'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">CIK: {cik}</span>
                {tradingSymbol && (
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">{tradingSymbol}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center`}
              >
                <BuildingOfficeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Info</span>
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`${
                  activeTab === 'news'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center ${!tradingSymbol ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!tradingSymbol}
              >
                <NewspaperIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span>News</span>
                {news.length > 0 && <span className="ml-1">({news.length})</span>}
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`${
                  activeTab === 'market'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center ${!tradingSymbol ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!tradingSymbol}
              >
                <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Market Data</span>
                <span className="sm:hidden">Market</span>
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`${
                  activeTab === 'trades'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center`}
              >
                <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span>Trades</span>
                <span className="ml-1">({trades.length})</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && insiderStats && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Recent Trades (30d)</p>
                    <p className="text-3xl font-bold text-gray-900">{insiderStats.recentTradesCount}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Total Buys */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Buys</p>
                    <p className="text-3xl font-bold text-green-600">{insiderStats.totalBuys}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(insiderStats.totalBuyValue)}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Total Sells */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Sells</p>
                    <p className="text-3xl font-bold text-red-600">{insiderStats.totalSells}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(insiderStats.totalSellValue)}</p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Net Sentiment */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Net Value</p>
                    <p className={`text-3xl font-bold ${insiderStats.netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {insiderStats.netValue >= 0 ? '+' : ''}{formatCurrency(insiderStats.netValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{insiderStats.uniqueInsiders} Insiders</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    insiderStats.netValue >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <UsersIcon className={`h-6 w-6 ${insiderStats.netValue >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trades Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Insider Activity</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Insider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trades.slice(0, 10).map((trade, index) => (
                      <tr key={`${trade.accession_number}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(trade.transaction_date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{trade.person_name}</div>
                          <div className="text-sm text-gray-500">{trade.officer_title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            trade.acquired_disposed_code === 'A' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.acquired_disposed_code === 'A' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatShares(trade.shares_transacted)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(trade.transaction_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setActiveTab('trades')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View all {trades.length} trades →
                </button>
              </div>
            </div>

            {/* Latest News Preview (if available) */}
            {tradingSymbol && news.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Latest News</h2>
                  <button
                    onClick={() => setActiveTab('news')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View all →
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {news.slice(0, 3).map((article) => (
                    <div key={article.id} className="p-6 hover:bg-gray-50">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          {article.headline}
                        </a>
                      </h3>
                      {article.summary && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{article.summary}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(article.createdAt).toLocaleDateString()} • {article.source}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* News Tab */}
        {activeTab === 'news' && tradingSymbol && (
          <CompanyNews 
            news={news} 
            loading={newsLoading} 
            error={newsError} 
            symbol={tradingSymbol}
          />
        )}

        {/* All Trades Tab */}
        {activeTab === 'trades' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Insider Trades ({trades.length})
              </h2>
            </div>

          {trades.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No trades found for this company.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trades.map((trade, index) => (
                    <tr key={`${trade.accession_number}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{formatDate(trade.transaction_date)}</div>
                          <div className="text-gray-500 text-xs">Filed: <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} /></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trade.person_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trade.officer_title && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
                                {trade.officer_title}
                              </span>
                            )}
                            {trade.is_director && (
                              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1">
                                Director
                              </span>
                            )}
                            {trade.is_ten_percent_owner && (
                              <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                10% Owner
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            trade.acquired_disposed_code === 'A' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.acquired_disposed_code === 'A' ? 'Buy' : 'Sell'}
                          </span>
                          <div className="text-gray-500 text-xs mt-1">
                            {trade.security_title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatShares(trade.shares_transacted)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.price_per_share !== null ? `$${trade.price_per_share.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(trade.transaction_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        )}

        {/* Market Data Tab */}
        {activeTab === 'market' && (
          <div>
            {!tradingSymbol ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Trading Symbol Available
                </h3>
                <p className="text-gray-600">
                  This company doesn&apos;t have a trading symbol associated with it.
                </p>
              </div>
            ) : marketError ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-red-600 text-xl mb-4">Error Loading Market Data</div>
                <p className="text-gray-600 mb-4">{marketError}</p>
                <p className="text-sm text-gray-500">
                  Note: Market data may not be available for all symbols or may require a valid Alpaca API key.
                </p>
              </div>
            ) : marketLoading ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : marketData ? (
              <MarketChart
                symbol={tradingSymbol}
                bars={marketData.bars}
                analysis={marketData.analysis}
                significantMoves={marketData.significantMoves}
                onTimeRangeChange={handleTimeRangeChange}
                currentTimeRange={selectedTimeRange}
                onTimeframeChange={handleTimeframeChange}
                currentTimeframe={selectedTimeframe}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
