'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { apiClient, BackfillStatus, BackfillResponse, BackfillProgress } from '@/lib/api-client';
import { cachedApiClient, invalidateAllTrades } from '@/lib/cached-api-client';

interface HistoricalImportButtonProps {
  cik: string;
  insiderName?: string; 
  onImportComplete?: () => void;
}

// Separate component for loading skeleton
function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-48 bg-gray-200 animate-pulse rounded-lg" />
      <div className="h-6 w-32 bg-gray-100 animate-pulse rounded-full" />
    </div>
  );
}

// Separate component for status badge
function StatusBadge({ status }: { status: BackfillStatus }) {
  return (
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
  );
}

// Separate component for progress display
function ProgressDisplay({ progress }: { progress: BackfillProgress | null }) {
  if (!progress) {
    return (
      <div className="text-sm font-bold text-gray-900">
        Starting import...
      </div>
    );
  }

  const getPhaseMessage = () => {
    if (progress.phase === 'init') return 'Initializing...';
    if (progress.phase === 'fetching') return 'Fetching filings from SEC...';
    if (progress.phase === 'processing') return 'Processing filings...';
    return 'Starting import...';
  };

  return (
    <>
      <div className="text-sm font-bold text-gray-900">
        {getPhaseMessage()}
      </div>
      {progress.message && (
        <div className="text-xs text-gray-600 font-medium">
          {progress.message}
        </div>
      )}
    </>
  );
}

