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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const mutation = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      // Reset validation errors
      setValidationErrors({});
      setUploadProgress(0);
      
      // Client-side validation
      const errors: Record<string, string> = {};
      
      if (!data.title || data.title.trim().length === 0) {
        errors.title = 'Recipe title is required';
      }
      
      if (!data.cuisine || data.cuisine.trim().length === 0) {
        errors.cuisine = 'Cuisine is required';
      }
      
      if (!data.difficulty) {
        errors.difficulty = 'Difficulty level is required';
      }
      
      if (data.cookTime <= 0) {
        errors.cookTime = 'Cook time must be greater than 0';
      }
      
      if (data.servings <= 0) {
        errors.servings = 'Servings must be greater than 0';
      }
      
      if (!data.ingredients || data.ingredients.length === 0) {
        errors.ingredients = 'At least one ingredient is required';
      }
      
      if (!data.instructions || data.instructions.length === 0) {
        errors.instructions = 'At least one instruction is required';
      }
      
      // Validate image if provided
      if (data.image) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(data.image.type)) {
          errors.image = 'Image must be JPG, PNG, or WebP format';
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (data.image.size > maxSize) {
          errors.image = 'Image size must be less than 5MB';
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('Validation failed');
      }
      
      try {
        // Simulate progress for image upload
        if (data.image) {
          setUploadProgress(30);
        }
        
        const result = await recipeService.createRecipe(data);
        
        if (data.image) {
          setUploadProgress(100);
        }
        
        return result;
      } catch (error: any) {
        // Handle server-side validation errors
        if (error.response?.data?.errors) {
          setValidationErrors(error.response.data.errors);
        }
        throw error;
      }
    },
    onSuccess: (newRecipe) => {
      // Invalidate and refetch recipes
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
      
      // Add the new recipe to the cache
      queryClient.setQueryData(['recipe', newRecipe.id], newRecipe);
      
      // Reset progress
      setUploadProgress(0);
      setValidationErrors({});
    },
    onError: (error: any) => {
      // Reset progress on error
      setUploadProgress(0);
      
      // Extract validation errors from server response
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      }
    },
  });
  
  return {
    ...mutation,
    uploadProgress,
    validationErrors,
    clearValidationErrors: () => setValidationErrors({}),
  };
};

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecipeFormData> }) => {
      // Reset validation errors
      setValidationErrors({});
      setUploadProgress(0);
      
      // Get current recipe for ownership validation
      const currentRecipe = queryClient.getQueryData<Recipe>(['recipe', id]);
      
      // Client-side ownership validation
      if (currentRecipe && currentRecipe.userId && currentRecipe.userId !== user?.id) {
        const error = new Error('You do not have permission to edit this recipe');
        setValidationErrors({ ownership: 'You do not have permission to edit this recipe' });
        throw error;
      }
      
      // Client-side validation for provided fields
      const errors: Record<string, string> = {};
      
      if (data.title !== undefined && data.title.trim().length === 0) {
        errors.title = 'Recipe title cannot be empty';
      }
      
      if (data.cuisine !== undefined && data.cuisine.trim().length === 0) {
        errors.cuisine = 'Cuisine cannot be empty';
      }
      
      if (data.cookTime !== undefined && data.cookTime <= 0) {
        errors.cookTime = 'Cook time must be greater than 0';
      }
      
      if (data.servings !== undefined && data.servings <= 0) {
        errors.servings = 'Servings must be greater than 0';
      }
      
      if (data.ingredients !== undefined && data.ingredients.length === 0) {
        errors.ingredients = 'At least one ingredient is required';
      }
      
      if (data.instructions !== undefined && data.instructions.length === 0) {
        errors.instructions = 'At least one instruction is required';
      }
      
      // Validate image if provided
      if (data.image) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(data.image.type)) {
          errors.image = 'Image must be JPG, PNG, or WebP format';
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (data.image.size > maxSize) {
          errors.image = 'Image size must be less than 5MB';
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('Validation failed');
      }
      
      try {
        // Simulate progress for image upload
        if (data.image) {
          setUploadProgress(30);
        }
        
        const result = await recipeService.updateRecipe(id, data);
        
        if (data.image) {
          setUploadProgress(100);
        }
        
        return result;
      } catch (error: any) {
        // Handle server-side validation errors
        if (error.response?.data?.errors) {
          setValidationErrors(error.response.data.errors);
        }
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['recipe', id] });
      
      // Snapshot the previous value for rollback
      const previousRecipe = queryClient.getQueryData<Recipe>(['recipe', id]);
      
      // Optimistically update the recipe
      if (previousRecipe) {
        queryClient.setQueryData<Recipe>(['recipe', id], (old) => {
          if (!old) return old;
          
          // Convert IngredientInput[] to Ingredient[] if ingredients are being updated
          const updatedIngredients = data.ingredients 
            ? data.ingredients.map(ing => ({
                id: ing.id || `temp-${Date.now()}-${Math.random()}`,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                category: ing.category || 'Other',
              }))
            : old.ingredients;
          
          return {
            ...old,
            title: data.title ?? old.title,
            description: data.description ?? old.description,
            cuisine: data.cuisine ?? old.cuisine,
            cookTime: data.cookTime ?? old.cookTime,
            prepTime: data.prepTime ?? old.prepTime,
            servings: data.servings ?? old.servings,
            difficulty: data.difficulty ?? old.difficulty,
            dietaryTags: data.dietaryTags ?? old.dietaryTags,
            ingredients: updatedIngredients,
            instructions: data.instructions ?? old.instructions,
            // Preserve fields that shouldn't be updated optimistically
            id: old.id,
            userId: old.userId,
            createdAt: old.createdAt,
            updatedAt: new Date().toISOString(),
          };
        });
      }
      
      // Return context with previous value for rollback
      return { previousRecipe };
    },
    onSuccess: (updatedRecipe) => {
      // Update the specific recipe in cache with server response
      queryClient.setQueryData(['recipe', updatedRecipe.id], updatedRecipe);
      
      // Invalidate recipes lists to reflect changes
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes-paginated'] });
      
      // Reset progress and errors
      setUploadProgress(0);
      setValidationErrors({});
    },
    onError: (error: any, { id }, context) => {
      // Rollback to previous value on error
      if (context?.previousRecipe) {
        queryClient.setQueryData(['recipe', id], context.previousRecipe);
      }
      
      // Reset progress
      setUploadProgress(0);
      
      // Extract validation errors from server response
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      }
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    },
  });
  
  return {
    ...mutation,
    uploadProgress,
    validationErrors,
    clearValidationErrors: () => setValidationErrors({}),
  };
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