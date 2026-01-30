import React, { useState, useEffect } from 'react';
import { Users, Check, AlertCircle } from 'lucide-react';
import { userPreferencesService } from '../../services/userPreferencesService';
import { SCALING_CONSTANTS } from '../../types/Scaling.types';
import { LoadingSpinner } from './LoadingSpinner';
import { useHouseholdSize } from '../../contexts/HouseholdSizeContext';
import { ScalingSyncStatusIndicator } from './ScalingSyncStatusIndicator';
import { 
  ValidationErrorCollection, 
  ScalingError, 
  NetworkErrorHandler 
} from '../../utils/errorHandling';
import toast from 'react-hot-toast';

interface HouseholdSizeSettingsProps {
  /** Optional callback when household size is successfully updated */
  onUpdate?: (newSize: number) => void;
  /** Whether to show the component in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Household Size Settings Component
 * 
 * Provides an interface for users to view and update their household size.
 * Integrates with UserPreferencesService for validation and persistence.
 * 
 * Features:
 * - Real-time validation with error messages
 * - Loading states during save operations
 * - Success/error feedback via toast notifications
 * - Accessible form controls with proper labeling
 * - Responsive design for mobile and desktop
 */
export const HouseholdSizeSettings: React.FC<HouseholdSizeSettingsProps> = ({
  onUpdate,
  compact = false,
  className = ''
}) => {
  const { householdSize: contextHouseholdSize, updateHouseholdSize, isLoading: contextLoading } = useHouseholdSize();
  const [localHouseholdSize, setLocalHouseholdSize] = useState<number>(contextHouseholdSize);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load current household size on component mount and sync with context
  useEffect(() => {
    setLocalHouseholdSize(contextHouseholdSize);
    setHasUnsavedChanges(false);
  }, [contextHouseholdSize]);

  const handleSizeChange = (newSize: number) => {
    setLocalHouseholdSize(newSize);
    setHasUnsavedChanges(newSize !== contextHouseholdSize);
    
    // Validate the new size
    const validation = userPreferencesService.validateHouseholdSize(newSize);
    setValidationError(validation.isValid ? '' : validation.error || '');
  };

  const handleSave = async () => {
    // Validate before saving
    const validation = userPreferencesService.validateHouseholdSize(localHouseholdSize);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid household size');
      return;
    }

    setIsLoading(true);
    setValidationError('');

    try {
      // Update via household size context for real-time updates
      await updateHouseholdSize(localHouseholdSize);
      
      setHasUnsavedChanges(false);
      toast.success('Household size updated successfully');
      
      // Call optional callback
      if (onUpdate) {
        onUpdate(localHouseholdSize);
      }
    } catch (error: any) {
      console.error('Failed to save household size:', error);
      
      let errorMessage = 'Failed to save household size. Please try again.';
      
      if (error instanceof ValidationErrorCollection) {
        errorMessage = error.errors[0].message;
      } else if (error instanceof ScalingError) {
        errorMessage = error.userMessage;
      } else {
        errorMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      }
      
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLocalHouseholdSize(contextHouseholdSize);
    setHasUnsavedChanges(false);
    setValidationError('');
  };

  if (isLoading || contextLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <LoadingSpinner size="sm" className="mr-2" />
        <span className="text-sm text-gray-600">Loading household size...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-900">Household Size</h3>
        </div>
      )}

      {/* Description */}
      {!compact && (
        <p className="text-sm text-gray-600">
          Set the number of people in your household. This will automatically scale recipe ingredients 
          to the right quantities for your family.
        </p>
      )}

      {/* Input Section */}
      <div className="space-y-3">
        <div>
          <label 
            htmlFor="household-size-input" 
            className={`block font-medium text-gray-700 ${compact ? 'text-sm' : 'text-base'}`}
          >
            {compact ? 'Household Size' : 'Number of People'}
          </label>
          
          <div className="mt-1 flex items-center space-x-3">
            <select
              id="household-size-input"
              value={localHouseholdSize}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className={`input ${compact ? 'text-sm' : ''} ${validationError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading || contextLoading}
              aria-describedby={validationError ? 'household-size-error' : 'household-size-help'}
            >
              {Array.from({ length: SCALING_CONSTANTS.MAX_HOUSEHOLD_SIZE }, (_, i) => i + 1).map(size => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'person' : 'people'}
                </option>
              ))}
            </select>

            {/* Save Button */}
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isLoading || contextLoading || !!validationError}
                className={`btn-primary ${compact ? 'btn-sm' : ''} flex items-center space-x-1`}
                aria-label="Save household size"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-1" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            {/* Reset Button */}
            {hasUnsavedChanges && !isLoading && !contextLoading && (
              <button
                onClick={handleReset}
                className={`btn-secondary ${compact ? 'btn-sm' : ''}`}
                aria-label="Reset household size"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Help Text */}
        {!validationError && !compact && (
          <p id="household-size-help" className="text-xs text-gray-500">
            Choose between {SCALING_CONSTANTS.MIN_HOUSEHOLD_SIZE} and {SCALING_CONSTANTS.MAX_HOUSEHOLD_SIZE} people.
            Recipe ingredients will be automatically scaled to match your household size.
          </p>
        )}

        {/* Validation Error */}
        {validationError && (
          <div id="household-size-error" className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{validationError}</span>
          </div>
        )}

        {/* Current Status */}
        {!hasUnsavedChanges && !compact && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">
                Recipes are currently scaled for {localHouseholdSize} {localHouseholdSize === 1 ? 'person' : 'people'}
              </span>
            </div>
            
            {/* Sync Status Indicator */}
            <ScalingSyncStatusIndicator size="sm" />
          </div>
        )}

        {/* Compact Sync Status */}
        {compact && (
          <div className="flex justify-end">
            <ScalingSyncStatusIndicator size="sm" showText={false} />
          </div>
        )}
      </div>
    </div>
  );
};