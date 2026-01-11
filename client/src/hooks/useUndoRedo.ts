import { useState, useCallback, useRef } from 'react';
import { MealPlan } from '../types/MealPlan.types';

export interface HistoryEntry {
  id: string;
  mealPlan: MealPlan;
  timestamp: Date;
  action: string; // Description of the action that created this state
}

export interface UndoRedoState {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
}

export const useUndoRedo = (maxHistorySize: number = 50) => {
  const [state, setState] = useState<UndoRedoState>({
    history: [],
    currentIndex: -1,
    maxHistorySize,
  });

  // Keep track of the next entry ID
  const nextEntryId = useRef(1);

  // Helper function to restore Date objects from serialized meal plan
  const restoreDates = useCallback((mealPlan: any): MealPlan => {
    return JSON.parse(JSON.stringify(mealPlan), (_, value) => {
      // Restore Date objects from ISO strings
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  }, []);

  // Add a new state to the history
  const pushState = useCallback((mealPlan: MealPlan, action: string) => {
    setState(prevState => {
      // Deep clone and ensure dates are properly serialized
      const clonedMealPlan = JSON.parse(JSON.stringify(mealPlan, (_, value) => {
        // Convert Date objects to ISO strings for storage
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));

      const newEntry: HistoryEntry = {
        id: `history-${nextEntryId.current++}`,
        mealPlan: clonedMealPlan,
        timestamp: new Date(),
        action,
      };

      // Remove any future history if we're not at the end
      const newHistory = prevState.history.slice(0, prevState.currentIndex + 1);
      
      // Add the new entry
      newHistory.push(newEntry);

      // Trim history if it exceeds max size
      const trimmedHistory = newHistory.length > maxHistorySize 
        ? newHistory.slice(-maxHistorySize)
        : newHistory;

      return {
        ...prevState,
        history: trimmedHistory,
        currentIndex: trimmedHistory.length - 1,
      };
    });
  }, [maxHistorySize]);

  // Initialize history with the first meal plan state
  const initializeHistory = useCallback((mealPlan: MealPlan) => {
    setState(prevState => {
      // Only initialize if history is empty
      if (prevState.history.length === 0) {
        // Deep clone and ensure dates are properly serialized
        const clonedMealPlan = JSON.parse(JSON.stringify(mealPlan, (_, value) => {
          // Convert Date objects to ISO strings for storage
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        }));

        const initialEntry: HistoryEntry = {
          id: `history-${nextEntryId.current++}`,
          mealPlan: clonedMealPlan,
          timestamp: new Date(),
          action: 'Initial state',
        };

        return {
          ...prevState,
          history: [initialEntry],
          currentIndex: 0,
        };
      }
      return prevState;
    });
  }, []);

  // Undo to the previous state
  const undo = useCallback((): HistoryEntry | null => {
    if (state.currentIndex <= 0) {
      return null; // Nothing to undo
    }

    const previousIndex = state.currentIndex - 1;
    const previousEntry = state.history[previousIndex];

    setState(prevState => ({
      ...prevState,
      currentIndex: previousIndex,
    }));

    // Return the entry with restored dates
    return {
      ...previousEntry,
      mealPlan: restoreDates(previousEntry.mealPlan),
    };
  }, [state.currentIndex, state.history, restoreDates]);

  // Redo to the next state
  const redo = useCallback((): HistoryEntry | null => {
    if (state.currentIndex >= state.history.length - 1) {
      return null; // Nothing to redo
    }

    const nextIndex = state.currentIndex + 1;
    const nextEntry = state.history[nextIndex];

    setState(prevState => ({
      ...prevState,
      currentIndex: nextIndex,
    }));

    // Return the entry with restored dates
    return {
      ...nextEntry,
      mealPlan: restoreDates(nextEntry.mealPlan),
    };
  }, [state.currentIndex, state.history, restoreDates]);

  // Get the current state
  const getCurrentState = useCallback((): HistoryEntry | null => {
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      const currentEntry = state.history[state.currentIndex];
      return {
        ...currentEntry,
        mealPlan: restoreDates(currentEntry.mealPlan),
      };
    }
    return null;
  }, [state.currentIndex, state.history, restoreDates]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setState({
      history: [],
      currentIndex: -1,
      maxHistorySize,
    });
    nextEntryId.current = 1;
  }, [maxHistorySize]);

  // Check if undo is available
  const canUndo = state.currentIndex > 0;

  // Check if redo is available
  const canRedo = state.currentIndex < state.history.length - 1;

  // Get history summary for debugging
  const getHistorySummary = useCallback(() => {
    return state.history.map((entry, index) => ({
      id: entry.id,
      action: entry.action,
      timestamp: entry.timestamp,
      isCurrent: index === state.currentIndex,
    }));
  }, [state.history, state.currentIndex]);

  return {
    // State management
    pushState,
    initializeHistory,
    clearHistory,
    
    // Undo/Redo operations
    undo,
    redo,
    canUndo,
    canRedo,
    
    // State access
    getCurrentState,
    getHistorySummary,
    
    // History info
    historyLength: state.history.length,
    currentIndex: state.currentIndex,
  };
};