import React from 'react';
import { ScaledIngredient } from '../../types/Scaling.types';
import { Ingredient } from '../../types/Recipe.types';

export interface IngredientQuantityDisplayProps {
  /** Original ingredient data */
  ingredient: Ingredient;
  /** Scaled ingredient data (optional) */
  scaledIngredient?: ScaledIngredient;
  /** Whether to show scaled quantities */
  showScaled: boolean;
  /** Whether to show scaling indicator for this ingredient */
  showScalingIndicator?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for displaying ingredient quantities with original/scaled toggle support
 * Requirements: 5.4
 */
export const IngredientQuantityDisplay: React.FC<IngredientQuantityDisplayProps> = ({
  ingredient,
  scaledIngredient,
  showScaled,
  showScalingIndicator = false,
  compact = false,
  className = '',
}) => {
  // Determine which quantity to display
  const displayQuantity = showScaled && scaledIngredient 
    ? scaledIngredient.displayQuantity 
    : `${ingredient.quantity} ${ingredient.unit}`;
  
  // Check if scaling is applied
  const hasScaling = scaledIngredient && Math.abs(scaledIngredient.scaledQuantity - scaledIngredient.originalQuantity) > 0.01;
  
  // Get scaling factor for display
  const scalingFactor = scaledIngredient 
    ? scaledIngredient.scaledQuantity / scaledIngredient.originalQuantity 
    : 1;

  if (compact) {
    return (
      <span className={`inline-flex items-center space-x-1 ${className}`}>
        <span className={`font-medium ${showScaled && hasScaling ? 'text-blue-700' : 'text-gray-900'}`}>
          {displayQuantity}
        </span>
        <span className="text-gray-600">{ingredient.name}</span>
        {showScalingIndicator && hasScaling && (
          <span className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
            {scalingFactor.toFixed(1)}×
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={`font-medium ${showScaled && hasScaling ? 'text-blue-700' : 'text-gray-900'}`}>
          {displayQuantity}
        </span>
        <span className="text-gray-600">{ingredient.name}</span>
      </div>
      
      {showScalingIndicator && hasScaling && (
        <div className="flex items-center space-x-2">
          {showScaled && (
            <span className="text-xs text-gray-500">
              (was {ingredient.quantity} {ingredient.unit})
            </span>
          )}
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
            {scalingFactor.toFixed(1)}× scaled
          </span>
        </div>
      )}
    </div>
  );
};