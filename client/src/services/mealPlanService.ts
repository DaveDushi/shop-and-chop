import api from './api';
import { MealPlan, CreateMealPlanData, MealPlanDetailResponse } from '../types/MealPlan.types';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: process.env.NODE_ENV === 'production' ? 3 : 1, // Fewer retries in development
  baseDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  backoffFactor: 2,
};

// Network error types that should trigger retries
const RETRYABLE_ERRORS = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'ECONNABORTED',
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
];

// HTTP status codes that should trigger retries
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export interface MealPlanService {
  getMealPlan(userId: string, weekStart: Date): Promise<MealPlan>;
  updateMealPlan(mealPlan: MealPlan): Promise<MealPlan>;
  createMealPlan(userId: string, weekStart: Date): Promise<MealPlan>;
}

// Enhanced error class for meal plan operations
export class MealPlanError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public isRetryable: boolean = false,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'MealPlanError';
  }
}

// Utility function to determine if an error is retryable
const isRetryableError = (error: any): boolean => {
  // Network errors
  if (error.code && RETRYABLE_ERRORS.includes(error.code)) {
    return true;
  }
  
  // HTTP status codes
  if (error.response?.status && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true;
  }
  
  // Axios timeout errors
  if (error.code === 'ECONNABORTED' && error instanceof Error ? error.message : 'Unknown error'.includes('timeout')) {
    return true;
  }
  
  return false;
};

// Utility function to calculate retry delay with exponential backoff
const calculateRetryDelay = (attempt: number): number => {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
    RETRY_CONFIG.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
};

// Utility function to retry async operations
const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt === maxRetries || !isRetryableError(error)) {
        break;
      }
      
      const delay = calculateRetryDelay(attempt);
      console.warn(
        `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  const isRetryable = isRetryableError(lastError);
  const statusCode = lastError.response?.status;
  const message = lastError.response?.data?.error || lastError.message || `${operationName} failed after ${maxRetries + 1} attempts`;
  
  throw new MealPlanError(message, lastError, isRetryable, statusCode);
};

export const mealPlanService: MealPlanService = {
  async getMealPlan(_userId: string, weekStart: Date): Promise<MealPlan> {
    return withRetry(async () => {
      const weekStartString = weekStart.toISOString().split('T')[0];
      const response = await api.get<MealPlanDetailResponse>(`/meal-plans`, {
        params: {
          weekStart: weekStartString,
        },
        timeout: 10000, // 10 second timeout
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
    }, 'Get meal plan');
  },

  async updateMealPlan(mealPlan: MealPlan): Promise<MealPlan> {
    return withRetry(async () => {
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
          // Only include meals that exist and have valid recipe IDs
          if (meal && meal.recipeId) {
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

      const response = await api.put<MealPlanDetailResponse>(`/meal-plans/${mealPlan.id}`, mealPlanForAPI, {
        timeout: 15000, // 15 second timeout for updates
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
    }, 'Update meal plan');
  },

  async createMealPlan(_userId: string, weekStart: Date): Promise<MealPlan> {
    return withRetry(async () => {
      const createData: CreateMealPlanData = {
        weekStartDate: weekStart.toISOString().split('T')[0],
        meals: [], // Start with empty meals array
      };

      const response = await api.post<MealPlanDetailResponse>('/meal-plans', createData, {
        timeout: 10000, // 10 second timeout
      });
      
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
    }, 'Create meal plan');
  },
};