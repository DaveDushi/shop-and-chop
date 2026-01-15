import { useState, useCallback } from 'react';
import { Recipe } from '../types/Recipe.types';
import { MealType } from '../types/MealPlan.types';
import { useMealPlan } from './useMealPlan';
import { startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

export interface UseAddToMealPlanReturn {
  isModalOpen: boolean;
  selectedRecipe: Recipe | null;
  openModal: (recipe: Recipe) => void;
  closeModal: () => void;
  addToMealPlan: (dayIndex: number, mealType: MealType, servings: number) => Promise<void>;
  isAdding: boolean;
}

export const useAddToMealPlan = (): UseAddToMealPlanReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Get current week's meal plan
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { assignMeal, isUpdating } = useMealPlan(weekStart);

  const openModal = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isAdding && !isUpdating) {
      setIsModalOpen(false);
      // Delay clearing the recipe to allow modal animation to complete
      setTimeout(() => setSelectedRecipe(null), 300);
    }
  }, [isAdding, isUpdating]);

  const addToMealPlan = useCallback(
    async (dayIndex: number, mealType: MealType, servings: number) => {
      if (!selectedRecipe) {
        throw new Error('No recipe selected');
      }

      setIsAdding(true);

      try {
        await assignMeal(dayIndex, mealType, selectedRecipe, servings);
        
        toast.success(
          `${selectedRecipe.name || selectedRecipe.title} added to meal plan!`,
          {
            duration: 3000,
            position: 'bottom-right',
            icon: '✅',
          }
        );
      } catch (error) {
        console.error('Failed to add recipe to meal plan:', error);
        toast.error('Failed to add recipe to meal plan. Please try again.', {
          duration: 4000,
          position: 'bottom-right',
        });
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    [selectedRecipe, assignMeal]
  );

  return {
    isModalOpen,
    selectedRecipe,
    openModal,
    closeModal,
    addToMealPlan,
    isAdding: isAdding || isUpdating,
  };
};
