/**
 * TradesDisplay Component
 * 
 * A universal, reusable component for displaying insider trades across the application.
 * Designed to be intuitive for non-traders while providing comprehensive data for experienced users.
 * 
 * Features:
 * - Two display modes: 'slim' (essential info) and 'comprehensive' (all details)
 * - Two layout options: 'cards' (mobile-friendly) and 'table' (desktop)
 * - Clear visual indicators for trade importance with animations
 * - Optional pagination support
 * - Responsive and accessible
 * - Context-aware (company view vs insider view)
 * 
 * Usage:
 * 
 * Basic (no pagination):
 * ```tsx
 * <TradesDisplay 
 *   trades={trades}
 *   mode="comprehensive"
 *   layout="table"
 *   context="company"
 *   onTradeClick={(accessionNumber) => router.push(`/filing/${accessionNumber}`)}
 * />
 * ```
 * 
 * With pagination (internal state):
 * ```tsx
 * <TradesDisplay 
 *   trades={allTrades}
 *   mode="comprehensive"
 *   layout="table"
 *   context="company"
 *   enablePagination={true}
 *   itemsPerPage={25}
 * />
 * ```
 * 
 * With pagination (external state control):
 * ```tsx
 * const [currentPage, setCurrentPage] = useState(1);
 * 
 * <TradesDisplay 
 *   trades={allTrades}
 *   mode="comprehensive"
 *   layout="table"
 *   context="company"
 *   enablePagination={true}
 *   itemsPerPage={25}
 *   currentPage={currentPage}
 *   onPageChange={setCurrentPage}
 * />
 * ```
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination } from './Pagination';
import TransactionBadge, { 
  getTransactionCategory, 
  isSignificantTransaction 
} from './TransactionBadge';

export interface Trade {
  transaction_id?: string | number;
  accession_number: string;
  transaction_date: string;
  filed_at?: string | null;
  person_name?: string | null;
  person_cik?: string | null;
  issuer_name?: string | null;
  issuer_cik?: string | null;
  trading_symbol?: string | null;
  transaction_code: string;
  acquired_disposed_code: string;
  transaction_description?: string | null;
  security_title?: string | null;
  shares_transacted: number | null;
  price_per_share: number | null;
  transaction_value: number | null;
  officer_title?: string | null;
  is_director?: boolean | null;
  is_officer?: boolean | null;
  is_ten_percent_owner?: boolean | null;
  is_10b5_1_plan?: boolean | number | null;
  ownership_nature?: string | null;
}

export interface TradesDisplayProps {
  trades: Trade[];
  mode?: 'slim' | 'comprehensive';
  layout?: 'cards' | 'table';
  context?: 'company' | 'insider' | 'general';
  loading?: boolean;
  emptyMessage?: string;
  onTradeClick?: (accessionNumber: string) => void;
  maxItems?: number;
  // Pagination props (optional - for backward compatibility)
  enablePagination?: boolean;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Format currency values with context
 */
