'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { TradeData } from '../../lib/database';
import { PaginationMetadata } from '../../lib/api-client';
import { cachedApiClient } from '../../lib/cached-api-client';
import { useCurrencyFormatter, useNumberFormatter } from '@/hooks/useTranslation';
import { Calendar, Search, ExternalLink } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';
import FilingLink from './FilingLink';
import TransactionBadge from '@/components/TransactionBadge';
import { Pagination } from '@/components/Pagination';
import { useRouter } from 'next/navigation';


// Helper functions
const formatCurrency = (value: number | null, currencyFormatter: Intl.NumberFormat, t: (key: string) => string) => {
  if (!value) return t('common.noData');

  // For very large values, use compact notation
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  // For smaller values, round to nearest dollar
  return currencyFormatter.format(Math.round(value));
};

const formatPrice = (value: number | null, t: (key: string) => string) => {
  if (!value) return t('common.noData');
  
  // For stock prices, show 2 decimal places but round appropriately
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number | null, numberFormatter: Intl.NumberFormat, t: (key: string) => string) => {
  if (!value) return t('common.noData');
  
  // For very large numbers, use compact notation
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  // For shares, round to whole numbers
  return numberFormatter.format(Math.round(value));
};

const formatDate = (dateString: string) => {
  const locale = typeof window !== 'undefined' ? localStorage.getItem('preferred-locale') || 'en' : 'en';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Storage key for persisting state
const TRADESLIST_STATE_KEY = 'tradeslist-state';

// Interface for persisted state
interface PersistedState {
  pagination: PaginationMetadata;
  filters: {
    q: string;
    type: '' | 'P' | 'S' | 'A';
    acquired: '' | 'A' | 'D';
    ownership: '' | 'D' | 'I';
    isDirector: boolean;
    isOfficer: boolean;
    isTen: boolean;
    symbol: string;
    minValue: string;
    minShares: string;
    dateFrom: string;
    dateTo: string;
  };
  timestamp: number;
}

export function TradesList() {
  const t = useTranslations();
  const router = useRouter();
  const currencyFormatter = useCurrencyFormatter();
  const numberFormatter = useNumberFormatter();
  
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 25,
    offset: 0,
    total_count: 0,
    total_pages: 1,
    has_next_page: false,
    has_prev_page: false,
    next_page: null,
    prev_page: null,
  });
  const [queryInfo, setQueryInfo] = useState<{
    filters_applied: number;
    count_source?: string;
  }>({
    filters_applied: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  
  // Filter states
  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | 'P' | 'S' | 'A'>('');
  const [acquired, setAcquired] = useState<'' | 'A' | 'D'>('');
  const [ownership, setOwnership] = useState<'' | 'D' | 'I'>('');
  const [isDirector, setIsDirector] = useState(false);
  const [isOfficer, setIsOfficer] = useState(false);
  const [isTen, setIsTen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [minValue, setMinValue] = useState('');
  const [minShares, setMinShares] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Save current state to sessionStorage
  const saveStateToStorage = useCallback(() => {
    try {
      const currentState: PersistedState = {
        pagination,
        filters: {
          q,
          type,
          acquired,
          ownership,
          isDirector,
          isOfficer,
          isTen,
          symbol,
          minValue,
          minShares,
          dateFrom,
          dateTo,
        },
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem(TRADESLIST_STATE_KEY, JSON.stringify(currentState));
    } catch (error) {
      console.warn('Failed to save TradesList state:', error);
    }
  }, [pagination, q, type, acquired, ownership, isDirector, isOfficer, isTen, symbol, minValue, minShares, dateFrom, dateTo]);

  // Restore state from sessionStorage
  const restoreStateFromStorage = () => {
    try {
      const savedStateStr = sessionStorage.getItem(TRADESLIST_STATE_KEY);
      if (!savedStateStr) return false;

      const savedState: PersistedState = JSON.parse(savedStateStr);
      
      // Check if state is not too old (max 30 minutes)
      const stateAge = Date.now() - savedState.timestamp;
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      if (stateAge > maxAge) {
        console.info('Saved TradesList state is too old, ignoring');
        sessionStorage.removeItem(TRADESLIST_STATE_KEY);
        return false;
      }

      // Restore filters
      setQ(savedState.filters.q);
      setType(savedState.filters.type);
      setAcquired(savedState.filters.acquired);
      setOwnership(savedState.filters.ownership);
      setIsDirector(savedState.filters.isDirector);
      setIsOfficer(savedState.filters.isOfficer);
      setIsTen(savedState.filters.isTen);
      setSymbol(savedState.filters.symbol);
      setMinValue(savedState.filters.minValue);
      setMinShares(savedState.filters.minShares);
      setDateFrom(savedState.filters.dateFrom);
      setDateTo(savedState.filters.dateTo);

      // Restore pagination (but keep the limit from initial state)
      setPagination(prev => ({
        ...savedState.pagination,
        limit: prev.limit, // Keep current limit
      }));

      console.info('Restored TradesList state from navigation');
      return true;
    } catch (error) {
      console.warn('Failed to restore TradesList state:', error);
      sessionStorage.removeItem(TRADESLIST_STATE_KEY);
      return false;
    }
  };

  // Effect to restore state on mount
  useEffect(() => {
    const wasRestored = restoreStateFromStorage();
    setHasRestoredState(true);
    
    // If we didn't restore state, fetch with default pagination
    if (!wasRestored) {
      fetchTrades();
    }
    // If we did restore state, fetchTrades will be called by the dependency useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTradeClick = async (accessionNumber: string) => {
    // Prevent multiple simultaneous navigations
    if (isNavigating) return;
    
    try {
      setIsNavigating(true);
      
      // Save current state before navigating
      saveStateToStorage();
      
      // Find the trade data we already have for this filing
      const relevantTrades = trades.filter(trade => trade.accession_number === accessionNumber);
      
      if (relevantTrades.length > 0) {
        // We have the data! Store it and navigate
        // Use a more reliable key format and ensure immediate availability
        const cacheData = {
          trades: relevantTrades,
          cachedAt: Date.now()
        };
        
        // Store in sessionStorage synchronously
        sessionStorage.setItem(`filing-${accessionNumber}`, JSON.stringify(cacheData));
        
        // Small delay to ensure storage operation completes
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Navigate immediately
        router.push(`/filing/${accessionNumber}`);
        
      } else {
        // Fallback: we don't have the data, so fetch it first
        console.info('Trade data not found in current list, fetching from API...');
        await cachedApiClient.getFilingByAccessionNumber(accessionNumber);
        router.push(`/filing/${accessionNumber}`);
      }
      
    } catch (error) {
      console.error('Navigation failed:', error);
      setIsNavigating(false);
    }
    // Note: We don't reset isNavigating here - let the route change handle it
  };

  // Create a dependency array that includes all filter states
  // This ensures fetchTrades is called whenever filters or pagination changes
  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    q,
    type,
    acquired,
    ownership,
    isDirector,
    isOfficer,
    isTen,
    symbol,
    minValue,
    minShares,
    dateFrom,
    dateTo
  ]);

  // Reset navigation state when component unmounts
  useEffect(() => {
    // Listen for beforeunload to reset state when user navigates away
    const handleBeforeUnload = () => {
      setIsNavigating(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      setIsNavigating(false);
      
      // Save state when component unmounts (but only if we restored state initially)
      if (hasRestoredState) {
        saveStateToStorage();
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasRestoredState, saveStateToStorage]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const fetchTrades = async () => {
    try {
      setLoading(true);
      
      const filterParams = {
        q: q || undefined,
        type: (type || undefined) as 'P' | 'S' | 'A' | undefined,
        acquired: (acquired || undefined) as 'A' | 'D' | undefined,
        ownership: (ownership || undefined) as 'D' | 'I' | undefined,
        is_director: isDirector,
        is_officer: isOfficer,
        is_ten_percent_owner: isTen,
        symbol: symbol || undefined,
        min_value: minValue ? Number(minValue) : undefined,
        min_shares: minShares ? Number(minShares) : undefined,
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
        page: pagination.page,
      };
      
      const response = await cachedApiClient.getLatestTradesWithPagination(pagination.limit, filterParams);
      
      console.info('API Response:', response);
      console.info('Pagination data:', response.pagination);
      
      setTrades(response.data);
      setPagination(response.pagination);
      setQueryInfo(response.query_info || { filters_applied: 0 });
      setError(null);
    } catch (err) {
      console.error('fetchTrades error:', err);
      setError('Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  };

  const resetFiltersAndFetch = () => {
    setQ('');
    setType('');
    setAcquired('');
    setOwnership('');
    setIsDirector(false);
    setIsOfficer(false);
    setIsTen(false);
    setSymbol('');
    setMinValue('');
    setMinShares('');
    setDateFrom('');
    setDateTo('');
    
    // Clear saved state when explicitly resetting
    try {
      sessionStorage.removeItem(TRADESLIST_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear saved state:', error);
    }
    
    // Reset pagination to page 1 - this will trigger fetchTrades via useEffect
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
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
          <div className="text-red-600 mb-2">❌ {t('common.error')}</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchTrades}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('tradesPage.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('tradesPage.title')}</h2>
        <button
          onClick={fetchTrades}
          className="self-start sm:self-auto px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t('tradesPage.refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-md p-3 sm:p-4 mb-4 sm:mb-6">
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 items-end">
          <div className="col-span-2 md:col-span-2">
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.searchLabel')}</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('tradesPage.searchPlaceholder')}
                className="pl-8 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.typeLabel')}</label>
            <select value={type} onChange={(e) => setType(e.target.value as '' | 'P' | 'S' | 'A')} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">{t('tradesPage.any')}</option>
              <option value="P">{t('tradesPage.purchase')}</option>
              <option value="S">{t('tradesPage.sale')}</option>
              <option value="A">{t('tradesPage.grantAward')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.acquiredDisposedLabel')}</label>
            <select value={acquired} onChange={(e) => setAcquired(e.target.value as '' | 'A' | 'D')} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">{t('tradesPage.any')}</option>
              <option value="A">{t('tradesPage.acquired')}</option>
              <option value="D">{t('tradesPage.disposed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.ownershipLabel')}</label>
            <select value={ownership} onChange={(e) => setOwnership(e.target.value as '' | 'D' | 'I')} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">{t('tradesPage.any')}</option>
              <option value="D">{t('tradesPage.direct')}</option>
              <option value="I">{t('tradesPage.indirect')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.symbolLabel')}</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="AAPL" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.minValueLabel')}</label>
            <input value={minValue} onChange={(e) => setMinValue(e.target.value)} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" inputMode="numeric" placeholder="1000000" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.minSharesLabel')}</label>
            <input value={minShares} onChange={(e) => setMinShares(e.target.value)} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" inputMode="numeric" placeholder="10000" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.fromLabel')}</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">{t('tradesPage.toLabel')}</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-300 rounded-md py-2 px-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="col-span-2 md:col-span-1 flex gap-2">
            <button 
              onClick={() => {
                // Reset pagination to page 1 - this will trigger fetchTrades via useEffect
                setPagination(prev => ({ ...prev, page: 1 }));
              }} 
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t('tradesPage.applyButton')}
            </button>
            <button
              onClick={resetFiltersAndFetch}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t('tradesPage.resetButton')}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1 text-xs text-gray-700">
              <input type="checkbox" className="rounded accent-blue-600" checked={isDirector} onChange={(e) => setIsDirector(e.target.checked)} /> {t('tradesPage.director')}
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-gray-700">
              <input type="checkbox" className="rounded accent-blue-600" checked={isOfficer} onChange={(e) => setIsOfficer(e.target.checked)} /> {t('tradesPage.officer')}
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-gray-700">
              <input type="checkbox" className="rounded accent-blue-600" checked={isTen} onChange={(e) => setIsTen(e.target.checked)} /> {t('tradesPage.tenPercent')}
            </label>
          </div>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-gray-500">{t('tradesPage.noTrades')}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {trades.map((trade, index) => (
            <div 
              key={trade.transaction_id ? `tx-${trade.transaction_id}` : `trade-${index}-${trade.accession_number}-${trade.person_cik || 'unknown'}`} 
              onClick={() => handleTradeClick(trade.accession_number)}
              className={`
                relative border border-gray-200 rounded-lg p-3 sm:p-4 
                hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group
                ${isNavigating ? 'opacity-75 pointer-events-none' : ''}
              `}
            >
              {/* Mobile: Badges at top, Desktop: Badges on right */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                {/* Badges - show at top on mobile, right on desktop */}
                <div className="flex flex-wrap items-center gap-2 sm:order-2 sm:flex-col sm:items-end sm:flex-shrink-0 relative">
                  {/* Visual indicator that card is clickable */}
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {isNavigating ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <TransactionBadge
                      transactionCode={trade.transaction_code}
                      acquiredDisposedCode={trade.acquired_disposed_code}
                      transactionDescription={trade.transaction_description}
                      is10b51Plan={trade.is_10b5_1_plan}
                      size="sm"
                      showIcon={true}
                    />
                  </div>
                  {(!!trade.is_director || !!trade.is_officer) && (
                    <>
                      {!!trade.is_director && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded whitespace-nowrap">
                          {t('tradesPage.director')}
                        </span>
                      )}
                      {!!trade.is_officer && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded whitespace-nowrap">
                          {t('tradesPage.officer')}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Company and Insider Info */}
                <div className="flex-1 min-w-0 sm:order-1 sm:pr-8">
                  <div className="mb-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <ClickableCompany
                      name={trade.issuer_name}
                      symbol={trade.trading_symbol}
                      cik={trade.issuer_cik}
                      className="text-sm sm:text-base relative z-10 break-words"
                    />
                  </div>
                  <div className="mb-2 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <ClickableInsider
                      name={trade.person_name}
                      cik={trade.person_cik}
                      title={trade.officer_title}
                      className="text-xs sm:text-sm relative z-10 break-words"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{t('tradesPage.filedLabel')}:</span>
                      <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} />
                    </div>
                    <div className="whitespace-nowrap">{t('tradesPage.transactionLabel')}: {formatDate(trade.transaction_date)}</div>
                  </div>
                </div>
              </div>

              {/* Data Grid - 2 columns on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-2.5 sm:p-3 bg-gray-50 rounded-md">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t('trades.shares')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={formatNumber(trade.shares_transacted, numberFormatter, t)}>
                    {formatNumber(trade.shares_transacted, numberFormatter, t)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t('trades.price')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={formatPrice(trade.price_per_share, t)}>
                    {formatPrice(trade.price_per_share, t)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t('trades.value')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={formatCurrency(trade.transaction_value, currencyFormatter, t)}>
                    {formatCurrency(trade.transaction_value, currencyFormatter, t)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t('tradesPage.ownedAfter')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={formatNumber(trade.shares_owned_following, numberFormatter, t)}>
                    {formatNumber(trade.shares_owned_following, numberFormatter, t)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      <div className="mt-6">
        <div className="text-xs text-gray-500 mb-2">
          Debug: Page {pagination.page} of {pagination.total_pages} (Total: {pagination.total_count})
          {queryInfo.count_source && (
            <span className="ml-2 text-blue-600">• Count source: {queryInfo.count_source}</span>
          )}
        </div>
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={handlePageChange}
          hasNextPage={pagination.has_next_page}
          hasPrevPage={pagination.has_prev_page}
          className="border-t border-gray-200 pt-6"
        />
      </div>
    </div>
  );
}
