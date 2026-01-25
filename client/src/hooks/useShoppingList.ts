import { useState, useCallback, useEffect } from 'react';
import { MealPlan } from '../types/MealPlan.types';
import { ShoppingList } from '../types/ShoppingList.types';
import { OfflineShoppingListEntry, ShoppingListMetadata } from '../types/OfflineStorage.types';
import { ShoppingListService } from '../services/shoppingListService';
import { ShoppingListApiService } from '../services/shoppingListApiService';
import { useOfflineStatus } from './useOfflineStatus';

interface UseShoppingListOptions {
  householdSize?: number;
  useApiGeneration?: boolean; // Whether to use API or client-side generation
  enableOfflineStorage?: boolean; // Whether to enable offline storage
  enableAutoSync?: boolean; // Whether to enable automatic synchronization
}

interface UseShoppingListReturn {
  // Core state
  shoppingList: ShoppingList | null;
  isGenerating: boolean;
  error: string | null;
  
  // Offline state
  offlineEntry: OfflineShoppingListEntry | null;
  isOffline: boolean;
  pendingSyncCount: number;
  
  // Core actions
  generateShoppingList: (mealPlan: MealPlan, metadata?: Partial<ShoppingListMetadata>) => Promise<void>;
  generateFromApi: (mealPlanId: string) => Promise<void>;
  clearShoppingList: () => void;
  clearError: () => void;
  saveToShoppingList: (shoppingList: ShoppingList) => Promise<void>;
  
  // Offline actions
  loadOfflineShoppingList: (id: string) => Promise<void>;
  updateItemStatus: (category: string, itemId: string, checked: boolean) => Promise<void>;
  syncShoppingList: () => Promise<void>;
  
  // Utility
  hasOfflineData: boolean;
}

