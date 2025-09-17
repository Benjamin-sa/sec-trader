// Database utility for connecting to Cloudflare D1 via API Worker
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
  private apiBaseUrl: string;
  
  constructor() {
    // Use the deployed API worker URL
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-server.benjamin-sautersb.workers.dev';
  }

  private async fetchTradesFromApi(endpoint: string): Promise<TradeData[]> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    try {
      console.log(`Fetching from API: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request was not successful');
      }

      return data.data as TradeData[];
    } catch (error) {
      console.error(`API fetch error for ${endpoint}:`, error);
  throw error;
    }
  }

  private async fetchClustersFromApi(endpoint: string): Promise<ClusterBuy[]> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    try {
      console.log(`Fetching from API: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request was not successful');
      }

      return data.data as ClusterBuy[];
    } catch (error) {
      console.error(`API fetch error for ${endpoint}:`, error);
      return [];
    }
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
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      
      if (filters) {
        // Add string filters if they have values
        if (filters.q?.trim()) params.set('q', filters.q.trim());
        if (filters.type) params.set('type', filters.type);
        if (filters.acquired) params.set('acquired', filters.acquired);
        if (filters.ownership) params.set('ownership', filters.ownership);
        if (filters.symbol?.trim()) params.set('symbol', filters.symbol.trim());
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date) params.set('end_date', filters.end_date);
        
        // Add boolean filters only when true
        if (filters.is_director === true) params.set('is_director', '1');
        if (filters.is_officer === true) params.set('is_officer', '1');
        if (filters.is_ten_percent_owner === true) params.set('is_ten_percent_owner', '1');
        
        // Add numeric filters if they are positive numbers
        if (typeof filters.min_value === 'number' && filters.min_value > 0) {
          params.set('min_value', String(filters.min_value));
        }
        if (typeof filters.min_shares === 'number' && filters.min_shares > 0) {
          params.set('min_shares', String(filters.min_shares));
        }
      }
      
      const queryString = params.toString();
      console.log('Making API request with filters:', queryString);
      
      const data = await this.fetchTradesFromApi(`/api/trades/latest?${queryString}`);
      console.log('Received data:', data?.length, 'trades');
      
      return data || [];
    } catch (error) {
      console.error('Error fetching latest trades:', error);
      return [];
    }
  }

  async getImportantTrades(): Promise<TradeData[]> {
    try {
      const data = await this.fetchTradesFromApi('/api/trades/important');
      return data || [];
    } catch (error) {
      console.error('Error fetching important trades:', error);
  return [];
    }
  }

  async getClusterBuys(daysWindow: number = 7): Promise<ClusterBuy[]> {
    try {
      const data = await this.fetchClustersFromApi(`/api/trades/clusters?days=${daysWindow}`);
      return data || [];
    } catch (error) {
      console.error('Error fetching cluster buys:', error);
  return [];
    }
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
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      
      // Add company identifier
      if (symbol?.trim()) params.set('symbol', symbol.trim());
      if (cik?.trim()) params.set('cik', cik.trim());
      if (name?.trim()) params.set('name', name.trim());
      
      // Add additional filters
      if (filters) {
        if (filters.q?.trim()) params.set('q', filters.q.trim());
        if (filters.type) params.set('type', filters.type);
        if (filters.acquired) params.set('acquired', filters.acquired);
        if (filters.ownership) params.set('ownership', filters.ownership);
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date) params.set('end_date', filters.end_date);
        
        if (filters.is_director === true) params.set('is_director', '1');
        if (filters.is_officer === true) params.set('is_officer', '1');
        if (filters.is_ten_percent_owner === true) params.set('is_ten_percent_owner', '1');
        
        if (typeof filters.min_value === 'number' && filters.min_value > 0) {
          params.set('min_value', String(filters.min_value));
        }
        if (typeof filters.min_shares === 'number' && filters.min_shares > 0) {
          params.set('min_shares', String(filters.min_shares));
        }
      }
      
      const queryString = params.toString();
      console.log('Making API request for company trades:', queryString);
      
      const data = await this.fetchTradesFromApi(`/api/trades/company?${queryString}`);
      console.log('Received company trades:', data?.length, 'trades');
      
      return data || [];
    } catch (error) {
      console.error('Error fetching company trades:', error);
      return [];
    }
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
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      
      // Add insider identifier
      if (cik?.trim()) params.set('cik', cik.trim());
      if (name?.trim()) params.set('name', name.trim());
      
      // Add additional filters
      if (filters) {
        if (filters.q?.trim()) params.set('q', filters.q.trim());
        if (filters.type) params.set('type', filters.type);
        if (filters.acquired) params.set('acquired', filters.acquired);
        if (filters.ownership) params.set('ownership', filters.ownership);
        if (filters.symbol?.trim()) params.set('symbol', filters.symbol.trim());
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date) params.set('end_date', filters.end_date);
        
        if (filters.is_director === true) params.set('is_director', '1');
        if (filters.is_officer === true) params.set('is_officer', '1');
        if (filters.is_ten_percent_owner === true) params.set('is_ten_percent_owner', '1');
        
        if (typeof filters.min_value === 'number' && filters.min_value > 0) {
          params.set('min_value', String(filters.min_value));
        }
        if (typeof filters.min_shares === 'number' && filters.min_shares > 0) {
          params.set('min_shares', String(filters.min_shares));
        }
      }
      
      const queryString = params.toString();
      console.log('Making API request for insider trades:', queryString);
      
      const data = await this.fetchTradesFromApi(`/api/trades/insider?${queryString}`);
      console.log('Received insider trades:', data?.length, 'trades');
      
      return data || [];
    } catch (error) {
      console.error('Error fetching insider trades:', error);
      return [];
    }
  }

  async getFirstBuys(recentDays: number = 30, lookbackDays: number = 365): Promise<TradeData[]> {
    try {
      const data = await this.fetchTradesFromApi(`/api/trades/first-buys?recentDays=${recentDays}&lookbackDays=${lookbackDays}`);
      return data || [];
    } catch (error) {
      console.error('Error fetching first buys:', error);
      return [];
    }
  }
}

export const db = new Database();
