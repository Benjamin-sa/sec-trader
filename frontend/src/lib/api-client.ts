// REST API client for Cloudflare Workers API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-server.benjamin-sautersb.workers.dev';
const ALPACA_API_URL = process.env.NEXT_PUBLIC_ALPACA_API_URL || 'https://alpaca-market.benjamin-sautersb.workers.dev';

// Generic API response wrapper from workers/api
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count: number;
  timestamp: string;
  pagination?: PaginationMetadata;
  query_info?: {
    filters_applied: number;
    total_params: number;
    limit_applied: number;
    count_source?: string;
  };
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  offset: number;
  total_count: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  next_page: number | null;
  prev_page: number | null;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: PaginationMetadata;
  query_info?: {
    filters_applied: number;
    total_params: number;
    limit_applied: number;
    count_source?: string;
  };
}

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

export interface FilingData {
  accession_number: string;
  filed_at: string;
  form_type: string;
  issuer_cik: string;
  issuer_name: string;
  trading_symbol: string | null;
  person_cik: string;
  person_name: string;
  transaction_count: number;
  total_value: number;
  total_shares: number;
}

export interface FilingResponse {
  filing: FilingData;
  trades: TradeData[];
  count: number;
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
  page?: number;
}

export interface MarketSnapshot {
  symbol: string;
  snapshot: Record<string, unknown>;
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

  private async fetchApiWithPagination<T>(endpoint: string, queryParams: string = ''): Promise<PaginatedResponse<T>> {
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

      const apiResponse: ApiResponse<T> = await response.json();
      
      return {
        data: apiResponse.data,
        pagination: apiResponse.pagination || {
          page: 1,
          limit: 25,
          offset: 0,
          total_count: Array.isArray(apiResponse.data) ? apiResponse.data.length : 0,
          total_pages: 1,
          has_next_page: false,
          has_prev_page: false,
          next_page: null,
          prev_page: null,
        },
        query_info: apiResponse.query_info
      };
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getLatestTrades(limit: number = 50, filters?: ApiFilters): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({ ...filters, limit });
    return this.fetchApi<TradeData[]>('/api/trades/latest', queryParams);
  }

  async getLatestTradesWithPagination(limit: number = 25, filters?: ApiFilters): Promise<PaginatedResponse<TradeData[]>> {
    const queryParams = this.buildQueryParams({ ...filters, limit });
    return this.fetchApiWithPagination<TradeData[]>('/api/trades/latest', queryParams);
  }

  async getImportantTrades(limit: number = 50): Promise<TradeData[]> {
    const queryParams = this.buildQueryParams({ limit });
    return this.fetchApi<TradeData[]>('/api/trades/important', queryParams);
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    const queryParams = this.buildQueryParams({ days: daysWindow } as ApiFilters & { days?: number });
    return this.fetchApi<ClusterBuy[]>('/api/trades/clusters', queryParams);
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
    } as ApiFilters & { cik?: string; name?: string; limit?: number });
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
    } as ApiFilters & { cik?: string; name?: string; limit?: number });
    return this.fetchApi<TradeData[]>('/api/trades/insider', queryParams);
  }

  async getFilingByAccessionNumber(accessionNumber: string): Promise<FilingResponse> {
    if (!accessionNumber) {
      throw new Error('Accession number is required');
    }
    return this.fetchApi<FilingResponse>(`/api/filing/${accessionNumber}`);
  }


  /**
   * Start insider backfill with real-time streaming updates
   * Returns an EventSource for listening to progress events
   */
  createInsiderBackfillStream(
    cik: string,
    limit: number = 50,
    onProgress?: (data: BackfillProgress) => void,
    onComplete?: (data: BackfillResponse) => void,
    onError?: (error: string) => void
  ): EventSource {
    const queryParams = this.buildQueryParams({ cik, limit } as ApiFilters & { limit?: number });
    const url = `${this.baseUrl}/api/insider/backfill${queryParams}`;
    
    const eventSource = new EventSource(url);

    // Listen to different event types
    eventSource.addEventListener('status', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onProgress?.(data);
    });

    eventSource.addEventListener('found', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onProgress?.(data);
    });

    eventSource.addEventListener('progress', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onProgress?.(data);
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onComplete?.(data);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onError?.(data.message || 'Import failed');
      eventSource.close();
    });

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      onError?.('Connection error during import');
      eventSource.close();
    };

    return eventSource;
  }

  async getInsiderBackfillStatus(cik: string): Promise<ApiResponse<BackfillStatus>> {
    const queryParams = this.buildQueryParams({ cik } as ApiFilters);
    return this.fetchApi<ApiResponse<BackfillStatus>>('/api/insider/backfill/status', queryParams);
  }
}

