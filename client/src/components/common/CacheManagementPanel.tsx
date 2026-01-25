/**
 * Cache Management Panel Component
 * Provides UI for monitoring and managing service worker caches
 */

import React, { useState } from 'react';
import { useCacheManager } from '../../hooks/useCacheManager';

interface CacheManagementPanelProps {
  className?: string;
  showAdvanced?: boolean;
}

export const CacheManagementPanel: React.FC<CacheManagementPanelProps> = ({
  className = '',
  showAdvanced = false
}) => {
  const {
    statistics,
    storageStatus,
    isLoading,
    error,
    refreshStatistics,
    clearAllCaches,
    forceUpdateCaches,
    cleanupCache,
    monitorStorage,
    getVersion
  } = useCacheManager();

  const [isOperating, setIsOperating] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');

  // Load version on mount
  React.useEffect(() => {
    getVersion().then(setVersion);
  }, [getVersion]);

  const handleOperation = async (
    operation: () => Promise<boolean | void>,
    successMessage: string,
    errorMessage: string
  ) => {
    setIsOperating(true);
    setOperationMessage(null);
    
    try {
      const result = await operation();
      if (result !== false) {
        setOperationMessage(successMessage);
      } else {
        setOperationMessage(errorMessage);
      }
    } catch (error) {
      setOperationMessage(errorMessage);
    } finally {
      setIsOperating(false);
      setTimeout(() => setOperationMessage(null), 3000);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageStatusColor = (percentage: number): string => {
    if (percentage > 80) return 'text-red-600';
    if (percentage > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading && !statistics) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cache Management</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">v{version}</span>
          <button
            onClick={() => handleOperation(refreshStatistics, 'Statistics refreshed', 'Failed to refresh statistics')}
            disabled={isOperating}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {operationMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {operationMessage}
        </div>
      )}

      {/* Storage Status */}
      {storageStatus && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-2">Storage Usage</h4>
          <div className="bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                storageStatus.percentage > 80 ? 'bg-red-500' :
                storageStatus.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(storageStatus.percentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {formatBytes(storageStatus.usage)} / {formatBytes(storageStatus.quota)}
            </span>
            <span className={getStorageStatusColor(storageStatus.percentage)}>
              {Math.round(storageStatus.percentage)}%
            </span>
          </div>
          
          {storageStatus.percentage > 60 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              {storageStatus.percentage > 80 ? 
                'Storage usage is high. Consider clearing cache or cleaning up old data.' :
                'Storage usage is moderate. Regular cleanup recommended.'
              }
            </div>
          )}
        </div>
      )}

      {/* Cache Statistics */}
      {statistics && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Cache Statistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statistics.caches).map(([key, cache]) => (
              <div key={key} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {cache.entries}/{cache.maxEntries}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  Size: {formatBytes(cache.estimatedSize)}
                  {cache.expiredEntries > 0 && (
                    <span className="text-yellow-600 ml-2">
                      ({cache.expiredEntries} expired)
                    </span>
                  )}
                </div>
                <div className="bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      cache.utilizationPercentage > 90 ? 'bg-red-400' :
                      cache.utilizationPercentage > 70 ? 'bg-yellow-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(cache.utilizationPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            Total: {statistics.totalEntries} entries, {formatBytes(statistics.totalSize)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleOperation(
              () => cleanupCache(false),
              'Standard cleanup completed',
              'Cleanup failed'
            )}
            disabled={isOperating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Clean Up Cache
          </button>
          
          {storageStatus && storageStatus.percentage > 80 && (
            <button
              onClick={() => handleOperation(
                () => cleanupCache(true),
                'Aggressive cleanup completed',
                'Aggressive cleanup failed'
              )}
              disabled={isOperating}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              Aggressive Cleanup
            </button>
          )}
          
          <button
            onClick={() => handleOperation(
              forceUpdateCaches,
              'Cache update completed',
              'Cache update failed'
            )}
            disabled={isOperating}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            Update Cache
          </button>
        </div>

        {showAdvanced && (
          <div className="pt-3 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Advanced Actions</h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleOperation(
                  clearAllCaches,
                  'All caches cleared',
                  'Failed to clear caches'
                )}
                disabled={isOperating}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                Clear All Caches
              </button>
              
              <button
                onClick={() => handleOperation(
                  monitorStorage,
                  'Storage monitoring triggered',
                  'Storage monitoring failed'
                )}
                disabled={isOperating}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                Monitor Storage
              </button>
            </div>
          </div>
        )}
      </div>

      {isOperating && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
};

export default CacheManagementPanel;