import { useQuery } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';
import { RecipeFilters } from '../types/Recipe.types';
import { useAuth } from './useAuth';

export const useRecipes = (searchQuery: string = '', filters: RecipeFilters = {}) => {
  return useQuery({
    queryKey: ['recipes', searchQuery, filters],
    queryFn: () => recipeService.searchRecipes(searchQuery, filters),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecipe = (recipeId: string) => {
  return useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => recipeService.getRecipe(recipeId),
    enabled: !!recipeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useFavoriteRecipes = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['favoriteRecipes', user?.id],
    queryFn: () => recipeService.getFavoriteRecipes(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};