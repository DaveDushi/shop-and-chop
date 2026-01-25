import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';

interface SyncProgressIndicatorProps {
  isActive: boolean;
  totalOperations: number;
  completedOperations: number;
  currentOperation?: string;
  errors: string[];
  onDismiss?: () => void;
  className?: string;
}

export const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({
  isActive,
  totalOperations,
  completedOperations,
  currentOperation,
  errors,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show when sync is active or there are errors
    if (isActive || errors.length > 0) {
      setIsVisible(true);
    } else {
      // Hide after a delay when sync completes successfully
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, errors.length]);

  if (!isVisible) return null;

  const progress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;
  const hasErrors = errors.length > 0;
  const isCompleted = !isActive && totalOperations > 0 && completedOperations === totalOperations;

  const getStatusIcon = () => {
    if (hasErrors) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (isActive) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (hasErrors) {
      return `Sync failed (${errors.length} error${errors.length > 1 ? 's' : ''})`;
    }
    if (isActive) {
      return currentOperation || 'Synchronizing...';
    }
    if (isCompleted) {
      return `Sync completed (${completedOperations}/${totalOperations})`;
    }
    return 'Preparing to sync...';
  };

  const getProgressBarColor = () => {
    if (hasErrors) return 'bg-red-500';
    if (isCompleted) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div 
      className={`
        fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]
        transform transition-all duration-300 ease-in-out z-40
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {getStatusText()}
            </h4>
            
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress Bar */}
          {totalOperations > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{completedOperations} of {totalOperations}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Current Operation */}
          {isActive && currentOperation && (
            <p className="text-xs text-gray-600 mb-2">
              {currentOperation}
            </p>
          )}
          
          {/* Error Details */}
          {hasErrors && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              
              {showDetails && (
                <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <ul className="text-xs text-red-700 space-y-1">
                    {errors.slice(0, 3).map((error, index) => (
                      <li key={index} className="break-words">
                        • {error}
                      </li>
                    ))}
                    {errors.length > 3 && (
                      <li className="text-red-600">
                        ... and {errors.length - 3} more error{errors.length - 3 > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncProgressIndicator;