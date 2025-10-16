'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TradeData } from '@/lib/database';
import { cachedApiClient } from '@/lib/cached-api-client';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import HistoricalImportButton from '@/components/HistoricalImportButton';
import TradesDisplay from '@/components/TradesDisplay';

export default function InsiderPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryCik = searchParams?.get('cik') || '';
  const routeCik = (params?.cik as string) || '';
  const cik = (queryCik || routeCik).replace(/\.0$/, '');
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [insiderName, setInsiderName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsiderTrades = async () => {
      if (!cik) return;
      try {
        setLoading(true);
        const result = await cachedApiClient.getTradesByInsider(cik, undefined, 100);
        setTrades(result);

        if (result.length > 0) {
          setInsiderName(result[0].person_name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch insider trades');
      } finally {
        setLoading(false);
      }
    };

    fetchInsiderTrades();
  }, [cik]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insider trades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading insider data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Breadcrumb & Insider Info */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words mb-1">
                    {insiderName || 'Insider Profile'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    CIK: {cik}
                  </p>
                </div>
                {cik && (
                  <div className="w-full sm:w-auto">
                    <HistoricalImportButton 
                      cik={cik} 
                      insiderName={insiderName}
                      onImportComplete={async () => {
                        // Refresh trades after import completes
                        // Cache is already invalidated by the button component
                        // Force a fresh fetch with forceRefresh option
                        try {
                          const result = await cachedApiClient.getTradesByInsider(
                            cik, 
                            undefined, 
                            100, 
                            undefined,
                            { forceRefresh: true }
                          );
                          setTrades(result);
                        } catch (err) {
                          console.error('Failed to refresh trades:', err);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Trades ({trades.length})
            </h2>
          </div>
          <div className="p-6">
            <TradesDisplay
              trades={trades}
              mode="comprehensive"
              layout="table"
              context="insider"
              loading={loading}
              emptyMessage="No trades found for this insider."
              onTradeClick={(accessionNumber) => router.push(`/filing/${accessionNumber}`)}
              enablePagination={true}
              itemsPerPage={25}
            />
          </div>
        </div>
      </div>
    </div>
  );
}