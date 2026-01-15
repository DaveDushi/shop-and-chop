import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useCreateRecipe, useUpdateRecipe } from './useRecipes';
import { RecipeFormData, Recipe } from '../types/Recipe.types';
import React from 'react';

// Mock the recipe service
vi.mock('../services/recipeService', () => ({
  recipeService: {
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

import { recipeService } from '../services/recipeService';

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useCreateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate required fields before submission', async () => {
    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    const invalidData: RecipeFormData = {
      title: '',
      cuisine: '',
      cookTime: 0,
      prepTime: 10,
      servings: 0,
      difficulty: 'Easy',
      dietaryTags: [],
      ingredients: [],
      instructions: [],
    };

    result.current.mutate(invalidData);

    await waitFor(() => {
      expect(result.current.validationErrors).toHaveProperty('title');
      expect(result.current.validationErrors).toHaveProperty('cuisine');
      expect(result.current.validationErrors).toHaveProperty('cookTime');
      expect(result.current.validationErrors).toHaveProperty('servings');
      expect(result.current.validationErrors).toHaveProperty('ingredients');
      expect(result.current.validationErrors).toHaveProperty('instructions');
    });
  });

  it('should validate image file type', async () => {
    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    // Create an invalid image file (wrong type)
    const invalidImageFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    const dataWithInvalidImage: RecipeFormData = {
      title: 'Test Recipe',
      cuisine: 'Italian',
      cookTime: 30,
      prepTime: 10,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: ['vegetarian'],
      ingredients: [{ name: 'Pasta', quantity: '200', unit: 'g' }],
      instructions: ['Cook pasta'],
      image: invalidImageFile,
    };

    result.current.mutate(dataWithInvalidImage);

    await waitFor(() => {
      expect(result.current.validationErrors).toHaveProperty('image');
      expect(result.current.validationErrors.image).toContain('JPG, PNG, or WebP');
    });
  });

  it('should successfully create a recipe with valid data', async () => {
    const mockRecipe: Recipe = {
      id: 'recipe-123',
      name: 'Test Recipe',
      description: 'A test recipe',
      imageUrl: '/images/test.jpg',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: ['vegetarian'],
      ingredients: [
        { id: 'ing-1', name: 'Pasta', quantity: '200', unit: 'g', category: 'Grains' },
      ],
      instructions: ['Cook pasta'],
      createdBy: 'user-123',
      userId: 'user-123',
    };

    vi.mocked(recipeService.createRecipe).mockResolvedValue(mockRecipe);

    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    const validData: RecipeFormData = {
      title: 'Test Recipe',
      description: 'A test recipe',
      cuisine: 'Italian',
      cookTime: 30,
      prepTime: 10,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: ['vegetarian'],
      ingredients: [{ name: 'Pasta', quantity: '200', unit: 'g' }],
      instructions: ['Cook pasta'],
    };

    result.current.mutate(validData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockRecipe);
      expect(Object.keys(result.current.validationErrors).length).toBe(0);
    });
  });
});

describe('useUpdateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate ownership before updating', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Set up a recipe owned by a different user
    const existingRecipe: Recipe = {
      id: 'recipe-123',
      name: 'Test Recipe',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: [],
      ingredients: [
        { id: 'ing-1', name: 'Pasta', quantity: '200', unit: 'g', category: 'Grains' },
      ],
      instructions: ['Cook pasta'],
      createdBy: 'other-user',
      userId: 'other-user', // Different from current user
    };

    queryClient.setQueryData(['recipe', 'recipe-123'], existingRecipe);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    const updateData = {
      id: 'recipe-123',
      data: { title: 'Updated Recipe' },
    };

    result.current.mutate(updateData);

    await waitFor(() => {
      expect(result.current.validationErrors).toHaveProperty('ownership');
      expect(result.current.validationErrors.ownership).toContain('permission');
    });
  });

  it('should perform optimistic update and rollback on error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const existingRecipe: Recipe = {
      id: 'recipe-123',
      name: 'Original Recipe',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: [],
      ingredients: [
        { id: 'ing-1', name: 'Pasta', quantity: '200', unit: 'g', category: 'Grains' },
      ],
      instructions: ['Cook pasta'],
      createdBy: 'user-123',
      userId: 'user-123',
    };

    queryClient.setQueryData(['recipe', 'recipe-123'], existingRecipe);

    // Mock service to fail
    vi.mocked(recipeService.updateRecipe).mockRejectedValue(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    const updateData = {
      id: 'recipe-123',
      data: { title: 'Updated Recipe' },
    };

    result.current.mutate(updateData);

    // Wait for the mutation to complete (with error)
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Check that the recipe was rolled back to original
    const cachedRecipe = queryClient.getQueryData<Recipe>(['recipe', 'recipe-123']);
    expect(cachedRecipe?.name).toBe('Original Recipe');
  });

  it('should successfully update a recipe with partial data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const existingRecipe: Recipe = {
      id: 'recipe-123',
      name: 'Original Recipe',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      difficulty: 'Easy',
      dietaryTags: [],
      ingredients: [
        { id: 'ing-1', name: 'Pasta', quantity: '200', unit: 'g', category: 'Grains' },
      ],
      instructions: ['Cook pasta'],
      createdBy: 'user-123',
      userId: 'user-123',
    };

    const updatedRecipe: Recipe = {
      ...existingRecipe,
      name: 'Updated Recipe',
      cookTime: 45,
    };

    queryClient.setQueryData(['recipe', 'recipe-123'], existingRecipe);
    vi.mocked(recipeService.updateRecipe).mockResolvedValue(updatedRecipe);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    const updateData = {
      id: 'recipe-123',
      data: { title: 'Updated Recipe', cookTime: 45 },
    };

    result.current.mutate(updateData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.name).toBe('Updated Recipe');
      expect(result.current.data?.cookTime).toBe(45);
    });
  });

  it('should validate partial update data', async () => {
    const { result } = renderHook(() => useUpdateRecipe(), {
      wrapper: createWrapper(),
    });

    const invalidUpdateData = {
      id: 'recipe-123',
      data: {
        title: '', // Empty title should fail validation
        cookTime: -5, // Negative cook time should fail
      },
    };

    result.current.mutate(invalidUpdateData);

    await waitFor(() => {
      expect(result.current.validationErrors).toHaveProperty('title');
      expect(result.current.validationErrors).toHaveProperty('cookTime');
    });
  });
});
