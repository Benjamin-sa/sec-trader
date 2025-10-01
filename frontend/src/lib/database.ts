// Database utility for connecting to REST API
import { apiClient } from './api-client';
import type { TradeData, ClusterBuy, ApiFilters } from './api-client';

// Re-export types for convenience
export type { TradeData, ClusterBuy };

export class Database {
  async getLatestTrades(limit: number = 50, filters?: ApiFilters): Promise<TradeData[]> {
    return await apiClient.getLatestTrades(limit, filters);
  }

  async getImportantTrades(): Promise<TradeData[]> {
    return await apiClient.getImportantTrades();
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    return await apiClient.getClusterBuys(daysWindow);
  }

  async getTradesByCompany(
    symbol?: string, 
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    return await apiClient.getTradesByCompany(symbol, cik, name, limit, filters);
  }

  async getTradesByInsider(
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    return await apiClient.getTradesByInsider(cik, name, limit, filters);
  }

  async getFirstBuys(recentDays: number = 30, lookbackDays: number = 365): Promise<TradeData[]> {
    return await apiClient.getFirstBuys(recentDays, lookbackDays);
  }
}

export const db = new Database();
