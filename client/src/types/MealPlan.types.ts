import { Recipe } from './Recipe.types';

export interface MealPlanItem {
  id: string;
  recipeId: string;
  recipe: Recipe;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings: number;
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  meals: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealPlanData {
  weekStartDate: string;
  meals: {
    recipeId: string;
    dayOfWeek: number;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    servings?: number;
  }[];
}

export interface MealPlanResponse {
  mealPlans: MealPlan[];
}

export interface MealPlanDetailResponse {
  mealPlan: MealPlan;
}