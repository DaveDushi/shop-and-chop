import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface NetworkErrorRecoveryProps {
  error: Error | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  className?: string;
}

export const NetworkErrorRecovery: React.FC<NetworkErrorRecoveryProps> = ({
  error,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  className = '',
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && error && autoRetryEnabled && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        onRetry();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, error, autoRetryEnabled, retryCount, maxRetries, onRetry]);

  if (!error) return null;

  const isNetworkError = error.message?.includes('Network Error') || 
                        error.message?.includes('fetch') ||
                        !isOnline;

  const getErrorMessage = () => {
    if (!isOnline) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    
    if (isNetworkError) {
      return 'Unable to connect to the server. This might be a temporary network issue.';
    }
    
    return error.message || 'An unexpected error occurred.';
  };

  const getRetryMessage = () => {
    if (retryCount >= maxRetries) {
      return 'Maximum retry attempts reached. Please try again later.';
    }
    
    if (isRetrying) {
      return `Retrying... (Attempt ${retryCount + 1}/${maxRetries})`;
    }
    
    return null;
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {!isOnline ? (
            <WifiOff className="w-6 h-6 text-red-500" />
          ) : isNetworkError ? (
            <Wifi className="w-6 h-6 text-red-500" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {!isOnline ? 'Connection Lost' : 'Network Error'}
          </h3>
          
          <p className="text-sm text-red-700 mb-4">
            {getErrorMessage()}
          </p>
          
          {getRetryMessage() && (
            <p className="text-sm text-red-600 mb-4 font-medium">
              {getRetryMessage()}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              disabled={isRetrying || retryCount >= maxRetries}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
            
            {isNetworkError && (
              <label className="inline-flex items-center gap-2 text-sm text-red-700">
                <input
                  type="checkbox"
                  checked={autoRetryEnabled}
                  onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                Auto-retry when connection is restored
              </label>
            )}
          </div>
          
          {!isOnline && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Offline Mode:</strong> Some features may not be available while offline. 
                Your changes will be saved when connection is restored.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};