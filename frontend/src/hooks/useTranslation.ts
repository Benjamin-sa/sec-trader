import { useTranslations as useNextIntlTranslations } from 'next-intl';

/**
 * Custom hook for translations with better TypeScript support
 * Usage: const t = useT();
 */
export function useT(namespace?: string) {
  return useNextIntlTranslations(namespace);
}

/**
 * Format number with locale
 */
export function useNumberFormatter(options?: Intl.NumberFormatOptions) {
  const locale = typeof window !== 'undefined' 
    ? localStorage.getItem('preferred-locale') || 'en'
    : 'en';
    
  return new Intl.NumberFormat(locale, options);
}

/**
 * Format currency with locale
 */
export function useCurrencyFormatter(currency = 'USD') {
  return useNumberFormatter({
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format date with locale
 */
export function useDateFormatter(options?: Intl.DateTimeFormatOptions) {
  const locale = typeof window !== 'undefined'
    ? localStorage.getItem('preferred-locale') || 'en'
    : 'en';
    
  return new Intl.DateTimeFormat(locale, options);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function useRelativeTimeFormatter() {
  const locale = typeof window !== 'undefined'
    ? localStorage.getItem('preferred-locale') || 'en'
    : 'en';
    
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
}

/**
 * Get relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];
  
  for (const { unit, seconds } of units) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      const locale = typeof window !== 'undefined'
        ? localStorage.getItem('preferred-locale') || 'en'
        : 'en';
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return rtf.format(-interval, unit);
    }
  }
  
  return 'just now';
}

/**
 * Format large numbers (e.g., 1M, 1.5B)
 */
export function formatCompactNumber(num: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
}
