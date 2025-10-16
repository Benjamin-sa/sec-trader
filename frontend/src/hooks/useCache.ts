/**
 * React Hook for Cache Management
 * 
 * Provides easy-to-use cache utilities in React components.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { cache, type CacheStats } from '@/lib/cache';
import { clearAllCaches, getCacheStats, prefetchCommonData } from '@/lib/cached-api-client';

/**
 * Hook to manage cache in React components
 */
export function useCache() {
  const statsRef = useRef<CacheStats | null>(null);

  const getStats = useCallback(() => {
    const stats = getCacheStats();
    statsRef.current = stats;
    return stats;
  }, []);

  const clear = useCallback(async (namespace?: string) => {
    if (namespace) {
      await cache.clear(namespace);
    } else {
      await clearAllCaches();
    }
  }, []);

  const prefetch = useCallback(async () => {
    await prefetchCommonData();
  }, []);

  const invalidate = useCallback(async (key: string, namespace: string = 'default') => {
    await cache.invalidate(key, namespace);
  }, []);

  const invalidatePattern = useCallback(async (pattern: string, namespace: string = 'default') => {
    await cache.invalidatePattern(pattern, namespace);
  }, []);

  const invalidateByTag = useCallback(async (tag: string) => {
    await cache.invalidateByTag(tag);
  }, []);

  return {
    getStats,
    clear,
    prefetch,
    invalidate,
    invalidatePattern,
    invalidateByTag,
    stats: statsRef.current,
  };
}

/**
 * Hook to prefetch data on component mount
 */
export function usePrefetch() {
  useEffect(() => {
    prefetchCommonData().catch(error => {
      console.warn('Prefetch failed:', error);
    });
  }, []);
}

/**
 * Hook to clear cache on component unmount (useful for testing)
 */
export function useClearCacheOnUnmount(namespace?: string) {
  useEffect(() => {
    return () => {
      if (namespace) {
        cache.clear(namespace).catch(console.warn);
      } else {
        clearAllCaches().catch(console.warn);
      }
    };
  }, [namespace]);
}

/**
 * Hook to monitor cache performance
 */
export function useCacheStats(intervalMs: number = 5000) {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setStats(getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return stats;
}
