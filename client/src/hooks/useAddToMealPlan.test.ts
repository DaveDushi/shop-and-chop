import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAddToMealPlan } from './useAddToMealPlan';
import { Recipe } from '../types/Recipe.types';
import * as useMealPlanModule from './useMealPlan';

// Mock the useMealPlan hook
vi.mock('./useMealPlan', () => ({
  useMealPlan: vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAddToMealPlan', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    name: 'Test Recipe',
    title: 'Test Recipe',
    description: 'A test recipe',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'Easy',
    dietaryTags: ['vegetarian'],
    ingredients: [],
    instructions: [],
    createdBy: 'user-1',
  };

  const mockAssignMeal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock implementation
    vi.mocked(useMealPlanModule.useMealPlan).mockReturnValue({
      assignMeal: mockAssignMeal,
      isUpdating: false,
      mealPlan: null,
      isLoading: false,
      error: null,
      isRetrying: false,
      lastError: null,
      removeMeal: vi.fn(),
      clearDay: vi.fn(),
      copyMeal: vi.fn(),
      duplicateDay: vi.fn(),
      duplicateWeek: vi.fn(),
      swapMeals: vi.fn(),
      updateServings: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('should initialize with modal closed', () => {
    const { result } = renderHook(() => useAddToMealPlan());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.selectedRecipe).toBeNull();
  });

  it('should open modal with selected recipe', () => {
    const { result } = renderHook(() => useAddToMealPlan());

    act(() => {
      result.current.openModal(mockRecipe);
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.selectedRecipe).toEqual(mockRecipe);
  });

  it('should close modal', async () => {
    const { result } = renderHook(() => useAddToMealPlan());

    act(() => {
      result.current.openModal(mockRecipe);
    });

    expect(result.current.isModalOpen).toBe(true);

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isModalOpen).toBe(false);
  });

  it('should add recipe to meal plan', async () => {
    mockAssignMeal.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAddToMealPlan());

    act(() => {
      result.current.openModal(mockRecipe);
    });

    await act(async () => {
      await result.current.addToMealPlan(0, 'dinner', 4);
    });

    expect(mockAssignMeal).toHaveBeenCalledWith(0, 'dinner', mockRecipe, 4);
  });

  it('should handle errors when adding to meal plan', async () => {
    const error = new Error('Failed to add meal');
    mockAssignMeal.mockRejectedValue(error);

    const { result } = renderHook(() => useAddToMealPlan());

    act(() => {
      result.current.openModal(mockRecipe);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.addToMealPlan(0, 'dinner', 4);
      });
    }).rejects.toThrow('Failed to add meal');

    expect(mockAssignMeal).toHaveBeenCalledWith(0, 'dinner', mockRecipe, 4);
  });

  it('should throw error if no recipe is selected', async () => {
    const { result } = renderHook(() => useAddToMealPlan());

    await expect(async () => {
      await act(async () => {
        await result.current.addToMealPlan(0, 'dinner', 4);
      });
    }).rejects.toThrow('No recipe selected');
  });
});
