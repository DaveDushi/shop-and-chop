import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useFavorites } from './useFavorites';
import React from 'react';

// Mock the recipe service
vi.mock('../services/recipeService', () => ({
  recipeService: {
    toggleFavorite: vi.fn(),
  },
}));

import { recipeService } from '../services/recipeService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with empty favorites and can sync with provided favorites', () => {
    const { result } = renderHook(
      () => useFavorites(),
      { wrapper: createWrapper() }
    );

    // Initially no favorites
    expect(result.current.isFavorited('recipe1')).toBe(false);
    expect(result.current.isFavorited('recipe2')).toBe(false);
    expect(result.current.isFavorited('recipe3')).toBe(false);

    // Sync with favorites
    act(() => {
      result.current.syncWithRecipes(['recipe1', 'recipe2']);
    });

    expect(result.current.isFavorited('recipe1')).toBe(true);
    expect(result.current.isFavorited('recipe2')).toBe(true);
    expect(result.current.isFavorited('recipe3')).toBe(false);
  });

  it('returns correct loading state', () => {
    const { result } = renderHook(
      () => useFavorites(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading('recipe1')).toBe(false);
  });

  it('optimistically updates favorite status', async () => {
    const mockToggleFavorite = vi.mocked(recipeService.toggleFavorite);
    mockToggleFavorite.mockResolvedValue({ isFavorited: true });

    const { result } = renderHook(
      () => useFavorites(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFavorited('recipe1')).toBe(false);

    await act(async () => {
      await result.current.toggleFavorite('recipe1');
    });

    expect(result.current.isFavorited('recipe1')).toBe(true);
    expect(mockToggleFavorite).toHaveBeenCalledWith('recipe1');
  });

  it('handles API errors gracefully', async () => {
    const mockToggleFavorite = vi.mocked(recipeService.toggleFavorite);
    mockToggleFavorite.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () => useFavorites(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.toggleFavorite('recipe1');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }
    });

    expect(mockToggleFavorite).toHaveBeenCalledWith('recipe1');
  });
});