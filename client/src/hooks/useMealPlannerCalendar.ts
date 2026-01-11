import { useCallback } from 'react';
import { useCalendarState } from './useCalendarState';
import { useMealPlan } from './useMealPlan';
import { useRecipes } from './useRecipes';
import { MealType } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';

export const useMealPlannerCalendar = () => {
  const calendarState = useCalendarState();
  const mealPlan = useMealPlan(calendarState.currentWeek);
  
  // Default recipe search (can be customized later)
  const recipes = useRecipes('', {});

  // Enhanced meal assignment with UI state management
  const handleMealAssign = useCallback((dayIndex: number, mealType: MealType, recipe: Recipe, servings?: number) => {
    mealPlan.assignMeal(dayIndex, mealType, recipe, servings);
    calendarState.clearMealSlotSelection();
  }, [mealPlan, calendarState]);

  // Enhanced meal removal with UI state management
  const handleMealRemove = useCallback((dayIndex: number, mealType: MealType) => {
    mealPlan.removeMeal(dayIndex, mealType);
    calendarState.clearMealSlotSelection();
  }, [mealPlan, calendarState]);

  // Handle recipe card clicks
  const handleRecipeClick = useCallback((recipe: Recipe) => {
    calendarState.openRecipeModal(recipe);
  }, [calendarState]);

  // Handle meal slot clicks
  const handleMealSlotClick = useCallback((dayIndex: number, mealType: MealType) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    const meal = mealPlan.mealPlan?.meals[dayKey]?.[mealType];
    
    if (meal) {
      // If there's a meal, open the recipe modal
      calendarState.openRecipeModal(meal.recipe);
    } else {
      // If empty slot, select it for potential assignment
      calendarState.selectMealSlot(dayIndex, mealType);
    }
  }, [mealPlan.mealPlan, calendarState]);

  // Auto-save status
  const isDirty = mealPlan.isUpdating;
  const lastSaved = mealPlan.mealPlan?.updatedAt || null;

  return {
    // Calendar state and navigation
    currentWeek: calendarState.currentWeek,
    goToPreviousWeek: calendarState.goToPreviousWeek,
    goToNextWeek: calendarState.goToNextWeek,
    goToCurrentWeek: calendarState.goToCurrentWeek,
    goToWeek: calendarState.goToWeek,

    // Meal plan data and operations
    mealPlan: mealPlan.mealPlan,
    isLoading: mealPlan.isLoading,
    error: mealPlan.error,
    isUpdating: mealPlan.isUpdating,
    assignMeal: handleMealAssign,
    removeMeal: handleMealRemove,
    updateServings: mealPlan.updateServings,
    createMealPlan: mealPlan.createMealPlan,

    // Recipe data
    recipes: recipes.data || [],
    recipesLoading: recipes.isLoading,
    recipesError: recipes.error,

    // UI state
    uiState: calendarState.uiState,
    toggleSidebar: calendarState.toggleSidebar,
    openRecipeModal: calendarState.openRecipeModal,
    closeRecipeModal: calendarState.closeRecipeModal,
    
    // Event handlers
    handleRecipeClick,
    handleMealSlotClick,

    // Drag and drop state
    startDrag: calendarState.startDrag,
    endDrag: calendarState.endDrag,
    setDropTarget: calendarState.setDropTarget,
    setDragPreview: calendarState.setDragPreview,

    // Auto-save status
    isDirty,
    lastSaved,
  };
};