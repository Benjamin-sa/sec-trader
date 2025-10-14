'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TradesList } from './components/TradesList';
import { ImportantTrades } from './components/ImportantTrades';
import { ClusterBuys } from './components/ClusterBuys';
import { TrendingUp, AlertTriangle, Users } from 'lucide-react';

export default function SECAnalyzer() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'latest' | 'important' | 'clusters'>('latest');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-200/60">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{t('stats.latestFilings.title')}</h3>
                <p className="text-sm font-medium text-gray-500">{t('stats.latestFilings.description')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-200/60">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{t('stats.importantTrades.title')}</h3>
                <p className="text-sm font-medium text-gray-500">{t('stats.importantTrades.description')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-200/60">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{t('stats.clusterBuys.title')}</h3>
                <p className="text-sm font-medium text-gray-500">{t('stats.clusterBuys.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200/60 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('latest')}
              className={`py-3 px-4 border-b-2 font-bold text-sm transition-all duration-200 rounded-t-xl ${
                activeTab === 'latest'
                  ? 'border-blue-500 text-blue-600 bg-gradient-to-t from-blue-50/50 to-transparent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('tabs.latestFilings')}
            </button>
            <button
              onClick={() => setActiveTab('important')}
              className={`py-3 px-4 border-b-2 font-bold text-sm transition-all duration-200 rounded-t-xl ${
                activeTab === 'important'
                  ? 'border-amber-500 text-amber-600 bg-gradient-to-t from-amber-50/50 to-transparent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('tabs.importantTrades')}
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`py-3 px-4 border-b-2 font-bold text-sm transition-all duration-200 rounded-t-xl ${
                activeTab === 'clusters'
                  ? 'border-emerald-500 text-emerald-600 bg-gradient-to-t from-emerald-50/50 to-transparent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('tabs.clusterBuys')}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60">
          {activeTab === 'latest' && <TradesList />}
          {activeTab === 'important' && <ImportantTrades />}
          {activeTab === 'clusters' && <ClusterBuys />}
        </div>
      </div>
    </div>
  );
}
