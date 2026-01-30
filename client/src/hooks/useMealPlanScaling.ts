import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdSizeChange } from '../contexts/HouseholdSizeContext';
import { MealPlan, MealSlot } from '../types/MealPlan.types';
import { scalingService } from '../services/scalingService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

interface UseMealPlanScalingOptions {
  /** Current week start date for the meal plan */
  weekStart: Date;
  /** Whether to enable real-time scaling updates */
  enabled?: boolean;
  /** Callback when scaling updates are applied */
  onScalingUpdate?: (updatedMealPlan: MealPlan) => void;
}

/**
 * Hook to handle real-time meal plan scaling updates when household size changes
 * 
 * This hook listens for household size changes and automatically recalculates
 * all recipe scaling in the current meal plan while preserving manual overrides.
 */
export const useMealPlanScaling = ({
  weekStart,
  enabled = true,
  onScalingUpdate
}: UseMealPlanScalingOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isUpdatingRef = useRef(false);
  
  // Format week key for query cache
  const weekKey = weekStart.toISOString().split('T')[0];
  const queryKey = ['mealPlan', user?.id, weekKey];

  /**
   * Recalculate scaling for all meals in a meal plan
   * Preserves manual overrides while updating household-based scaling
   */
  const recalculateMealPlanScaling = useCallback((
    mealPlan: MealPlan,
    newHouseholdSize: number,
    previousHouseholdSize: number
  ): MealPlan => {
    const updatedMeals = { ...mealPlan.meals };
    let hasChanges = false;

    // Process each day's meals
    Object.keys(updatedMeals).forEach(dayKey => {
      const dayMeals = updatedMeals[dayKey];
      const updatedDayMeals = { ...dayMeals };

      // Process each meal type (breakfast, lunch, dinner)
      (['breakfast', 'lunch', 'dinner'] as const).forEach(mealType => {
        const mealSlot = dayMeals[mealType];
        
        if (mealSlot && !mealSlot.manualServingOverride) {
          // Only update meals without manual overrides
          const recipe = mealSlot.recipe;
          
          // Calculate new effective serving size based on new household size
          const newEffectiveServings = scalingService.getEffectiveServingSize(
            recipe,
            newHouseholdSize,
            undefined // No manual override since manualServingOverride is false
          );

          // Only update if the serving size actually changed
          if (newEffectiveServings !== mealSlot.servings) {
            const updatedMealSlot: MealSlot = {
              ...mealSlot,
              servings: newEffectiveServings,
              // Update timestamp to reflect the change
              updatedAt: new Date()
            };

            updatedDayMeals[mealType] = updatedMealSlot;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        updatedMeals[dayKey] = updatedDayMeals;
      }
    });

    // Return updated meal plan if there were changes
    if (hasChanges) {
      return {
        ...mealPlan,
        meals: updatedMeals,
        updatedAt: new Date()
      };
    }

    return mealPlan;
  }, []);

  /**
   * Handle household size changes with optimistic updates
   */
  const handleHouseholdSizeChange = useCallback((
    newHouseholdSize: number,
    previousHouseholdSize: number
  ) => {
    if (!enabled || isUpdatingRef.current) {
      return;
    }

    // Prevent concurrent updates
    isUpdatingRef.current = true;

    try {
      // Get current meal plan from cache
      const currentMealPlan = queryClient.getQueryData<MealPlan>(queryKey);
      
      if (!currentMealPlan) {
        // No meal plan to update
        return;
      }

      // Recalculate scaling for the meal plan
      const updatedMealPlan = recalculateMealPlanScaling(
        currentMealPlan,
        newHouseholdSize,
        previousHouseholdSize
      );

      // Check if any changes were made
      if (updatedMealPlan !== currentMealPlan) {
        // Update the query cache optimistically
        queryClient.setQueryData(queryKey, updatedMealPlan);

        // Call the callback if provided
        if (onScalingUpdate) {
          onScalingUpdate(updatedMealPlan);
        }

        // Show user feedback
        toast.success(
          `Recipes updated for ${newHouseholdSize} ${newHouseholdSize === 1 ? 'person' : 'people'}`,
          {
            duration: 3000,
            position: 'bottom-right',
          }
        );

        // Note: The actual server update will be handled by the meal plan mutation
        // when the user makes their next change, or by auto-save if enabled
      }
    } catch (error) {
      console.error('Error updating meal plan scaling:', error);
      toast.error('Failed to update recipe scaling. Please refresh the page.');
    } finally {
      // Allow future updates
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [enabled, queryClient, queryKey, recalculateMealPlanScaling, onScalingUpdate]);

  // Listen for household size changes
  useHouseholdSizeChange(handleHouseholdSizeChange, [handleHouseholdSizeChange]);

  /**
   * Manually trigger scaling recalculation
   * Useful for testing or manual refresh scenarios
   */
  const triggerScalingUpdate = useCallback((newHouseholdSize: number) => {
    const currentMealPlan = queryClient.getQueryData<MealPlan>(queryKey);
    
    if (currentMealPlan) {
      const updatedMealPlan = recalculateMealPlanScaling(
        currentMealPlan,
        newHouseholdSize,
        currentMealPlan.householdSize || 2 // Use current or default
      );

      if (updatedMealPlan !== currentMealPlan) {
        queryClient.setQueryData(queryKey, updatedMealPlan);
        
        if (onScalingUpdate) {
          onScalingUpdate(updatedMealPlan);
        }
      }
    }
  }, [queryClient, queryKey, recalculateMealPlanScaling, onScalingUpdate]);

  return {
    triggerScalingUpdate,
    isUpdating: isUpdatingRef.current
  };
};