export const useShoppingList = (options: UseShoppingListOptions = {}): UseShoppingListReturn => {
  const { 
    householdSize = 2, 
    enableOfflineStorage = true,
    enableAutoSync = true
  } = options;
  
  // Core state
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Offline state
  const [offlineEntry, setOfflineEntry] = useState<OfflineShoppingListEntry | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  
  // Network status
  const { isOnline } = useOfflineStatus();

  // Initialize service configuration
  useEffect(() => {
    ShoppingListService.configure({
      enableOfflineStorage,
      enableAutoSync,
      compressionEnabled: true,
      deviceId: '' // Will be auto-generated
    });
  }, [enableOfflineStorage, enableAutoSync]);

  // Load pending sync count
  const loadPendingSyncCount = useCallback(async () => {
    if (!enableOfflineStorage) return;
    
    try {
      const count = await ShoppingListService.getPendingSyncCount();
      setPendingSyncCount(count);
    } catch (err) {
      console.error('Failed to load pending sync count:', err);
    }
  }, [enableOfflineStorage]);

  // Load pending sync count on mount and when online status changes
  useEffect(() => {
    loadPendingSyncCount();
  }, [loadPendingSyncCount, isOnline]);

  const generateShoppingList = useCallback(async (
    mealPlan: MealPlan, 
    metadata?: Partial<ShoppingListMetadata>
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Check if meal plan has any meals
      const hasMeals = Object.values(mealPlan.meals).some(dayMeals => 
        Object.values(dayMeals).some(mealSlot => mealSlot !== undefined)
      );

      if (!hasMeals) {
        throw new Error('No meals found in the meal plan. Add some meals to generate a shopping list.');
      }

      if (enableOfflineStorage && metadata) {
        // Generate and store offline
        const result = await ShoppingListService.generateAndStoreFromMealPlan(
          mealPlan, 
          householdSize, 
          {
            id: metadata.id || `sl_${Date.now()}`,
            mealPlanId: metadata.mealPlanId || '',
            weekStartDate: metadata.weekStartDate || new Date().toISOString(),
            generatedAt: new Date()
          }
        );
        
        setShoppingList(result.shoppingList);
        setOfflineEntry(result.offlineEntry || null);
        
        // Update pending sync count
        await loadPendingSyncCount();
      } else {
        // Generate in-memory only
        const generatedList = ShoppingListService.generateFromMealPlan(mealPlan, householdSize);

        if (ShoppingListService.isEmpty(generatedList)) {
          throw new Error('Unable to generate shopping list. Please ensure your recipes have ingredients.');
        }

        setShoppingList(generatedList);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate shopping list';
      setError(errorMessage);
      console.error('Shopping list generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [householdSize, enableOfflineStorage, loadPendingSyncCount]);

  const generateFromApi = useCallback(async (mealPlanId: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!isOnline && enableOfflineStorage) {
        // Try to load from offline storage first
        const offlineEntries = await ShoppingListService.getOfflineShoppingListsByMealPlan(mealPlanId);
        if (offlineEntries.length > 0) {
          const latestEntry = offlineEntries.sort((a, b) => 
            new Date(b.metadata.generatedAt).getTime() - new Date(a.metadata.generatedAt).getTime()
          )[0];
          
          const convertedList = ShoppingListService.convertFromOfflineShoppingList(latestEntry.shoppingList);
          setShoppingList(convertedList);
          setOfflineEntry(latestEntry);
          return;
        }
        
        throw new Error('No offline shopping list available for this meal plan');
      }

      // Generate from API when online
      const response = await ShoppingListApiService.generateFromMealPlan(mealPlanId);
      setShoppingList(response.shoppingList);
      
      // Store offline if enabled
      if (enableOfflineStorage) {
        try {
          await ShoppingListService.storeOfflineShoppingList(response.shoppingList, {
            id: `api_${mealPlanId}_${Date.now()}`,
            mealPlanId,
            weekStartDate: new Date().toISOString(),
            generatedAt: new Date()
          });
          await loadPendingSyncCount();
        } catch (offlineError) {
          console.warn('Failed to store API-generated list offline:', offlineError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate shopping list from server';
      setError(errorMessage);
      console.error('API shopping list generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [isOnline, enableOfflineStorage, loadPendingSyncCount]);

  const saveToShoppingList = useCallback(async (shoppingList: ShoppingList) => {
    try {
      if (!isOnline && enableOfflineStorage) {
        // Save offline only when offline
        const metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'> = {
          id: `saved_${Date.now()}`,
          mealPlanId: '',
          weekStartDate: new Date().toISOString(),
          generatedAt: new Date()
        };
        
        await ShoppingListService.storeOfflineShoppingList(shoppingList, metadata);
        await loadPendingSyncCount();
      } else {
        // Save to API when online
        await ShoppingListApiService.saveShoppingList(shoppingList);
        
        // Also store offline if enabled
        if (enableOfflineStorage) {
          const metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'> = {
            id: `saved_${Date.now()}`,
            mealPlanId: '',
            weekStartDate: new Date().toISOString(),
            generatedAt: new Date()
          };
          
          await ShoppingListService.storeOfflineShoppingList(shoppingList, metadata);
          await loadPendingSyncCount();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save shopping list';
      throw new Error(errorMessage);
    }
  }, [isOnline, enableOfflineStorage, loadPendingSyncCount]);

  const clearShoppingList = useCallback(() => {
    setShoppingList(null);
    setOfflineEntry(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load offline shopping list by ID
  const loadOfflineShoppingList = useCallback(async (id: string) => {
    if (!enableOfflineStorage) {
      throw new Error('Offline storage is disabled');
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      const entry = await ShoppingListService.getOfflineShoppingList(id);
      if (!entry) {
        throw new Error(`Shopping list ${id} not found`);
      }
      
      const convertedList = ShoppingListService.convertFromOfflineShoppingList(entry.shoppingList);
      setShoppingList(convertedList);
      setOfflineEntry(entry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load shopping list ${id}`;
      setError(errorMessage);
      console.error('Failed to load offline shopping list:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [enableOfflineStorage]);

  // Update item status (check/uncheck)
  const updateItemStatus = useCallback(async (category: string, itemId: string, checked: boolean) => {
    if (!offlineEntry) {
      throw new Error('No shopping list loaded');
    }

    try {
      setError(null);
      
      await ShoppingListService.updateOfflineItemStatus(
        offlineEntry.metadata.id,
        category,
        itemId,
        checked
      );
      
      // Reload the entry to reflect changes
      await loadOfflineShoppingList(offlineEntry.metadata.id);
      await loadPendingSyncCount();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item status';
      setError(errorMessage);
      console.error('Failed to update item status:', err);
      throw err;
    }
  }, [offlineEntry, loadOfflineShoppingList, loadPendingSyncCount]);

  // Trigger manual sync
  const syncShoppingList = useCallback(async () => {
    if (!enableOfflineStorage) {
      throw new Error('Offline storage is disabled');
    }

    try {
      setError(null);
      
      await ShoppingListService.triggerManualSync();
      await loadPendingSyncCount();
      
      // Reload current entry if it exists to get updated sync status
      if (offlineEntry) {
        await loadOfflineShoppingList(offlineEntry.metadata.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync shopping list';
      setError(errorMessage);
      console.error('Failed to sync shopping list:', err);
      throw err;
    }
  }, [enableOfflineStorage, loadPendingSyncCount, offlineEntry, loadOfflineShoppingList]);

  return {
    // Core state
    shoppingList,
    isGenerating,
    error,
    
    // Offline state
    offlineEntry,
    isOffline: !isOnline,
    pendingSyncCount,
    
    // Core actions
    generateShoppingList,
    generateFromApi,
    clearShoppingList,
    clearError,
    saveToShoppingList,
    
    // Offline actions
    loadOfflineShoppingList,
    updateItemStatus,
    syncShoppingList,
    
    // Utility
    hasOfflineData: offlineEntry !== null
  };
};