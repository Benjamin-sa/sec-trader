// REST API client for Cloudflare Workers API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-server.benjamin-sautersb.workers.dev';
const ALPACA_API_URL = process.env.NEXT_PUBLIC_ALPACA_API_URL || 'https://alpaca-market.benjamin-sautersb.workers.dev';

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
  // Derived fields from API
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

export interface ApiFilters {
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

export interface MarketBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
  vwap: number | null;
}

export interface MarketAnalysis {
  currentPrice: number;
  startPrice: number;
  priceChange: number;
  priceChangePercent: string;
  periodHigh: number;
  periodLow: number;
  sma20: string | null;
  sma50: string | null;
  avgVolume: number;
  maxVolume: number;
  minVolume: number;
  totalBars: number;
}

export interface SignificantMove {
  date: string;
  previousClose: number;
  currentClose: number;
  changePercent: string;
  volume: number;
}

export interface MarketBarsResponse {
  symbol: string;
  timeframe: string;
  start: string;
  end: string;
  barCount: number;
  bars: MarketBar[];
  analysis?: MarketAnalysis;
  significantMoves?: SignificantMove[];
}

export interface MarketSnapshot {
  symbol: string;
  snapshot: any;
  timestamp: string;
}

class RestApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildQueryParams(filters?: ApiFilters & { limit?: number }): string {
    if (!filters) return '';
    
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async fetchApi<T>(endpoint: string, queryParams: string = ''): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${queryParams}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getLatestTrades(limit: number = 50, filters?: ApiFilters): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({ ...filters, limit });
    return this.fetchApi<TradeData[]>('/api/trades/latest', queryParams);
  }

  async getImportantTrades(limit: number = 50): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({ limit });
    return this.fetchApi<TradeData[]>('/api/trades/important', queryParams);
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    const queryParams = this.buildQueryParams({ days: daysWindow } as any);
    return this.fetchApi<ClusterBuy[]>('/api/trades/clusters', queryParams);
  }

  async getFirstBuys(recentDays: number = 30, lookbackDays: number = 365): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({ 
      recent_days: recentDays, 
      lookback_days: lookbackDays 
    } as any);
    return this.fetchApi<TradeData[]>('/api/trades/first-buys', queryParams);
  }

  async getTradesByCompany(
    symbol?: string,
    cik?: string,
    name?: string,
    limit: number = 50,
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({
      symbol,
      cik,
      name,
      limit,
      ...filters,
    } as any);
    return this.fetchApi<TradeData[]>('/api/trades/company', queryParams);
  }

  async getTradesByInsider(
    cik?: string,
    name?: string,
    limit: number = 50,
    filters?: ApiFilters
  ): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({
      cik,
      name,
      limit,
      ...filters,
    } as any);
    return this.fetchApi<TradeData[]>('/api/trades/insider', queryParams);
  }
}

// Alpaca Market API Client
class AlpacaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ALPACA_API_URL) {
    this.baseUrl = baseUrl;
  }

  private buildQueryParams(params?: Record<string, any>): string {
    if (!params) return '';
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async fetchApi<T>(endpoint: string, queryParams: string = ''): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${queryParams}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getMarketBars(
    symbol: string,
    timeframe: string = '1Day',
    months: number = 3,
    analysis: boolean = true
  ): Promise<MarketBarsResponse> {
    const queryParams = this.buildQueryParams({ timeframe, months, analysis });
    return this.fetchApi<MarketBarsResponse>(`/api/market/bars/${symbol}`, queryParams);
  }

  async getMarketBarsCustomRange(
    symbol: string,
    start: string,
    end: string,
    timeframe: string = '1Day',
    analysis: boolean = true
  ): Promise<MarketBarsResponse> {
    const queryParams = this.buildQueryParams({ start, end, timeframe, analysis });
    return this.fetchApi<MarketBarsResponse>(`/api/market/bars/${symbol}`, queryParams);
  }

  async getSnapshot(symbol: string): Promise<MarketSnapshot> {
    return this.fetchApi<MarketSnapshot>(`/api/market/snapshot/${symbol}`);
  }

  async getMultipleSnapshots(symbols: string[]): Promise<any> {
    const queryParams = this.buildQueryParams({ symbols: symbols.join(',') });
    return this.fetchApi(`/api/market/snapshots`, queryParams);
  }

  async getQuote(symbol: string): Promise<any> {
    return this.fetchApi(`/api/market/quote/${symbol}`);
  }
}

// Export singleton instances
export const apiClient = new RestApiClient();
export const alpacaClient = new AlpacaApiClient();
