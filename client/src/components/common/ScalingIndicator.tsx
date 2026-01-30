import React from 'react';
import { Scale, Users, Settings } from 'lucide-react';

export interface ScalingIndicatorProps {
  /** Original recipe serving size */
  originalServings: number;
  /** Current effective serving size */
  currentServings: number;
  /** Scaling factor applied */
  scalingFactor: number;
  /** Whether this is from manual override or household scaling */
  scalingSource: 'household' | 'manual';
  /** Whether to show compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visual indicator component for scaled recipes
 * Shows scaling status, factor, and source (household vs manual)
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */
export const ScalingIndicator: React.FC<ScalingIndicatorProps> = ({
  originalServings,
  currentServings,
  scalingFactor,
  scalingSource,
  compact = false,
  className = '',
}) => {
  // Determine if scaling is applied (factor not equal to 1)
  const isScaled = Math.abs(scalingFactor - 1) > 0.01;
  
  // Get appropriate colors and icons based on scaling source
  const getScalingStyles = () => {
    if (!isScaled) {
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        icon: Users,
      };
    }
    
    if (scalingSource === 'manual') {
      return {
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
        icon: Settings,
      };
    }
    
    return {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: Scale,
    };
  };

  const styles = getScalingStyles();
  const IconComponent = styles.icon;

  // Format scaling factor for display
  const formatScalingFactor = (factor: number): string => {
    if (Math.abs(factor - 1) < 0.01) return '1×';
    if (factor < 1) return `${factor.toFixed(2)}×`;
    return `${factor.toFixed(1)}×`;
  };

  // Get tooltip text
  const getTooltipText = (): string => {
    if (!isScaled) {
      return `No scaling applied - serves ${currentServings}`;
    }
    
    const sourceText = scalingSource === 'manual' ? 'manual override' : 'household scaling';
    return `Scaled from ${originalServings} to ${currentServings} servings (${formatScalingFactor(scalingFactor)}) via ${sourceText}`;
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${styles.bgColor} ${styles.textColor} ${styles.borderColor} ${className}`}
        title={getTooltipText()}
        aria-label={getTooltipText()}
      >
        <IconComponent className="h-3 w-3" />
        <span>{formatScalingFactor(scalingFactor)}</span>
        {scalingSource === 'manual' && (
          <span className="text-xs">•</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border ${styles.bgColor} ${styles.textColor} ${styles.borderColor} ${className}`}
      title={getTooltipText()}
      aria-label={getTooltipText()}
    >
      <IconComponent className="h-4 w-4" />
      <div className="flex items-center space-x-2">
        <span>
          {originalServings} → {currentServings}
        </span>
        <span className="text-xs opacity-75">
          ({formatScalingFactor(scalingFactor)})
        </span>
        {scalingSource === 'manual' && (
          <span className="text-xs font-semibold bg-white bg-opacity-50 px-1.5 py-0.5 rounded">
            Manual
          </span>
        )}
      </div>
    </div>
  );
};