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
import { createPortal } from 'react-dom';
import { getTransactionCategory } from './TransactionBadge';

interface TransactionInfoModalProps {
  transactionCode: string;
  acquiredDisposedCode: string;
  is10b51Plan?: boolean | number;
  children: React.ReactNode;
}

export default function TransactionInfoModal({
  transactionCode,
  acquiredDisposedCode,
  is10b51Plan,
  children
}: TransactionInfoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [mounted, setMounted] = useState(false);
  const [, setIsHovering] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const category = getTransactionCategory(transactionCode, acquiredDisposedCode, is10b51Plan);

  // Ensure component is mounted (SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

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

      // More conservative space requirements to prevent flickering
      if (spaceBelow > 450) {
        setPosition('bottom');
      } else if (spaceAbove > 450) {
        setPosition('top');
      } else if (spaceRight > 350) {
        setPosition('right');
      } else if (spaceLeft > 350) {
        setPosition('left');
      } else {
        // If no position has enough space, choose the one with most space
        // but prefer bottom to avoid header overlap
        if (spaceBelow >= spaceAbove) {
          setPosition('bottom');
        } else {
          setPosition('top');
        }
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
    if (!isMobile || !isOpen) return undefined;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  const handleToggle = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      // Clear any pending timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setIsHovering(true);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
      // Add a small delay before closing to prevent flickering
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
      'S+D+10b51': {
        title: '10b5-1 Planned Sale',
        tagline: 'Pre-scheduled automatic sale under SEC rule',
        visual: [
          { emoji: '🤖', label: 'Automated/Pre-planned', color: 'text-orange-600' },
          { emoji: '📅', label: 'Set Months in Advance', color: 'text-blue-600' },
          { emoji: '⬇️', label: 'Lower Signal Value', color: 'text-gray-500' }
        ],
        keyPoint: 'This sale was planned months ago - not based on current information',
        importance: 'Low',
        sentiment: 'neutral'
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

    // Check for 10b5-1 planned sale first
    if (transactionCode === 'S' && acquiredDisposedCode === 'D' && Boolean(is10b51Plan)) {
      return explanations['S+D+10b51'];
    }

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

  // Calculate absolute position for portal tooltip
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen && !isMobile && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  }, [isOpen, isMobile]);

  // Portal tooltip positioning
  const getPortalTooltipStyle = (): React.CSSProperties => {
    if (!triggerRect) return {};

    const tooltipWidth = 288; // w-72 = 288px
    const tooltipHeight = 400; // Approximate height
    const offset = 12; // Gap between trigger and tooltip
    const padding = 16; // Minimum distance from viewport edges

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipHeight - offset;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Constrain to viewport with stable positioning
    const maxTop = window.innerHeight - tooltipHeight - padding;
    const maxLeft = window.innerWidth - tooltipWidth - padding;
    
    top = Math.max(padding, Math.min(maxTop, top));
    left = Math.max(padding, Math.min(maxLeft, left));

    // Ensure tooltip doesn't cover the trigger when positioned incorrectly
    const triggerBottom = triggerRect.bottom;
    const triggerTop = triggerRect.top;
    const triggerLeft = triggerRect.left;
    const triggerRight = triggerRect.right;

    // If tooltip would overlap trigger, push it away
    if (position === 'top' && top + tooltipHeight + 8 > triggerTop) {
      top = triggerBottom + offset;
    } else if (position === 'bottom' && top - 8 < triggerBottom) {
      top = triggerTop - tooltipHeight - offset;
    } else if (position === 'left' && left + tooltipWidth + 8 > triggerLeft) {
      left = triggerRight + offset;
    } else if (position === 'right' && left - 8 < triggerRight) {
      left = triggerLeft - tooltipWidth - offset;
    }

    // Final bounds check
    top = Math.max(padding, Math.min(maxTop, top));
    left = Math.max(padding, Math.min(maxLeft, left));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    };
  };

  const renderDesktopTooltip = () => {
    if (!mounted || !isOpen || isMobile) return null;

    return createPortal(
      <div
        style={getPortalTooltipStyle()}
        className="w-72 animate-in fade-in slide-in-from-top-2 duration-200"
        onMouseEnter={() => {
          // Keep tooltip open when hovering over it
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          setIsHovering(true);
        }}
        onMouseLeave={() => {
          // Close tooltip when leaving it
          setIsHovering(false);
          hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
          }, 100);
        }}
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
      </div>,
      document.body
    );
  };

  const renderMobileModal = () => {
    if (!mounted || !isOpen || !isMobile) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          ref={modalRef}
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        >
          {/* Header */}
          <div className={`px-4 py-3 ${category.colorClass} border-b border-current/10 flex-shrink-0`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">{category.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-base leading-tight">{explanation.title}</h3>
                  <p className="text-xs opacity-75 font-medium mt-0.5 line-clamp-2">{explanation.tagline}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            
            {/* Importance badge */}
            <div className="flex items-center justify-center gap-1.5 bg-white/30 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold opacity-75">Signal Strength</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                ${explanation.importance === 'High' ? 'bg-green-500 text-white' : ''}
                ${explanation.importance === 'Medium' ? 'bg-amber-500 text-white' : ''}
                ${explanation.importance === 'Low' ? 'bg-gray-400 text-white' : ''}
              `}>
                {explanation.importance}
              </span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Visual indicators */}
            <div className="px-4 py-3 space-y-2">
              {explanation.visual.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <span className={`text-sm font-bold ${item.color} leading-tight`}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Key point */}
            <div className="px-4 pb-3">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-3 py-3 shadow-lg">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <p className="text-sm text-white font-semibold leading-relaxed">{explanation.keyPoint}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200/60 space-y-2 flex-shrink-0">
            <a
              href="/learn/insider-trading-guide"
              className="block w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-center"
              onClick={(e) => e.stopPropagation()}
            >
              📚 Learn Trading Strategies
            </a>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all border border-gray-300 active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
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
      </div>

      {/* Portal-rendered modals */}
      {renderDesktopTooltip()}
      {renderMobileModal()}
    </>
  );
}
