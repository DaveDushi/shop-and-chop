import { useCallback, useEffect, useRef } from 'react';
import { useMealPlan } from './useMealPlan';
import { useAutoSave } from './useAutoSave';
import { extendedMealPlanService } from '../services/extendedMealPlanService';
import { MealType } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';
import toast from 'react-hot-toast';

export const useMealPlanWithAutoSave = (weekStart: Date) => {
  const baseMealPlan = useMealPlan(weekStart);
  
  // Track if we're currently applying changes to prevent auto-save loops
  const isApplyingChangesRef = useRef(false);
  
  // Auto-save configuration
  const autoSave = useAutoSave({
    debounceMs: 2000, // 2 second debounce
    enabled: !baseMealPlan.isLoading && !!baseMealPlan.mealPlan,
    onSave: async () => {
      // The actual save is handled by the optimistic updates in useMealPlan
      // This is just to track the auto-save status
      if (baseMealPlan.isUpdating) {
        // Wait for the current update to complete
        return new Promise((resolve, reject) => {
          const checkUpdate = () => {
            if (!baseMealPlan.isUpdating) {
              if (baseMealPlan.lastError) {
                reject(baseMealPlan.lastError);
              } else {
                resolve(void 0);
              }
            } else {
              setTimeout(checkUpdate, 100);
            }
          };
          checkUpdate();
        });
      }
    },
    onError: (error) => {
      console.error('Auto-save error:', error);
      // Don't show toast here as the useMealPlan hook already handles error toasts
    },
  });

  // Track when meal plan operations are performed to trigger auto-save
  const triggerAutoSave = useCallback(() => {
    if (!isApplyingChangesRef.current) {
      autoSave.triggerSave();
    }
  }, [autoSave]);

  // Enhanced meal assignment with auto-save
  const assignMeal = useCallback(async (dayIndex: number, mealType: MealType, recipe: Recipe, servings: number = recipe.servings) => {
    isApplyingChangesRef.current = true;
    try {
      await baseMealPlan.assignMeal(dayIndex, mealType, recipe, servings);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced meal removal with auto-save
  const removeMeal = useCallback((dayIndex: number, mealType: MealType) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.removeMeal(dayIndex, mealType);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced clear day with auto-save
  const clearDay = useCallback((dayIndex: number) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.clearDay(dayIndex);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced copy meal with auto-save
  const copyMeal = useCallback((sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.copyMeal(sourceDayIndex, sourceMealType, targetDayIndex, targetMealType);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced duplicate day with auto-save
  const duplicateDay = useCallback((sourceDayIndex: number, targetDayIndex: number) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.duplicateDay(sourceDayIndex, targetDayIndex);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced duplicate week with auto-save
  const duplicateWeek = useCallback((targetWeekStart: Date) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.duplicateWeek(targetWeekStart);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced swap meals with auto-save
  const swapMeals = useCallback((
    sourceDayIndex: number, 
    sourceMealType: MealType, 
    targetDayIndex: number, 
    targetMealType: MealType
  ) => {
    isApplyingChangesRef.current = true;
    try {
      baseMealPlan.swapMeals(sourceDayIndex, sourceMealType, targetDayIndex, targetMealType);
      triggerAutoSave();
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Enhanced update servings with auto-save and manual override support
  const updateServings = useCallback(async (dayIndex: number, mealType: MealType, servings: number, isManualOverride?: boolean) => {
    isApplyingChangesRef.current = true;
    try {
      if (isManualOverride && baseMealPlan.mealPlan) {
        // Handle manual override serving changes using the extended service
        const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
        const meal = baseMealPlan.mealPlan.meals[dayKey]?.[mealType];
        
        if (meal) {
          try {
            await extendedMealPlanService.setManualServingOverride(baseMealPlan.mealPlan.id, meal.recipeId, servings);
            // Update the local state optimistically
            baseMealPlan.updateServings(dayIndex, mealType, servings);
            triggerAutoSave();
          } catch (error) {
            console.error('Failed to set manual serving override:', error);
            toast.error('Failed to update serving size');
          }
        }
      } else {
        // Handle regular serving changes
        baseMealPlan.updateServings(dayIndex, mealType, servings);
        triggerAutoSave();
      }
    } finally {
      isApplyingChangesRef.current = false;
    }
  }, [baseMealPlan, triggerAutoSave]);

  // Manual save function
  const forceSave = useCallback(async () => {
    try {
      await autoSave.forceSave();
      toast.success('Meal plan saved manually', {
        duration: 2000,
        position: 'bottom-right',
      });
    } catch (error) {
      toast.error('Failed to save meal plan');
    }
  }, [autoSave]);

  // Offline state persistence
  useEffect(() => {
    if (!autoSave.isOnline && baseMealPlan.mealPlan) {
      // Store meal plan in localStorage when offline
      try {
        const mealPlanData = {
          ...baseMealPlan.mealPlan,
          // Convert dates to strings for storage
          weekStartDate: baseMealPlan.mealPlan.weekStartDate.toISOString(),
          createdAt: baseMealPlan.mealPlan.createdAt.toISOString(),
          updatedAt: baseMealPlan.mealPlan.updatedAt.toISOString(),
        };
        localStorage.setItem(`mealPlan_${baseMealPlan.mealPlan.id}`, JSON.stringify(mealPlanData));
      } catch (error) {
        console.warn('Failed to store meal plan offline:', error);
      }
    }
  }, [baseMealPlan.mealPlan, autoSave.isOnline]);

  // Restore from offline storage when coming back online
  useEffect(() => {
    if (autoSave.isOnline && baseMealPlan.mealPlan) {
      try {
        const storedData = localStorage.getItem(`mealPlan_${baseMealPlan.mealPlan.id}`);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const storedUpdatedAt = new Date(parsedData.updatedAt);
          const currentUpdatedAt = baseMealPlan.mealPlan.updatedAt;
          
          // If stored data is newer, we might have offline changes
          if (storedUpdatedAt > currentUpdatedAt) {
            toast.success('Offline changes detected. Syncing...', {
              duration: 3000,
              position: 'bottom-right',
            });
            // Trigger a save to sync offline changes
            autoSave.forceSave();
          }
          
          // Clean up stored data
          localStorage.removeItem(`mealPlan_${baseMealPlan.mealPlan.id}`);
        }
      } catch (error) {
        console.warn('Failed to restore offline meal plan:', error);
      }
    }
  }, [autoSave.isOnline, baseMealPlan.mealPlan, autoSave]);

  return {
    // All base meal plan functionality
    ...baseMealPlan,
    
    // Enhanced operations with auto-save
    assignMeal,
    removeMeal,
    clearDay,
    copyMeal,
    duplicateDay,
    duplicateWeek,
    swapMeals,
    updateServings,
    
    // Auto-save functionality
    autoSaveStatus: autoSave.status,
    isOnline: autoSave.isOnline,
    forceSave,
    clearAutoSaveError: autoSave.clearError,
    
    // Combined save status
    isSaving: baseMealPlan.isUpdating || autoSave.status.status === 'saving',
    hasUnsavedChanges: autoSave.status.pendingChanges || baseMealPlan.isUpdating,
    lastSaved: autoSave.status.lastSaved || baseMealPlan.mealPlan?.updatedAt || null,
  };
};