import api from './api';
import { Recipe, RecipeFilters, RecipesResponse, RecipeFormData } from '../types/Recipe.types';

export interface RecipeService {
  searchRecipes(query: string, filters: RecipeFilters): Promise<Recipe[]>;
  getRecipes(filters: RecipeFilters, page?: number, limit?: number): Promise<RecipesResponse>;
  getRecipe(recipeId: string): Promise<Recipe>;
  getFavoriteRecipes(userId: string): Promise<Recipe[]>;
  createRecipe(data: RecipeFormData): Promise<Recipe>;
  updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  toggleFavorite(recipeId: string): Promise<{ isFavorited: boolean }>;
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

  async getRecipes(filters: RecipeFilters, page = 1, limit = 20): Promise<RecipesResponse> {
    const params = {
      ...filters,
      page,
      limit,
      // Convert array filters to comma-separated strings for API
      dietaryTags: filters.dietaryTags?.join(','),
    };

    const response = await api.get<RecipesResponse>('/recipes', { params });
    return response.data;
  },

  async getRecipe(recipeId: string): Promise<Recipe> {
    const response = await api.get<{ recipe: Recipe }>(`/recipes/${recipeId}`);
    return response.data.recipe;
  },

  async getFavoriteRecipes(userId: string): Promise<Recipe[]> {
    const response = await api.get<RecipesResponse>(`/users/${userId}/favorite-recipes`);
    return response.data.recipes;
  },

  async createRecipe(data: RecipeFormData): Promise<Recipe> {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('cuisine', data.cuisine);
    formData.append('cookTime', data.cookTime.toString());
    formData.append('prepTime', data.prepTime.toString());
    formData.append('servings', data.servings.toString());
    formData.append('difficulty', data.difficulty);
    formData.append('dietaryTags', JSON.stringify(data.dietaryTags));
    formData.append('ingredients', JSON.stringify(data.ingredients));
    formData.append('instructions', JSON.stringify(data.instructions));
    
    // Add image if provided
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await api.post<{ recipe: Recipe }>('/recipes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.recipe;
  },

  async updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<Recipe> {
    const formData = new FormData();
    
    // Add text fields if provided
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.cuisine) formData.append('cuisine', data.cuisine);
    if (data.cookTime) formData.append('cookTime', data.cookTime.toString());
    if (data.prepTime) formData.append('prepTime', data.prepTime.toString());
    if (data.servings) formData.append('servings', data.servings.toString());
    if (data.difficulty) formData.append('difficulty', data.difficulty);
    if (data.dietaryTags) formData.append('dietaryTags', JSON.stringify(data.dietaryTags));
    if (data.ingredients) formData.append('ingredients', JSON.stringify(data.ingredients));
    if (data.instructions) formData.append('instructions', JSON.stringify(data.instructions));
    
    // Add image if provided
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await api.put<{ recipe: Recipe }>(`/recipes/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.recipe;
  },

  async deleteRecipe(id: string): Promise<void> {
    await api.delete(`/recipes/${id}`);
  },

  async toggleFavorite(recipeId: string): Promise<{ isFavorited: boolean }> {
    const response = await api.post<{ isFavorited: boolean }>(`/recipes/${recipeId}/favorite`);
    return response.data;
  },
};