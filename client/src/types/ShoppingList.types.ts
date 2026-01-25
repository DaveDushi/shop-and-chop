export interface ShoppingListItem {
  id?: string; // Optional for backward compatibility, required for offline
  name: string;
  quantity: string;
  unit: string;
  category: string;
  recipes: string[];
  checked?: boolean;
}

export interface ShoppingList {
  [category: string]: ShoppingListItem[];
}

export interface ShoppingListResponse {
  shoppingList: ShoppingList;
  mealPlanId: string;
  weekStartDate: string;
}