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
      return await mealPlanService.getMealPlan(user!.id, weekStartNormalized);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation for updating meal plan
  const updateMealPlanMutation = useMutation({
    mutationFn: (updatedMealPlan: MealPlan) => mealPlanService.updateMealPlan(updatedMealPlan),
    onSuccess: (updatedMealPlan) => {
      // Update the cache with the new data (use the ID from the response)
      queryClient.setQueryData(['mealPlan', user?.id, weekKey], updatedMealPlan);
    },
    onError: (error) => {
      console.error('Failed to update meal plan:', error);
      // Refetch to get the latest data and sync the cache
      refetch();
    },
  });

  // Helper function to assign a meal to a slot
  const assignMeal = async (dayIndex: number, mealType: MealType, recipe: Recipe, servings: number = recipe.servings) => {
    // Check if the same recipe is already assigned to this slot
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
    const existingMeal = mealPlan?.meals[dayKey]?.[mealType];
    if (existingMeal && existingMeal.recipeId === recipe.id) {
      // Allow duplicates but show a confirmation
      const shouldReplace = window.confirm(
        `"${recipe.title}" is already planned for ${dayKey} ${mealType}. Do you want to replace it?`
      );
      if (!shouldReplace) {
        return;
      }
    }

    // If no meal plan exists, refetch to trigger backend creation
    if (!mealPlan) {
      try {
        const { data: newMealPlan } = await refetch();
        if (!newMealPlan) {
          console.error('Failed to get or create meal plan');
          return;
        }
      } catch (error) {
        console.error('Failed to get meal plan:', error);
        return;
      }
    }

    const currentMealPlan = mealPlan || queryClient.getQueryData(['mealPlan', user?.id, weekKey]) as MealPlan;
    if (!currentMealPlan) {
      console.error('No meal plan available after refetch');
      return;
    }

    const scheduledDate = new Date(weekStartNormalized);
    scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

    const newMealSlot: MealSlot = {
      id: `${currentMealPlan.id}-${dayKey}-${mealType}-${Date.now()}`,
      recipeId: recipe.id,
      recipe,
      servings,
      scheduledFor: scheduledDate,
      mealType,
    };

    const updatedMealPlan: MealPlan = {
      ...currentMealPlan,
      meals: {
        ...currentMealPlan.meals,
        [dayKey]: {
          ...currentMealPlan.meals[dayKey],
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

  // Helper function to clear all meals from a specific day
  const clearDay = (dayIndex: number) => {
    if (!mealPlan) return;

    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [dayKey]: {
          breakfast: undefined,
          lunch: undefined,
          dinner: undefined,
        },
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  // Helper function to copy a meal to another slot
  const copyMeal = (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => {
    if (!mealPlan) return;

    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    const sourceMeal = mealPlan.meals[sourceDayKey]?.[sourceMealType];
    if (!sourceMeal) return;

    // Create a new meal slot with updated scheduling
    const targetScheduledDate = new Date(weekStartNormalized);
    targetScheduledDate.setDate(targetScheduledDate.getDate() + targetDayIndex);

    const newMealSlot: MealSlot = {
      id: `${mealPlan.id}-${targetDayKey}-${targetMealType}-${Date.now()}`,
      recipeId: sourceMeal.recipeId,
      recipe: sourceMeal.recipe,
      servings: sourceMeal.servings,
      scheduledFor: targetScheduledDate,
      mealType: targetMealType,
      notes: sourceMeal.notes,
    };

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [targetDayKey]: {
          ...mealPlan.meals[targetDayKey],
          [targetMealType]: newMealSlot,
        },
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  // Helper function to duplicate an entire day
  const duplicateDay = (sourceDayIndex: number, targetDayIndex: number) => {
    if (!mealPlan) return;

    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    const sourceDayMeals = mealPlan.meals[sourceDayKey];
    if (!sourceDayMeals) return;

    // Create new meal slots for the target day
    const targetDayMeals: { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot } = {};
    
    (['breakfast', 'lunch', 'dinner'] as const).forEach((mealType) => {
      const sourceMeal = sourceDayMeals[mealType];
      if (sourceMeal) {
        const targetScheduledDate = new Date(weekStartNormalized);
        targetScheduledDate.setDate(targetScheduledDate.getDate() + targetDayIndex);

        targetDayMeals[mealType] = {
          id: `${mealPlan.id}-${targetDayKey}-${mealType}-${Date.now()}`,
          recipeId: sourceMeal.recipeId,
          recipe: sourceMeal.recipe,
          servings: sourceMeal.servings,
          scheduledFor: targetScheduledDate,
          mealType,
          notes: sourceMeal.notes,
        };
      }
    });

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [targetDayKey]: targetDayMeals,
      },
      updatedAt: new Date(),
    };

    updateMealPlanMutation.mutate(updatedMealPlan);
  };

  // Helper function to duplicate the entire week (useful for meal prep)
  const duplicateWeek = (targetWeekStart: Date) => {
    if (!mealPlan) return;

    // This would typically create a new meal plan for the target week
    // For now, we'll just log the action as it requires more complex state management
    console.log('Duplicate week functionality - would create meal plan for:', targetWeekStart);
    // TODO: Implement full week duplication with new meal plan creation
  };

  // Helper function to swap meals between two slots
  const swapMeals = (
    sourceDayIndex: number, 
    sourceMealType: MealType, 
    targetDayIndex: number, 
    targetMealType: MealType
  ) => {
    if (!mealPlan) return;

    const sourceDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][sourceDayIndex];
    const targetDayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][targetDayIndex];
    
    const sourceMeal = mealPlan.meals[sourceDayKey]?.[sourceMealType];
    const targetMeal = mealPlan.meals[targetDayKey]?.[targetMealType];

    // If source meal doesn't exist, nothing to swap
    if (!sourceMeal) return;

    // Create updated meal slots with proper scheduling
    let updatedSourceMeal: MealSlot | undefined;
    let updatedTargetMeal: MealSlot | undefined;

    // If target slot has a meal, move it to source slot
    if (targetMeal) {
      const sourceScheduledDate = new Date(weekStartNormalized);
      sourceScheduledDate.setDate(sourceScheduledDate.getDate() + sourceDayIndex);

      updatedSourceMeal = {
        ...targetMeal,
        id: `${mealPlan.id}-${sourceDayKey}-${sourceMealType}-${Date.now()}`,
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
      id: `${mealPlan.id}-${targetDayKey}-${targetMealType}-${Date.now()}`,
      scheduledFor: targetScheduledDate,
      mealType: targetMealType,
    };

    const updatedMealPlan: MealPlan = {
      ...mealPlan,
      meals: {
        ...mealPlan.meals,
        [sourceDayKey]: {
          ...mealPlan.meals[sourceDayKey],
          [sourceMealType]: updatedSourceMeal,
        },
        [targetDayKey]: {
          ...mealPlan.meals[targetDayKey],
          [targetMealType]: updatedTargetMeal,
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