import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useHouseholdSize, useHouseholdSizeChange } from '../../contexts/HouseholdSizeContext';

interface ScalingStatusIndicatorProps {
  /** Whether to show the indicator in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the current household size */
  showHouseholdSize?: boolean;
}

/**
 * Scaling Status Indicator Component
 * 
 * Shows the current household size and provides visual feedback when
 * real-time scaling updates are being applied to meal plans.
 */
export const ScalingStatusIndicator: React.FC<ScalingStatusIndicatorProps> = ({
  compact = false,
  className = '',
  showHouseholdSize = true
}) => {
  const { householdSize, isLoading } = useHouseholdSize();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Listen for household size changes to show update feedback
  useHouseholdSizeChange((newSize, previousSize) => {
    if (newSize !== previousSize) {
      setIsUpdating(true);
      setLastUpdate(new Date());
      
      // Show updating state for a brief period
      setTimeout(() => {
        setIsUpdating(false);
      }, 2000);
    }
  }, []);

  // Don't render if household size is not available
  if (!showHouseholdSize && !isUpdating && !lastUpdate) {
    return null;
  }

  const getStatusIcon = () => {
    if (isLoading || isUpdating) {
      return <RefreshCw className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} animate-spin text-blue-600`} />;
    }
    
    if (lastUpdate) {
      return <Check className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />;
    }
    
    return <Users className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />;
  };

  const getStatusText = () => {
    if (isLoading) {
      return 'Loading household size...';
    }
    
    if (isUpdating) {
      return `Updating recipes for ${householdSize} ${householdSize === 1 ? 'person' : 'people'}...`;
    }
    
    if (lastUpdate && Date.now() - lastUpdate.getTime() < 5000) {
      return `Recipes updated for ${householdSize} ${householdSize === 1 ? 'person' : 'people'}`;
    }
    
    if (showHouseholdSize) {
      return `Scaled for ${householdSize} ${householdSize === 1 ? 'person' : 'people'}`;
    }
    
    return '';
  };

  const getStatusColor = () => {
    if (isLoading || isUpdating) {
      return 'text-blue-600';
    }
    
    if (lastUpdate && Date.now() - lastUpdate.getTime() < 5000) {
      return 'text-green-600';
    }
    
    return 'text-gray-600';
  };

  return (
    <div 
      className={`flex items-center space-x-2 ${getStatusColor()} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Recipe scaling status"
    >
      {getStatusIcon()}
      
      {!compact && (
        <span className={`text-sm font-medium ${compact ? 'sr-only' : ''}`}>
          {getStatusText()}
        </span>
      )}
      
      {compact && getStatusText() && (
        <span className="sr-only">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

/**
 * Compact Scaling Status Badge
 * 
 * A minimal version of the scaling status indicator for use in tight spaces
 */
export const ScalingStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <ScalingStatusIndicator 
      compact={true}
      showHouseholdSize={false}
      className={`${className}`}
    />
  );
};

/**
 * Detailed Scaling Status Panel
 * 
 * A more detailed version showing household size and update history
 */
export const ScalingStatusPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { householdSize } = useHouseholdSize();
  const [updateHistory, setUpdateHistory] = useState<Array<{ timestamp: Date; size: number }>>([]);

  useHouseholdSizeChange((newSize) => {
    setUpdateHistory(prev => [
      { timestamp: new Date(), size: newSize },
      ...prev.slice(0, 4) // Keep last 5 updates
    ]);
  }, []);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Recipe Scaling</h3>
        <ScalingStatusBadge />
      </div>
      
      <ScalingStatusIndicator showHouseholdSize={true} />
      
      {updateHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Updates</h4>
          <div className="space-y-1">
            {updateHistory.slice(0, 3).map((update, index) => (
              <div key={index} className="flex items-center justify-between text-xs text-gray-600">
                <span>Scaled for {update.size} {update.size === 1 ? 'person' : 'people'}</span>
                <span>{update.timestamp.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};