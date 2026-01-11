import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { mealPlanService } from '../services/mealPlanService';
import { MealPlan, MealSlot, MealType } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';
import { useAuth } from './useAuth';

export const useMealPlan = (weekStart: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const weekStartNormalized = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday start
  const weekKey = format(weekStartNormalized, 'yyyy-MM-dd');

  // Query for getting meal plan
  const {
    data: mealPlan,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mealPlan', user?.id, weekKey],
    queryFn: async () => {
      try {
        return await mealPlanService.getMealPlan(user!.id, weekStartNormalized);
      } catch (error: any) {
        // If meal plan doesn't exist (404), return null instead of throwing
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation for updating meal plan
  const updateMealPlanMutation = useMutation({
    mutationFn: (updatedMealPlan: MealPlan) => mealPlanService.updateMealPlan(updatedMealPlan),
    onSuccess: (updatedMealPlan) => {
      // Update the cache with the new data
      queryClient.setQueryData(['mealPlan', user?.id, weekKey], updatedMealPlan);
    },
    onError: (error) => {
      console.error('Failed to update meal plan:', error);
      // Optionally refetch to get the latest data
      refetch();
    },
  });

  // Mutation for creating meal plan
  const createMealPlanMutation = useMutation({
    mutationFn: () => mealPlanService.createMealPlan(user!.id, weekStartNormalized),
    onSuccess: (newMealPlan) => {
      // Update the cache with the new data
      queryClient.setQueryData(['mealPlan', user?.id, weekKey], newMealPlan);
    },
  });

  // Helper function to assign a meal to a slot
  const assignMeal = (dayIndex: number, mealType: MealType, recipe: Recipe, servings: number = recipe.servings) => {
    // If no meal plan exists, create one first
    if (!mealPlan) {
      createMealPlanMutation.mutate();
      return;
    }

    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    const scheduledDate = new Date(weekStartNormalized);
    scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

    const newMealSlot: MealSlot = {
      id: `${mealPlan.id}-${dayKey}-${mealType}-${Date.now()}`,
      recipeId: recipe.id,
      recipe,
      servings,
      scheduledFor: scheduledDate,
      mealType,
    };

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [dayKey]: {
          ...mealPlan.meals[dayKey],
          [mealType]: newMealSlot,
        },
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  // Helper function to remove a meal from a slot
  const removeMeal = (dayIndex: number, mealType: MealType) => {
    if (!mealPlan) return;

    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [dayKey]: {
          ...mealPlan.meals[dayKey],
          [mealType]: undefined,
        },
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  // Helper function to update serving size
  const updateServings = (dayIndex: number, mealType: MealType, servings: number) => {
    if (!mealPlan) return;

    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    const currentMeal = mealPlan.meals[dayKey]?.[mealType];
    
    if (!currentMeal) return;

    const updatedMealSlot: MealSlot = {
      ...currentMeal,
      servings,
    };

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [dayKey]: {
          ...mealPlan.meals[dayKey],
          [mealType]: updatedMealSlot,
        },
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  return {
    mealPlan,
    isLoading,
    error,
    isUpdating: updateMealPlanMutation.isPending,
    isCreating: createMealPlanMutation.isPending,
    assignMeal,
    removeMeal,
    updateServings,
    createMealPlan: createMealPlanMutation.mutate,
    getOrCreateMealPlan: () => {
      if (!mealPlan) {
        createMealPlanMutation.mutate();
      }
      return mealPlan;
    },
    refetch,
  };
};