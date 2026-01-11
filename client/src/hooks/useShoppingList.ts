import { useState, useCallback } from 'react';
import { MealPlan } from '../types/MealPlan.types';
import { ShoppingList } from '../types/ShoppingList.types';
import { ShoppingListService } from '../services/shoppingListService';
import { ShoppingListApiService } from '../services/shoppingListApiService';

interface UseShoppingListOptions {
  householdSize?: number;
  useApiGeneration?: boolean; // Whether to use API or client-side generation
}

interface UseShoppingListReturn {
  shoppingList: ShoppingList | null;
  isGenerating: boolean;
  error: string | null;
  generateShoppingList: (mealPlan: MealPlan) => void;
  generateFromApi: (mealPlanId: string) => void;
  clearShoppingList: () => void;
  clearError: () => void;
  saveToShoppingList: (shoppingList: ShoppingList) => Promise<void>;
}

export const useShoppingList = (options: UseShoppingListOptions = {}): UseShoppingListReturn => {
  const { householdSize = 2, useApiGeneration = false } = options;
  
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShoppingList = useCallback((mealPlan: MealPlan) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Check if meal plan has any meals
      const hasMeals = Object.values(mealPlan.meals).some(dayMeals => 
        Object.values(dayMeals).some(mealSlot => mealSlot !== undefined)
      );

      if (!hasMeals) {
        throw new Error('No meals found in the meal plan. Add some meals to generate a shopping list.');
      }

      // Generate shopping list
      const generatedList = ShoppingListService.generateFromMealPlan(mealPlan, householdSize);

      if (ShoppingListService.isEmpty(generatedList)) {
        throw new Error('Unable to generate shopping list. Please ensure your recipes have ingredients.');
      }

      setShoppingList(generatedList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate shopping list';
      setError(errorMessage);
      console.error('Shopping list generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [householdSize]);

  const generateFromApi = useCallback(async (mealPlanId: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await ShoppingListApiService.generateFromMealPlan(mealPlanId);
      setShoppingList(response.shoppingList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate shopping list from server';
      setError(errorMessage);
      console.error('API shopping list generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const saveToShoppingList = useCallback(async (shoppingList: ShoppingList) => {
    try {
      await ShoppingListApiService.saveShoppingList(shoppingList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save shopping list';
      throw new Error(errorMessage);
    }
  }, []);

  const clearShoppingList = useCallback(() => {
    setShoppingList(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    shoppingList,
    isGenerating,
    error,
    generateShoppingList,
    generateFromApi,
    clearShoppingList,
    clearError,
    saveToShoppingList
  };
};