const formatCurrency = (value: number | null, transactionCode?: string): string => {
  if (!value) {
    // For Awards/Grants, explain why there's no price
    if (transactionCode === 'A') {
      return '—'; // Em dash looks more elegant than N/A
    }
    return 'N/A';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format share numbers with context
 */
const formatShares = (shares: number | null, transactionCode?: string): string => {
  if (!shares) {
    if (transactionCode === 'A') {
      return '—';
    }
    return 'N/A';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(shares);
};

/**
 * Format price with context awareness
 */
const formatPrice = (price: number | null, transactionCode: string): string => {
  if (transactionCode === 'A') {
    return 'Grant'; // Awards are granted, not purchased
  }
  if (transactionCode === 'M') {
    return 'Exercise'; // Options are exercised
  }
  if (transactionCode === 'G') {
    return 'Gift'; // Gifts have no price
  }
  if (!price) {
    return 'N/A';
  }
  return `$${price.toFixed(2)}`;
};

/**
 * Get value display text with explanation
 */
const formatValueWithContext = (
  value: number | null,
  transactionCode: string,
  shares: number | null
): { display: string; subtitle?: string } => {
  // For Awards/Grants with no value
  if (transactionCode === 'A' && !value && shares) {
    return {
      display: `${formatShares(shares)} shares`,
      subtitle: 'Compensation grant'
    };
  }
  
  // For Gifts
  if (transactionCode === 'G' && !value && shares) {
    return {
      display: `${formatShares(shares)} shares`,
      subtitle: 'Transferred as gift'
    };
  }
  
  // For Exercise with no value
  if (transactionCode === 'M' && !value && shares) {
    return {
      display: `${formatShares(shares)} shares`,
      subtitle: 'Options exercised'
    };
  }
  
  // Normal case with value
  if (value) {
    return {
      display: formatCurrency(value, transactionCode)
    };
  }
  
  return { display: 'N/A' };
};

/**
 * Format dates
 */
const formatDate = (dateString: string): string => {
  const locale = typeof window !== 'undefined' 
    ? localStorage.getItem('preferred-locale') || 'en' 
    : 'en';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get importance indicator for a trade
 */
const getImportanceIndicator = (trade: Trade) => {
  const isSignificant = isSignificantTransaction(
    trade.transaction_code,
    trade.acquired_disposed_code
  );
  
  const category = getTransactionCategory(
    trade.transaction_code,
    trade.acquired_disposed_code
  );

  return {
    isSignificant,
    importance: category.importance,
    shouldAnimate: isSignificant,
  };
};

/**
 * Importance Badge Component with smooth animations - Following style guide
 * Mobile optimized with responsive sizing
 */
const ImportanceBadge: React.FC<{ importance: 'high' | 'medium' | 'low' }> = ({ importance }) => {
  if (importance === 'high') {
    return (
      <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-full shadow-sm animate-subtle-glow backdrop-blur-sm">
        <span className="text-blue-600 text-xs sm:text-sm animate-pulse">⭐</span>
        <span className="text-blue-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          Important
        </span>
      </div>
    );
  }
  return null;
};

/**
 * Insider Info Component (for company context) - Enhanced with smooth animations
 */
const InsiderInfo: React.FC<{ trade: Trade; slim?: boolean }> = ({ trade, slim }) => {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trade.person_cik) {
      router.push(`/insider/${trade.person_cik}`);
    }
  };

  return (
    <div className="min-w-0">
      <div 
        className="text-xs sm:text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-all duration-200 hover:translate-x-1 truncate"
        onClick={handleClick}
      >
        {trade.person_name || 'Unknown'}
      </div>
      {!slim && (
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          {trade.officer_title && (
            <span className="inline-block bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
              {trade.officer_title}
            </span>
          )}
          {trade.is_director && (
            <span className="inline-block bg-gradient-to-r from-green-100 to-green-50 text-green-800 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
              Director
            </span>
          )}
          {trade.is_ten_percent_owner && (
            <span className="inline-block bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105">
              10% Owner
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Company Info Component (for insider context) - Enhanced with smooth animations
 */
const CompanyInfo: React.FC<{ trade: Trade; slim?: boolean }> = ({ trade, slim }) => {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trade.issuer_cik) {
      router.push(`/company/${trade.issuer_cik}`);
    }
  };

  return (
    <div className="min-w-0">
      <div 
        className="text-xs sm:text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-all duration-200 hover:translate-x-1 truncate"
        onClick={handleClick}
      >
        {trade.issuer_name || 'Unknown Company'}
      </div>
      {!slim && trade.trading_symbol && (
        <div className="mt-1.5 sm:mt-2">
          <span className="inline-block bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-mono font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 border border-gray-200/50">
            {trade.trading_symbol}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Filing Link Component - Enhanced with smooth hover effect
 */
const FilingLink: React.FC<{ accessionNumber: string; filedAt?: string | null }> = ({ 
  accessionNumber, 
  filedAt 
}) => {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/filing/${accessionNumber}`);
  };

  return (
    <button
      onClick={handleClick}
      className="text-blue-600 hover:text-blue-800 transition-all duration-200 hover:underline hover:translate-x-0.5 inline-flex items-center gap-1 font-medium"
    >
      {filedAt ? formatDate(filedAt) : 'View Filing'}
      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
    </button>
  );
};

/**
 * Card Layout Component with premium animations
 * Mobile optimized with responsive spacing and typography
 */
const TradeCard: React.FC<{ 
  trade: Trade; 
  context: 'company' | 'insider' | 'general';
  mode: 'slim' | 'comprehensive';
  onClick?: () => void;
}> = ({ trade, context, mode, onClick }) => {
  const { isSignificant, importance, shouldAnimate } = getImportanceIndicator(trade);
  const isSlim = mode === 'slim';
  const valueInfo = formatValueWithContext(trade.transaction_value, trade.transaction_code, trade.shares_transacted);

  return (
    <div
      onClick={onClick}
      className={`
        group relative border rounded-xl p-3 sm:p-5 transition-all duration-300 ease-in-out cursor-pointer
        backdrop-blur-sm bg-white/95
        ${shouldAnimate 
          ? 'border-blue-400/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 hover:shadow-2xl hover:scale-[1.02] animate-pulse-border' 
          : 'border-gray-200/60 hover:shadow-xl hover:scale-[1.01] hover:border-gray-300/80'
        }
        hover:-translate-y-1
      `}
      role="button"
      tabIndex={0}
    >
      {/* Subtle gradient overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-gray-50/30 rounded-xl pointer-events-none" />
      
      {/* Content wrapper with relative positioning */}
      <div className="relative">
        {/* Header: Date + Importance Badge */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight">
              {formatDate(trade.transaction_date)}
            </div>
            {!isSlim && trade.filed_at && (
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 transition-colors group-hover:text-gray-700">
                Filed: <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} />
              </div>
            )}
          </div>
          <ImportanceBadge importance={importance} />
        </div>

        {/* Main Content */}
        <div className="space-y-2.5 sm:space-y-4">
          {/* Entity Info (Person or Company) */}
          <div className="transition-transform duration-200 group-hover:translate-x-1">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5 font-medium">
              {context === 'company' ? 'Insider' : context === 'insider' ? 'Company' : 'Entity'}
            </div>
            {context === 'company' ? (
              <InsiderInfo trade={trade} slim={isSlim} />
            ) : (
              <CompanyInfo trade={trade} slim={isSlim} />
            )}
          </div>

          {/* Transaction Badge */}
          <div className="transition-transform duration-200 group-hover:translate-x-1">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5 font-medium">Transaction</div>
            <div className="flex items-center gap-2">
              <TransactionBadge
                transactionCode={trade.transaction_code}
                acquiredDisposedCode={trade.acquired_disposed_code}
                transactionDescription={trade.transaction_description}
                is10b51Plan={trade.is_10b5_1_plan || undefined}
                size="md"
                showIcon={true}
              />
            </div>
            {!isSlim && trade.security_title && (
              <div className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 italic break-words">{trade.security_title}</div>
            )}
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 sm:pt-3 border-t border-gray-200/60">
            {!isSlim && (
              <div className="transition-all duration-200 group-hover:translate-y-[-2px]">
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5 sm:mb-1">Shares</div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 break-words">
                  {formatShares(trade.shares_transacted, trade.transaction_code)}
                </div>
              </div>
            )}
            {!isSlim && (
              <div className="transition-all duration-200 group-hover:translate-y-[-2px]">
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5 sm:mb-1">Price</div>
                <div className="text-xs sm:text-sm font-bold text-gray-900">
                  {formatPrice(trade.price_per_share, trade.transaction_code)}
                </div>
              </div>
            )}
            <div className={`${!isSlim ? 'col-span-2' : 'col-span-2'} transition-all duration-200 group-hover:translate-y-[-2px]`}>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5 sm:mb-1">Total Value</div>
              <div className={`font-extrabold tracking-tight break-words ${isSignificant ? 'text-base sm:text-xl text-gray-900' : 'text-sm sm:text-lg text-gray-800'}`}>
                {valueInfo.display}
              </div>
              {valueInfo.subtitle && (
                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 italic">{valueInfo.subtitle}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Table Layout Component
 * Mobile optimized with responsive padding and better scrolling
 */
const TradesTable: React.FC<{
  trades: Trade[];
  context: 'company' | 'insider' | 'general';
  mode: 'slim' | 'comprehensive';
  onTradeClick?: (accessionNumber: string) => void;
}> = ({ trades, context, mode, onTradeClick }) => {
  const isSlim = mode === 'slim';

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {context === 'company' ? 'Insider' : context === 'insider' ? 'Company' : 'Entity'}
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                {!isSlim && (
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shares
                  </th>
                )}
                {!isSlim && (
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                )}
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade, index) => {
                const { isSignificant, importance } = getImportanceIndicator(trade);
                
                return (
                  <tr
                    key={trade.transaction_id || `${trade.accession_number}-${index}`}
                    onClick={() => onTradeClick?.(trade.accession_number)}
                    className={`
                      group transition-all duration-300 ease-in-out cursor-pointer
                      ${isSignificant 
                        ? 'bg-gradient-to-r from-blue-50/60 to-indigo-50/40 hover:from-blue-50/90 hover:to-indigo-50/70 hover:shadow-md' 
                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/50 hover:shadow-sm'
                      }
                      ${isSignificant ? 'border-l-2 sm:border-l-4 border-l-blue-500' : 'border-l-2 sm:border-l-4 border-l-transparent'}
                      hover:scale-[1.002]
                    `}
                  >
                    {/* Date Column */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <div>
                        <div className="font-medium text-gray-900 whitespace-nowrap">
                          {formatDate(trade.transaction_date)}
                        </div>
                        {!isSlim && trade.filed_at && (
                          <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block">
                            Filed: <FilingLink accessionNumber={trade.accession_number} filedAt={trade.filed_at} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Entity Column */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-start gap-2">
                        {context === 'company' ? (
                          <InsiderInfo trade={trade} slim={isSlim} />
                        ) : (
                          <CompanyInfo trade={trade} slim={isSlim} />
                        )}
                      </div>
                    </td>

                    {/* Transaction Column */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <TransactionBadge
                            transactionCode={trade.transaction_code}
                            acquiredDisposedCode={trade.acquired_disposed_code}
                            transactionDescription={trade.transaction_description}
                            is10b51Plan={trade.is_10b5_1_plan || undefined}
                            size="sm"
                            showIcon={true}
                          />
                          <ImportanceBadge importance={importance} />
                        </div>
                        {!isSlim && trade.security_title && (
                          <div className="text-[10px] sm:text-xs text-gray-500 break-words max-w-[150px] sm:max-w-none hidden lg:block">{trade.security_title}</div>
                        )}
                      </div>
                    </td>

                    {/* Shares Column - Hidden on mobile and tablet, shown on large screens */}
                    {!isSlim && (
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 transition-all duration-200 group-hover:font-semibold">
                        {formatShares(trade.shares_transacted, trade.transaction_code)}
                      </td>
                    )}

                    {/* Price Column - Hidden on mobile and tablet, shown on large screens */}
                    {!isSlim && (
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm transition-all duration-200">
                        <div className={`font-medium ${trade.transaction_code === 'A' || trade.transaction_code === 'G' || trade.transaction_code === 'M' ? 'text-gray-600 italic' : 'text-gray-900'}`}>
                          {formatPrice(trade.price_per_share, trade.transaction_code)}
                        </div>
                      </td>
                    )}

                    {/* Value Column */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {(() => {
                        const valueInfo = formatValueWithContext(trade.transaction_value, trade.transaction_code, trade.shares_transacted);
                        return (
                          <div>
                            <div className={`font-bold tracking-tight transition-all duration-200 break-words ${isSignificant ? 'text-sm sm:text-base text-gray-900' : 'text-xs sm:text-sm text-gray-800'}`}>
                              {valueInfo.display}
                            </div>
                            {valueInfo.subtitle && (
                              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 italic">{valueInfo.subtitle}</div>
                            )}
                            {/* Show shares and price on mobile/tablet below value */}
                            {!isSlim && (
                              <div className="lg:hidden mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                                <div className="text-[10px] text-gray-500">
                                  <span className="font-medium">Shares:</span> {formatShares(trade.shares_transacted, trade.transaction_code)}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  <span className="font-medium">Price:</span> {formatPrice(trade.price_per_share, trade.transaction_code)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Main TradesDisplay Component
 */
export default function TradesDisplay({
  trades,
  mode = 'comprehensive',
  layout = 'table',
  context = 'general',
  loading = false,
  emptyMessage = 'No trades found',
  onTradeClick,
  maxItems,
  // Pagination props
  enablePagination = false,
  itemsPerPage = 25,
  currentPage: externalCurrentPage,
  onPageChange: externalOnPageChange,
}: TradesDisplayProps) {
  const router = useRouter();
  
  // Internal pagination state (used when pagination is enabled but not controlled externally)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  
  // Use external page control if provided, otherwise use internal state
  const currentPage = externalCurrentPage ?? internalCurrentPage;
  const handlePageChange = externalOnPageChange ?? setInternalCurrentPage;

  // Calculate pagination
  const { paginatedTrades, totalPages, hasNextPage, hasPrevPage } = useMemo(() => {
    let tradesToDisplay = trades;
    
    // Apply maxItems if specified (takes precedence over pagination)
    if (maxItems && !enablePagination) {
      tradesToDisplay = trades.slice(0, maxItems);
    }
    
    // Apply pagination if enabled
    if (enablePagination) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      tradesToDisplay = trades.slice(startIndex, endIndex);
      
      const total = Math.ceil(trades.length / itemsPerPage);
      
      return {
        paginatedTrades: tradesToDisplay,
        totalPages: total,
        hasNextPage: currentPage < total,
        hasPrevPage: currentPage > 1,
      };
    }
    
    return {
      paginatedTrades: tradesToDisplay,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }, [trades, currentPage, itemsPerPage, enablePagination, maxItems]);

  const handleTradeClick = (accessionNumber: string) => {
    if (onTradeClick) {
      onTradeClick(accessionNumber);
    } else {
      router.push(`/filing/${accessionNumber}`);
    }
  };

  // Loading State - Premium shimmer effect
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="border border-gray-200/60 rounded-xl p-6 bg-gradient-to-r from-white via-gray-50/30 to-white bg-[length:200%_100%] animate-shimmer overflow-hidden"
            style={{
              animationDelay: `${i * 0.15}s`
            }}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-28 animate-pulse"></div>
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-24 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-2/3 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-1/2 animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-20 animate-pulse"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-20 animate-pulse"></div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (paginatedTrades.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-2">📊</div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Render based on layout
  return (
    <div className="space-y-4">
      {/* Trades Display */}
      <div>
        {layout === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {paginatedTrades.map((trade, index) => (
              <TradeCard
                key={trade.transaction_id || `${trade.accession_number}-${index}`}
                trade={trade}
                context={context}
                mode={mode}
                onClick={() => handleTradeClick(trade.accession_number)}
              />
            ))}
          </div>
        ) : (
          <TradesTable
            trades={paginatedTrades}
            context={context}
            mode={mode}
            onTradeClick={handleTradeClick}
          />
        )}
      </div>

      {/* Pagination Controls */}
      {enablePagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          className="mt-6"
        />
      )}
    </div>
  );
}
