import { useCallback, useEffect, useRef } from 'react';
import { useMealPlan } from './useMealPlan';
import { useUndoRedo } from './useUndoRedo';
import { MealType } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';

export const useMealPlanWithHistory = (weekStart: Date) => {
  const baseMealPlan = useMealPlan(weekStart);
  const undoRedo = useUndoRedo(50); // Keep 50 states in history
  
  // Track if we're currently applying an undo/redo operation to prevent infinite loops
  const isApplyingHistoryChange = useRef(false);
  
  // Initialize history when meal plan is first loaded
  useEffect(() => {
    if (baseMealPlan.mealPlan && !isApplyingHistoryChange.current) {
      undoRedo.initializeHistory(baseMealPlan.mealPlan);
    }
  }, [baseMealPlan.mealPlan, undoRedo]);

  // Helper function to save state to history before making changes
  const saveStateToHistory = useCallback((action: string) => {
    if (baseMealPlan.mealPlan && !isApplyingHistoryChange.current) {
      undoRedo.pushState(baseMealPlan.mealPlan, action);
    }
  }, [baseMealPlan.mealPlan, undoRedo]);

  // Enhanced meal assignment with history tracking
  const assignMeal = useCallback((dayIndex: number, mealType: MealType, recipe: Recipe, servings: number = recipe.servings) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
    saveStateToHistory(`Assign ${recipe.name} to ${dayName} ${mealType}`);
    baseMealPlan.assignMeal(dayIndex, mealType, recipe, servings);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced meal removal with history tracking
  const removeMeal = useCallback((dayIndex: number, mealType: MealType) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
    saveStateToHistory(`Remove meal from ${dayName} ${mealType}`);
    baseMealPlan.removeMeal(dayIndex, mealType);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced clear day with history tracking
  const clearDay = useCallback((dayIndex: number) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
    saveStateToHistory(`Clear all meals from ${dayName}`);
    baseMealPlan.clearDay(dayIndex);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced copy meal with history tracking
  const copyMeal = useCallback((sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => {
    const sourceDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][sourceDayIndex];
    const targetDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][targetDayIndex];
    saveStateToHistory(`Copy meal from ${sourceDayName} ${sourceMealType} to ${targetDayName} ${targetMealType}`);
    baseMealPlan.copyMeal(sourceDayIndex, sourceMealType, targetDayIndex, targetMealType);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced duplicate day with history tracking
  const duplicateDay = useCallback((sourceDayIndex: number, targetDayIndex: number) => {
    const sourceDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][sourceDayIndex];
    const targetDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][targetDayIndex];
    saveStateToHistory(`Duplicate ${sourceDayName} to ${targetDayName}`);
    baseMealPlan.duplicateDay(sourceDayIndex, targetDayIndex);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced duplicate week with history tracking
  const duplicateWeek = useCallback((targetWeekStart: Date) => {
    saveStateToHistory(`Duplicate week to ${targetWeekStart.toDateString()}`);
    baseMealPlan.duplicateWeek(targetWeekStart);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced swap meals with history tracking
  const swapMeals = useCallback((
    sourceDayIndex: number, 
    sourceMealType: MealType, 
    targetDayIndex: number, 
    targetMealType: MealType
  ) => {
    const sourceDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][sourceDayIndex];
    const targetDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][targetDayIndex];
    saveStateToHistory(`Swap meals between ${sourceDayName} ${sourceMealType} and ${targetDayName} ${targetMealType}`);
    baseMealPlan.swapMeals(sourceDayIndex, sourceMealType, targetDayIndex, targetMealType);
  }, [baseMealPlan, saveStateToHistory]);

  // Enhanced update servings with history tracking
  const updateServings = useCallback((dayIndex: number, mealType: MealType, servings: number) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
    saveStateToHistory(`Update servings for ${dayName} ${mealType} to ${servings}`);
    baseMealPlan.updateServings(dayIndex, mealType, servings);
  }, [baseMealPlan, saveStateToHistory]);

  // Undo operation
  const undo = useCallback(() => {
    const previousState = undoRedo.undo();
    if (previousState && previousState.mealPlan) {
      isApplyingHistoryChange.current = true;
      
      // We need to create a custom update function that bypasses history tracking
      // Since we don't have direct access to the mutation, we'll need to use the service directly
      import('../services/mealPlanService').then(({ mealPlanService }) => {
        mealPlanService.updateMealPlan(previousState.mealPlan)
          .then(() => {
            // Trigger a refetch to update the UI
            baseMealPlan.refetch();
          })
          .catch((error) => {
            console.error('Failed to apply undo:', error);
          })
          .finally(() => {
            setTimeout(() => {
              isApplyingHistoryChange.current = false;
            }, 100);
          });
      });
    }
  }, [undoRedo, baseMealPlan.refetch]);

  // Redo operation
  const redo = useCallback(() => {
    const nextState = undoRedo.redo();
    if (nextState && nextState.mealPlan) {
      isApplyingHistoryChange.current = true;
      
      // We need to create a custom update function that bypasses history tracking
      import('../services/mealPlanService').then(({ mealPlanService }) => {
        mealPlanService.updateMealPlan(nextState.mealPlan)
          .then(() => {
            // Trigger a refetch to update the UI
            baseMealPlan.refetch();
          })
          .catch((error) => {
            console.error('Failed to apply redo:', error);
          })
          .finally(() => {
            setTimeout(() => {
              isApplyingHistoryChange.current = false;
            }, 100);
          });
      });
    }
  }, [undoRedo, baseMealPlan.refetch]);

  // Get the current action description for UI display
  const getCurrentActionDescription = useCallback(() => {
    const currentState = undoRedo.getCurrentState();
    return currentState?.action || '';
  }, [undoRedo]);

  // Get the previous action description for undo button
  const getPreviousActionDescription = useCallback(() => {
    if (undoRedo.currentIndex > 0) {
      const previousState = undoRedo.getHistorySummary()[undoRedo.currentIndex - 1];
      return previousState?.action || '';
    }
    return '';
  }, [undoRedo]);

  // Get the next action description for redo button
  const getNextActionDescription = useCallback(() => {
    if (undoRedo.currentIndex < undoRedo.historyLength - 1) {
      const nextState = undoRedo.getHistorySummary()[undoRedo.currentIndex + 1];
      return nextState?.action || '';
    }
    return '';
  }, [undoRedo]);

  return {
    // All base meal plan functionality
    ...baseMealPlan,
    
    // Enhanced operations with history tracking
    assignMeal,
    removeMeal,
    clearDay,
    copyMeal,
    duplicateDay,
    duplicateWeek,
    swapMeals,
    updateServings,
    
    // Undo/Redo functionality
    undo,
    redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    
    // History information for UI
    getCurrentActionDescription,
    getPreviousActionDescription,
    getNextActionDescription,
    historyLength: undoRedo.historyLength,
    currentHistoryIndex: undoRedo.currentIndex,
    
    // Debug helpers
    getHistorySummary: undoRedo.getHistorySummary,
    clearHistory: undoRedo.clearHistory,
  };
};