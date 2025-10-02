/**
 * Translation keys type for better TypeScript support
 * This helps catch typos in translation keys at compile time
 */

export type TranslationKeys = {
  common: {
    loading: string;
    error: string;
    noData: string;
    search: string;
    filter: string;
    clear: string;
    apply: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    view: string;
    close: string;
  };
  header: {
    title: string;
    description: string;
  };
  stats: {
    latestFilings: {
      title: string;
      description: string;
    };
    importantTrades: {
      title: string;
      description: string;
    };
    clusterBuys: {
      title: string;
      description: string;
    };
    firstBuys: {
      title: string;
      description: string;
    };
  };
  tabs: {
    latestFilings: string;
    importantTrades: string;
    clusterBuys: string;
    firstBuys: string;
  };
  trades: {
    company: string;
    insider: string;
    position: string;
    transactionType: string;
    shares: string;
    value: string;
    price: string;
    date: string;
    filingDate: string;
    buy: string;
    sell: string;
    viewDetails: string;
    transactionCode: string;
    securityType: string;
    ownership: string;
  };
  clusterBuys: {
    insiderCount: string;
    totalValue: string;
    averageValue: string;
    dateRange: string;
    viewCluster: string;
  };
  firstBuys: {
    noPreviousBuys: string;
    significance: string;
    historicalGap: string;
  };
  companyPage: {
    overview: string;
    recentActivity: string;
    insidersList: string;
    tradingHistory: string;
    marketData: string;
    news: string;
    ticker: string;
    cik: string;
    industry: string;
    sector: string;
  };
  insiderPage: {
    overview: string;
    positions: string;
    tradingActivity: string;
    totalTrades: string;
    totalValue: string;
    companies: string;
  };
  filters: {
    dateRange: string;
    transactionType: string;
    minValue: string;
    maxValue: string;
    company: string;
    insider: string;
    all: string;
    last7Days: string;
    last30Days: string;
    last90Days: string;
    lastYear: string;
  };
  errors: {
    fetchError: string;
    networkError: string;
    tryAgain: string;
    notFound: string;
    unauthorized: string;
    serverError: string;
  };
};
