// Database utility for connecting to GraphQL API
import { gqlDb } from './graphql-client';

export interface TradeData {
  accession_number: string;
  filed_at: string;
  form_type: string;
  issuer_cik: string;
  issuer_name: string;
  trading_symbol: string | null;
  person_cik: string;
  person_name: string;
  is_director: boolean;
  is_officer: boolean;
  officer_title: string | null;
  is_ten_percent_owner: boolean;
  transaction_date: string;
  security_title: string;
  transaction_code: string;
  transaction_description: string;
  acquired_disposed_code: string;
  shares_transacted: number | null;
  price_per_share: number | null;
  transaction_value: number | null;
  shares_owned_following: number;
  direct_or_indirect: string;
  // Derived fields from API for importance and UI signals (optional for backward compatibility)
  is_purchase?: number;
  is_sale?: number;
  is_award?: number;
  role_priority?: number;
  cluster_size?: number;
  pct_of_holdings?: number | null;
  importance_score?: number;
  transaction_id?: number;
  is_10b5_1_plan?: number | boolean;
}

export interface ClusterBuy {
  issuer_name: string;
  trading_symbol: string | null;
  transaction_date: string;
  total_insiders: number;
  total_shares: number;
  total_value: number;
  trades: TradeData[];
}


export class Database {
  constructor() {
    // Use GraphQL API now
  }

  async getLatestTrades(limit: number = 50, filters?: {
    q?: string;
    type?: 'P' | 'S' | 'A';
    acquired?: 'A' | 'D';
    ownership?: 'D' | 'I';
    is_director?: boolean;
    is_officer?: boolean;
    is_ten_percent_owner?: boolean;
    symbol?: string;
    min_value?: number;
    min_shares?: number;
    start_date?: string; // YYYY-MM-DD
    end_date?: string;   // YYYY-MM-DD
  }): Promise<TradeData[]> {
    return await gqlDb.getLatestTrades(limit, filters);
  }

  async getImportantTrades(): Promise<TradeData[]> {
    return await gqlDb.getImportantTrades();
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    return await gqlDb.getClusterBuys(daysWindow);
  }

  async getTradesByCompany(
    symbol?: string, 
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: {
      q?: string;
      type?: 'P' | 'S' | 'A';
      acquired?: 'A' | 'D';
      ownership?: 'D' | 'I';
      is_director?: boolean;
      is_officer?: boolean;
      is_ten_percent_owner?: boolean;
      min_value?: number;
      min_shares?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<TradeData[]> {
    return await gqlDb.getTradesByCompany(symbol, cik, name, limit, filters);
  }

  async getTradesByInsider(
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: {
      q?: string;
      type?: 'P' | 'S' | 'A';
      acquired?: 'A' | 'D';
      ownership?: 'D' | 'I';
      is_director?: boolean;
      is_officer?: boolean;
      is_ten_percent_owner?: boolean;
      symbol?: string;
      min_value?: number;
      min_shares?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<TradeData[]> {
    return await gqlDb.getTradesByInsider(cik, name, limit, filters);
  }

  async getFirstBuys(recentDays: number = 30, lookbackDays: number = 365): Promise<TradeData[]> {
    return await gqlDb.getFirstBuys(recentDays, lookbackDays);
  }
}

export const db = new Database();
