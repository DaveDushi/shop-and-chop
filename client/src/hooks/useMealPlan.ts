import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { mealPlanService, MealPlanError } from '../services/mealPlanService';
import { MealPlan, MealSlot, MealType } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';
import { useAuth } from './useAuth';
import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export const useMealPlan = (weekStart: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Track the last successful state for rollback purposes
  const lastSuccessfulStateRef = useRef<MealPlan | null>(null);
  
  const weekStartNormalized = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday start
  const weekKey = format(weekStartNormalized, 'yyyy-MM-dd');
  const queryKey = ['mealPlan', user?.id, weekKey];

  // Query for getting meal plan
  const {
    data: mealPlan,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await mealPlanService.getMealPlan(user!.id, weekStartNormalized);
      lastSuccessfulStateRef.current = result;
      return result;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a MealPlanError and not retryable
      if (error instanceof MealPlanError && !error.isRetryable) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update the last successful state when data changes
  if (mealPlan && mealPlan !== lastSuccessfulStateRef.current) {
    lastSuccessfulStateRef.current = mealPlan;
  }

  // Enhanced mutation with optimistic updates and rollback
  const updateMealPlanMutation = useMutation({
    mutationFn: (updatedMealPlan: MealPlan) => mealPlanService.updateMealPlan(updatedMealPlan),
    onMutate: async (updatedMealPlan) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousMealPlan = queryClient.getQueryData<MealPlan>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, updatedMealPlan);

      // Return a context object with the snapshotted value
      return { previousMealPlan };
    },
    onSuccess: (updatedMealPlan, variables, context) => {
      // Update the cache with the server response
      queryClient.setQueryData(queryKey, updatedMealPlan);
      lastSuccessfulStateRef.current = updatedMealPlan;
      
      // Show success feedback for significant operations
      toast.success('Meal plan updated', {
        duration: 2000,
        position: 'bottom-right',
      });
    },
    onError: (error, variables, context) => {
      // Rollback to the previous state
      if (context?.previousMealPlan) {
        queryClient.setQueryData(queryKey, context.previousMealPlan);
      } else if (lastSuccessfulStateRef.current) {
        queryClient.setQueryData(queryKey, lastSuccessfulStateRef.current);
      }

      // Handle different types of errors
      if (error instanceof MealPlanError) {
        if (error.statusCode === 409) {
          toast.error('Meal plan conflict detected. Please refresh and try again.');
          // Trigger a refetch to get the latest data
          refetch();
        } else if (error.statusCode === 404) {
          toast.error('Meal plan not found. Creating a new one...');
          // Trigger a refetch which will create a new meal plan
          refetch();
        } else if (error.isRetryable) {
          toast.error('Network error. Changes will be retried automatically.');
        } else {
          toast.error(`Failed to update meal plan: ${error.message}`);
        }
      } else {
        toast.error('Failed to update meal plan. Please try again.');
      }

      console.error('Failed to update meal plan:', error);
    },
    // Retry configuration for mutations
    retry: (failureCount, error) => {
      if (error instanceof MealPlanError && error.isRetryable && failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Helper function to perform optimistic updates safely
  const performOptimisticUpdate = useCallback((
    updateFn: (currentPlan: MealPlan) => MealPlan,
    actionDescription: string
  ) => {
    const currentMealPlan = mealPlan || lastSuccessfulStateRef.current;
    
    if (!currentMealPlan) {
      console.error('No meal plan available for optimistic update');
      toast.error('Please wait for meal plan to load');
      return;
    }

    try {
      const updatedMealPlan = updateFn({
        ...currentMealPlan,
        updatedAt: new Date(),
      });
      
      updateMealPlanMutation.mutate(updatedMealPlan);
    } catch (error) {
      console.error(`Failed to perform ${actionDescription}:`, error);
      toast.error(`Failed to ${actionDescription.toLowerCase()}`);
    }
  }, [mealPlan, updateMealPlanMutation]);

  // Helper function to assign a meal to a slot
  const assignMeal = useCallback(async (dayIndex: number, mealType: MealType, recipe: Recipe, servings: number = recipe.servings) => {
    // If no meal plan exists, refetch to trigger backend creation
    if (!mealPlan && !lastSuccessfulStateRef.current) {
      try {
        await refetch();
      } catch (error) {
        console.error('Failed to get meal plan:', error);
        toast.error('Failed to load meal plan');
        return;
      }
    }

    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    const scheduledDate = new Date(weekStartNormalized);
    scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

    performOptimisticUpdate((currentPlan) => {
      const newMealSlot: MealSlot = {
        id: `${currentPlan.id}-${dayKey}-${mealType}-${Date.now()}`,
        recipeId: recipe.id,
        recipe,
        servings,
        scheduledFor: scheduledDate,
        mealType,
      };

      return {
        ...currentPlan,
        meals: {
          ...currentPlan.meals,
          [dayKey]: {
            ...currentPlan.meals[dayKey],
            [mealType]: newMealSlot,
          },
        },
      };
    }, `Assign ${recipe.name} to ${dayKey} ${mealType}`);
  }, [mealPlan, weekStartNormalized, performOptimisticUpdate, refetch]);

  // Helper function to remove a meal from a slot
  const removeMeal = useCallback((dayIndex: number, mealType: MealType) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];

    performOptimisticUpdate((currentPlan) => ({
      ...currentPlan,
      meals: {
        ...currentPlan.meals,
        [dayKey]: {
          ...currentPlan.meals[dayKey],
          [mealType]: undefined,
        },
      },
    }), `Remove meal from ${dayKey} ${mealType}`);
  }, [performOptimisticUpdate]);

  // Helper function to clear all meals from a specific day
  const clearDay = useCallback((dayIndex: number) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];

    performOptimisticUpdate((currentPlan) => ({
      ...currentPlan,
      meals: {
        ...currentPlan.meals,
        [dayKey]: {
          breakfast: undefined,
          lunch: undefined,
          dinner: undefined,
        },
      },
    }), `Clear all meals from ${dayKey}`);
  }, [performOptimisticUpdate]);

  // Helper function to copy a meal to another slot
  const copyMeal = useCallback((sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => {
    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    performOptimisticUpdate((currentPlan) => {
      const sourceMeal = currentPlan.meals[sourceDayKey]?.[sourceMealType];
      if (!sourceMeal) return currentPlan;

      // Create a new meal slot with updated scheduling
      const targetScheduledDate = new Date(weekStartNormalized);
      targetScheduledDate.setDate(targetScheduledDate.getDate() + targetDayIndex);

      const newMealSlot: MealSlot = {
        id: `${currentPlan.id}-${targetDayKey}-${targetMealType}-${Date.now()}`,
        recipeId: sourceMeal.recipeId,
        recipe: sourceMeal.recipe,
        servings: sourceMeal.servings,
        scheduledFor: targetScheduledDate,
        mealType: targetMealType,
        notes: sourceMeal.notes,
      };

      return {
        ...currentPlan,
        meals: {
          ...currentPlan.meals,
          [targetDayKey]: {
            ...currentPlan.meals[targetDayKey],
            [targetMealType]: newMealSlot,
          },
        },
      };
    }, `Copy meal from ${sourceDayKey} ${sourceMealType} to ${targetDayKey} ${targetMealType}`);
  }, [weekStartNormalized, performOptimisticUpdate]);

  // Helper function to duplicate an entire day
  const duplicateDay = useCallback((sourceDayIndex: number, targetDayIndex: number) => {
    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    performOptimisticUpdate((currentPlan) => {
      const sourceDayMeals = currentPlan.meals[sourceDayKey];
      if (!sourceDayMeals) return currentPlan;

      // Create new meal slots for the target day
      const targetDayMeals: { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot } = {};
      
      (['breakfast', 'lunch', 'dinner'] as const).forEach((mealType) => {
        const sourceMeal = sourceDayMeals[mealType];
        if (sourceMeal) {
          const targetScheduledDate = new Date(weekStartNormalized);
          targetScheduledDate.setDate(targetScheduledDate.getDate() + targetDayIndex);

          targetDayMeals[mealType] = {
            id: `${currentPlan.id}-${targetDayKey}-${mealType}-${Date.now()}`,
            recipeId: sourceMeal.recipeId,
            recipe: sourceMeal.recipe,
            servings: sourceMeal.servings,
            scheduledFor: targetScheduledDate,
            mealType,
            notes: sourceMeal.notes,
          };
        }
      });

      return {
        ...currentPlan,
        meals: {
          ...currentPlan.meals,
          [targetDayKey]: targetDayMeals,
        },
      };
    }, `Duplicate ${sourceDayKey} to ${targetDayKey}`);
  }, [weekStartNormalized, performOptimisticUpdate]);

  // Helper function to duplicate the entire week (useful for meal prep)
  const duplicateWeek = useCallback((targetWeekStart: Date) => {
    // This would typically create a new meal plan for the target week
    // For now, we'll just log the action as it requires more complex state management
    console.log('Duplicate week functionality - would create meal plan for:', targetWeekStart);
    toast.info('Week duplication feature coming soon!');
    // TODO: Implement full week duplication with new meal plan creation
  }, []);

  // Helper function to swap meals between two slots
  const swapMeals = useCallback((
    sourceDayIndex: number, 
    sourceMealType: MealType, 
    targetDayIndex: number, 
    targetMealType: MealType
  ) => {
    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    performOptimisticUpdate((currentPlan) => {
      const sourceMeal = currentPlan.meals[sourceDayKey]?.[sourceMealType];
      const targetMeal = currentPlan.meals[targetDayKey]?.[targetMealType];

      // If source meal doesn't exist, nothing to swap
      if (!sourceMeal) return currentPlan;

      // Create updated meal slots with proper scheduling
      let updatedSourceMeal: MealSlot | undefined;
      let updatedTargetMeal: MealSlot | undefined;

      // If target slot has a meal, move it to source slot
      if (targetMeal) {
        const sourceScheduledDate = new Date(weekStartNormalized);
        sourceScheduledDate.setDate(sourceScheduledDate.getDate() + sourceDayIndex);

        updatedSourceMeal = {
          ...targetMeal,
          id: `${currentPlan.id}-${sourceDayKey}-${sourceMealType}-${Date.now()}`,
          scheduledFor: sourceScheduledDate,
          mealType: sourceMealType,
        };
      }
      // If target slot is empty, clear the source slot
      else {
        updatedSourceMeal = undefined;
      }

      // Move source meal to target slot
      const targetScheduledDate = new Date(weekStartNormalized);
      targetScheduledDate.setDate(targetScheduledDate.getDate() + targetDayIndex);

      updatedTargetMeal = {
        ...sourceMeal,
        id: `${currentPlan.id}-${targetDayKey}-${targetMealType}-${Date.now()}`,
        scheduledFor: targetScheduledDate,
        mealType: targetMealType,
      };

      return {
        ...currentPlan,
        meals: {
          ...currentPlan.meals,
          [sourceDayKey]: {
            ...currentPlan.meals[sourceDayKey],
            [sourceMealType]: updatedSourceMeal,
          },
          [targetDayKey]: {
            ...currentPlan.meals[targetDayKey],
            [targetMealType]: updatedTargetMeal,
          },
        },
      };
    }, `Swap meals between ${sourceDayKey} ${sourceMealType} and ${targetDayKey} ${targetMealType}`);
  }, [weekStartNormalized, performOptimisticUpdate]);

  // Helper function to update serving size
  const updateServings = useCallback((dayIndex: number, mealType: MealType, servings: number) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    
    performOptimisticUpdate((currentPlan) => {
      const currentMeal = currentPlan.meals[dayKey]?.[mealType];
      if (!currentMeal) return currentPlan;

      const updatedMealSlot: MealSlot = {
        ...currentMeal,
        servings,
      };

      return {
        ...currentPlan,
        meals: {
          ...currentPlan.meals,
          [dayKey]: {
            ...currentPlan.meals[dayKey],
            [mealType]: updatedMealSlot,
          },
        },
      };
    }, `Update servings for ${dayKey} ${mealType} to ${servings}`);
  }, [performOptimisticUpdate]);

  return {
    mealPlan,
    isLoading,
    error,
    isUpdating: updateMealPlanMutation.isPending,
    isRetrying: updateMealPlanMutation.failureCount > 0 && updateMealPlanMutation.isPending,
    lastError: updateMealPlanMutation.error,
    assignMeal,
    removeMeal,
    clearDay,
    copyMeal,
    duplicateDay,
    duplicateWeek,
    swapMeals,
    updateServings,
    refetch,
  };
};