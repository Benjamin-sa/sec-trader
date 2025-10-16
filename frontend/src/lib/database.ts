// Database utility for connecting to REST API with caching
import { apiClient, type TradeData, type ClusterBuy, type ApiFilters } from './api-client';
import { cachedApiClient } from './cached-api-client';

// Re-export types for convenience
export type { TradeData, ClusterBuy };

export class Database {
  // Use cached API by default for better performance
  private useCache: boolean = true;

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.useCache = enabled;
  }

  async getLatestTrades(limit: number = 50, filters?: ApiFilters): Promise<TradeData[]> {
    if (this.useCache) {
      return await cachedApiClient.getLatestTrades(limit, filters);
    }
    return await apiClient.getLatestTrades(limit, filters);
  }

  async getImportantTrades(): Promise<TradeData[]> {
    if (this.useCache) {
      return await cachedApiClient.getImportantTrades();
    }
    return await apiClient.getImportantTrades();
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    if (this.useCache) {
      return await cachedApiClient.getClusterBuys(daysWindow);
    }
    return await apiClient.getClusterBuys(daysWindow);
  }

  async getTradesByCompany(
    symbol?: string, 
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    if (this.useCache) {
      return await cachedApiClient.getTradesByCompany(symbol, cik, name, limit, filters);
    }
    return await apiClient.getTradesByCompany(symbol, cik, name, limit, filters);
  }

  async getTradesByInsider(
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    if (this.useCache) {
      return await cachedApiClient.getTradesByInsider(cik, name, limit, filters);
    }
    return await apiClient.getTradesByInsider(cik, name, limit, filters);
  }

  /**
   * Force refresh data (bypass cache)
   */
  async refreshLatestTrades(limit: number = 50, filters?: ApiFilters): Promise<TradeData[]> {
    return await cachedApiClient.getLatestTrades(limit, filters, { forceRefresh: true });
  }

  async refreshImportantTrades(): Promise<TradeData[]> {
    return await cachedApiClient.getImportantTrades(50, { forceRefresh: true });
  }

  /**
   * Invalidate specific caches
   */
  async invalidateTrades(): Promise<void> {
    await cachedApiClient.invalidateTrades();
  }

  async invalidateCompany(identifier: string): Promise<void> {
    await cachedApiClient.invalidateCompany(identifier);
  }

  async invalidateInsider(cik: string): Promise<void> {
    await cachedApiClient.invalidateInsider(cik);
  }
}

export const db = new Database();
