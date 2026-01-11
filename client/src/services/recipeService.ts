import api from './api';
import { Recipe, RecipeFilters, RecipesResponse } from '../types/Recipe.types';

export interface RecipeService {
  searchRecipes(query: string, filters: RecipeFilters): Promise<Recipe[]>;
  getRecipe(recipeId: string): Promise<Recipe>;
  getFavoriteRecipes(userId: string): Promise<Recipe[]>;
}

export const recipeService: RecipeService = {
  async searchRecipes(query: string, filters: RecipeFilters): Promise<Recipe[]> {
    const params = {
      search: query,
      ...filters,
      // Convert array filters to comma-separated strings for API
      dietaryTags: filters.dietaryTags?.join(','),
    };

    const response = await api.get<RecipesResponse>('/recipes', { params });
    return response.data.recipes;
  },

  async getRecipe(recipeId: string): Promise<Recipe> {
    const response = await api.get<{ recipe: Recipe }>(`/recipes/${recipeId}`);
    return response.data.recipe;
  },

  async getFavoriteRecipes(userId: string): Promise<Recipe[]> {
    const response = await api.get<RecipesResponse>(`/users/${userId}/favorite-recipes`);
    return response.data.recipes;
  },
};