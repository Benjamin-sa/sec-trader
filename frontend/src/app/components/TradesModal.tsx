'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { TradeData, db } from '../../lib/database';
import { ClickableCompany, ClickableInsider } from './ClickableLinks';

interface TradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  companyFilter?: {
    symbol?: string;
    cik?: string;
    name?: string;
  };
  insiderFilter?: {
    cik?: string;
    name?: string;
  };
}

export function TradesModal({ 
  isOpen, 
  onClose, 
  title, 
  companyFilter, 
  insiderFilter 
}: TradesModalProps) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTrades();
    }
  }, [isOpen, companyFilter, insiderFilter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: TradeData[] = [];
      
      if (companyFilter) {
        data = await db.getTradesByCompany(
          companyFilter.symbol,
          companyFilter.cik,
          companyFilter.name,
          50
        );
      } else if (insiderFilter) {
        data = await db.getTradesByInsider(
          insiderFilter.cik,
          insiderFilter.name,
          50
        );
      }
      
      setTrades(data);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to fetch trades');
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

  const handleNestedCompanyClick = (symbol?: string, cik?: string, name?: string) => {
    // For nested clicks within the modal, we can either close this modal and open a new one,
    // or filter the current results. For simplicity, let's just log for now.
    console.log('Nested company click:', { symbol, cik, name });
  };

  const handleNestedInsiderClick = (cik?: string, name?: string) => {
    console.log('Nested insider click:', { cik, name });
  };

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button 
                onClick={fetchTrades}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-gray-500">No trades found</p>
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
                          onClick={handleNestedCompanyClick}
                          className="text-base"
                        />
                      </div>
                      <div className="mb-2">
                        <ClickableInsider
                          name={trade.person_name}
                          cik={trade.person_cik}
                          title={trade.officer_title}
                          onClick={handleNestedInsiderClick}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        Filed: {formatDate(trade.filed_at)} | Transaction: {formatDate(trade.transaction_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(trade.transaction_code)} mb-2 inline-block`}>
                        {getTransactionTypeIcon(trade.acquired_disposed_code)} {trade.transaction_description}
                      </span>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(trade.transaction_value)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatNumber(trade.shares_transacted)} shares @ {formatCurrency(trade.price_per_share)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      {trade.is_director && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          Director
                        </span>
                      )}
                      {trade.is_officer && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Officer
                        </span>
                      )}
                      {trade.is_ten_percent_owner && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          10%+ Owner
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Owns After</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(trade.shares_owned_following)} shares
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
