'use client';

import { useEffect, useState } from 'react';
import { TradesList } from './components/TradesList';
import { ImportantTrades } from './components/ImportantTrades';
import { ClusterBuys } from './components/ClusterBuys';
import { FirstBuys } from './components/FirstBuys';
import { TrendingUp, AlertTriangle, Users, Sparkles } from 'lucide-react';

export default function SECAnalyzer() {
  const [activeTab, setActiveTab] = useState<'latest' | 'important' | 'clusters' | 'first-buys'>('latest');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SEC Form 4 Insider Trading Analyzer
          </h1>
          <p className="text-gray-600">
            Monitor insider trading activity, identify important transactions, and detect cluster buying patterns
          </p>
        </div>

        {/* Stats Overview */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Latest Filings</h3>
                <p className="text-sm text-gray-500">Recent insider transactions</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Important Trades</h3>
                <p className="text-sm text-gray-500">High-value & executive trades</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Cluster Buys</h3>
                <p className="text-sm text-gray-500">Coordinated buying activity</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Sparkles className="h-8 w-8 text-green-700" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">First Buys (12M)</h3>
                <p className="text-sm text-gray-500">First insider buy after a year</p>
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
              Latest Filings
            </button>
            <button
              onClick={() => setActiveTab('important')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'important'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Important Trades
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clusters'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cluster Buys
            </button>
            <button
              onClick={() => setActiveTab('first-buys')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'first-buys'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              First Buys
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'latest' && <TradesList />}
          {activeTab === 'important' && <ImportantTrades />}
          {activeTab === 'clusters' && <ClusterBuys />}
          {activeTab === 'first-buys' && <FirstBuys />}
        </div>
      </div>
    </div>
  );
}
