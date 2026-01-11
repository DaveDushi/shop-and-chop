import { MealPlan } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';
import { ShoppingList, ShoppingListItem } from '../types/ShoppingList.types';

interface MealPlanItem {
  servings: number;
  recipe: Recipe;
}

export class ShoppingListService {
  /**
   * Generate a shopping list from a meal plan
   */
  static generateFromMealPlan(mealPlan: MealPlan, householdSize: number = 2): ShoppingList {
    const meals: MealPlanItem[] = [];

    // Extract all meals from the meal plan
    Object.values(mealPlan.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(mealSlot => {
        if (mealSlot) {
          meals.push({
            servings: mealSlot.servings,
            recipe: mealSlot.recipe
          });
        }
      });
    });

    return this.generateFromMeals(meals, householdSize);
  }

  /**
   * Generate a shopping list from an array of meals
   */
  static generateFromMeals(meals: MealPlanItem[], householdSize: number = 2): ShoppingList {
    const consolidatedIngredients = new Map<string, ShoppingListItem>();

    // Process each meal
    meals.forEach(meal => {
      const { recipe, servings } = meal;
      const scalingFactor = (servings * householdSize) / recipe.servings;

      recipe.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
        
        if (consolidatedIngredients.has(key)) {
          // Consolidate existing ingredient
          const existing = consolidatedIngredients.get(key)!;
          const existingQuantity = this.parseQuantity(existing.quantity);
          const newQuantity = this.parseQuantity(ingredient.quantity) * scalingFactor;
          
          existing.quantity = this.formatQuantity(existingQuantity + newQuantity);
          const recipeName = recipe.name || recipe.title || 'Unknown Recipe';
          if (!existing.recipes.includes(recipeName)) {
            existing.recipes.push(recipeName);
          }
        } else {
          // Add new ingredient
          const scaledQuantity = this.parseQuantity(ingredient.quantity) * scalingFactor;
          const recipeName = recipe.name || recipe.title || 'Unknown Recipe';
          consolidatedIngredients.set(key, {
            name: ingredient.name,
            quantity: this.formatQuantity(scaledQuantity),
            unit: ingredient.unit,
            category: ingredient.category,
            recipes: [recipeName],
            checked: false
          });
        }
      });
    });

    // Group by category
    const shoppingList: ShoppingList = {};
    
    consolidatedIngredients.forEach(item => {
      if (!shoppingList[item.category]) {
        shoppingList[item.category] = [];
      }
      shoppingList[item.category].push(item);
    });

    // Sort categories and items
    return this.sortShoppingList(shoppingList);
  }

  /**
   * Sort shopping list by category priority and item names
   */
  private static sortShoppingList(shoppingList: ShoppingList): ShoppingList {
    const sortedShoppingList: ShoppingList = {};
    const categoryOrder = [
      'Produce',
      'Meat & Seafood',
      'Dairy & Eggs',
      'Pantry',
      'Grains & Bread',
      'Frozen',
      'Beverages',
      'Other'
    ];

    // Add categories in preferred order
    categoryOrder.forEach(category => {
      if (shoppingList[category]) {
        sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      }
    });

    // Add any remaining categories
    Object.keys(shoppingList).forEach(category => {
      if (!categoryOrder.includes(category)) {
        sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      }
    });

    return sortedShoppingList;
  }

  /**
   * Parse quantity string to number
   */
  private static parseQuantity(quantity: string): number {
    // Handle fractions and mixed numbers
    const fractionMatch = quantity.match(/(\d+)?\s*(\d+)\/(\d+)/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1] || '0', 10);
      const numerator = parseInt(fractionMatch[2], 10);
      const denominator = parseInt(fractionMatch[3], 10);
      return whole + (numerator / denominator);
    }

    // Handle decimal numbers
    const decimalMatch = quantity.match(/(\d+\.?\d*)/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }

    // Default to 1 if no number found
    return 1;
  }

  /**
   * Format quantity number to string
   */
  private static formatQuantity(quantity: number): string {
    // Round to reasonable precision
    if (quantity < 1) {
      // Convert to fraction for small amounts
      const fractions = [
        [0.125, '1/8'],
        [0.25, '1/4'],
        [0.33, '1/3'],
        [0.5, '1/2'],
        [0.67, '2/3'],
        [0.75, '3/4']
      ];

      for (const [decimal, fraction] of fractions) {
        if (Math.abs(quantity - (decimal as number)) < 0.05) {
          return fraction as string;
        }
      }
    }

    // Round to 2 decimal places and remove trailing zeros
    return parseFloat(quantity.toFixed(2)).toString();
  }

  /**
   * Get total number of items in shopping list
   */
  static getTotalItemCount(shoppingList: ShoppingList): number {
    return Object.values(shoppingList).reduce((total, items) => total + items.length, 0);
  }

  /**
   * Get total number of categories in shopping list
   */
  static getCategoryCount(shoppingList: ShoppingList): number {
    return Object.keys(shoppingList).length;
  }

  /**
   * Check if shopping list is empty
   */
  static isEmpty(shoppingList: ShoppingList): boolean {
    return Object.keys(shoppingList).length === 0;
  }
}