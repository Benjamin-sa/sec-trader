'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { apiClient, BackfillStatus } from '@/lib/api-client';

interface HistoricalImportButtonProps {
  cik: string;
  insiderName?: string;
  onImportComplete?: () => void;
}

export default function HistoricalImportButton({ cik, onImportComplete }: HistoricalImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasHistoricalData, setHasHistoricalData] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const initialQueuedCount = useRef<number>(0);

  // Fetch initial status when component mounts
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const response = await apiClient.getInsiderBackfillStatus(cik);
        
        // Handle both wrapped and unwrapped responses
        const statusData = response.data || response;
        
        // Validate statusData exists and has expected properties
        if (statusData && typeof statusData === 'object') {
          setStatus(statusData as BackfillStatus);
          
          // Use the historyImported flag from the database
          if (statusData.historyImported === true) {
            setHasHistoricalData(true);
          }
        } else {
          console.warn('Invalid status data received:', response);
        }
      } catch (err) {
        console.error('Failed to fetch initial status:', err);
        // Don't show error to user, just log it
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkInitialStatus();
  }, [cik]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await apiClient.getInsiderBackfillStatus(cik);
      const statusData = response.data;
      setStatus(statusData);
      return statusData;
    } catch (err) {
      console.error('Failed to fetch status:', err);
      return null;
    }
  };

  const startPolling = () => {
    // Poll every 2 seconds
    pollingInterval.current = setInterval(async () => {
      const currentStatus = await fetchStatus();
      
      if (currentStatus) {
        // Stop polling if no more items are queued
        if (currentStatus.queued === 0) {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          setIsImporting(false);
          setShowSuccess(true);
          setHasHistoricalData(true); // Mark that historical data now exists
          
          // Call onImportComplete callback
          if (onImportComplete) {
            onImportComplete();
          }
          
          // Hide success message after 3 seconds
          setTimeout(() => {
            setShowSuccess(false);
          }, 3000);
        }
      }
    }, 2000);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setShowSuccess(false);

    try {
      // Trigger the import (100 filings as default)
      const result = await apiClient.triggerInsiderBackfill(cik, 100, false);
      
      if (result.data.queued && result.data.queued > 0) {
        // Store initial queued count
        initialQueuedCount.current = result.data.queued;
        
        // Start polling for progress
        startPolling();
      } else {
        // Nothing to import
        setIsImporting(false);
        setError('No new filings to import. All available filings have been processed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start import');
      setIsImporting(false);
    }
  };

  // Calculate progress percentage
  const getProgress = () => {
    if (!status || initialQueuedCount.current === 0) return 0;
    const processed = initialQueuedCount.current - status.queued;
    return Math.min(100, Math.round((processed / initialQueuedCount.current) * 100));
  };

  return (
    <div className="relative">
      {isLoadingStatus && (
        <div className="flex items-center gap-3">
          <div className="h-9 w-48 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-6 w-32 bg-gray-100 animate-pulse rounded-full" />
        </div>
      )}
      
      {!isLoadingStatus && !isImporting && !showSuccess && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={isImporting || isLoadingStatus}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold hover:scale-105 disabled:hover:scale-100 shadow-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {hasHistoricalData ? 'Re-import Historical Data' : 'Import Historical Data'}
          </button>
          
          {hasHistoricalData && status && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-full shadow-sm">
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-800 font-bold">
                  {status.total} filing{status.total !== 1 ? 's' : ''} imported
                </span>
              </div>
              {status.completed > 0 && (
                <span className="text-gray-500 font-medium">
                  {status.completed} processed
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {isImporting && (
        <div className="inline-flex flex-col gap-3 min-w-[300px] p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/60 rounded-xl shadow-sm">
          {/* Progress Header */}
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">
                Importing Historical Filings...
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {status && (
                  <>
                    {initialQueuedCount.current - status.queued} of {initialQueuedCount.current} processed
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200/60 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out rounded-full shadow-sm"
              style={{ width: `${getProgress()}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="text-right">
            <span className="text-sm font-extrabold text-blue-600">{getProgress()}%</span>
          </div>

          {/* Status Breakdown */}
          {status && (
            <div className="flex gap-4 text-xs text-gray-600 mt-1">
              <div>
                <span className="font-bold text-emerald-600">{status.completed}</span> completed
              </div>
              <div>
                <span className="font-bold text-amber-600">{status.queued}</span> queued
              </div>
              {status.failed > 0 && (
                <div>
                  <span className="font-bold text-red-600">{status.failed}</span> failed
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showSuccess && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 text-emerald-800 rounded-xl text-sm shadow-sm animate-fade-in">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
          <span className="font-bold">Import Complete!</span>
        </div>
      )}

      {error && !isImporting && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/60 rounded-xl text-sm text-red-800 shadow-lg z-10">
          <div className="flex items-start gap-2">
            <XCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Import Failed</div>
              <div className="text-xs mt-1 font-medium">{error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
