import React from 'react';
import { WifiOff, Wifi, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingOperations: number;
  lastSync?: Date;
  onManualSync?: () => void;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  pendingOperations,
  lastSync,
  onManualSync,
  className = ''
}) => {
  // Don't show banner if online and no pending operations
  if (isOnline && pendingOperations === 0) {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    if (pendingOperations > 0) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return pendingOperations > 0 
        ? `Offline - ${pendingOperations} changes pending`
        : 'Offline';
    }
    if (pendingOperations > 0) {
      return `Syncing ${pendingOperations} changes...`;
    }
    return 'All changes synced';
  };

  const getBannerColor = () => {
    if (!isOnline) {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (pendingOperations > 0) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const formatLastSync = (date?: Date) => {
    if (!date || date.getTime() === 0) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div 
      className={`
        border rounded-lg p-3 transition-all duration-200 ease-in-out
        ${getBannerColor()} ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs opacity-75">
              Last sync: {formatLastSync(lastSync)}
            </span>
          )}
          
          {!isOnline && pendingOperations > 0 && (
            <span className="text-xs opacity-75">
              Changes will sync when online
            </span>
          )}
          
          {isOnline && onManualSync && (
            <button
              onClick={onManualSync}
              className="text-xs font-medium hover:underline focus:outline-none focus:underline"
              disabled={pendingOperations === 0}
            >
              Sync now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;