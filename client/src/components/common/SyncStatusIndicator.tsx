import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Smartphone
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
  isActive: boolean;
  pendingOperations: number;
  errors: string[];
  className?: string;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isOnline,
  connectionType,
  isActive,
  pendingOperations,
  errors,
  className = '',
  compact = false
}) => {
  const getConnectionIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    switch (connectionType) {
      case 'wifi':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'cellular':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSyncIcon = () => {
    if (errors.length > 0) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (isActive) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    if (pendingOperations > 0) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (errors.length > 0) {
      return compact ? 'Error' : 'Sync error';
    }
    
    if (isActive) {
      return compact ? 'Syncing' : 'Syncing...';
    }
    
    if (pendingOperations > 0) {
      return compact ? `${pendingOperations}` : `${pendingOperations} pending`;
    }
    
    return compact ? 'Synced' : 'Up to date';
  };

  const getStatusColor = () => {
    if (errors.length > 0) return 'text-red-600';
    if (isActive) return 'text-blue-600';
    if (pendingOperations > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTooltipText = () => {
    const connectionStatus = isOnline 
      ? `Connected via ${connectionType === 'unknown' ? 'network' : connectionType}`
      : 'Offline';
    
    let syncStatus = '';
    if (errors.length > 0) {
      syncStatus = `Sync errors: ${errors.slice(0, 2).join(', ')}`;
    } else if (isActive) {
      syncStatus = 'Synchronizing changes...';
    } else if (pendingOperations > 0) {
      syncStatus = `${pendingOperations} changes waiting to sync`;
    } else {
      syncStatus = 'All changes synchronized';
    }
    
    return `${connectionStatus}\n${syncStatus}`;
  };

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-1 ${className}`}
        title={getTooltipText()}
      >
        {getConnectionIcon()}
        {getSyncIcon()}
        {pendingOperations > 0 && (
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {pendingOperations}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 ${className}`}
      title={getTooltipText()}
    >
      <div className="flex items-center gap-1">
        {getConnectionIcon()}
        {getSyncIcon()}
      </div>
      
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {errors.length > 0 && (
        <span className="text-xs text-red-500">
          ({errors.length} error{errors.length > 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;