import { describe, it, expect } from 'vitest';
import { MealPlan } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';

// Mock recipe data
const mockRecipe: Recipe = {
  id: 'recipe-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  difficulty: 'Easy',
  dietaryTags: ['vegetarian'],
  ingredients: [
    { id: '1', name: 'Test Ingredient', quantity: '1', unit: 'cup', category: 'produce' }
  ],
  instructions: ['Test instruction'],
  createdBy: 'test-user',
};

describe('MealPlan Service Data Transformation', () => {
  it('should transform frontend meal plan format to backend format', () => {
    // Create a mock meal plan in frontend format
    const frontendMealPlan: MealPlan = {
      id: 'meal-plan-1',
      userId: 'user-1',
      weekStartDate: new Date('2024-01-01'),
      meals: {
        monday: {
          breakfast: {
            id: 'meal-1',
            recipeId: 'recipe-1',
            recipe: mockRecipe,
            servings: 2,
            scheduledFor: new Date('2024-01-01T08:00:00Z'),
            mealType: 'breakfast',
          },
        },
        wednesday: {
          lunch: {
            id: 'meal-2',
            recipeId: 'recipe-1',
            recipe: mockRecipe,
            servings: 4,
            scheduledFor: new Date('2024-01-03T12:00:00Z'),
            mealType: 'lunch',
          },
        },
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    // Transform to backend format (simulate the transformation logic)
    const mealsArray: any[] = [];
    
    Object.entries(frontendMealPlan.meals).forEach(([dayKey, dayMeals]) => {
      const dayMapping: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      
      const dayOfWeek = dayMapping[dayKey];
      
      Object.entries(dayMeals).forEach(([mealType, meal]) => {
        if (meal) {
          mealsArray.push({
            recipeId: meal.recipeId,
            dayOfWeek,
            mealType,
            servings: meal.servings,
          });
        }
      });
    });

    const backendFormat = {
      weekStartDate: frontendMealPlan.weekStartDate.toISOString(),
      meals: mealsArray,
    };

    // Verify the transformation
    expect(backendFormat.meals).toHaveLength(2);
    expect(backendFormat.meals[0]).toEqual({
      recipeId: 'recipe-1',
      dayOfWeek: 1, // Monday
      mealType: 'breakfast',
      servings: 2,
    });
    expect(backendFormat.meals[1]).toEqual({
      recipeId: 'recipe-1',
      dayOfWeek: 3, // Wednesday
      mealType: 'lunch',
      servings: 4,
    });
    expect(backendFormat.weekStartDate).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle empty meals object', () => {
    const frontendMealPlan: MealPlan = {
      id: 'meal-plan-1',
      userId: 'user-1',
      weekStartDate: new Date('2024-01-01'),
      meals: {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        saturday: {},
        sunday: {},
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    // Transform to backend format
    const mealsArray: any[] = [];
    
    Object.entries(frontendMealPlan.meals).forEach(([dayKey, dayMeals]) => {
      const dayMapping: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      
      const dayOfWeek = dayMapping[dayKey];
      
      Object.entries(dayMeals).forEach(([mealType, meal]) => {
        if (meal) {
          mealsArray.push({
            recipeId: meal.recipeId,
            dayOfWeek,
            mealType,
            servings: meal.servings,
          });
        }
      });
    });

    expect(mealsArray).toHaveLength(0);
  });
});