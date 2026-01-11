import React from 'react';
import { AutoSaveStatus } from '../../hooks/useAutoSave';
import { formatDistanceToNow } from 'date-fns';

interface SaveStatusIndicatorProps {
  status: AutoSaveStatus;
  className?: string;
  showLastSaved?: boolean;
  onRetry?: () => void;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  className = '',
  showLastSaved = true,
  onRetry,
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'saving':
        return (
          <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'saved':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'offline':
        return (
          <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      case 'offline':
        return 'Offline';
      case 'idle':
        return status.pendingChanges ? 'Unsaved changes' : '';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'saving':
        return 'text-blue-600';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'offline':
        return 'text-orange-600';
      case 'idle':
        return status.pendingChanges ? 'text-yellow-600' : 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatLastSaved = () => {
    if (!status.lastSaved) return null;
    
    try {
      return `Last saved ${formatDistanceToNow(status.lastSaved, { addSuffix: true })}`;
    } catch {
      return 'Last saved recently';
    }
  };

  if (status.status === 'idle' && !status.pendingChanges && !showLastSaved) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className={getStatusColor()}>{getStatusText()}</span>
      </div>
      
      {status.status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-blue-600 hover:text-blue-800 underline text-xs"
        >
          Retry
        </button>
      )}
      
      {showLastSaved && status.lastSaved && status.status !== 'saving' && (
        <span className="text-gray-400 text-xs">
          {formatLastSaved()}
        </span>
      )}
      
      {status.error && (
        <div className="text-red-500 text-xs max-w-xs truncate" title={status.error}>
          {status.error}
        </div>
      )}
    </div>
  );
};