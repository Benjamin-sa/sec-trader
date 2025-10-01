/**
 * GraphQL Client for SEC Insider Trading Platform
 * 
 * Replaces the REST API calls with GraphQL queries
 */

import { GraphQLClient } from 'graphql-request';

// GraphQL client configuration
const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://graphql-api.benjamin-sautersb.workers.dev/graphql',
  {
    headers: {
      'Content-Type': 'application/json',
    },
  }
);

// GraphQL Queries
export const LATEST_TRADES_QUERY = `
  query GetLatestTrades(
    $filters: TradeFilters
    $sort: TradeSortInput
    $pagination: PaginationInput
  ) {
    trades(filters: $filters, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          transactionDate
          transactionType
          transactionCode
          acquisitionDisposition
          sharesTransacted
          pricePerShare
          totalValue
          sharesOwnedAfter
          directIndirect
          insider {
            cik
            name
            title
            historyImported
          }
          company {
            id
            cik
            name
            ticker
          }
          filing {
            accessionNumber
            filingDate
          }
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
      totalValue
    }
  }
`;

export const IMPORTANT_TRADES_QUERY = `
  query GetImportantTrades($timeframe: Timeframe!, $minValue: Float, $limit: Int) {
    importantTrades(timeframe: $timeframe, minValue: $minValue, limit: $limit) {
      id
      transactionDate
      transactionType
      totalValue
      sharesTransacted
      pricePerShare
      insider {
        cik
        name
        title
      }
      company {
        name
        ticker
      }
      filing {
        accessionNumber
        filingDate
      }
    }
  }
`;

export const CLUSTER_BUYS_QUERY = `
  query GetClusterBuys($timeframe: Timeframe!, $minInsiders: Int, $limit: Int) {
    clusterBuys(timeframe: $timeframe, minInsiders: $minInsiders, limit: $limit) {
      id
      transactionDate
      transactionType
      totalValue
      sharesTransacted
      insider {
        cik
        name
      }
      company {
        name
        ticker
      }
    }
  }
`;

export const FIRST_BUYS_QUERY = `
  query GetFirstBuys($timeframe: Timeframe!, $limit: Int) {
    firstBuys(timeframe: $timeframe, limit: $limit) {
      id
      transactionDate
      transactionType
      totalValue
      sharesTransacted
      pricePerShare
      insider {
        cik
        name
        title
      }
      company {
        name
        ticker
      }
      filing {
        accessionNumber
        filingDate
      }
    }
  }
`;

export const TRADES_BY_COMPANY_QUERY = `
  query GetTradesByCompany(
    $ticker: String!
    $pagination: PaginationInput
  ) {
    tradesByCompany(ticker: $ticker, pagination: $pagination) {
      edges {
        node {
          id
          transactionDate
          transactionType
          transactionCode
          acquisitionDisposition
          sharesTransacted
          pricePerShare
          totalValue
          sharesOwnedAfter
          directIndirect
          insider {
            cik
            name
            title
          }
          filing {
            accessionNumber
            filingDate
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
      totalValue
    }
  }
`;

export const TRADES_BY_INSIDER_QUERY = `
  query GetTradesByInsider(
    $cik: String!
    $pagination: PaginationInput
  ) {
    tradesByInsider(cik: $cik, pagination: $pagination) {
      edges {
        node {
          id
          transactionDate
          transactionType
          transactionCode
          acquisitionDisposition
          sharesTransacted
          pricePerShare
          totalValue
          sharesOwnedAfter
          directIndirect
          company {
            name
            ticker
          }
          filing {
            accessionNumber
            filingDate
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
      totalValue
    }
  }
`;

export const INSIDER_QUERY = `
  query GetInsider($cik: String!) {
    insider(cik: $cik) {
      cik
      name
      title
      historyImported
      lastTradeDate
      totalTrades
      totalTradeValue
      rating {
        ratingScore
        alpha1m
        alpha3m
        alpha6m
        alpha1y
        winRate3m
        lastCalculated
      }
      company {
        name
        ticker
      }
    }
  }
`;

export const COMPANY_QUERY = `
  query GetCompany($ticker: String!) {
    company(ticker: $ticker) {
      id
      cik
      name
      ticker
      exchange
      industry
      sector
      currentPrice
      marketCap
    }
  }
`;

// Mutations
export const CALCULATE_INSIDER_RATING_MUTATION = `
  mutation CalculateInsiderRating($cik: String!) {
    calculateInsiderRating(cik: $cik) {
      success
      message
      cik
      rating {
        ratingScore
        alpha3m
        winRate3m
      }
      calculatedAt
    }
  }
`;

export const BACKFILL_INSIDER_HISTORY_MUTATION = `
  mutation BackfillInsiderHistory($cik: String!) {
    backfillInsiderHistory(cik: $cik) {
      success
      message
      cik
      insider
      status
      queuedAt
    }
  }
`;

// Interface matching the existing TradeData interface
export interface GraphQLTradeData {
  id: string;
  transactionDate: string;
  transactionType: string;
  transactionCode: string;
  acquisitionDisposition: string;
  sharesTransacted?: number | null;
  pricePerShare?: number | null;
  totalValue: number;
  sharesOwnedAfter?: number;
  directIndirect?: string;
  insider: {
    cik: string;
    name: string;
    title?: string | null;
    historyImported?: boolean;
  };
  company: {
    id: string;
    cik: string;
    name: string;
    ticker?: string | null;
  };
  filing: {
    accessionNumber: string;
    filingDate: string;
  };
  createdAt?: string;
}

// Transform GraphQL data to match existing TradeData interface
export function transformGraphQLTradeToTradeData(gqlTrade: any): any {
  return {
    transaction_id: gqlTrade.id,
    accession_number: gqlTrade.filing?.accessionNumber || '',
    filed_at: gqlTrade.filing?.filingDate || gqlTrade.createdAt || '',
    form_type: 'Form 4', // Default, could be enhanced
    issuer_cik: gqlTrade.company?.cik || '',
    issuer_name: gqlTrade.company?.name || '',
    trading_symbol: gqlTrade.company?.ticker || null,
    person_cik: gqlTrade.insider?.cik || '',
    person_name: gqlTrade.insider?.name || '',
    is_director: false, // Would need to enhance GraphQL to include this
    is_officer: gqlTrade.insider?.title ? true : false,
    officer_title: gqlTrade.insider?.title || null,
    is_ten_percent_owner: false, // Would need to enhance GraphQL
    transaction_date: gqlTrade.transactionDate,
    security_title: 'Common Stock', // Default
    transaction_code: gqlTrade.transactionCode,
    transaction_description: mapTransactionTypeToDescription(gqlTrade.transactionType),
    acquired_disposed_code: gqlTrade.acquisitionDisposition,
    shares_transacted: gqlTrade.sharesTransacted,
    price_per_share: gqlTrade.pricePerShare,
    transaction_value: gqlTrade.totalValue,
    shares_owned_following: gqlTrade.sharesOwnedAfter || 0,
    direct_or_indirect: gqlTrade.directIndirect || 'D',
    // Derived fields
    is_purchase: gqlTrade.transactionType === 'PURCHASE' ? 1 : 0,
    is_sale: gqlTrade.transactionType === 'SALE' ? 1 : 0,
    is_award: gqlTrade.transactionType === 'AWARD' ? 1 : 0,
  };
}

function mapTransactionTypeToDescription(type: string): string {
  const mapping: Record<string, string> = {
    'PURCHASE': 'Purchase of securities',
    'SALE': 'Sale of securities',
    'AWARD': 'Award or grant of securities',
    'GIFT': 'Gift of securities',
    'OTHER': 'Other transaction'
  };
  return mapping[type] || 'Unknown transaction';
}

// Main GraphQL Database class
export class GraphQLDatabase {
  private client: GraphQLClient;

