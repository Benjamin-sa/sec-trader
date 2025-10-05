/**
 * Frontend Cache System
 * 
 * A scalable, adaptive cache mechanism to minimize database reads.
 * 
 * Architecture:
 * 1. Memory Cache (fastest, short-lived)
 * 2. IndexedDB Cache (persistent across sessions)
 * 3. Stale-While-Revalidate pattern
 * 4. Cache invalidation strategies
 * 
 * Usage:
 * ```typescript
 * const data = await cache.get('trades-latest', async () => {
 *   return await apiClient.getLatestTrades();
 * }, { ttl: 60000 }); // 1 minute TTL
 * ```
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  key: string;
}

export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Whether to use stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
  /** Custom cache key prefix */
  namespace?: string;
  /** Force refresh from source */
  forceRefresh?: boolean;
  /** Store in IndexedDB for persistence */
  persistent?: boolean;
  /** Tags for bulk invalidation */
  tags?: string[];
}

export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  idbHits: number;
  idbMisses: number;
  totalRequests: number;
  hitRate: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL_MULTIPLIER = 2; // Serve stale data for 2x TTL while revalidating
const MEMORY_CACHE_SIZE = 100; // Maximum items in memory
const IDB_NAME = 'ecom-trader-cache';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'cache-store';

// ============================================================================
// Memory Cache Layer
// ============================================================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = MEMORY_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, entry: CacheEntry<T>): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry) {
      this.updateAccessOrder(key);
      return entry;
    }
    return null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// IndexedDB Cache Layer
// ============================================================================

class IndexedDBCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      throw new Error('IndexedDB is not available in server-side rendering');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
    });

    return this.dbPromise;
  }

  async set<T>(key: string, entry: CacheEntry<T> & { tags?: string[] }): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      await store.put({ ...entry, key });
    } catch (error) {
      console.warn('IndexedDB set failed:', error);
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('IndexedDB get failed:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      await store.delete(key);
    } catch (error) {
      console.warn('IndexedDB delete failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      await store.clear();
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const index = store.index('tags');
      const request = index.openCursor(IDBKeyRange.only(tag));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('IndexedDB invalidateByTag failed:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const index = store.index('timestamp');
      const now = Date.now();
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          if (now - entry.timestamp > entry.ttl * STALE_TTL_MULTIPLIER) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('IndexedDB cleanup failed:', error);
    }
  }
}

// ============================================================================
// Main Cache Manager
// ============================================================================

export class CacheManager {
  private memoryCache: MemoryCache;
  private idbCache: IndexedDBCache;
  private stats: CacheStats;
  private revalidationInProgress = new Map<string, Promise<unknown>>();

  constructor() {
    this.memoryCache = new MemoryCache();
    this.idbCache = new IndexedDBCache();
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      idbHits: 0,
      idbMisses: 0,
      totalRequests: 0,
      hitRate: 0,
    };

    // Cleanup old entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.idbCache.cleanup(), 60 * 60 * 1000); // Every hour
    }
  }

  /**
   * Get data from cache or fetch from source
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = DEFAULT_TTL,
      staleWhileRevalidate = true,
      namespace = 'default',
      forceRefresh = false,
      persistent = false,
      tags = [],
    } = options;

    const cacheKey = this.buildKey(namespace, key);
    this.stats.totalRequests++;

    // Force refresh bypasses cache
    if (forceRefresh) {
      return await this.fetchAndCache(cacheKey, fetcher, ttl, persistent, tags);
    }

    // Check memory cache first
    const memoryEntry = this.memoryCache.get<T>(cacheKey);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.stats.memoryHits++;
      this.updateHitRate();
      return memoryEntry.data;
    }

    if (memoryEntry && this.isStale(memoryEntry) && staleWhileRevalidate) {
      // Serve stale data while revalidating in background
      this.stats.memoryHits++;
      this.updateHitRate();
      this.revalidateInBackground(cacheKey, fetcher, ttl, persistent, tags);
      return memoryEntry.data;
    }

    this.stats.memoryMisses++;

    // Check IndexedDB cache
    if (persistent || !memoryEntry) {
      const idbEntry = await this.idbCache.get<T>(cacheKey);
      if (idbEntry && this.isValid(idbEntry)) {
        this.stats.idbHits++;
        this.updateHitRate();
        // Populate memory cache
        this.memoryCache.set(cacheKey, idbEntry);
        return idbEntry.data;
      }

      if (idbEntry && this.isStale(idbEntry) && staleWhileRevalidate) {
        this.stats.idbHits++;
        this.updateHitRate();
        this.memoryCache.set(cacheKey, idbEntry);
        this.revalidateInBackground(cacheKey, fetcher, ttl, persistent, tags);
        return idbEntry.data;
      }

      this.stats.idbMisses++;
    }

    // Cache miss - fetch from source
    this.updateHitRate();
    return await this.fetchAndCache(cacheKey, fetcher, ttl, persistent, tags);
  }

  /**
   * Manually set cache entry
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = DEFAULT_TTL,
      namespace = 'default',
      persistent = false,
      tags = [],
    } = options;

    const cacheKey = this.buildKey(namespace, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: cacheKey,
    };

    this.memoryCache.set(cacheKey, entry);

    if (persistent) {
      await this.idbCache.set(cacheKey, { ...entry, tags });
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string, namespace: string = 'default'): Promise<void> {
    const cacheKey = this.buildKey(namespace, key);
    this.memoryCache.delete(cacheKey);
    await this.idbCache.delete(cacheKey);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string, namespace: string = 'default'): Promise<void> {
    const prefix = this.buildKey(namespace, '');
    const regex = new RegExp(pattern);

    // Clear from memory cache
    const keysToDelete = this.memoryCache.keys().filter(key => 
      key.startsWith(prefix) && regex.test(key)
    );
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Note: IndexedDB doesn't support pattern matching efficiently
    // Consider using tags for bulk invalidation
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    await this.idbCache.invalidateByTag(tag);
    // Also clear from memory (simple approach: clear all)
    this.memoryCache.clear();
  }

  /**
   * Clear all cache
   */
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const prefix = this.buildKey(namespace, '');
      const keysToDelete = this.memoryCache.keys().filter(key => key.startsWith(prefix));
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } else {
      this.memoryCache.clear();
      await this.idbCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      idbHits: 0,
      idbMisses: 0,
      totalRequests: 0,
      hitRate: 0,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private isStale(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age >= entry.ttl && age < entry.ttl * STALE_TTL_MULTIPLIER;
  }

  private async fetchAndCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    persistent: boolean,
    tags: string[]
  ): Promise<T> {
    const data = await fetcher();
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: cacheKey,
    };

    this.memoryCache.set(cacheKey, entry);

    if (persistent) {
      await this.idbCache.set(cacheKey, { ...entry, tags });
    }

    return data;
  }

  private async revalidateInBackground<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    persistent: boolean,
    tags: string[]
  ): Promise<void> {
    // Prevent duplicate revalidations
    if (this.revalidationInProgress.has(cacheKey)) {
      return;
    }

    const promise = this.fetchAndCache(cacheKey, fetcher, ttl, persistent, tags)
      .catch(error => {
        console.warn('Background revalidation failed:', error);
      })
      .finally(() => {
        this.revalidationInProgress.delete(cacheKey);
      });

    this.revalidationInProgress.set(cacheKey, promise);
  }

  private updateHitRate(): void {
    const totalHits = this.stats.memoryHits + this.stats.idbHits;
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? totalHits / this.stats.totalRequests 
      : 0;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const cache = new CacheManager();

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Create a cache key from parameters
 */
export function createCacheKey(base: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

  const paramString = JSON.stringify(sortedParams);
  return `${base}:${paramString}`;
}

/**
 * Cache decorator for class methods
 */
export function Cached(options: CacheOptions = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = createCacheKey(propertyKey, { args });
      return await cache.get(
        cacheKey,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}