// Separate component for progress stats
function ProgressStats({ progress }: { progress: BackfillProgress }) {
  if (!progress.total || progress.total === 0) {
    if (progress.totalFound) {
      return (
        <div className="text-xs text-gray-600 font-medium">
          Found {progress.totalFound} filings to process
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200/60 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out rounded-full shadow-sm"
          style={{ width: `${progress.progress || 0}%` }}
        />
      </div>

      {/* Progress Details */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3 text-gray-600">
          <span>
            <span className="font-bold text-emerald-600">{progress.processed || 0}</span> processed
          </span>
          <span>
            <span className="font-bold text-gray-500">{progress.skipped || 0}</span> skipped
          </span>
          {progress.errors && progress.errors > 0 && (
            <span>
              <span className="font-bold text-red-600">{progress.errors}</span> errors
            </span>
          )}
        </div>
        <span className="text-sm font-extrabold text-blue-600">
          {progress.progress || 0}%
        </span>
      </div>

      {/* Remaining count */}
      {progress.remaining !== undefined && progress.remaining > 0 && (
        <div className="text-xs text-gray-500 font-medium text-center pt-1 border-t border-blue-100">
          {progress.remaining} remaining
        </div>
      )}
    </>
  );
}

// Separate component for success message
function SuccessMessage({ importResult }: { importResult: BackfillResponse }) {
  return (
    <div className="inline-flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl shadow-lg animate-fade-in w-full sm:max-w-md">
      {/* Success Header */}
      <div className="flex items-center gap-2">
        <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
        <span className="font-bold text-sm sm:text-base text-emerald-800">Import Complete!</span>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
        <div className="bg-white/60 rounded-lg p-1.5 sm:p-2 border border-emerald-100">
          <div className="text-lg sm:text-2xl font-extrabold text-emerald-600">
            {importResult.processed || 0}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 font-medium">Processed</div>
        </div>
        <div className="bg-white/60 rounded-lg p-1.5 sm:p-2 border border-gray-100">
          <div className="text-lg sm:text-2xl font-extrabold text-gray-600">
            {importResult.skipped || 0}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 font-medium">Skipped</div>
        </div>
        {importResult.errors !== undefined && importResult.errors > 0 && (
          <div className="bg-white/60 rounded-lg p-1.5 sm:p-2 border border-red-100">
            <div className="text-lg sm:text-2xl font-extrabold text-red-600">
              {importResult.errors}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600 font-medium">Errors</div>
          </div>
        )}
      </div>

      {/* Detailed Info */}
      {importResult.summary && (
        <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-100">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Success Rate:</span>
            <span className="font-bold text-emerald-700">
              {importResult.summary.successRate}%
            </span>
          </div>
          {importResult.duration && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Duration:</span>
              <span className="font-bold text-gray-700">
                {importResult.duration}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {importResult.message && (
        <div className="text-xs text-gray-600 font-medium pt-1 border-t border-emerald-100">
          {importResult.message}
        </div>
      )}
    </div>
  );
}

// Separate component for error message
function ErrorMessage({ error, importResult }: { error: string; importResult: BackfillResponse | null }) {
  return (
    <div className="absolute top-full left-0 right-0 mt-2 p-2 sm:p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/60 rounded-xl text-xs sm:text-sm shadow-lg z-10 w-full sm:max-w-md">
      <div className="flex items-start gap-2">
        <XCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-red-800">Import Failed</div>
          <div className="text-xs mt-1 font-medium text-red-700 break-words">{error}</div>
          
          {/* Show partial results if available */}
          {importResult && (importResult.processed || importResult.skipped || importResult.errors) && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Partial Results:</div>
              <div className="flex gap-3 text-xs">
                {importResult.processed && importResult.processed > 0 && (
                  <span className="text-emerald-700">
                    ✓ {importResult.processed} processed
                  </span>
                )}
                {importResult.skipped && importResult.skipped > 0 && (
                  <span className="text-gray-600">
                    ⊘ {importResult.skipped} skipped
                  </span>
                )}
                {importResult.errors && importResult.errors > 0 && (
                  <span className="text-red-600">
                    ✗ {importResult.errors} failed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoricalImportButton({ cik, onImportComplete }: HistoricalImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [importResult, setImportResult] = useState<BackfillResponse | null>(null);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasHistoricalData, setHasHistoricalData] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  // Cleanup EventSource on unmount
  useEffect(() => {
    const currentEventSource = eventSourceRef.current;
    return () => {
      if (currentEventSource) {
        currentEventSource.close();
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

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setShowSuccess(false);
    setImportResult(null);
    setProgress(null);

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Start streaming import with real-time updates
      const eventSource = apiClient.createInsiderBackfillStream(
        cik,
        100,
        // onProgress
        (progressData) => {
          setProgress(progressData);
        },
        // onComplete
        async (resultData) => {
          setImportResult(resultData);
          setIsImporting(false);
          setShowSuccess(true);
          setHasHistoricalData(true);
          
          // Invalidate cache for this CIK to show new filings
          try {
            // Invalidate CIK-specific caches
            await cachedApiClient.invalidateCIK(cik);
            
            // Also invalidate all trade caches since new filings affect:
            // - Latest trades feed
            // - Important trades
            // - Cluster buys
            await invalidateAllTrades();
            
            console.info('Cache invalidated for CIK and all trades:', cik);
          } catch (error) {
            console.warn('Failed to invalidate cache:', error);
          }
          
          // Update status
          fetchStatus();
          
          // Call onImportComplete callback to refresh the page data
          if (onImportComplete) {
            onImportComplete();
          }
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            setShowSuccess(false);
          }, 5000);
        },
        // onError
        (errorMessage) => {
          setError(errorMessage);
          setIsImporting(false);
        }
      );

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start import');
      setIsImporting(false);
    }
  };

  return (
    <div className="relative">
      {isLoadingStatus && <LoadingSkeleton />}
      
      {!isLoadingStatus && !isImporting && !showSuccess && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full">
          <button
            onClick={handleImport}
            disabled={isImporting || isLoadingStatus}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm font-semibold hover:scale-105 disabled:hover:scale-100 shadow-sm w-full sm:w-auto"
          >
            <ArrowPathIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {hasHistoricalData ? (
                <>
                  <span className="hidden sm:inline">Re-import Historical Data</span>
                  <span className="sm:hidden">Re-import History</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Import Historical Data</span>
                  <span className="sm:hidden">Import History</span>
                </>
              )}
            </span>
          </button>
          
          {hasHistoricalData && status && <StatusBadge status={status} />}
        </div>
      )}

      {isImporting && (
        <div className="inline-flex flex-col gap-3 w-full sm:min-w-[320px] sm:max-w-md p-3 sm:p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/60 rounded-xl shadow-sm">
          {/* Progress Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <ProgressDisplay progress={progress} />
            </div>
          </div>

          {/* Progress Stats */}
          {progress && <ProgressStats progress={progress} />}
        </div>
      )}

      {showSuccess && importResult && <SuccessMessage importResult={importResult} />}

      {error && !isImporting && <ErrorMessage error={error} importResult={importResult} />}
    </div>
  );
}
