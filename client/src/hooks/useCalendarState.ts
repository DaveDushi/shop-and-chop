import { useState, useCallback } from 'react';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { UIState, DragState } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';

export const useCalendarState = () => {
  // Calendar state
  const [currentWeek, setCurrentWeek] = useState<Date>(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );

  // UI state
  const [uiState, setUIState] = useState<UIState>({
    sidebarCollapsed: false,
    showRecipeModal: false,
    dragState: {
      isDragging: false,
    },
  });

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setCurrentWeek(startOfWeek(date, { weekStartsOn: 1 }));
  }, []);

  // UI state management
  const toggleSidebar = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const openRecipeModal = useCallback((recipe: Recipe) => {
    setUIState(prev => ({
      ...prev,
      showRecipeModal: true,
      selectedRecipe: recipe,
    }));
  }, []);

  const closeRecipeModal = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      showRecipeModal: false,
      selectedRecipe: undefined,
    }));
  }, []);

  const selectMealSlot = useCallback((dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setUIState(prev => ({
      ...prev,
      selectedMealSlot: { dayIndex, mealType },
    }));
  }, []);

  const clearMealSlotSelection = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      selectedMealSlot: undefined,
    }));
  }, []);

  // Drag state management
  const updateDragState = useCallback((dragState: Partial<DragState>) => {
    setUIState(prev => ({
      ...prev,
      dragState: {
        ...prev.dragState,
        ...dragState,
      },
    }));
  }, []);

  const startDrag = useCallback((draggedItem: DragState['draggedItem']) => {
    updateDragState({
      isDragging: true,
      draggedItem,
    });
  }, [updateDragState]);

  const endDrag = useCallback(() => {
    updateDragState({
      isDragging: false,
      draggedItem: undefined,
      dropTarget: undefined,
      dragPreview: undefined,
    });
  }, [updateDragState]);

  const setDropTarget = useCallback((dropTarget: DragState['dropTarget']) => {
    updateDragState({ dropTarget });
  }, [updateDragState]);

  const setDragPreview = useCallback((dragPreview: DragState['dragPreview']) => {
    updateDragState({ dragPreview });
  }, [updateDragState]);

  return {
    // Calendar state
    currentWeek,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeek,
    
    // UI state
    uiState,
    toggleSidebar,
    openRecipeModal,
    closeRecipeModal,
    selectMealSlot,
    clearMealSlotSelection,
    
    // Drag state
    startDrag,
    endDrag,
    setDropTarget,
    setDragPreview,
    updateDragState,
  };
};