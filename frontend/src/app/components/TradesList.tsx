'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TradeData, db } from '../../lib/database';
import { useCurrencyFormatter, useNumberFormatter } from '@/hooks/useTranslation';
import { Calendar, Search } from 'lucide-react';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';
import FilingLink from './FilingLink';

export function TradesList() {
  const t = useTranslations();
  const currencyFormatter = useCurrencyFormatter();
  const numberFormatter = useNumberFormatter();
  
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      };
      
      console.log('Frontend filter state:', {
        q, type, acquired, ownership, isDirector, isOfficer, isTen, 
        symbol, minValue, minShares, dateFrom, dateTo
      });
      console.log('Calling API with filters:', filterParams);
      
      const data = await db.getLatestTrades(25, filterParams);
      console.log('API returned trades:', data.length);
      
      setTrades(data);
      setError(null);
    } catch (err) {
      console.error('fetchTrades error:', err);
      setError('Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return t('common.noData');
    return currencyFormatter.format(value);
  };

  const formatNumber = (value: number | null) => {
    if (!value) return t('common.noData');
    return numberFormatter.format(value);
  };

  const formatDate = (dateString: string) => {
    const locale = typeof window !== 'undefined' ? localStorage.getItem('preferred-locale') || 'en' : 'en';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionTypeColor = (code: string) => {
    switch (code) {
      case 'P': return 'bg-green-100 text-green-800';
      case 'S': return 'bg-red-100 text-red-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeIcon = (disposedCode: string) => {
    return disposedCode === 'A' ? '↗️' : '↘️';
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
            <button onClick={fetchTrades} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">{t('tradesPage.applyButton')}</button>
            <button
              onClick={() => { setQ(''); setType(''); setAcquired(''); setOwnership(''); setIsDirector(false); setIsOfficer(false); setIsTen(false); setSymbol(''); setMinValue(''); setMinShares(''); setDateFrom(''); setDateTo(''); fetchTrades(); }}
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
        <div className="space-y-4">
          {trades.map((trade, index) => (
            <div key={trade.transaction_id ? `tx-${trade.transaction_id}` : `trade-${index}-${trade.accession_number}-${trade.person_cik || 'unknown'}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="mb-1">
                    <ClickableCompany
                      name={trade.issuer_name}
                      symbol={trade.trading_symbol}
                      cik={trade.issuer_cik}
                      className="text-base"
                    />
                  </div>
                  <div className="mb-2">
                    <ClickableInsider
                      name={trade.person_name}
                      cik={trade.person_cik}
                      title={trade.officer_title}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t('tradesPage.filedLabel')}: <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} />
                    </div>
                    <div>{t('tradesPage.transactionLabel')}: {formatDate(trade.transaction_date)}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(trade.transaction_code)}`}>
                    {getTransactionTypeIcon(trade.acquired_disposed_code)} {trade.transaction_code}
                  </span>
                  {(trade.is_director || trade.is_officer) && (
                    <div className="flex gap-1">
                      {trade.is_director && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {t('tradesPage.director')}
                        </span>
                      )}
                      {trade.is_officer && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {t('tradesPage.officer')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{t('trades.shares')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatNumber(trade.shares_transacted)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{t('trades.price')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(trade.price_per_share)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{t('trades.value')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(trade.transaction_value)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{t('tradesPage.ownedAfter')}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatNumber(trade.shares_owned_following)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
