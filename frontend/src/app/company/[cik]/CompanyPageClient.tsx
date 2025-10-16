'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import { TradeData } from '@/lib/database';
import { NewsArticle } from '@/lib/api-client';
import { cachedApiClient, cachedAlpacaClient } from '@/lib/cached-api-client';
import { 
  ArrowLeftIcon, 
  BuildingOfficeIcon, 
  ChartBarIcon, 
  NewspaperIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  Calendar,
  Sparkles
} from 'lucide-react';
import TradingViewWidget from '@/components/TradingViewWidget';
import TradesDisplay from '@/components/TradesDisplay';

interface MarketSnapshot {
  snapshot?: {
    latestTrade?: {
      p?: number;
      s?: number;
    };
    dailyBar?: {
      o?: number;
      h?: number;
      l?: number;
      c?: number;
      v?: number;
    };
    prevDailyBar?: {
      c?: number;
    };
  };
}

// ============================================
// Stats Card Component
// ============================================
interface StatsCardProps {
  label: string;
  sublabel?: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'red' | 'amber';
  delay: number;
  isCurrency?: boolean;
  showSign?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  label,
  sublabel,
  value,
  icon: Icon,
  color,
  delay,
  isCurrency = false,
  showSign = false,
}) => {
  const [ref, inView] = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const colorClasses = {
    blue: {
      bg: 'from-blue-100 to-blue-50',
      icon: 'text-blue-600',
      text: 'text-blue-900',
      border: 'border-blue-200/60',
    },
    emerald: {
      bg: 'from-emerald-100 to-emerald-50',
      icon: 'text-emerald-600',
      text: 'text-emerald-900',
      border: 'border-emerald-200/60',
    },
    red: {
      bg: 'from-red-100 to-red-50',
      icon: 'text-red-600',
      text: 'text-red-900',
      border: 'border-red-200/60',
    },
    amber: {
      bg: 'from-amber-100 to-amber-50',
      icon: 'text-amber-600',
      text: 'text-amber-900',
      border: 'border-amber-200/60',
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, delay }}
      className={`
        bg-gradient-to-br ${colors.bg}
        border ${colors.border}
        rounded-xl 
        p-6 
        shadow-sm hover:shadow-lg 
        transition-all duration-300 
        hover:-translate-y-1
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
            {label}
          </p>
          <div className={`text-3xl font-extrabold ${colors.text}`}>
            {inView && (
              <CountUp
                end={isCurrency ? Math.abs(value) : value}
                duration={2}
                separator=","
                prefix={isCurrency ? (showSign && value >= 0 ? '+$' : value < 0 ? '-$' : '$') : ''}
              />
            )}
          </div>
          {sublabel && (
            <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`
          w-12 h-12 
          bg-gradient-to-br ${colors.bg}
          rounded-xl 
          flex items-center justify-center 
          shadow-sm
        `}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </motion.div>
  );
};

// eslint-disable-next-line max-lines-per-function
export default function CompanyPageClient() {
  const params = useParams();
  const router = useRouter();
  const cik = params.cik as string;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [tradingSymbol, setTradingSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    const fetchCompanyTrades = async () => {
      if (!cik) return;
      
      try {
        setLoading(true);
        const result = await cachedApiClient.getTradesByCompany(undefined, cik, undefined, 100);
        setTrades(result);
        
        // Set company name and symbol from first trade
        if (result.length > 0) {
          setCompanyName(result[0].issuer_name);
          setTradingSymbol(result[0].trading_symbol);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch company trades');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyTrades();
  }, [cik]);

  // Fetch news when symbol is available
  useEffect(() => {
    const fetchNews = async () => {
      if (!tradingSymbol) return;
      
      try {
        const response = await cachedAlpacaClient.getNewsBySymbol(tradingSymbol, 20, 30);
        setNews(response.news);
      } catch (err) {
        console.error('Error fetching news:', err);
      }
    };

    fetchNews();
  }, [tradingSymbol]);

  // Fetch market snapshot when symbol is available
  useEffect(() => {
    const fetchSnapshot = async () => {
      if (!tradingSymbol) return;
      
      try {
        const data = await cachedAlpacaClient.getSnapshot(tradingSymbol);
        setSnapshot(data);
      } catch (err) {
        console.error('Error fetching snapshot:', err);
      }
    };

    fetchSnapshot();
  }, [tradingSymbol]);

  // Calculate insider activity statistics
  // NOTE: Only count actual purchases (P+A) and sales (S+D), not grants/awards
  const calculateInsiderStats = () => {
    const recentTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.transaction_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return tradeDate >= thirtyDaysAgo;
    });

    // Only count actual open market purchases, not grants/awards
    const actualBuys = trades.filter(t => 
      t.transaction_code === 'P' && t.acquired_disposed_code === 'A'
    );
    
    // Only count actual open market sales
    const actualSells = trades.filter(t => 
      t.transaction_code === 'S' && t.acquired_disposed_code === 'D'
    );
    
    const totalBuyValue = actualBuys.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
    const totalSellValue = actualSells.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
    
    const uniqueInsiders = new Set(trades.map(t => t.person_cik)).size;
    
    return {
      recentTradesCount: recentTrades.length,
      totalBuys: actualBuys.length,
      totalSells: actualSells.length,
      totalBuyValue,
      totalSellValue,
      netValue: totalBuyValue - totalSellValue,
      uniqueInsiders,
    };
  };

  const insiderStats = trades.length > 0 ? calculateInsiderStats() : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-medium text-gray-600">Loading company data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="text-red-600 text-xl font-bold mb-4">Error loading company data</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="
              px-6 py-3 
              bg-gradient-to-r from-blue-600 to-blue-700
              text-white font-semibold 
              rounded-xl 
              shadow-sm hover:shadow-md 
              transition-all duration-200
            "
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="text-gray-600 text-xl mb-4">No trades found for this company.</div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="
              px-6 py-3 
              bg-gradient-to-r from-blue-600 to-blue-700
              text-white font-semibold 
              rounded-xl 
              shadow-sm hover:shadow-md 
              transition-all duration-200
            "
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section with Company Info */}
      <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 45, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute top-1/4 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className="
              flex items-center gap-2 
              text-sm font-medium text-gray-600 
              hover:text-blue-600 
              transition-colors duration-200
              mb-6
            "
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Home</span>
          </motion.button>

          {/* Company Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
              className="
                w-16 h-16 sm:w-20 sm:w-20 
                bg-gradient-to-br from-blue-600 to-indigo-600 
                rounded-2xl 
                flex items-center justify-center 
                shadow-lg
              "
            >
              <BuildingOfficeIcon className="h-10 w-10 text-white" />
            </motion.div>

            {/* Company Info */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3">
                {companyName || 'Company Profile'}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="
                  inline-flex items-center gap-2
                  px-3 py-1.5 
                  bg-white/80 backdrop-blur-sm
                  border border-gray-200/60 
                  text-gray-700 text-sm font-medium 
                  rounded-full 
                  shadow-sm
                ">
                  <span className="text-xs text-gray-500">CIK:</span>
                  <span className="font-mono">{cik}</span>
                </span>
                {tradingSymbol && (
                  <span className="
                    inline-flex items-center gap-2
                    px-4 py-1.5 
                    bg-gradient-to-r from-blue-600 to-indigo-600
                    text-white text-sm font-bold 
                    rounded-full 
                    shadow-md
                  ">
                    ${tradingSymbol}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Key Metrics - Animated Stats */}
          {insiderStats && (
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {/* Recent Activity */}
              <StatsCard
                label="Recent Trades"
                sublabel="Last 30 days"
                value={insiderStats.recentTradesCount}
                icon={Activity}
                color="blue"
                delay={0}
              />

              {/* Total Buys */}
              <StatsCard
                label="Total Buys"
                sublabel={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(insiderStats.totalBuyValue)}
                value={insiderStats.totalBuys}
                icon={TrendingUp}
                color="emerald"
                delay={0.1}
              />

              {/* Total Sells */}
              <StatsCard
                label="Total Sells"
                sublabel={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(insiderStats.totalSellValue)}
                value={insiderStats.totalSells}
                icon={TrendingDown}
                color="red"
                delay={0.2}
              />

              {/* Net Sentiment */}
              <StatsCard
                label="Net Value"
                sublabel={`${insiderStats.uniqueInsiders} Insiders`}
                value={insiderStats.netValue}
                icon={DollarSign}
                color={insiderStats.netValue >= 0 ? 'emerald' : 'red'}
                delay={0.3}
                isCurrency
                showSign
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
        
        {/* Market Snapshot Section */}
        {tradingSymbol && snapshot && snapshot.snapshot && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-2xl 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              overflow-hidden
            ">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Market Snapshot</h2>
                    <p className="text-xs sm:text-sm text-gray-600">{tradingSymbol} • Real-time data</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Latest Trade */}
                  {snapshot.snapshot.latestTrade && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-xl p-3 sm:p-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Latest Price</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-900">
                        ${snapshot.snapshot.latestTrade.p?.toFixed(2) || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {snapshot.snapshot.latestTrade.s ? `${snapshot.snapshot.latestTrade.s.toLocaleString()} shares` : ''}
                      </p>
                    </div>
                  )}
                  
                  {/* Daily Bar */}
                  {snapshot.snapshot.dailyBar && (
                    <>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl p-3 sm:p-4">
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Day Open</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-900">
                          ${snapshot.snapshot.dailyBar.o?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-xl p-3 sm:p-4">
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Day High</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                          ${snapshot.snapshot.dailyBar.h?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-50/50 rounded-xl p-3 sm:p-4">
                        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Day Low</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-red-600">
                          ${snapshot.snapshot.dailyBar.l?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                    </>
                  )}
                  
                  {/* Previous Daily Bar */}
                  {snapshot.snapshot.prevDailyBar && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl p-3 sm:p-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Previous Close</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-900">
                        ${snapshot.snapshot.prevDailyBar.c?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  {/* Calculate Daily Change */}
                  {snapshot.snapshot.latestTrade?.p && snapshot.snapshot.prevDailyBar?.c && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Daily Change</p>
                      <p className={`text-xl sm:text-2xl font-extrabold ${
                        (snapshot.snapshot.latestTrade.p - snapshot.snapshot.prevDailyBar.c) >= 0 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {((snapshot.snapshot.latestTrade.p - snapshot.snapshot.prevDailyBar.c) >= 0 ? '+' : '')}
                        {((snapshot.snapshot.latestTrade.p - snapshot.snapshot.prevDailyBar.c) / snapshot.snapshot.prevDailyBar.c * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  
                  {/* Volume */}
                  {snapshot.snapshot.dailyBar?.v && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl p-3 sm:p-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Volume</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-900">
                        {(snapshot.snapshot.dailyBar.v / 1000000).toFixed(2)}M
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Live Chart Section */}
        {tradingSymbol && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-2xl 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              overflow-hidden
            ">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Live Trading Chart</h2>
                      <p className="text-xs sm:text-sm text-gray-600">{tradingSymbol} • TradingView</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 text-xs font-bold rounded-full">
                    <Sparkles className="w-4 h-4" />
                    LIVE
                  </span>
                </div>
              </div>
              <div className="w-full" style={{ height: 'clamp(400px, 60vh, 600px)' }}>
                <TradingViewWidget symbol={tradingSymbol} />
              </div>
            </div>
          </motion.section>
        )}

        {/* Recent Insider Activity Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
        >
          <div className="
            bg-white/80 backdrop-blur-sm
            border border-gray-200/60 
            rounded-2xl 
            shadow-sm hover:shadow-lg 
            transition-all duration-300 
            overflow-hidden
          ">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Insider Activity</h2>
                  <p className="text-xs sm:text-sm text-gray-600">{trades.length} Total Trades</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {/* Mobile: Cards, Desktop: Table */}
              <div className="block md:hidden">
                <TradesDisplay
                  trades={trades}
                  mode="comprehensive"
                  layout="cards"
                  context="company"
                  emptyMessage="No insider trades found for this company."
                  onTradeClick={(accessionNumber) => router.push(`/filing/${accessionNumber}`)}
                />
              </div>
              <div className="hidden md:block">
                <TradesDisplay
                  trades={trades}
                  mode="comprehensive"
                  layout="table"
                  context="company"
                  emptyMessage="No insider trades found for this company."
                  onTradeClick={(accessionNumber) => router.push(`/filing/${accessionNumber}`)}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Latest News Section */}
        {tradingSymbol && news.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-2xl 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              overflow-hidden
            ">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <NewspaperIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Latest News</h2>
                    <p className="text-xs sm:text-sm text-gray-600">{news.length} Recent Articles</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200/60">
                {news.slice(0, 5).map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-200"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {article.headline}
                      </a>
                    </h3>
                    {article.summary && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="truncate">{new Date(article.createdAt).toLocaleDateString()}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">{article.source}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
