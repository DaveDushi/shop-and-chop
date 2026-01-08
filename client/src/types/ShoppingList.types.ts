export interface ShoppingListItem {
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