import { mealPlanService, MealPlanError } from './mealPlanService';
import { ExtendedMealPlanService } from '../types/Scaling.types';
import { api } from './api';
import { 
  ScalingError, 
  ValidationErrorCollection,
  InputValidator, 
  NetworkErrorHandler,
  ErrorLogger,
  ERROR_CODES 
} from '../utils/errorHandling';
import { scalingOfflineManager } from './scalingOfflineManager';

/**
 * Extended meal plan service that adds manual serving override functionality
 * Builds on top of the existing mealPlanService
 */
export class ExtendedMealPlanServiceImpl implements ExtendedMealPlanService {
  
  /**
   * Set manual serving override for a specific recipe in a meal plan with enhanced error handling
   * @param mealPlanId - ID of the meal plan
   * @param recipeId - ID of the recipe to override
   * @param servings - Manual serving size
   */
  async setManualServingOverride(mealPlanId: string, recipeId: string, servings: number): Promise<void> {
    // Enhanced validation
    const validationErrors = InputValidator.validateServingSize(servings);
    if (validationErrors.length > 0) {
      throw new ValidationErrorCollection(validationErrors);
    }

    try {
      await api.patch(`/meal-plans/${mealPlanId}/items/${recipeId}/servings`, {
        servings,
        manualServingOverride: true
      });
    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      
      ErrorLogger.logError(
        error,
        'ExtendedMealPlanService.setManualServingOverride',
        { mealPlanId, recipeId, servings, isNetworkError }
      );

      if (isNetworkError) {
        // Cache for later sync
        await scalingOfflineManager.cacheManualOverride(mealPlanId, recipeId, servings);
        
        throw new ScalingError(
          'Network error while setting manual override',
          ERROR_CODES.NETWORK_ERROR,
          'manualOverride',
          true,
          'Unable to save manual override right now. Your change will be saved when connection is restored.'
        );
      }

      const userMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      throw new ScalingError(
        error.message || 'Failed to set manual serving override',
        ERROR_CODES.STORAGE_ERROR,
        'manualOverride',
        true,
        userMessage
      );
    }
  }

  /**
   * Remove manual serving override for a specific recipe in a meal plan with enhanced error handling
   * This will revert to automatic household-based scaling
   * @param mealPlanId - ID of the meal plan
   * @param recipeId - ID of the recipe to remove override from
   */
  async removeManualServingOverride(mealPlanId: string, recipeId: string): Promise<void> {
    try {
      await api.patch(`/meal-plans/${mealPlanId}/items/${recipeId}/servings`, {
        manualServingOverride: false
      });
    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      
      ErrorLogger.logError(
        error,
        'ExtendedMealPlanService.removeManualServingOverride',
        { mealPlanId, recipeId, isNetworkError }
      );

      if (isNetworkError) {
        // Cache removal for later sync (null servings means removal)
        await scalingOfflineManager.cacheManualOverride(mealPlanId, recipeId, null);
        
        throw new ScalingError(
          'Network error while removing manual override',
          ERROR_CODES.NETWORK_ERROR,
          'manualOverride',
          true,
          'Unable to remove manual override right now. Your change will be saved when connection is restored.'
        );
      }

      const userMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      throw new ScalingError(
        error.message || 'Failed to remove manual serving override',
        ERROR_CODES.STORAGE_ERROR,
        'manualOverride',
        true,
        userMessage
      );
    }
  }

  /**
   * Get effective serving size for a recipe in a meal plan with offline support
   * Returns the manual override if set, otherwise returns the household-based serving size
   * @param mealPlanId - ID of the meal plan
   * @param recipeId - ID of the recipe
   * @returns Effective serving size
   */
  async getEffectiveServings(mealPlanId: string, recipeId: string): Promise<number> {
    try {
      const response = await api.get(`/meal-plans/${mealPlanId}/items/${recipeId}/servings`);
      return response.data.effectiveServings;
    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      
      ErrorLogger.logError(
        error,
        'ExtendedMealPlanService.getEffectiveServings',
        { mealPlanId, recipeId, isNetworkError }
      );

      if (isNetworkError) {
        // Try to get cached value
        const cachedOverride = scalingOfflineManager.getCachedManualOverride(mealPlanId, recipeId);
        if (cachedOverride !== null) {
          return cachedOverride;
        }
        
        // Fallback to default household size if no cached override
        return 2; // Default household size
      }

      throw new ScalingError(
        error.message || 'Failed to get effective servings',
        ERROR_CODES.STORAGE_ERROR,
        'effectiveServings',
        true,
        NetworkErrorHandler.getNetworkErrorMessage(error)
      );
    }
  }

  /**
   * Check if a recipe has a manual serving override in a meal plan
   * @param mealPlanId - ID of the meal plan
   * @param recipeId - ID of the recipe
   * @returns True if manual override is set
   */
  async hasManualOverride(mealPlanId: string, recipeId: string): Promise<boolean> {
    try {
      const response = await api.get(`/meal-plans/${mealPlanId}/items/${recipeId}`);
      return response.data.manualServingOverride === true;
    } catch (error) {
      console.error('Failed to check manual override status:', error);
      // Return false as default if we can't determine the status
      return false;
    }
  }

  /**
   * Get manual override details for a recipe in a meal plan
   * @param mealPlanId - ID of the meal plan
   * @param recipeId - ID of the recipe
   * @returns Override details or null if no override
   */
  async getManualOverrideDetails(mealPlanId: string, recipeId: string): Promise<{
    hasOverride: boolean;
    servings?: number;
    originalServings?: number;
  }> {
    try {
      const response = await api.get(`/meal-plans/${mealPlanId}/items/${recipeId}`);
      const item = response.data;
      
      return {
        hasOverride: item.manualServingOverride === true,
        servings: item.servings,
        originalServings: item.recipe?.servings
      };
    } catch (error) {
      console.error('Failed to get manual override details:', error);
      return { hasOverride: false };
    }
  }

  /**
   * Batch update multiple manual serving overrides
   * @param mealPlanId - ID of the meal plan
   * @param overrides - Array of recipe ID and serving size pairs
   */
  async batchSetManualOverrides(
    mealPlanId: string, 
    overrides: Array<{ recipeId: string; servings: number }>
  ): Promise<void> {
    // Validate all overrides first
    for (const override of overrides) {
      if (override.servings <= 0) {
        throw new Error(`Serving size must be greater than 0 for recipe ${override.recipeId}`);
      }
      if (override.servings > 50) {
        throw new Error(`Serving size cannot exceed 50 for recipe ${override.recipeId}`);
      }
    }

    try {
      await api.patch(`/meal-plans/${mealPlanId}/items/batch-servings`, {
        overrides: overrides.map(override => ({
          recipeId: override.recipeId,
          servings: override.servings,
          manualServingOverride: true
        }))
      });
    } catch (error) {
      console.error('Failed to batch set manual serving overrides:', error);
      throw new MealPlanError(
        'Failed to update serving overrides. Please try again.',
        error,
        true
      );
    }
  }
}

// Export singleton instance
export const extendedMealPlanService = new ExtendedMealPlanServiceImpl();

// Re-export the original meal plan service methods for convenience
export const mealPlanServiceWithOverrides = {
  ...mealPlanService,
  ...extendedMealPlanService
};