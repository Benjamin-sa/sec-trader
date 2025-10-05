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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('stats.latestFilings.title')}</h3>
                <p className="text-sm text-gray-500">{t('stats.latestFilings.description')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('stats.importantTrades.title')}</h3>
                <p className="text-sm text-gray-500">{t('stats.importantTrades.description')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{t('stats.clusterBuys.title')}</h3>
                <p className="text-sm text-gray-500">{t('stats.clusterBuys.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('latest')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'latest'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('tabs.latestFilings')}
            </button>
            <button
              onClick={() => setActiveTab('important')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'important'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('tabs.importantTrades')}
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clusters'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('tabs.clusterBuys')}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'latest' && <TradesList />}
          {activeTab === 'important' && <ImportantTrades />}
          {activeTab === 'clusters' && <ClusterBuys />}
        </div>
      </div>
    </div>
  );
}
