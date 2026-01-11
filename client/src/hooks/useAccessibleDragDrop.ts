import { useEffect, useState, useCallback } from 'react';
import { Recipe } from '../types/Recipe.types';
import { MealType } from '../types/MealPlan.types';

interface AccessibleDragDropConfig {
  onMealAssign?: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove?: (dayIndex: number, mealType: MealType) => void;
  onMealSwap?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  enabled?: boolean;
}

interface FocusableSlot {
  dayIndex: number;
  mealType: MealType;
  element: HTMLElement;
}

export const useAccessibleDragDrop = ({
  onMealAssign,
  onMealRemove,
  onMealSwap,
  enabled = true,
}: AccessibleDragDropConfig) => {
  const [focusedSlot, setFocusedSlot] = useState<FocusableSlot | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [isInKeyboardMode, setIsInKeyboardMode] = useState(false);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Get all focusable meal slots
  const getFocusableSlots = useCallback((): FocusableSlot[] => {
    const slots: FocusableSlot[] = [];
    const mealSlots = document.querySelectorAll('[data-meal-slot]');
    
    mealSlots.forEach((element) => {
      const dayIndex = parseInt(element.getAttribute('data-day-index') || '0');
      const mealType = element.getAttribute('data-meal-type') as MealType;
      
      if (mealType && element instanceof HTMLElement) {
        slots.push({ dayIndex, mealType, element });
      }
    });
    
    return slots.sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      const mealOrder = { breakfast: 0, lunch: 1, dinner: 2 };
      return mealOrder[a.mealType] - mealOrder[b.mealType];
    });
  }, []);

  // Navigate between meal slots
  const navigateSlots = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const slots = getFocusableSlots();
    if (slots.length === 0) return;

    let currentIndex = focusedSlot 
      ? slots.findIndex(slot => 
          slot.dayIndex === focusedSlot.dayIndex && 
          slot.mealType === focusedSlot.mealType
        )
      : -1;

    let nextIndex = currentIndex;

    switch (direction) {
      case 'up':
        // Move to previous meal type in same day
        if (currentIndex > 0 && slots[currentIndex - 1].dayIndex === slots[currentIndex].dayIndex) {
          nextIndex = currentIndex - 1;
        }
        break;
      case 'down':
        // Move to next meal type in same day
        if (currentIndex < slots.length - 1 && slots[currentIndex + 1].dayIndex === slots[currentIndex].dayIndex) {
          nextIndex = currentIndex + 1;
        }
        break;
      case 'left':
        // Move to same meal type in previous day
        const currentMealType = slots[currentIndex]?.mealType;
        for (let i = currentIndex - 1; i >= 0; i--) {
          if (slots[i].mealType === currentMealType) {
            nextIndex = i;
            break;
          }
        }
        break;
      case 'right':
        // Move to same meal type in next day
        const targetMealType = slots[currentIndex]?.mealType;
        for (let i = currentIndex + 1; i < slots.length; i++) {
          if (slots[i].mealType === targetMealType) {
            nextIndex = i;
            break;
          }
        }
        break;
    }

    if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < slots.length) {
      const nextSlot = slots[nextIndex];
      setFocusedSlot(nextSlot);
      nextSlot.element.focus();
      
      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][nextSlot.dayIndex];
      const mealName = nextSlot.mealType.charAt(0).toUpperCase() + nextSlot.mealType.slice(1);
      announce(`Focused on ${dayName} ${mealName}`);
    }
  }, [focusedSlot, getFocusableSlots, announce]);

  // Handle keyboard interactions
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

      if (isInputField) return;

      // Enable keyboard mode on first keyboard interaction
      if (!isInKeyboardMode) {
        setIsInKeyboardMode(true);
      }

      // Navigation keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        
        switch (event.key) {
          case 'ArrowUp':
            navigateSlots('up');
            break;
          case 'ArrowDown':
            navigateSlots('down');
            break;
          case 'ArrowLeft':
            navigateSlots('left');
            break;
          case 'ArrowRight':
            navigateSlots('right');
            break;
        }
        return;
      }

      // Enter key - select recipe or assign meal
      if (event.key === 'Enter' && focusedSlot) {
        event.preventDefault();
        
        if (selectedRecipe && onMealAssign) {
          onMealAssign(focusedSlot.dayIndex, focusedSlot.mealType, selectedRecipe);
          setSelectedRecipe(null);
          announce(`Assigned ${selectedRecipe.name} to ${focusedSlot.mealType}`);
        } else {
          // Open recipe selection modal
          const addButton = focusedSlot.element.querySelector('[data-add-meal-button]') as HTMLElement;
          if (addButton) {
            addButton.click();
          }
        }
        return;
      }

      // Delete key - remove meal
      if (event.key === 'Delete' && focusedSlot && onMealRemove) {
        event.preventDefault();
        onMealRemove(focusedSlot.dayIndex, focusedSlot.mealType);
        announce(`Removed meal from ${focusedSlot.mealType}`);
        return;
      }

      // Space key - select/deselect meal for moving
      if (event.key === ' ' && focusedSlot) {
        event.preventDefault();
        
        if (selectedMeal) {
          // Move meal to current slot
          if (onMealSwap && 
              (selectedMeal.dayIndex !== focusedSlot.dayIndex || 
               selectedMeal.mealType !== focusedSlot.mealType)) {
            onMealSwap(
              selectedMeal.dayIndex, 
              selectedMeal.mealType, 
              focusedSlot.dayIndex, 
              focusedSlot.mealType
            );
            announce(`Moved meal to ${focusedSlot.mealType}`);
          }
          setSelectedMeal(null);
        } else {
          // Select current meal for moving
          const hasMeal = focusedSlot.element.querySelector('[data-meal-card]');
          if (hasMeal) {
            setSelectedMeal({ dayIndex: focusedSlot.dayIndex, mealType: focusedSlot.mealType });
            announce(`Selected meal for moving. Use arrow keys to navigate and space to place.`);
          }
        }
        return;
      }

      // Escape key - cancel selection
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedRecipe(null);
        setSelectedMeal(null);
        announce('Selection cancelled');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, focusedSlot, selectedRecipe, selectedMeal, isInKeyboardMode, navigateSlots, onMealAssign, onMealRemove, onMealSwap, announce]);

  // Handle mouse interactions to disable keyboard mode
  useEffect(() => {
    const handleMouseDown = () => {
      if (isInKeyboardMode) {
        setIsInKeyboardMode(false);
        setFocusedSlot(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isInKeyboardMode]);

  return {
    focusedSlot,
    selectedRecipe,
    selectedMeal,
    isInKeyboardMode,
    setSelectedRecipe,
    announce,
  };
};