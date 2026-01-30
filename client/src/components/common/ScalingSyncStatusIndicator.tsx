/**
 * Sync Status Indicator for Scaling Preferences
 * Shows the current sync status of household size and manual overrides
 */

import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { useScalingSyncStatusDisplay } from '../../hooks/useScalingOfflineSync';
import toast from 'react-hot-toast';

interface ScalingSyncStatusIndicatorProps {
  /** Whether to show detailed status text */
  showText?: boolean;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the current sync status for scaling preferences
 */
export const ScalingSyncStatusIndicator: React.FC<ScalingSyncStatusIndicatorProps> = ({
  showText = true,
  size = 'md',
  className = ''
}) => {
  const {
    syncStatusText,
    syncStatusColor,
    canManualSync,
    forceSyncAttempt,
    syncStatus
  } = useScalingSyncStatusDisplay();

  const handleManualSync = async () => {
    if (!canManualSync) return;

    try {
      await forceSyncAttempt();
      toast.success('Changes synced successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync changes');
    }
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

    if (!syncStatus.isOnline) {
      return <WifiOff className={`${iconSize} ${syncStatusColor}`} />;
    }

    if (syncStatus.syncInProgress) {
      return <RefreshCw className={`${iconSize} ${syncStatusColor} animate-spin`} />;
    }

    if (syncStatus.pendingChanges > 0) {
      return <Clock className={`${iconSize} ${syncStatusColor}`} />;
    }

    return <CheckCircle className={`${iconSize} ${syncStatusColor}`} />;
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getIcon()}
      </div>

      {/* Status Text */}
      {showText && (
        <span className={`${getTextSize()} ${syncStatusColor} font-medium`}>
          {syncStatusText}
        </span>
      )}

      {/* Manual Sync Button */}
      {canManualSync && (
        <button
          onClick={handleManualSync}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-md
            text-xs font-medium transition-colors duration-200
            bg-blue-50 text-blue-700 hover:bg-blue-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          `}
          title="Sync pending changes now"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync Now</span>
        </button>
      )}

      {/* Network Status Warning */}
      {!syncStatus.isOnline && syncStatus.pendingChanges > 0 && (
        <div className="flex items-center space-x-1 text-orange-600">
          <AlertCircle className="w-3 h-3" />
          {showText && (
            <span className="text-xs">
              Changes will sync when online
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for use in headers or toolbars
 */
export const CompactScalingSyncIndicator: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <ScalingSyncStatusIndicator
      showText={false}
      size="sm"
      className={className}
    />
  );
};

/**
 * Detailed version for use in settings or status pages
 */
export const DetailedScalingSyncIndicator: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { syncStatus } = useScalingSyncStatusDisplay();

  return (
    <div className={`space-y-2 ${className}`}>
      <ScalingSyncStatusIndicator
        showText={true}
        size="md"
      />
      
      {/* Additional Details */}
      <div className="text-xs text-gray-500 space-y-1">
        {syncStatus.lastSuccessfulSync && (
          <div>
            Last synced: {syncStatus.lastSuccessfulSync.toLocaleString()}
          </div>
        )}
        
        {syncStatus.lastSyncAttempt && 
         syncStatus.lastSyncAttempt !== syncStatus.lastSuccessfulSync && (
          <div>
            Last attempt: {syncStatus.lastSyncAttempt.toLocaleString()}
          </div>
        )}
        
        {syncStatus.pendingChanges > 0 && (
          <div className="text-orange-600">
            {syncStatus.pendingChanges} change{syncStatus.pendingChanges !== 1 ? 's' : ''} waiting to sync
          </div>
        )}
      </div>
    </div>
  );
};