import { useState, useEffect, useCallback } from 'react';
import { OfflineShoppingListEntry, ShoppingListMetadata } from '../types/OfflineStorage.types';
import { ShoppingList } from '../types/ShoppingList.types';
import { ShoppingListService } from '../services/shoppingListService';
import { MealPlan } from '../types/MealPlan.types';

interface UseOfflineShoppingListOptions {
  enableAutoSync?: boolean;
  enableOfflineStorage?: boolean;
}

interface UseOfflineShoppingListReturn {
  // State
  offlineEntries: OfflineShoppingListEntry[];
  currentEntry: OfflineShoppingListEntry | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  generateAndStore: (
    mealPlan: MealPlan, 
    householdSize: number, 
    metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'>
  ) => Promise<{ shoppingList: ShoppingList; offlineEntry?: OfflineShoppingListEntry }>;
  loadOfflineEntry: (id: string) => Promise<void>;
  updateItemStatus: (shoppingListId: string, category: string, itemId: string, checked: boolean) => Promise<void>;
  deleteOfflineEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
  clearError: () => void;
  
  // Utility
  getEntriesForWeek: (weekStartDate: string) => OfflineShoppingListEntry[];
  getEntriesByMealPlan: (mealPlanId: string) => OfflineShoppingListEntry[];
}

export const useOfflineShoppingList = (
  options: UseOfflineShoppingListOptions = {}
): UseOfflineShoppingListReturn => {
  const {
    enableAutoSync = true,
    enableOfflineStorage = true
  } = options;

  const [offlineEntries, setOfflineEntries] = useState<OfflineShoppingListEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<OfflineShoppingListEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service configuration
  useEffect(() => {
    ShoppingListService.configure({
      enableOfflineStorage,
      enableAutoSync
    });
  }, [enableOfflineStorage, enableAutoSync]);

  // Load all offline entries
  const loadOfflineEntries = useCallback(async () => {
    if (!enableOfflineStorage) return;

    try {
      setLoading(true);
      setError(null);
      
      const entries = await ShoppingListService.getAllOfflineShoppingLists();
      setOfflineEntries(entries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load offline shopping lists';
      setError(errorMessage);
      console.error('Failed to load offline entries:', err);
    } finally {
      setLoading(false);
    }
  }, [enableOfflineStorage]);

  // Load specific offline entry
  const loadOfflineEntry = useCallback(async (id: string) => {
    if (!enableOfflineStorage) return;

    try {
      setLoading(true);
      setError(null);
      
      const entry = await ShoppingListService.getOfflineShoppingList(id);
      setCurrentEntry(entry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load shopping list ${id}`;
      setError(errorMessage);
      console.error('Failed to load offline entry:', err);
    } finally {
      setLoading(false);
    }
  }, [enableOfflineStorage]);

  // Generate and store shopping list
  const generateAndStore = useCallback(async (
    mealPlan: MealPlan, 
    householdSize: number, 
    metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'>
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ShoppingListService.generateAndStoreFromMealPlan(
        mealPlan, 
        householdSize, 
        metadata
      );
      
      // Refresh entries to include the new one
      await loadOfflineEntries();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate and store shopping list';
      setError(errorMessage);
      console.error('Failed to generate and store:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadOfflineEntries]);

  // Update item status
  const updateItemStatus = useCallback(async (
    shoppingListId: string, 
    category: string, 
    itemId: string, 
    checked: boolean
  ) => {
    try {
      setError(null);
      
      await ShoppingListService.updateOfflineItemStatus(
        shoppingListId, 
        category, 
        itemId, 
        checked
      );
      
      // Refresh current entry if it matches
      if (currentEntry && currentEntry.metadata.id === shoppingListId) {
        await loadOfflineEntry(shoppingListId);
      }
      
      // Refresh all entries to update the list
      await loadOfflineEntries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item status';
      setError(errorMessage);
      console.error('Failed to update item status:', err);
      throw err;
    }
  }, [currentEntry, loadOfflineEntry, loadOfflineEntries]);

  // Delete offline entry
  const deleteOfflineEntry = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await ShoppingListService.deleteOfflineShoppingList(id);
      
      // Clear current entry if it was deleted
      if (currentEntry && currentEntry.metadata.id === id) {
        setCurrentEntry(null);
      }
      
      // Refresh entries
      await loadOfflineEntries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete shopping list ${id}`;
      setError(errorMessage);
      console.error('Failed to delete offline entry:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentEntry, loadOfflineEntries]);

  // Refresh entries
  const refreshEntries = useCallback(async () => {
    await loadOfflineEntries();
  }, [loadOfflineEntries]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get entries for specific week
  const getEntriesForWeek = useCallback((weekStartDate: string) => {
    return offlineEntries.filter(entry => entry.metadata.weekStartDate === weekStartDate);
  }, [offlineEntries]);

  // Get entries by meal plan ID
  const getEntriesByMealPlan = useCallback((mealPlanId: string) => {
    return offlineEntries.filter(entry => entry.metadata.mealPlanId === mealPlanId);
  }, [offlineEntries]);

  // Load entries on mount
  useEffect(() => {
    loadOfflineEntries();
  }, [loadOfflineEntries]);

  return {
    // State
    offlineEntries,
    currentEntry,
    loading,
    error,
    
    // Actions
    generateAndStore,
    loadOfflineEntry,
    updateItemStatus,
    deleteOfflineEntry,
    refreshEntries,
    clearError,
    
    // Utility
    getEntriesForWeek,
    getEntriesByMealPlan
  };
};

export default useOfflineShoppingList;