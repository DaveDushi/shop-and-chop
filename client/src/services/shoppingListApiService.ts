import api from './api';
import { ShoppingListResponse } from '../types/ShoppingList.types';

export class ShoppingListApiService {
  /**
   * Generate shopping list from a meal plan
   */
  static async generateFromMealPlan(mealPlanId: string): Promise<ShoppingListResponse> {
    const response = await api.get(`/meal-plans/${mealPlanId}/shopping-list`);
    return response.data;
  }

  /**
   * Save shopping list to user's shopping lists (if such endpoint exists)
   * This is a placeholder for future implementation
   */
  static async saveShoppingList(shoppingListData: any): Promise<void> {
    // TODO: Implement when shopping list save endpoint is available
    // const response = await api.post('/shopping-lists', shoppingListData);
    // return response.data;
    
    // For now, just simulate a successful save
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }
}