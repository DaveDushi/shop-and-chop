import api from './api';
import { MealPlan, CreateMealPlanData, MealPlanDetailResponse } from '../types/MealPlan.types';

export interface MealPlanService {
  getMealPlan(userId: string, weekStart: Date): Promise<MealPlan>;
  updateMealPlan(mealPlan: MealPlan): Promise<MealPlan>;
  createMealPlan(userId: string, weekStart: Date): Promise<MealPlan>;
}

export const mealPlanService: MealPlanService = {
  async getMealPlan(userId: string, weekStart: Date): Promise<MealPlan> {
    const weekStartString = weekStart.toISOString().split('T')[0];
    const response = await api.get<MealPlanDetailResponse>(`/meal-plans`, {
      params: {
        userId,
        weekStart: weekStartString,
      },
    });
    
    // Convert backend format to frontend format
    const backendMealPlan = response.data.mealPlan;
    
    // Transform meals array to meals object structure
    const mealsObject: { [dayOfWeek: string]: { breakfast?: any; lunch?: any; dinner?: any } } = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {},
      sunday: {},
    };

    // Map backend meals to frontend structure
    if (backendMealPlan.meals && Array.isArray(backendMealPlan.meals)) {
      (backendMealPlan.meals as any[]).forEach((meal: any) => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[meal.dayOfWeek];
        
        if (!mealsObject[dayName]) {
          mealsObject[dayName] = {};
        }
        
        (mealsObject[dayName] as any)[meal.mealType] = {
          id: meal.id,
          recipeId: meal.recipeId,
          recipe: meal.recipe,
          servings: meal.servings,
          scheduledFor: new Date(meal.createdAt), // Use a reasonable date
          mealType: meal.mealType,
        };
      });
    }
    
    // Convert string dates back to Date objects and transform structure
    return {
      id: backendMealPlan.id,
      userId: backendMealPlan.userId,
      weekStartDate: new Date(backendMealPlan.weekStartDate),
      meals: mealsObject,
      createdAt: new Date(backendMealPlan.createdAt),
      updatedAt: new Date(backendMealPlan.updatedAt),
    };
  },

  async updateMealPlan(mealPlan: MealPlan): Promise<MealPlan> {
    // Convert Date objects to strings for API
    const mealPlanForAPI = {
      ...mealPlan,
      weekStartDate: mealPlan.weekStartDate.toISOString(),
      createdAt: mealPlan.createdAt.toISOString(),
      updatedAt: mealPlan.updatedAt.toISOString(),
      meals: Object.fromEntries(
        Object.entries(mealPlan.meals).map(([day, dayMeals]) => [
          day,
          Object.fromEntries(
            Object.entries(dayMeals).map(([mealType, meal]) => [
              mealType,
              meal ? {
                ...meal,
                scheduledFor: meal.scheduledFor.toISOString(),
              } : undefined,
            ])
          ),
        ])
      ),
    };

    const response = await api.put<MealPlanDetailResponse>(`/meal-plans/${mealPlan.id}`, mealPlanForAPI);
    
    // Convert string dates back to Date objects
    const updatedMealPlan = response.data.mealPlan;
    return {
      ...updatedMealPlan,
      weekStartDate: new Date(updatedMealPlan.weekStartDate),
      createdAt: new Date(updatedMealPlan.createdAt),
      updatedAt: new Date(updatedMealPlan.updatedAt),
      meals: Object.fromEntries(
        Object.entries(updatedMealPlan.meals).map(([day, dayMeals]) => [
          day,
          Object.fromEntries(
            Object.entries(dayMeals).map(([mealType, meal]) => [
              mealType,
              meal ? {
                ...meal,
                scheduledFor: new Date(meal.scheduledFor),
              } : undefined,
            ])
          ),
        ])
      ),
    };
  },

  async createMealPlan(_userId: string, weekStart: Date): Promise<MealPlan> {
    const createData: CreateMealPlanData = {
      weekStartDate: weekStart.toISOString().split('T')[0],
      meals: [], // Start with empty meals array
    };

    const response = await api.post<MealPlanDetailResponse>('/meal-plans', createData);
    
    // Convert backend format to frontend format
    const backendMealPlan = response.data.mealPlan;
    
    // Create empty meals object structure
    const mealsObject: { [dayOfWeek: string]: { breakfast?: any; lunch?: any; dinner?: any } } = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {},
      sunday: {},
    };

    // Transform to frontend structure
    return {
      id: backendMealPlan.id,
      userId: backendMealPlan.userId,
      weekStartDate: new Date(backendMealPlan.weekStartDate),
      meals: mealsObject,
      createdAt: new Date(backendMealPlan.createdAt),
      updatedAt: new Date(backendMealPlan.updatedAt),
    };
  },
};