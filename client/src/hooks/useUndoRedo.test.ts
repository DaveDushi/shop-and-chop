import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './useUndoRedo';
import { MealPlan } from '../types/MealPlan.types';

// Mock meal plan with dates
const createMockMealPlan = (id: string): MealPlan => ({
  id,
  userId: 'user-1',
  weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
  meals: {
    monday: {
      breakfast: {
        id: 'meal-1',
        recipeId: 'recipe-1',
        recipe: {
          id: 'recipe-1',
          name: 'Test Recipe',
          description: 'Test Description',
          prepTime: 30,
          cookTime: 45,
          servings: 4,
          difficulty: 'Easy' as const,
          dietaryTags: [],
          ingredients: [],
          instructions: [],
        },
        servings: 4,
        scheduledFor: new Date('2024-01-01T08:00:00.000Z'),
        mealType: 'breakfast' as const,
      },
    },
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
});

describe('useUndoRedo', () => {
  it('should handle date serialization and deserialization correctly', () => {
    const { result } = renderHook(() => useUndoRedo(10));
    
    const mealPlan1 = createMockMealPlan('plan-1');
    const mealPlan2 = createMockMealPlan('plan-2');
    
    // Initialize history
    act(() => {
      result.current.initializeHistory(mealPlan1);
    });
    
    // Add a second state
    act(() => {
      result.current.pushState(mealPlan2, 'Test action');
    });
    
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    
    // Undo and check that dates are properly restored
    let undoResult: any = null;
    act(() => {
      undoResult = result.current.undo();
    });
    
    expect(undoResult).not.toBeNull();
    expect(undoResult.mealPlan.weekStartDate).toBeInstanceOf(Date);
    expect(undoResult.mealPlan.createdAt).toBeInstanceOf(Date);
    expect(undoResult.mealPlan.updatedAt).toBeInstanceOf(Date);
    expect(undoResult.mealPlan.meals.monday.breakfast.scheduledFor).toBeInstanceOf(Date);
    
    // Check that the dates have the correct values
    expect(undoResult.mealPlan.weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(undoResult.mealPlan.meals.monday.breakfast.scheduledFor.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    
    // Redo and check dates again
    let redoResult: any = null;
    act(() => {
      redoResult = result.current.redo();
    });
    
    expect(redoResult).not.toBeNull();
    expect(redoResult.mealPlan.weekStartDate).toBeInstanceOf(Date);
    expect(redoResult.mealPlan.createdAt).toBeInstanceOf(Date);
    expect(redoResult.mealPlan.updatedAt).toBeInstanceOf(Date);
    expect(redoResult.mealPlan.meals.monday.breakfast.scheduledFor).toBeInstanceOf(Date);
  });
  
  it('should maintain history size limit', () => {
    const { result } = renderHook(() => useUndoRedo(3));
    
    const mealPlan1 = createMockMealPlan('plan-1');
    
    // Initialize history
    act(() => {
      result.current.initializeHistory(mealPlan1);
    });
    
    // Add more states than the limit
    act(() => {
      result.current.pushState(createMockMealPlan('plan-2'), 'Action 2');
      result.current.pushState(createMockMealPlan('plan-3'), 'Action 3');
      result.current.pushState(createMockMealPlan('plan-4'), 'Action 4');
      result.current.pushState(createMockMealPlan('plan-5'), 'Action 5');
    });
    
    // Should only keep the last 3 states
    expect(result.current.historyLength).toBe(3);
  });
  
  it('should provide correct history summary', () => {
    const { result } = renderHook(() => useUndoRedo(10));
    
    const mealPlan1 = createMockMealPlan('plan-1');
    const mealPlan2 = createMockMealPlan('plan-2');
    
    // Initialize history
    act(() => {
      result.current.initializeHistory(mealPlan1);
    });
    
    // Add a second state
    act(() => {
      result.current.pushState(mealPlan2, 'Add chicken to Monday breakfast');
    });
    
    const summary = result.current.getHistorySummary();
    expect(summary).toHaveLength(2);
    expect(summary[0].action).toBe('Initial state');
    expect(summary[1].action).toBe('Add chicken to Monday breakfast');
    expect(summary[1].isCurrent).toBe(true);
    
    // Undo
    act(() => {
      result.current.undo();
    });
    
    const summaryAfterUndo = result.current.getHistorySummary();
    expect(summaryAfterUndo[0].isCurrent).toBe(true);
    expect(summaryAfterUndo[1].isCurrent).toBe(false);
  });
});