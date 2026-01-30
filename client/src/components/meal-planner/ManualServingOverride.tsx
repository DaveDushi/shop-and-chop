import React, { useState, useEffect } from 'react';
import { Users, Settings, RotateCcw, Check, X, AlertCircle } from 'lucide-react';
import { extendedMealPlanService } from '../../services/extendedMealPlanService';
import { userPreferencesService } from '../../services/userPreferencesService';
import { useAuth } from '../../hooks/useAuth';
import { 
  InputValidator, 
  ValidationErrorCollection, 
  ScalingError, 
  NetworkErrorHandler,
  ErrorLogger 
} from '../../utils/errorHandling';
import toast from 'react-hot-toast';

interface ManualServingOverrideProps {
  mealPlanId: string;
  recipeId: string;
  currentServings: number;
  originalServings: number;
  hasManualOverride?: boolean;
  onServingChange: (newServings: number, isManualOverride: boolean) => void;
  compact?: boolean;
}

export const ManualServingOverride: React.FC<ManualServingOverrideProps> = ({
  mealPlanId,
  recipeId,
  currentServings,
  originalServings,
  hasManualOverride = false,
  onServingChange,
  compact = false,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentServings.toString());
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load household size on mount with error handling
  useEffect(() => {
    const loadHouseholdSize = async () => {
      if (user?.id) {
        try {
          const size = await userPreferencesService.getHouseholdSize(user.id);
          setHouseholdSize(size);
        } catch (error) {
          ErrorLogger.logError(
            error as Error,
            'ManualServingOverride.loadHouseholdSize',
            { userId: user.id }
          );
          // Keep default household size on error
        }
      }
    };
    loadHouseholdSize();
  }, [user?.id]);

  // Update input value when currentServings changes
  useEffect(() => {
    setInputValue(currentServings.toString());
    setHasUnsavedChanges(false);
    setValidationError('');
  }, [currentServings]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setInputValue(currentServings.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setHasUnsavedChanges(true);
    
    // Real-time validation
    if (value === '') {
      setValidationError('');
      return;
    }
    
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) {
      setValidationError('Servings must be a number');
      return;
    }
    
    const validationErrors = InputValidator.validateServingSize(numericValue);
    if (validationErrors.length > 0) {
      setValidationError(validationErrors[0].message);
    } else {
      setValidationError('');
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate input
    if (inputValue === '') {
      setValidationError('Servings is required');
      return;
    }
    
    const newServings = parseInt(inputValue, 10);
    if (isNaN(newServings)) {
      setValidationError('Servings must be a valid number');
      return;
    }

    // Use enhanced validation
    const validationErrors = InputValidator.validateServingSize(newServings);
    if (validationErrors.length > 0) {
      setValidationError(validationErrors[0].message);
      return;
    }

    setIsLoading(true);
    setValidationError('');

    try {
      // Set manual override
      await extendedMealPlanService.setManualServingOverride(mealPlanId, recipeId, newServings);
      onServingChange(newServings, true);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast.success('Manual serving override set');
    } catch (error: any) {
      ErrorLogger.logError(
        error,
        'ManualServingOverride.handleSave',
        { mealPlanId, recipeId, newServings }
      );

      let errorMessage = 'Failed to set manual serving override';
      
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

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setInputValue(currentServings.toString());
    setValidationError('');
    setHasUnsavedChanges(false);
  };

  const handleRemoveOverride = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsLoading(true);
    setValidationError('');

    try {
      // Remove manual override - revert to household scaling
      await extendedMealPlanService.removeManualServingOverride(mealPlanId, recipeId);
      onServingChange(householdSize, false);
      toast.success('Reverted to household scaling');
    } catch (error: any) {
      ErrorLogger.logError(
        error,
        'ManualServingOverride.handleRemoveOverride',
        { mealPlanId, recipeId }
      );

      let errorMessage = 'Failed to remove manual serving override';
      
      if (error instanceof ScalingError) {
        errorMessage = error.userMessage;
      } else {
        errorMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(e as any);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel(e as any);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-full px-2 py-1">
            <Users className="h-3 w-3 text-gray-500" />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className={`w-8 text-xs text-center border-none outline-none bg-transparent ${
                validationError ? 'text-red-600' : ''
              }`}
              autoFocus
              disabled={isLoading}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'serving-error-compact' : undefined}
            />
            <button
              onClick={handleSave}
              disabled={isLoading || !!validationError || !hasUnsavedChanges}
              className="p-1 hover:bg-green-100 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save manual override"
            >
              <Check className="h-3 w-3 text-green-600" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 hover:bg-red-100 rounded-full transition-colors duration-200"
              title="Cancel"
            >
              <X className="h-3 w-3 text-red-600" />
            </button>
          </div>
        ) : (
          <div className={`flex items-center space-x-1 rounded-full px-2 py-1 ${
            hasManualOverride 
              ? 'bg-blue-100 border border-blue-200' 
              : 'bg-gray-100 border border-gray-200'
          }`}>
            <Users className={`h-3 w-3 ${hasManualOverride ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className={`text-xs font-medium ${hasManualOverride ? 'text-blue-700' : 'text-gray-700'}`}>
              {currentServings}
            </span>
            {hasManualOverride && (
              <Settings className="h-3 w-3 text-blue-600" />
            )}
            <button
              onClick={handleEditClick}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors duration-200"
              title={hasManualOverride ? "Edit manual override" : "Set manual override"}
            >
              <Settings className="h-3 w-3 text-gray-500" />
            </button>
            {hasManualOverride && (
              <button
                onClick={handleRemoveOverride}
                disabled={isLoading}
                className="p-1 hover:bg-red-100 rounded-full transition-colors duration-200"
                title="Remove override (revert to household scaling)"
              >
                <RotateCcw className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>
        )}
        
        {/* Validation Error for Compact Mode */}
        {validationError && compact && (
          <div id="serving-error-compact" className="flex items-center space-x-1 text-red-600 text-xs">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>
    );
  }

  // Full version for detailed views
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Serving Size</span>
          {hasManualOverride && (
            <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
              <Settings className="h-3 w-3" />
              <span>Manual Override</span>
            </div>
          )}
        </div>
        
        {!isEditing && hasManualOverride && (
          <button
            onClick={handleRemoveOverride}
            disabled={isLoading}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 transition-colors duration-200"
            title="Remove override and revert to household scaling"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Revert to Household</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Users className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className={`w-16 text-center border-none outline-none bg-transparent ${
                validationError ? 'text-red-600' : ''
              }`}
              placeholder="1-50"
              autoFocus
              disabled={isLoading}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'serving-error-full' : undefined}
            />
            <span className="text-sm text-gray-500">people</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={isLoading || !!validationError || !hasUnsavedChanges}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 rounded-lg px-3 py-2 ${
              hasManualOverride 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <Users className={`h-4 w-4 ${hasManualOverride ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`font-medium ${hasManualOverride ? 'text-blue-700' : 'text-gray-700'}`}>
                {currentServings} people
              </span>
            </div>
            
            {!hasManualOverride && (
              <div className="text-xs text-gray-500">
                Based on household size ({householdSize})
              </div>
            )}
          </div>
          
          <button
            onClick={handleEditClick}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          >
            <Settings className="h-4 w-4" />
            <span>{hasManualOverride ? 'Edit Override' : 'Set Manual Override'}</span>
          </button>
        </div>
      )}

      {/* Validation Error for Full Mode */}
      {validationError && !compact && (
        <div id="serving-error-full" className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Information about scaling */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Original recipe serves: {originalServings} people</div>
        {hasManualOverride ? (
          <div>Manual override: scaling by {(currentServings / originalServings).toFixed(2)}x</div>
        ) : (
          <div>Household scaling: scaling by {(householdSize / originalServings).toFixed(2)}x</div>
        )}
      </div>
    </div>
  );
};