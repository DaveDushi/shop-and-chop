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
    // Convert frontend meals object structure to backend meals array format
    const mealsArray: any[] = [];
    
    Object.entries(mealPlan.meals).forEach(([dayKey, dayMeals]) => {
      // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
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

    // Convert Date objects to strings for API
    const mealPlanForAPI = {
      weekStartDate: mealPlan.weekStartDate.toISOString(), // Send as full ISO string for validation
      meals: mealsArray,
    };

    const response = await api.put<MealPlanDetailResponse>(`/meal-plans/${mealPlan.id}`, mealPlanForAPI);
    
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