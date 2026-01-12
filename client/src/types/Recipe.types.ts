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
  description?: string;
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
  // Recipe browser specific fields
  userId?: string; // null for curated recipes
  isFavorited?: boolean; // computed field
  favoriteCount?: number; // computed field
}

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  difficulty?: string;
  dietaryTags?: string[];
  maxCookTime?: number;
  showFavoritesOnly?: boolean;
  showUserRecipesOnly?: boolean;
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

// Recipe Browser specific interfaces
export interface RecipeBrowserState {
  // Data
  recipes: Recipe[];
  totalCount: number;
  
  // UI State
  searchQuery: string;
  filters: RecipeFilters;
  viewMode: 'grid' | 'list';
  currentPage: number;
  
  // Loading States
  isLoading: boolean;
  isSearching: boolean;
  isCreating: boolean;
  
  // Modal States
  showCreateModal: boolean;
  showEditModal: boolean;
  editingRecipe: Recipe | null;
  
  // Error States
  error: string | null;
  validationErrors: Record<string, string>;
}

export interface RecipeFormData {
  title: string;
  description?: string;
  cuisine: string;
  cookTime: number;
  prepTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dietaryTags: string[];
  ingredients: IngredientInput[];
  instructions: string[];
  image?: File;
}

export interface IngredientInput {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  category?: string;
}