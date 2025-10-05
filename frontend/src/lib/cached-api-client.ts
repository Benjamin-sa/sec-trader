/**
 * Cached API Client
 * 
 * Wraps the existing API client with intelligent caching to minimize database reads.
 * 
 * Features:
 * - Automatic caching of API responses
 * - Configurable TTL per endpoint type
 * - Smart cache invalidation
 * - Stale-while-revalidate for better UX
 */

import { apiClient, alpacaClient } from './api-client';
import type { TradeData, ClusterBuy, ApiFilters, MarketBarsResponse, NewsResponse } from './api-client';
import { cache, createCacheKey, type CacheOptions } from './cache';

// ============================================================================
// Cache Configuration per Endpoint Type
// ============================================================================

const CACHE_CONFIG = {
  // Trading data - moderate freshness required
  trades: {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['trades'] as string[],
  },
  importantTrades: {
    ttl: 3 * 60 * 1000, // 3 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['trades', 'important'] as string[],
  },
  clusterBuys: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['trades', 'clusters'] as string[],
  },
  companyTrades: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['trades', 'company'] as string[],
  },
  insiderTrades: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['trades', 'insider'] as string[],
  },
  
  // Market data - needs to be fresher
  marketBars: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['market', 'bars'] as string[],
  },
  marketSnapshot: {
    ttl: 30 * 1000, // 30 seconds (real-time data)
    staleWhileRevalidate: true,
    persistent: false,
    tags: ['market', 'snapshot'] as string[],
  },
  marketQuote: {
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true,
    persistent: false,
    tags: ['market', 'quote'] as string[],
  },
  
  // News - can be cached longer
  news: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: true,
    persistent: true,
    tags: ['news'] as string[],
  },
};

// ============================================================================
// Cached REST API Client
// ============================================================================

export class CachedRestApiClient {
  /**
   * Get latest trades with caching
   */
  async getLatestTrades(
    limit: number = 50, 
    filters?: ApiFilters,
    options?: Partial<CacheOptions>
  ): Promise<TradeData[]> {
    const cacheKey = createCacheKey('trades-latest', { limit, ...filters });
    
    return cache.get(
      cacheKey,
      () => apiClient.getLatestTrades(limit, filters),
      { ...CACHE_CONFIG.trades, ...options, namespace: 'api' }
    );
  }

  /**
   * Get important trades with caching
   */
  async getImportantTrades(
    limit: number = 50,
    options?: Partial<CacheOptions>
  ): Promise<TradeData[]> {
    const cacheKey = createCacheKey('trades-important', { limit });
    
    return cache.get(
      cacheKey,
      () => apiClient.getImportantTrades(limit),
      { ...CACHE_CONFIG.importantTrades, ...options, namespace: 'api' }
    );
  }

  /**
   * Get cluster buys with caching
   */
  async getClusterBuys(
    daysWindow: number = 7,
    options?: Partial<CacheOptions>
  ): Promise<ClusterBuy[]> {
    const cacheKey = createCacheKey('trades-clusters', { daysWindow });
    
    return cache.get(
      cacheKey,
      () => apiClient.getClusterBuys(daysWindow),
      { ...CACHE_CONFIG.clusterBuys, ...options, namespace: 'api' }
    );
  }

  /**
   * Get trades by company with caching
   */
  async getTradesByCompany(
    symbol?: string,
    cik?: string,
    name?: string,
    limit: number = 50,
    filters?: ApiFilters,
    options?: Partial<CacheOptions>
  ): Promise<TradeData[]> {
    const cacheKey = createCacheKey('trades-company', { symbol, cik, name, limit, ...filters });
    
    return cache.get(
      cacheKey,
      () => apiClient.getTradesByCompany(symbol, cik, name, limit, filters),
      { ...CACHE_CONFIG.companyTrades, ...options, namespace: 'api' }
    );
  }

  /**
   * Get trades by insider with caching
   */
  async getTradesByInsider(
    cik?: string,
    name?: string,
    limit: number = 50,
    filters?: ApiFilters,
    options?: Partial<CacheOptions>
  ): Promise<TradeData[]> {
    const cacheKey = createCacheKey('trades-insider', { cik, name, limit, ...filters });
    
    return cache.get(
      cacheKey,
      () => apiClient.getTradesByInsider(cik, name, limit, filters),
      { ...CACHE_CONFIG.insiderTrades, ...options, namespace: 'api' }
    );
  }

  /**
   * Invalidate all trade-related caches
   */
  async invalidateTrades(): Promise<void> {
    await cache.invalidateByTag('trades');
  }

  /**
   * Invalidate company-specific cache
   */
  async invalidateCompany(identifier: string): Promise<void> {
    await cache.invalidatePattern(`trades-company.*${identifier}.*`, 'api');
  }

