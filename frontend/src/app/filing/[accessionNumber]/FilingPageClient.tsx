'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import { TradeData } from '@/lib/database';
import { cachedApiClient } from '@/lib/cached-api-client';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import TransactionBadge, { getTransactionCategory } from '@/components/TransactionBadge';

// ============================================
// Stats Card Component
// ============================================
interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'red' | 'amber' | 'purple';
  delay: number;
  isNumber?: boolean;
  suffix?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  delay,
  isNumber = true,
  suffix = '',
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
    purple: {
      bg: 'from-purple-100 to-purple-50',
      icon: 'text-purple-600',
      text: 'text-purple-900',
      border: 'border-purple-200/60',
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
            {label}
          </p>
          <div className={`text-2xl sm:text-3xl font-extrabold ${colors.text}`}>
            {inView && isNumber && typeof value === 'number' ? (
              <CountUp
                end={value}
                duration={2}
                separator=","
                suffix={suffix}
              />
            ) : (
              value
            )}
          </div>
        </div>
        <div className={`
          w-12 h-12 
          bg-white/50
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

export default function FilingPageClient() {
  const params = useParams();
  const router = useRouter();
  const accessionNumber = params.accessionNumber as string;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilingData = async () => {
      if (!accessionNumber) return;
      
      try {
        setLoading(true);
        
        // Fetch all trades with this accession number
        const allTrades = await cachedApiClient.getLatestTrades(1000);
        const filingTrades = allTrades.filter(
          (trade: TradeData) => trade.accession_number === accessionNumber
        );
        
        setTrades(filingTrades);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch filing data');
      } finally {
        setLoading(false);
      }
    };

    fetchFilingData();
  }, [accessionNumber]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShares = (shares: number | null) => {
    if (shares === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(shares);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate SEC filing URL
  const getSecFilingUrl = (cik: string, accessionNumber: string) => {
    const accessionNoNoDashes = accessionNumber.replace(/-/g, '');
    return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoNoDashes}/${accessionNumber}-index.htm`;
  };

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
          <p className="text-lg font-medium text-gray-600">Loading filing details...</p>
        </motion.div>
      </div>
    );
  }

  if (error || trades.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <div className="text-red-600 text-xl font-bold mb-4">
            {error || 'Filing Not Found'}
          </div>
          <p className="text-gray-600 mb-6">
            {error || 'The requested filing could not be found.'}
          </p>
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

  const primaryTrade = trades[0];
  const totalValue = trades.reduce((sum, t) => sum + (t.transaction_value || 0), 0);
  const totalShares = trades.reduce((sum, t) => sum + (t.shares_transacted || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section with Filing Info */}
      <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        {/* Animated Background */}
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

          {/* Filing Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8"
          >
            <div className="flex items-start gap-6">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
                className="
                  w-16 h-16 sm:w-20 sm:h-20 
                  bg-gradient-to-br from-blue-600 to-indigo-600 
                  rounded-2xl 
                  flex items-center justify-center 
                  shadow-lg
                "
              >
                <FileText className="h-10 w-10 text-white" />
              </motion.div>

              {/* Title & Info */}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                  SEC Form 4 Filing
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
                    <span className="text-xs text-gray-500">Accession:</span>
                    <span className="font-mono text-xs">{accessionNumber}</span>
                  </span>
                  <span className="
                    inline-flex items-center gap-2
                    px-3 py-1.5 
                    bg-gradient-to-r from-emerald-100 to-emerald-50
                    text-emerald-800 text-sm font-bold 
                    rounded-full 
                    shadow-sm
                  ">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* SEC Link Button */}
            {primaryTrade && (
              <motion.a
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                href={getSecFilingUrl(primaryTrade.issuer_cik, accessionNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center gap-2 
                  px-6 py-3 
                  bg-gradient-to-r from-blue-600 to-blue-700
                  text-white font-semibold 
                  rounded-xl 
                  shadow-sm hover:shadow-md 
                  transition-all duration-200
                  whitespace-nowrap
                "
              >
                <span>View on SEC.gov</span>
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </motion.a>
            )}
          </motion.div>

          {/* Stats Cards */}
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
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
          >
            <StatsCard
              label="Total Transactions"
              value={trades.length}
              icon={FileText}
              color="blue"
              delay={0}
            />
            <StatsCard
              label="Total Shares"
              value={formatShares(totalShares)}
              icon={TrendingUp}
              color="purple"
              delay={0.1}
              isNumber={false}
            />
            <StatsCard
              label="Total Value"
              value={formatCurrency(totalValue)}
              icon={DollarSign}
              color="emerald"
              delay={0.2}
              isNumber={false}
            />
          </motion.div>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
        
        {/* What is Form 4? */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="
            bg-gradient-to-br from-blue-50/80 to-indigo-50/50
            border border-blue-200/60 
            rounded-2xl 
            p-6 sm:p-8
            shadow-sm
          ">
            <div className="flex items-start gap-4">
              <div className="
                w-12 h-12 
                bg-gradient-to-br from-blue-600 to-indigo-600
                rounded-xl 
                flex items-center justify-center 
                shadow-sm
                flex-shrink-0
              ">
                <Info className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  What is SEC Form 4?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Form 4 is a document that must be filed with the SEC by company insiders (officers, directors, and 
                  beneficial owners of more than 10% of company stock) whenever they buy or sell company shares. 
                  These filings must be submitted within <strong>two business days</strong> of the transaction, providing 
                  transparency into insider trading activity. Analyzing these filings can help investors understand 
                  insider sentiment and potential company developments.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Company & Insider Info Cards */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company Info */}
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-xl 
              p-6 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              hover:-translate-y-1
            ">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Company</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                  <button
                    onClick={() => router.push(`/company/${primaryTrade.issuer_cik}`)}
                    className="text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {primaryTrade.issuer_name}
                  </button>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">CIK</p>
                  <p className="text-sm font-mono text-gray-900">{primaryTrade.issuer_cik}</p>
                </div>
                {primaryTrade.trading_symbol && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ticker</p>
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-full">
                      ${primaryTrade.trading_symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Insider Info */}
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-xl 
              p-6 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              hover:-translate-y-1
            ">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Insider</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                  <button
                    onClick={() => router.push(`/insider?cik=${primaryTrade.person_cik}`)}
                    className="text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {primaryTrade.person_name}
                  </button>
                </div>
                {primaryTrade.officer_title && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Title</p>
                    <p className="text-sm font-medium text-gray-900">{primaryTrade.officer_title}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {primaryTrade.is_director && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 text-xs font-bold rounded-full">
                      Director
                    </span>
                  )}
                  {primaryTrade.is_officer && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 text-xs font-bold rounded-full">
                      Officer
                    </span>
                  )}
                  {primaryTrade.is_ten_percent_owner && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 text-xs font-bold rounded-full">
                      10% Owner
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filing Details */}
            <div className="
              bg-white/80 backdrop-blur-sm
              border border-gray-200/60 
              rounded-xl 
              p-6 
              shadow-sm hover:shadow-lg 
              transition-all duration-300 
              hover:-translate-y-1
            ">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Filing Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Form Type</p>
                  <p className="text-base font-semibold text-gray-900">{primaryTrade.form_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Filed On</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(primaryTrade.filed_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Transaction Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(primaryTrade.transaction_date)}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Transactions List */}
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
            <div className="px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Transactions in This Filing</h2>
                  <p className="text-sm text-gray-600">{trades.length} {trades.length === 1 ? 'Transaction' : 'Transactions'}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {trades.map((trade, index) => {
                const categoryInfo = getTransactionCategory(trade.transaction_code, trade.acquired_disposed_code);
                const isSignificant = categoryInfo.importance === 'high';
                
                return (
                  <motion.div
                    key={`${trade.transaction_id || index}`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className={`
                      rounded-xl p-6 
                      border transition-all duration-300 
                      hover:shadow-md hover:-translate-y-0.5
                      ${isSignificant 
                        ? 'bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-200/60' 
                        : 'bg-white border-gray-200/60'
                      }
                    `}
                  >
                    {/* Transaction Header */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">
                            {trade.security_title}
                          </h3>
                          <TransactionBadge
                            transactionCode={trade.transaction_code}
                            acquiredDisposedCode={trade.acquired_disposed_code}
                            transactionDescription={trade.transaction_description}
                            size="md"
                            showIcon={true}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{trade.transaction_description}</p>
                      </div>
                    </div>

                    {/* Category Info */}
                    <div className={`
                      rounded-xl p-4 mb-4 border
                      ${isSignificant 
                        ? 'bg-blue-50/50 border-blue-200/60' 
                        : 'bg-gray-50 border-gray-200/60'
                      }
                    `}>
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isSignificant ? 'bg-blue-600' : 'bg-gray-600'}
                        `}>
                          <Info className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm mb-1 ${
                            isSignificant ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {categoryInfo.label}
                          </p>
                          <p className={`text-sm ${
                            isSignificant ? 'text-blue-800' : 'text-gray-700'
                          }`}>
                            {categoryInfo.description}
                          </p>
                          <span className={`
                            inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-bold uppercase
                            ${isSignificant 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-600 text-white'
                            }
                          `}>
                            {categoryInfo.importance} Importance
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shares</p>
                        <p className="text-lg font-extrabold text-gray-900">{formatShares(trade.shares_transacted)}</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Price/Share</p>
                        <p className="text-lg font-extrabold text-gray-900">
                          {trade.price_per_share !== null ? `$${trade.price_per_share.toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
                        <p className="text-lg font-extrabold text-gray-900">{formatCurrency(trade.transaction_value)}</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shares After</p>
                        <p className="text-lg font-extrabold text-gray-900">{formatShares(trade.shares_owned_following)}</p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-4 border-t border-gray-200/60">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Ownership:</span>
                          <span className="font-semibold text-gray-900">
                            {trade.direct_or_indirect === 'D' ? 'Direct' : 'Indirect'}
                          </span>
                        </div>
                        {trade.is_10b5_1_plan && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-emerald-700">10b5-1 Plan</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Educational Footer */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="
            bg-gradient-to-br from-gray-50 to-gray-100
            border border-gray-300/60 
            rounded-2xl 
            p-6 sm:p-8
          ">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              How to Interpret Insider Transactions
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/80 rounded-xl p-6 border border-emerald-200/60">
                <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Bullish Signals
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>Multiple insiders buying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>Open market purchases (Code P)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>Large purchases relative to salary</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>C-suite executives buying</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white/80 rounded-xl p-6 border border-red-200/60">
                <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Bearish Signals
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Multiple insiders selling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Large sales not part of 10b5-1 plans</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Unusual selling patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Selling soon after grants/awards</span>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-xs text-gray-600 italic bg-white/50 rounded-lg p-4 border border-gray-200">
              <strong>Note:</strong> Not all insider selling is negative. Insiders may sell for personal financial reasons, 
              diversification, or predetermined trading plans (10b5-1). Always consider the context and broader market conditions.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
