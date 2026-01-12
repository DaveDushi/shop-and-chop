import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';
import { RecipeFilters, RecipeFormData, Recipe } from '../types/Recipe.types';
import { useAuth } from './useAuth';
import { useState, useCallback } from 'react';

export const useRecipes = (searchQuery: string = '', filters: RecipeFilters = {}) => {
  return useQuery({
    queryKey: ['recipes', searchQuery, filters],
    queryFn: () => recipeService.searchRecipes(searchQuery, filters),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network/server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

export const useRecipesWithPagination = (filters: RecipeFilters = {}, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['recipes-paginated', filters, page, limit],
    queryFn: () => recipeService.getRecipes(filters, page, limit),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    placeholderData: (previousData) => previousData, // Keep previous data while loading new page
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network/server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RecipeFormData) => recipeService.createRecipe(data),
    onSuccess: (newRecipe) => {
      // Invalidate and refetch recipes
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
      
      // Add the new recipe to the cache
      queryClient.setQueryData(['recipe', newRecipe.id], newRecipe);
    },
  });
};

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecipeFormData> }) => 
      recipeService.updateRecipe(id, data),
    onSuccess: (updatedRecipe) => {
      // Update the specific recipe in cache
      queryClient.setQueryData(['recipe', updatedRecipe.id], updatedRecipe);
      
      // Invalidate recipes lists to reflect changes
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
    },
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => recipeService.deleteRecipe(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['recipe', deletedId] });
      
      // Invalidate recipes lists
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
    },
  });
};

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  const toggleFavorite = useCallback(async (recipeId: string) => {
    setLoadingStates(prev => ({ ...prev, [recipeId]: true }));
    
    try {
      // Optimistic update
      queryClient.setQueryData(['recipe', recipeId], (oldData: Recipe | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          isFavorited: !oldData.isFavorited,
          favoriteCount: oldData.isFavorited 
            ? (oldData.favoriteCount || 1) - 1 
            : (oldData.favoriteCount || 0) + 1,
        };
      });
      
      const result = await recipeService.toggleFavorite(recipeId);
      
      // Update with server response
      queryClient.setQueryData(['recipe', recipeId], (oldData: Recipe | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          isFavorited: result.isFavorited,
        };
      });
      
      // Invalidate favorite recipes list
      queryClient.invalidateQueries({ queryKey: ['favoriteRecipes'] });
      
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(['recipe', recipeId], (oldData: Recipe | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          isFavorited: !oldData.isFavorited,
          favoriteCount: oldData.isFavorited 
            ? (oldData.favoriteCount || 0) + 1 
            : (oldData.favoriteCount || 1) - 1,
        };
      });
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, [recipeId]: false }));
    }
  }, [queryClient]);
  
  const isFavorited = useCallback((recipeId: string) => {
    const recipe = queryClient.getQueryData<Recipe>(['recipe', recipeId]);
    return recipe?.isFavorited || false;
  }, [queryClient]);
  
  const isLoading = useCallback((recipeId: string) => {
    return loadingStates[recipeId] || false;
  }, [loadingStates]);
  
  return {
    toggleFavorite,
    isFavorited,
    isLoading,
  };
};