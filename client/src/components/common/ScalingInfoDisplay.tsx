import React from 'react';
import { ScaledRecipe } from '../../types/Scaling.types';
import { ScalingIndicator } from './ScalingIndicator';
import { QuantityToggle } from './QuantityToggle';
import { Info } from 'lucide-react';

export interface ScalingInfoDisplayProps {
  /** Scaled recipe data */
  scaledRecipe: ScaledRecipe;
  /** Whether to show quantity toggle */
  showQuantityToggle?: boolean;
  /** Current toggle state for quantities */
  showScaled?: boolean;
  /** Callback for quantity toggle */
  onQuantityToggle?: (showScaled: boolean) => void;
  /** Layout mode */
  layout?: 'horizontal' | 'vertical' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Comprehensive scaling information display component
 * Shows scaling indicators, factors, and quantity toggle controls
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const ScalingInfoDisplay: React.FC<ScalingInfoDisplayProps> = ({
  scaledRecipe,
  showQuantityToggle = false,
  showScaled = true,
  onQuantityToggle,
  layout = 'horizontal',
  className = '',
}) => {
  const { originalRecipe, scalingFactor, effectiveServings, scalingSource, manualServingOverride } = scaledRecipe;
  
  // Check if scaling is applied
  const hasScaling = Math.abs(scalingFactor - 1) > 0.01;
  
  // Get scaling details for display
  const getScalingDetails = () => {
    const originalServings = originalRecipe.servings || 1;
    
    if (!hasScaling) {
      return {
        title: 'No Scaling Applied',
        description: `Recipe serves ${effectiveServings} as originally designed`,
        isScaled: false,
      };
    }
    
    if (scalingSource === 'manual') {
      return {
        title: 'Manual Override Applied',
        description: `Manually scaled from ${originalServings} to ${effectiveServings} servings`,
        isScaled: true,
      };
    }
    
    return {
      title: 'Household Scaling Applied',
      description: `Automatically scaled from ${originalServings} to ${effectiveServings} servings for your household`,
      isScaled: true,
    };
  };

  const scalingDetails = getScalingDetails();

  if (layout === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <ScalingIndicator
          originalServings={originalRecipe.servings || 1}
          currentServings={effectiveServings}
          scalingFactor={scalingFactor}
          scalingSource={scalingSource}
          compact={true}
        />
        {showQuantityToggle && hasScaling && onQuantityToggle && (
          <QuantityToggle
            showScaled={showScaled}
            onToggle={onQuantityToggle}
            hasScaling={hasScaling}
            compact={true}
          />
        )}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Scaling Status */}
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">{scalingDetails.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{scalingDetails.description}</p>
          </div>
        </div>

        {/* Scaling Indicator */}
        <ScalingIndicator
          originalServings={originalRecipe.servings || 1}
          currentServings={effectiveServings}
          scalingFactor={scalingFactor}
          scalingSource={scalingSource}
          compact={false}
        />

        {/* Quantity Toggle */}
        {showQuantityToggle && hasScaling && onQuantityToggle && (
          <QuantityToggle
            showScaled={showScaled}
            onToggle={onQuantityToggle}
            hasScaling={hasScaling}
            compact={false}
          />
        )}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={`flex items-center justify-between space-x-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <ScalingIndicator
          originalServings={originalRecipe.servings || 1}
          currentServings={effectiveServings}
          scalingFactor={scalingFactor}
          scalingSource={scalingSource}
          compact={false}
        />
        
        {scalingDetails.isScaled && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{scalingDetails.title}</span>
            {manualServingOverride && (
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Override: {manualServingOverride} servings
              </span>
            )}
          </div>
        )}
      </div>

      {showQuantityToggle && hasScaling && onQuantityToggle && (
        <QuantityToggle
          showScaled={showScaled}
          onToggle={onQuantityToggle}
          hasScaling={hasScaling}
          compact={false}
        />
      )}
    </div>
  );
};