export interface BackfillProgress {
  message?: string;
  phase?: string;
  cik?: string;
  totalFound?: number;
  processed?: number;
  skipped?: number;
  errors?: number;
  total?: number;
  remaining?: number;
  progress?: number;
  totalFilings?: number;
}

export interface BackfillResponse {
  success?: boolean;
  test?: boolean;
  cik: string;
  totalFound: number;
  processed?: number;
  queued?: number;
  skipped?: number;
  errors?: number;
  duration?: number;
  wouldBeProcessed?: number;
  wouldBeQueued?: number;
  wouldBeSkipped?: number;
  message: string;
  details?: {
    processedFilings?: Array<{
      accessionNumber: string;
      filingDate: string;
    }>;
    skippedFilings?: Array<{
      accessionNumber: string;
      filingDate: string;
      reason: string;
    }>;
    failedFilings?: Array<{
      accessionNumber?: string;
      filingDate?: string;
      error: string;
    }>;
  };
  summary?: {
    successRate: number;
    avgTimePerFiling: number;
  };
  filings?: Array<{
    accessionNumber: string;
    filingDate: string;
    alreadyProcessed: boolean;
    wouldBeQueued: boolean;
  }>;
}

export interface BackfillStatus {
  cik: string;
  historyImported: boolean;
  queued: number;
  completed: number;
  failed: number;
  total: number;
  lastFiling?: {
    accessionNumber: string;
    queuedAt: string;
    completedAt: string | null;
    status: string;
  };
}

// Alpaca Market API Client
class AlpacaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ALPACA_API_URL) {
    this.baseUrl = baseUrl;
  }

  private buildQueryParams(params?: Record<string, string | number | boolean | undefined>): string {
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

  async getSnapshot(symbol: string): Promise<MarketSnapshot> {
    return this.fetchApi<MarketSnapshot>(`/api/market/snapshot/${symbol}`);
  }

  async getMultipleSnapshots(symbols: string[]): Promise<Record<string, MarketSnapshot>> {
    const queryParams = this.buildQueryParams({ symbols: symbols.join(',') });
    return this.fetchApi<Record<string, MarketSnapshot>>(`/api/market/snapshots`, queryParams);
  }

  async getNews(
    symbols?: string[],
    limit: number = 50,
    days: number = 7,
    hours?: number
  ): Promise<NewsResponse> {
    const params: Record<string, string | number> = { limit };
    if (symbols && symbols.length > 0) {
      params.symbols = symbols.join(',');
    }
    if (hours) {
      params.hours = hours;
    } else {
      params.days = days;
    }
    const queryParams = this.buildQueryParams(params);
    return this.fetchApi<NewsResponse>(`/api/market/news`, queryParams);
  }

  async getNewsBySymbol(symbol: string, limit: number = 50, days: number = 7): Promise<NewsResponse> {
    return this.getNews([symbol], limit, days);
  }
}

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  content: string | null;
  symbols: string[];
  source: string | null;
  images: Array<{ size: string; url: string }>;
}

export interface NewsResponse {
  symbols: string[] | null;
  start: string;
  end: string;
  count: number;
  sort: string;
  news: NewsArticle[];
  timestamp: string;
  nextPageToken?: string;
}

// Export singleton instances
export const apiClient = new RestApiClient();
export const alpacaClient = new AlpacaApiClient();
