import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

export interface QuantityToggleProps {
  /** Whether to show scaled quantities (true) or original quantities (false) */
  showScaled: boolean;
  /** Callback when toggle state changes */
  onToggle: (showScaled: boolean) => void;
  /** Whether scaling is applied to this recipe */
  hasScaling?: boolean;
  /** Compact version for smaller spaces */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toggle component for switching between original and scaled ingredient quantities
 * Requirements: 5.4
 */
export const QuantityToggle: React.FC<QuantityToggleProps> = ({
  showScaled,
  onToggle,
  hasScaling = true,
  compact = false,
  className = '',
}) => {
  // Don't render if no scaling is applied
  if (!hasScaling) {
    return null;
  }

  const handleToggle = () => {
    onToggle(!showScaled);
  };

  const getToggleStyles = () => {
    if (showScaled) {
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        activeColor: 'text-blue-900',
        inactiveColor: 'text-blue-500',
      };
    }
    
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      activeColor: 'text-gray-900',
      inactiveColor: 'text-gray-500',
    };
  };

  const styles = getToggleStyles();

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm ${styles.bgColor} ${styles.textColor} ${styles.borderColor} ${className}`}
        title={showScaled ? 'Show original quantities' : 'Show scaled quantities'}
        aria-label={showScaled ? 'Switch to original quantities' : 'Switch to scaled quantities'}
        aria-pressed={showScaled}
      >
        {showScaled ? (
          <ToggleRight className="h-3 w-3" />
        ) : (
          <ToggleLeft className="h-3 w-3" />
        )}
        <span>{showScaled ? 'Scaled' : 'Original'}</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-3 px-3 py-2 rounded-lg border ${styles.bgColor} ${styles.borderColor} ${className}`}>
      <span className="text-sm font-medium text-gray-700">Quantities:</span>
      <button
        onClick={handleToggle}
        className="inline-flex items-center space-x-2 text-sm font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md px-2 py-1"
        title={showScaled ? 'Switch to original quantities' : 'Switch to scaled quantities'}
        aria-label={showScaled ? 'Currently showing scaled quantities. Click to show original quantities.' : 'Currently showing original quantities. Click to show scaled quantities.'}
        aria-pressed={showScaled}
      >
        <span className={!showScaled ? styles.activeColor : styles.inactiveColor}>
          Original
        </span>
        {showScaled ? (
          <ToggleRight className={`h-4 w-4 ${styles.activeColor}`} />
        ) : (
          <ToggleLeft className={`h-4 w-4 ${styles.inactiveColor}`} />
        )}
        <span className={showScaled ? styles.activeColor : styles.inactiveColor}>
          Scaled
        </span>
      </button>
    </div>
  );
};