  constructor() {
    this.client = graphqlClient;
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
    start_date?: string;
    end_date?: string;
  }): Promise<any[]> {
    try {
      // Transform filters to GraphQL format
      const gqlFilters: any = {};
      
      if (filters?.type) {
        gqlFilters.transactionCode = filters.type;
      }
      if (filters?.acquired) {
        gqlFilters.transactionType = filters.acquired === 'A' ? 'PURCHASE' : 'SALE';
      }
      if (filters?.symbol) {
        gqlFilters.companyTicker = filters.symbol;
      }
      if (filters?.min_value) {
        gqlFilters.minValue = filters.min_value;
      }
      if (filters?.min_shares) {
        gqlFilters.minShares = filters.min_shares;
      }
      if (filters?.start_date) {
        gqlFilters.startDate = filters.start_date;
      }
      if (filters?.end_date) {
        gqlFilters.endDate = filters.end_date;
      }

      const variables = {
        filters: Object.keys(gqlFilters).length > 0 ? gqlFilters : undefined,
        sort: { field: 'TRANSACTION_DATE', order: 'DESC' },
        pagination: { first: limit }
      };

      const data = await this.client.request(LATEST_TRADES_QUERY, variables) as any;
      
      return data.trades.edges.map((edge: any) => 
        transformGraphQLTradeToTradeData(edge.node)
      );
    } catch (error) {
      console.error('GraphQL Error fetching latest trades:', error);
      return [];
    }
  }

  async getImportantTrades(): Promise<any[]> {
    try {
      const variables = {
        timeframe: 'ONE_MONTH',
        minValue: 1000000,
        limit: 50
      };

      const data = await this.client.request(IMPORTANT_TRADES_QUERY, variables) as any;
      
      return data.importantTrades.map(transformGraphQLTradeToTradeData);
    } catch (error) {
      console.error('GraphQL Error fetching important trades:', error);
      return [];
    }
  }

  async getClusterBuys(daysWindow: number = 7): Promise<any[]> {
    try {
      const timeframe = daysWindow <= 30 ? 'ONE_MONTH' : 'THREE_MONTHS';
      const variables = {
        timeframe,
        minInsiders: 2,
        limit: 20
      };

      const data = await this.client.request(CLUSTER_BUYS_QUERY, variables) as any;
      
      // Group by company for cluster format
      const clusters: Record<string, any> = {};
      
      data.clusterBuys.forEach((trade: any) => {
        const key = trade.company.ticker || trade.company.name;
        if (!clusters[key]) {
          clusters[key] = {
            issuer_name: trade.company.name,
            trading_symbol: trade.company.ticker,
            transaction_date: trade.transactionDate,
            total_insiders: 0,
            total_shares: 0,
            total_value: 0,
            trades: []
          };
        }
        
        clusters[key].total_insiders += 1;
        clusters[key].total_shares += trade.sharesTransacted || 0;
        clusters[key].total_value += trade.totalValue || 0;
        clusters[key].trades.push(transformGraphQLTradeToTradeData(trade));
      });
      
      return Object.values(clusters);
    } catch (error) {
      console.error('GraphQL Error fetching cluster buys:', error);
      return [];
    }
  }

  async getTradesByCompany(
    symbol?: string, 
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: any
  ): Promise<any[]> {
    try {
      if (!symbol && !cik && !name) {
        return [];
      }

      // Use symbol as the primary identifier
      const ticker = symbol || cik; // Fallback to CIK if no symbol
      if (!ticker) return [];

      const variables = {
        ticker,
        pagination: { first: limit }
      };

      const data = await this.client.request(TRADES_BY_COMPANY_QUERY, variables) as any;
      
      return data.tradesByCompany.edges.map((edge: any) => 
        transformGraphQLTradeToTradeData(edge.node)
      );
    } catch (error) {
      console.error('GraphQL Error fetching company trades:', error);
      return [];
    }
  }

  async getTradesByInsider(
    cik?: string, 
    name?: string, 
    limit: number = 50, 
    filters?: any
  ): Promise<any[]> {
    try {
      if (!cik) {
        return [];
      }

      const variables = {
        cik,
        pagination: { first: limit }
      };

      const data = await this.client.request(TRADES_BY_INSIDER_QUERY, variables) as any;
      
      return data.tradesByInsider.edges.map((edge: any) => 
        transformGraphQLTradeToTradeData(edge.node)
      );
    } catch (error) {
      console.error('GraphQL Error fetching insider trades:', error);
      return [];
    }
  }

  async getFirstBuys(recentDays: number = 30, lookbackDays: number = 365): Promise<any[]> {
    try {
      const timeframe = recentDays <= 30 ? 'ONE_MONTH' : 'THREE_MONTHS';
      const variables = {
        timeframe,
        limit: 50
      };

      const data = await this.client.request(FIRST_BUYS_QUERY, variables) as any;
      
      return data.firstBuys.map(transformGraphQLTradeToTradeData);
    } catch (error) {
      console.error('GraphQL Error fetching first buys:', error);
      return [];
    }
  }

  // Mutations
  async calculateInsiderRating(cik: string) {
    try {
      const data = await this.client.request(CALCULATE_INSIDER_RATING_MUTATION, { cik }) as any;
      return data.calculateInsiderRating;
    } catch (error) {
      console.error('GraphQL Error calculating insider rating:', error);
      throw error;
    }
  }

  async backfillInsiderHistory(cik: string) {
    try {
      const data = await this.client.request(BACKFILL_INSIDER_HISTORY_MUTATION, { cik }) as any;
      return data.backfillInsiderHistory;
    } catch (error) {
      console.error('GraphQL Error backfilling insider history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const gqlDb = new GraphQLDatabase();
