/**
 * TransactionInfoModal Component
 * 
 * An interactive information modal that explains transaction types.
 * Shows as a tooltip on desktop (hover) and a modal on mobile (click).
 * 
 * Features:
 * - Smooth animations
 * - Touch-friendly for mobile
 * - Accessible with keyboard navigation
 * - Auto-positioning to avoid screen edges
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getTransactionCategory } from './TransactionBadge';

interface TransactionInfoModalProps {
  transactionCode: string;
  acquiredDisposedCode: string;
  children: React.ReactNode;
}

export default function TransactionInfoModal({
  transactionCode,
  acquiredDisposedCode,
  children
}: TransactionInfoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const category = getTransactionCategory(transactionCode, acquiredDisposedCode);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate optimal position for tooltip
  useEffect(() => {
    if (isOpen && !isMobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      // Choose position with most space
      if (spaceAbove > 200) {
        setPosition('top');
      } else if (spaceBelow > 200) {
        setPosition('bottom');
      } else if (spaceLeft > 300) {
        setPosition('left');
      } else if (spaceRight > 300) {
        setPosition('right');
      } else {
        setPosition('top'); // fallback
      }
    }
  }, [isOpen, isMobile]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close when clicking outside (mobile)
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  const handleToggle = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsOpen(false);
    }
  };

  // Get detailed explanation based on transaction type
  const getDetailedExplanation = () => {
    const explanations: Record<string, { 
      title: string; 
      tagline: string;
      visual: { emoji: string; label: string; color: string }[];
      keyPoint: string;
      importance: string;
      sentiment: 'bullish' | 'bearish' | 'neutral';
    }> = {
      'P+A': {
        title: 'Open Market Purchase',
        tagline: 'Insider buying shares with their own money',
        visual: [
          { emoji: '💵', label: 'Using Personal Money', color: 'text-green-600' },
          { emoji: '📈', label: 'Strong Bullish Signal', color: 'text-green-600' },
          { emoji: '⭐', label: 'Highest Importance', color: 'text-amber-500' }
        ],
        keyPoint: 'Insiders are betting their own capital that the stock will go up',
        importance: 'High',
        sentiment: 'bullish'
      },
      'S+D': {
        title: 'Open Market Sale',
        tagline: 'Insider selling their shares on the market',
        visual: [
          { emoji: '💸', label: 'Cashing Out Position', color: 'text-red-600' },
          { emoji: '❓', label: 'Mixed Signal - Many Reasons', color: 'text-amber-600' },
          { emoji: '👀', label: 'Watch for Patterns', color: 'text-blue-600' }
        ],
        keyPoint: 'Could mean concern about valuation, or just personal financial needs',
        importance: 'High',
        sentiment: 'bearish'
      },
      'A+A': {
        title: 'Grant or Award',
        tagline: 'Stock given as compensation, not purchased',
        visual: [
          { emoji: '🎁', label: 'Given as Salary/Bonus', color: 'text-blue-600' },
          { emoji: '📋', label: 'Part of Employment Contract', color: 'text-gray-600' },
          { emoji: '⬇️', label: 'Low Investment Signal', color: 'text-gray-500' }
        ],
        keyPoint: 'This is automatic compensation - the insider didn\'t choose to buy',
        importance: 'Low',
        sentiment: 'neutral'
      },
      'M+A': {
        title: 'Option Exercise',
        tagline: 'Converting stock options into actual shares',
        visual: [
          { emoji: '🔄', label: 'Options → Shares', color: 'text-purple-600' },
          { emoji: '📊', label: 'Often Followed by Sale', color: 'text-gray-600' },
          { emoji: '➖', label: 'Moderate Signal Strength', color: 'text-amber-600' }
        ],
        keyPoint: 'Technical move - watch if they keep shares or sell them after',
        importance: 'Medium',
        sentiment: 'neutral'
      },
      'F+D': {
        title: 'Tax Payment',
        tagline: 'Automatic withholding for taxes',
        visual: [
          { emoji: '🏦', label: 'Required by Tax Law', color: 'text-gray-600' },
          { emoji: '🤖', label: 'Automatic - Not Voluntary', color: 'text-gray-500' },
          { emoji: '❌', label: 'Can Safely Ignore', color: 'text-gray-400' }
        ],
        keyPoint: 'Company automatically withholds shares to pay taxes - not a real sale',
        importance: 'Low',
        sentiment: 'neutral'
      },
      'D+D': {
        title: 'Sale to Issuer',
        tagline: 'Shares sold back to the company itself',
        visual: [
          { emoji: '🏢', label: 'Sold to Company', color: 'text-pink-600' },
          { emoji: '🔄', label: 'Part of Buyback Program', color: 'text-blue-600' },
          { emoji: '➖', label: 'Moderate Signal Strength', color: 'text-amber-600' }
        ],
        keyPoint: 'Often part of structured company buyback - less meaningful than open market',
        importance: 'Medium',
        sentiment: 'neutral'
      },
      'G+D': {
        title: 'Gift',
        tagline: 'Shares transferred as a gift',
        visual: [
          { emoji: '🎀', label: 'Gift or Donation', color: 'text-indigo-600' },
          { emoji: '👨‍👩‍👧', label: 'To Family, Trust, or Charity', color: 'text-purple-600' },
          { emoji: '❌', label: 'No Investment Signal', color: 'text-gray-400' }
        ],
        keyPoint: 'Estate planning or charitable giving - no cash changes hands',
        importance: 'Low',
        sentiment: 'neutral'
      },
      'C+A': {
        title: 'Conversion',
        tagline: 'Converting one security type to another',
        visual: [
          { emoji: '🔁', label: 'Security Type Changed', color: 'text-cyan-600' },
          { emoji: '📑', label: 'Technical/Administrative', color: 'text-gray-600' },
          { emoji: '➖', label: 'Moderate Signal Strength', color: 'text-amber-600' }
        ],
        keyPoint: 'Administrative change (e.g., preferred to common stock) - not new money',
        importance: 'Medium',
        sentiment: 'neutral'
      },
      'J+A': {
        title: 'Other Acquisition',
        tagline: 'Shares acquired through other means',
        visual: [
          { emoji: '📥', label: 'Various Acquisition Types', color: 'text-teal-600' },
          { emoji: '❓', label: 'Check Transaction Details', color: 'text-gray-600' },
          { emoji: '➖', label: 'Moderate Signal Strength', color: 'text-amber-600' }
        ],
        keyPoint: 'Could be merger, inheritance, or other - review the specific description',
        importance: 'Medium',
        sentiment: 'neutral'
      }
    };

    const key = `${transactionCode}+${acquiredDisposedCode}`;
    return explanations[key] || {
      title: 'Transaction',
      tagline: 'Shares acquired or disposed',
      visual: [
        { emoji: '📊', label: 'Standard', color: 'text-gray-600' },
        { emoji: '❓', label: 'Review Details', color: 'text-gray-500' }
      ],
      keyPoint: 'Check transaction description',
      importance: category.importance === 'high' ? 'High' : category.importance === 'medium' ? 'Medium' : 'Low',
      sentiment: 'neutral' as const
    };
  };

  const explanation = getDetailedExplanation();

  // Desktop tooltip positioning classes
  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowPositionClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-[1px]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[1px]',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-[1px]',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-[1px]'
  };

  const arrowRotationClasses = {
    top: 'rotate-180',
    bottom: '',
    left: '-rotate-90',
    right: 'rotate-90'
  };

  return (
    <>
      {/* Trigger wrapper */}
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
      >
        {children}
        
        {/* Info icon indicator */}
        <button
          className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg hover:scale-110 transform duration-200 z-10"
          aria-label="More information"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
        >
          <span className="font-bold leading-none">i</span>
        </button>

        {/* Desktop tooltip */}
        {isOpen && !isMobile && (
          <div
            className={`
              absolute z-99 w-72 animate-in fade-in slide-in-from-top-2 duration-200
              ${tooltipPositionClasses[position]}
            `}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden backdrop-blur-sm">
              {/* Header */}
              <div className={`px-4 py-3 ${category.colorClass} border-b border-current/10`}>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{explanation.title}</h3>
                    <p className="text-xs opacity-75 font-medium mt-0.5">{explanation.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Visual indicators */}
              <div className="px-4 py-3 space-y-2">
                {explanation.visual.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Key point */}
              <div className="px-4 pb-3">
                <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                  <p className="text-sm text-blue-900 font-medium">💡 {explanation.keyPoint}</p>
                </div>
              </div>

              {/* Importance footer */}
              <div className={`px-4 py-2 border-t border-gray-100 flex items-center justify-between
                ${explanation.importance === 'High' ? 'bg-green-50' : ''}
                ${explanation.importance === 'Medium' ? 'bg-amber-50' : ''}
                ${explanation.importance === 'Low' ? 'bg-gray-50' : ''}
              `}>
                <span className="text-xs font-semibold text-gray-600">Signal Strength</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${explanation.importance === 'High' ? 'bg-green-500/20 text-green-800' : ''}
                  ${explanation.importance === 'Medium' ? 'bg-amber-500/20 text-amber-800' : ''}
                  ${explanation.importance === 'Low' ? 'bg-gray-500/20 text-gray-700' : ''}
                `}>
                  {explanation.importance}
                </span>
              </div>

              {/* Learn More Link */}
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                <a
                  href="/learn/insider-trading-guide"
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center justify-center gap-1 hover:gap-2 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>📚 Learn Advanced Strategies</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Arrow */}
            <div className={`absolute ${arrowPositionClasses[position]}`}>
              <div className={`w-3 h-3 bg-white border-l border-t border-gray-200/60 ${arrowRotationClasses[position]}`} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile modal overlay */}
      {isOpen && isMobile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            ref={modalRef}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            {/* Header */}
            <div className={`px-6 py-5 ${category.colorClass} border-b border-current/10`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-4xl">{category.icon}</span>
                  <div>
                    <h3 className="font-bold text-xl">{explanation.title}</h3>
                    <p className="text-sm opacity-75 font-medium mt-1">{explanation.tagline}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
              
              {/* Importance badge */}
              <div className="flex items-center justify-center gap-2 bg-white/30 rounded-xl px-4 py-2">
                <span className="text-sm font-semibold opacity-75">Signal Strength</span>
                <span className={`
                  px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm
                  ${explanation.importance === 'High' ? 'bg-green-500 text-white' : ''}
                  ${explanation.importance === 'Medium' ? 'bg-amber-500 text-white' : ''}
                  ${explanation.importance === 'Low' ? 'bg-gray-400 text-white' : ''}
                `}>
                  {explanation.importance}
                </span>
              </div>
            </div>

            {/* Visual indicators */}
            <div className="px-6 py-5 space-y-4">
              {explanation.visual.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className={`text-base font-bold ${item.color}`}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Key point */}
            <div className="px-6 pb-5">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl px-5 py-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <p className="text-base text-white font-semibold leading-relaxed">{explanation.keyPoint}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200/60 space-y-2">
              <a
                href="/learn/insider-trading-guide"
                className="block w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold text-base hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-center"
                onClick={(e) => e.stopPropagation()}
              >
                📚 Learn Trading Strategies
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 bg-white text-gray-700 rounded-2xl font-semibold text-base hover:bg-gray-100 transition-all border border-gray-300 active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
