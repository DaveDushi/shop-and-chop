import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';

export interface UseFavoritesReturn {
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorited: (recipeId: string) => boolean;
  isLoading: (recipeId: string) => boolean;
  syncWithRecipes: (favoriteRecipeIds: string[]) => void;
}

interface FavoriteState {
  [recipeId: string]: boolean;
}

interface LoadingState {
  [recipeId: string]: boolean;
}

export const useFavorites = (): UseFavoritesReturn => {
  const queryClient = useQueryClient();
  
  // Local state for optimistic updates
  const [favoriteState, setFavoriteState] = useState<FavoriteState>({});
  const [loadingState, setLoadingState] = useState<LoadingState>({});

  // Function to sync favorite state with recipe data from API
  const syncWithRecipes = useCallback((favoriteRecipeIds: string[]) => {
    setFavoriteState(prev => {
      const newState: FavoriteState = { ...prev };
      
      // Update state based on API data
      favoriteRecipeIds.forEach(id => {
        newState[id] = true;
      });
      
      // Remove any favorites that are no longer in the API response
      // (but keep optimistic updates for recipes not in current page)
      Object.keys(prev).forEach(id => {
        if (!favoriteRecipeIds.includes(id)) {
          // Only remove if we're sure it's not favorited (not just missing from current page)
          // We'll let the server response be the source of truth
          delete newState[id];
        }
      });
      
      return newState;
    });
  }, []);

  // Mutation for toggling favorites
  const favoriteMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await recipeService.toggleFavorite(recipeId);
      return response;
    },
    onMutate: async (recipeId: string) => {
      // Set loading state
      setLoadingState(prev => ({ ...prev, [recipeId]: true }));
      
      // Get current favorite status and toggle it optimistically
      const currentlyFavorited = favoriteState[recipeId] || false;
      const newFavoriteStatus = !currentlyFavorited;
      
      // Optimistically update the favorite state
      setFavoriteState(prev => ({ ...prev, [recipeId]: newFavoriteStatus }));
      
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['recipes'] });
      await queryClient.cancelQueries({ queryKey: ['recipes-paginated'] });
      
      // Snapshot the previous value
      const previousFavorites = favoriteState;
      
      // Optimistically update any cached recipe data
      queryClient.setQueriesData(
        { queryKey: ['recipes-paginated'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          // Handle paginated response structure
          if (oldData.recipes) {
            return {
              ...oldData,
              recipes: oldData.recipes.map((recipe: any) =>
                recipe.id === recipeId
                  ? { ...recipe, isFavorited: newFavoriteStatus }
                  : recipe
              ),
            };
          }
          
          return oldData;
        }
      );
      
      return { previousFavorites, previousFavoriteStatus: currentlyFavorited };
    },
    onError: (err, recipeId, context) => {
      // Revert the optimistic update on error
      if (context?.previousFavorites) {
        setFavoriteState(context.previousFavorites);
      }
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
      
      console.error(`Failed to update favorite for recipe ${recipeId}:`, err);
    },
    onSuccess: (data, recipeId) => {
      // Update the favorite state with the server response
      if (data && typeof data.isFavorited === 'boolean') {
        setFavoriteState(prev => ({ ...prev, [recipeId]: data.isFavorited }));
      }
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
    },
    onSettled: (_data, _error, recipeId) => {
      // Clear loading state
      setLoadingState(prev => {
        const newState = { ...prev };
        delete newState[recipeId];
        return newState;
      });
    },
  });

  const toggleFavorite = useCallback(async (recipeId: string) => {
    try {
      await favoriteMutation.mutateAsync(recipeId);
    } catch (error) {
      // Error handling is done in the mutation callbacks
      throw error;
    }
  }, [favoriteMutation]);

  const isFavorited = useCallback((recipeId: string): boolean => {
    return favoriteState[recipeId] || false;
  }, [favoriteState]);

  const isLoading = useCallback((recipeId: string): boolean => {
    return loadingState[recipeId] || false;
  }, [loadingState]);

  return {
    toggleFavorite,
    isFavorited,
    isLoading,
    syncWithRecipes,
  };
};