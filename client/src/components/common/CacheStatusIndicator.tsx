/**
 * Cache Status Indicator Component
 * Shows cache storage status and provides quick cleanup actions
 */

import React, { useState } from 'react';
import { useCacheStatus } from '../../hooks/useCacheManager';

interface CacheStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { storageStatus, isHighUsage, recommendCleanup, cleanupCache } = useCacheStatus();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCleanup = async (aggressive: boolean = false) => {
    setIsCleaningUp(true);
    try {
      await cleanupCache(aggressive);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (): string => {
    if (!storageStatus) return 'text-gray-400';
    if (isHighUsage) return 'text-red-500';
    if (recommendCleanup) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = (): string => {
    if (isCleaningUp) return '⟳';
    if (!storageStatus) return '○';
    if (isHighUsage) return '●';
    if (recommendCleanup) return '◐';
    return '●';
  };

  const getStatusText = (): string => {
    if (isCleaningUp) return 'Cleaning up...';
    if (!storageStatus) return 'Cache status unknown';
    if (isHighUsage) return 'Storage almost full';
    if (recommendCleanup) return 'Cleanup recommended';
    return 'Storage OK';
  };

  if (!storageStatus && !showDetails) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex items-center space-x-1 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => showDetails && setShowTooltip(!showTooltip)}
      >
        <span className={`text-sm ${getStatusColor()} ${isCleaningUp ? 'animate-spin' : ''}`}>
          {getStatusIcon()}
        </span>
        
        {showDetails && storageStatus && (
          <span className="text-xs text-gray-600">
            {Math.round(storageStatus.percentage)}%
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && storageStatus && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
            <div className="font-medium">{getStatusText()}</div>
            <div className="text-gray-300">
              {formatBytes(storageStatus.usage)} / {formatBytes(storageStatus.quota)}
            </div>
            
            {(recommendCleanup || isHighUsage) && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCleanup(false);
                    setShowTooltip(false);
                  }}
                  disabled={isCleaningUp}
                  className="block w-full text-left hover:text-blue-300 disabled:opacity-50"
                >
                  Clean up cache
                </button>
                
                {isHighUsage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCleanup(true);
                      setShowTooltip(false);
                    }}
                    disabled={isCleaningUp}
                    className="block w-full text-left hover:text-orange-300 disabled:opacity-50 mt-1"
                  >
                    Aggressive cleanup
                  </button>
                )}
              </div>
            )}
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}

      {/* Warning badge for high usage */}
      {isHighUsage && !showDetails && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

export default CacheStatusIndicator;