  /**
   * Invalidate insider-specific cache
   */
  async invalidateInsider(cik: string): Promise<void> {
    await cache.invalidatePattern(`trades-insider.*${cik}.*`, 'api');
  }
}

// ============================================================================
// Cached Alpaca Market API Client
// ============================================================================

export class CachedAlpacaApiClient {
  /**
   * Get market bars with caching
   */
  async getMarketBars(
    symbol: string,
    timeframe: string = '1Day',
    months: number = 3,
    analysis: boolean = true,
    options?: Partial<CacheOptions>
  ): Promise<MarketBarsResponse> {
    const cacheKey = createCacheKey('market-bars', { symbol, timeframe, months, analysis });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getMarketBars(symbol, timeframe, months, analysis),
      { ...CACHE_CONFIG.marketBars, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get market bars with custom range (cached)
   */
  async getMarketBarsCustomRange(
    symbol: string,
    start: string,
    end: string,
    timeframe: string = '1Day',
    analysis: boolean = true,
    options?: Partial<CacheOptions>
  ): Promise<MarketBarsResponse> {
    const cacheKey = createCacheKey('market-bars-range', { symbol, start, end, timeframe, analysis });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getMarketBarsCustomRange(symbol, start, end, timeframe, analysis),
      { ...CACHE_CONFIG.marketBars, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get market snapshot with short-term caching
   */
  async getSnapshot(
    symbol: string,
    options?: Partial<CacheOptions>
  ): Promise<ReturnType<typeof alpacaClient.getSnapshot>> {
    const cacheKey = createCacheKey('market-snapshot', { symbol });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getSnapshot(symbol),
      { ...CACHE_CONFIG.marketSnapshot, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get multiple snapshots with short-term caching
   */
  async getMultipleSnapshots(
    symbols: string[],
    options?: Partial<CacheOptions>
  ): Promise<ReturnType<typeof alpacaClient.getMultipleSnapshots>> {
    const cacheKey = createCacheKey('market-snapshots', { symbols: symbols.sort() });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getMultipleSnapshots(symbols),
      { ...CACHE_CONFIG.marketSnapshot, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get quote with short-term caching
   */
  async getQuote(
    symbol: string,
    options?: Partial<CacheOptions>
  ): Promise<Record<string, unknown>> {
    const cacheKey = createCacheKey('market-quote', { symbol });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getQuote(symbol),
      { ...CACHE_CONFIG.marketQuote, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get news with caching
   */
  async getNews(
    symbols?: string[],
    limit: number = 50,
    days: number = 7,
    hours?: number,
    options?: Partial<CacheOptions>
  ): Promise<NewsResponse> {
    const cacheKey = createCacheKey('news', { symbols: symbols?.sort(), limit, days, hours });
    
    return cache.get(
      cacheKey,
      () => alpacaClient.getNews(symbols, limit, days, hours),
      { ...CACHE_CONFIG.news, ...options, namespace: 'alpaca' }
    );
  }

  /**
   * Get news by symbol with caching
   */
  async getNewsBySymbol(
    symbol: string,
    limit: number = 50,
    days: number = 7,
    options?: Partial<CacheOptions>
  ): Promise<NewsResponse> {
    return this.getNews([symbol], limit, days, undefined, options);
  }

  /**
   * Invalidate all market data caches
   */
  async invalidateMarket(): Promise<void> {
    await cache.invalidateByTag('market');
  }

  /**
   * Invalidate symbol-specific market cache
   */
  async invalidateSymbol(symbol: string): Promise<void> {
    await cache.invalidatePattern(`.*${symbol}.*`, 'alpaca');
  }

  /**
   * Invalidate news cache
   */
  async invalidateNews(): Promise<void> {
    await cache.invalidateByTag('news');
  }
}

// ============================================================================
// Export Singleton Instances
// ============================================================================

export const cachedApiClient = new CachedRestApiClient();
export const cachedAlpacaClient = new CachedAlpacaApiClient();

// ============================================================================
// Cache Management Utilities
// ============================================================================

/**
 * Clear all caches (useful for logout or testing)
 */
export async function clearAllCaches(): Promise<void> {
  await cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Prefetch data to warm up the cache
 */
export async function prefetchCommonData(): Promise<void> {
  try {
    // Prefetch important data in parallel
    await Promise.all([
      cachedApiClient.getImportantTrades(25),
      cachedApiClient.getLatestTrades(25),
      cachedApiClient.getClusterBuys(7),
    ]);
  } catch (error) {
    console.warn('Prefetch failed:', error);
  }
}

/**
 * Hook for React components to use cached API
 */
export function useCachedApi() {
  return {
    api: cachedApiClient,
    alpaca: cachedAlpacaClient,
    cache: {
      clear: clearAllCaches,
      stats: getCacheStats,
      prefetch: prefetchCommonData,
    },
  };
}
