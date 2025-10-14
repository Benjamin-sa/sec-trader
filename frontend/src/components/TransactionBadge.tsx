 /**
 * TransactionBadge Component
 * 
 * A universal component for displaying insider transaction types with proper categorization.
 * This component distinguishes between actual purchases/sales and grants/awards/exercises,
 * providing clear visual indicators for each transaction type.
 * 
 * Transaction Codes (SEC Form 4):
 * - P: Open Market Purchase (actual buy - IMPORTANT)
 * - S: Open Market Sale (actual sell - IMPORTANT)
 * - A: Grant/Award (compensation, not a purchase - LESS IMPORTANT)
 * - M: Exercise of Options (conversion, not a purchase)
 * - F: Payment of Exercise Price or Tax (withholding)
 * - D: Sale to Issuer (company buyback)
 * - G: Gift (transfer)
 * - J: Other Acquisition
 * - C: Conversion of derivative
 * - I: Discretionary transaction
 * - K: Equity swap
 * 
 * Acquired/Disposed Codes:
 * - A: Acquired (shares increased)
 * - D: Disposed (shares decreased)
 */

import React from 'react';

export interface TransactionInfo {
  transactionCode: string;
  acquiredDisposedCode: string;
  transactionDescription?: string;
}

export interface TransactionBadgeProps {
  transactionCode: string;
  acquiredDisposedCode: string;
  transactionDescription?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDescription?: boolean;
}

interface TransactionCategory {
  label: string;
  icon: string;
  colorClass: string;
  importance: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Get detailed information about a transaction type
 */
export function getTransactionCategory(
  transactionCode: string,
  acquiredDisposedCode: string
): TransactionCategory {
  // Open Market Purchases - HIGH importance
  if (transactionCode === 'P' && acquiredDisposedCode === 'A') {
    return {
      label: 'Buy',
      icon: '💰',
      colorClass: 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-200/60',
      importance: 'high',
      description: 'Open market purchase - insider is buying with their own money'
    };
  }

  // Open Market Sales - HIGH importance (negative signal)
  if (transactionCode === 'S' && acquiredDisposedCode === 'D') {
    return {
      label: 'Sell',
      icon: '📉',
      colorClass: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200/60',
      importance: 'high',
      description: 'Open market sale - insider is selling shares'
    };
  }

  // Grants/Awards - LOW importance (compensation)
  if (transactionCode === 'A') {
    return {
      label: acquiredDisposedCode === 'A' ? 'Award' : 'Award Forfeiture',
      icon: '🎁',
      colorClass: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200/60',
      importance: 'low',
      description: 'Stock grant or award as compensation - not an actual purchase'
    };
  }

  // Option Exercise - MEDIUM importance
  if (transactionCode === 'M' && acquiredDisposedCode === 'A') {
    return {
      label: 'Exercise',
      icon: '🔄',
      colorClass: 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border-purple-200/60',
      importance: 'medium',
      description: 'Exercise of stock options'
    };
  }

  // Tax/Exercise Price Payment - LOW importance
  if (transactionCode === 'F') {
    return {
      label: 'Tax Payment',
      icon: '💸',
      colorClass: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border-amber-200/60',
      importance: 'low',
      description: 'Shares withheld for tax or exercise price payment'
    };
  }

  // Sale to Issuer - MEDIUM importance
  if (transactionCode === 'D' && acquiredDisposedCode === 'D') {
    return {
      label: 'Sale to Issuer',
      icon: '🏢',
      colorClass: 'bg-gradient-to-r from-pink-100 to-pink-50 text-pink-800 border-pink-200/60',
      importance: 'medium',
      description: 'Shares sold back to the company'
    };
  }

  // Gift - LOW importance
  if (transactionCode === 'G') {
    return {
      label: 'Gift',
      icon: '🎀',
      colorClass: 'bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-800 border-indigo-200/60',
      importance: 'low',
      description: 'Shares transferred as a gift'
    };
  }

  // Conversion - MEDIUM importance
  if (transactionCode === 'C') {
    return {
      label: 'Conversion',
      icon: '🔁',
      colorClass: 'bg-gradient-to-r from-cyan-100 to-cyan-50 text-cyan-800 border-cyan-200/60',
      importance: 'medium',
      description: 'Conversion of derivative security'
    };
  }

  // Other Acquisition - MEDIUM importance
  if (transactionCode === 'J' && acquiredDisposedCode === 'A') {
    return {
      label: 'Other Acquisition',
      icon: '📥',
      colorClass: 'bg-gradient-to-r from-teal-100 to-teal-50 text-teal-800 border-teal-200/60',
      importance: 'medium',
      description: 'Other form of acquisition'
    };
  }

  // Default fallback based on acquired/disposed
  if (acquiredDisposedCode === 'A') {
    return {
      label: 'Acquired',
      icon: '📈',
      colorClass: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200/60',
      importance: 'low',
      description: 'Shares acquired through unspecified transaction'
    };
  }

  return {
    label: 'Disposed',
    icon: '📊',
    colorClass: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200/60',
    importance: 'low',
    description: 'Shares disposed through unspecified transaction'
  };
}

/**
 * TransactionBadge Component
 * Displays a visual badge for a transaction type
 */
export default function TransactionBadge({
  transactionCode,
  acquiredDisposedCode,
  transactionDescription,
  size = 'sm',
  showIcon = true,
  showDescription = false
}: TransactionBadgeProps) {
  const category = getTransactionCategory(transactionCode, acquiredDisposedCode);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`
          inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border shadow-sm
          transition-all duration-200 hover:shadow-md hover:scale-105
          ${category.colorClass}
          ${sizeClasses[size]}
        `}
        title={category.description}
      >
        {showIcon && <span className="leading-none">{category.icon}</span>}
        <span>{category.label}</span>
      </span>
      {showDescription && transactionDescription && (
        <span className="text-xs text-gray-500 ml-1 font-medium">
          {transactionDescription}
        </span>
      )}
    </div>
  );
}

/**
 * Helper function to determine if a transaction is significant for trading signals
 */
export function isSignificantTransaction(
  transactionCode: string,
  acquiredDisposedCode: string
): boolean {
  // Only open market purchases (P+A) and sales (S+D) are highly significant
  const isPurchase = transactionCode === 'P' && acquiredDisposedCode === 'A';
  const isSale = transactionCode === 'S' && acquiredDisposedCode === 'D';
  
  return isPurchase || isSale;
}

/**
 * Helper function to get a simple text label for a transaction
 */
export function getSimpleTransactionLabel(
  transactionCode: string,
  acquiredDisposedCode: string
): string {
  const category = getTransactionCategory(transactionCode, acquiredDisposedCode);
  return category.label;
}

/**
 * Helper function to get color classes for custom styling
 */
export function getTransactionColorClass(
  transactionCode: string,
  acquiredDisposedCode: string
): string {
  const category = getTransactionCategory(transactionCode, acquiredDisposedCode);
  return category.colorClass;
}

/**
 * Helper function to get transaction icon
 */
export function getTransactionIcon(
  transactionCode: string,
  acquiredDisposedCode: string
): string {
  const category = getTransactionCategory(transactionCode, acquiredDisposedCode);
  return category.icon;
}
