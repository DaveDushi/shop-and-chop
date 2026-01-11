export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dietaryTags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  nutritionInfo?: NutritionInfo;
  rating?: number;
  createdBy: string;
  // Legacy fields for backward compatibility
  title?: string;
  cuisine?: string;
  _count?: {
    favoritedBy: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  difficulty?: string;
  dietaryTags?: string[];
  maxCookTime?: number;
}

export interface RecipesResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}