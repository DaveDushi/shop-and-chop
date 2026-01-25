import { useState, useEffect, useCallback } from 'react';
import { ShoppingList } from '../types/ShoppingList.types';
import { useShoppingList } from './useShoppingList';
import { useOfflineStatus } from './useOfflineStatus';
import { LocalStorageService, LocalShoppingListEntry } from '../services/localStorageService';
import { OfflineStorageCleanup } from '../utils/cleanupOfflineStorage';

interface ShoppingListEntry {
  id: string;
  shoppingList: ShoppingList;
  title: string;
  subtitle?: string;
  createdAt?: Date;
  isOffline?: boolean;
}

interface UseShoppingListPageReturn {
  // State
  shoppingLists: ShoppingListEntry[];
  currentShoppingList: ShoppingList | null;
  currentShoppingListId: string | null;
  currentTitle: string;
  loading: boolean;
  error: string | null;
  
  // View state
  viewMode: 'grid' | 'detail';
  
  // Actions
  loadShoppingLists: () => Promise<void>;
  selectShoppingList: (id: string, shoppingList: ShoppingList, title?: string) => void;
  goBackToGrid: () => void;
  handleItemToggle: (itemId: string, checked: boolean) => Promise<void>;
  clearError: () => void;
  
  // Utility
  hasShoppingLists: boolean;
  isOffline: boolean;
}

// Helper functions for localStorage persistence using the service
const saveShoppingListsToStorage = (lists: ShoppingListEntry[]) => {
  const localLists: LocalShoppingListEntry[] = lists
    .filter(list => !list.isOffline) // Only save non-offline lists
    .map(list => ({
      id: list.id,
      shoppingList: list.shoppingList,
      title: list.title,
      subtitle: list.subtitle,
      createdAt: list.createdAt?.toISOString() || new Date().toISOString(),
      isOffline: false
    }));

  LocalStorageService.saveShoppingLists(localLists);
};

const loadShoppingListsFromStorage = (): ShoppingListEntry[] => {
  const localLists = LocalStorageService.loadShoppingLists();
  return localLists.map(list => ({
    ...list,
    createdAt: new Date(list.createdAt)
  }));
};

export const useShoppingListPage = (): UseShoppingListPageReturn => {
  // State
  const [shoppingLists, setShoppingLists] = useState<ShoppingListEntry[]>([]);
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingList | null>(null);
  const [currentShoppingListId, setCurrentShoppingListId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState('Shopping List');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  // Hooks
  const { isOnline } = useOfflineStatus();
  const {
    shoppingList,
    isGenerating,
    error: shoppingListError,
    clearError: clearShoppingListError
  } = useShoppingList();

  // Load shopping lists from various sources
  const loadShoppingLists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, perform cleanup of offline storage and duplicates
      console.log('[ShoppingListPage] Performing storage cleanup...');
      const cleanupResult = await OfflineStorageCleanup.performFullCleanup();
      
      if (cleanupResult.indexedDBCleared) {
        console.log('[ShoppingListPage] Cleared IndexedDB to remove offline duplicates');
      }
      
      if (cleanupResult.localStorageDuplicatesRemoved > 0) {
        console.log(`[ShoppingListPage] Cleaned up ${cleanupResult.localStorageDuplicatesRemoved} localStorage duplicates`);
      }

      const lists: ShoppingListEntry[] = [];

      // Load from localStorage
      const storedLists = loadShoppingListsFromStorage();
      lists.push(...storedLists);

      // Add current shopping list if it exists and isn't already stored
      if (shoppingList) {
        const currentExists = lists.some(list => 
          list.id === 'current' || 
          JSON.stringify(list.shoppingList) === JSON.stringify(shoppingList)
        );

        if (!currentExists) {
          const currentEntry: ShoppingListEntry = {
            id: 'current',
            shoppingList,
            title: 'Current Shopping List',
            subtitle: 'Generated from meal plan',
            createdAt: new Date(),
            isOffline: false
          };
          
          lists.unshift(currentEntry);
          
          // Save the updated list to localStorage immediately
          saveShoppingListsToStorage(lists);
        }
      }

      // Sort by creation date (newest first)
      lists.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setShoppingLists(lists);
      console.log(`[ShoppingListPage] Loaded ${lists.length} shopping lists from storage`);
    } catch (err) {
      console.error('Failed to load shopping lists:', err);
      setError('Failed to load shopping lists. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [shoppingList]);

  // Save a shopping list to localStorage using the service
  const saveShoppingList = useCallback((shoppingList: ShoppingList, title?: string) => {
    const success = LocalStorageService.addShoppingList(shoppingList, title);
    
    if (success) {
      // Reload the lists to reflect the new addition
      const updatedLists = loadShoppingListsFromStorage();
      setShoppingLists(prevLists => {
        // Merge with offline lists
        const offlineLists = prevLists.filter(list => list.isOffline);
        const allLists = [...updatedLists, ...offlineLists];
        
        // Sort by creation date (newest first)
        allLists.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        return allLists;
      });
      
      console.log('[ShoppingListPage] Shopping list saved successfully');
    } else {
      console.error('[ShoppingListPage] Failed to save shopping list');
    }
  }, []);

  // Load shopping lists on mount and when shoppingList changes
  useEffect(() => {
    loadShoppingLists();
  }, [loadShoppingLists]); // Include dependencies

  // Separate effect for when shoppingList changes to avoid infinite loops
  useEffect(() => {
    if (shoppingList) {
      // Reload shopping lists when a new shopping list is generated
      loadShoppingLists();
    }
  }, [shoppingList, loadShoppingLists]);

  // Select a shopping list for detailed view
  const selectShoppingList = useCallback((id: string, shoppingList: ShoppingList, title?: string) => {
    setCurrentShoppingList(shoppingList);
    setCurrentShoppingListId(id);
    setCurrentTitle(title || 'Shopping List');
    setViewMode('detail');
  }, []);

  // Go back to grid view
  const goBackToGrid = useCallback(() => {
    setViewMode('grid');
    setCurrentShoppingList(null);
    setCurrentShoppingListId(null);
    setCurrentTitle('Shopping List');
  }, []);

  // Handle item toggle
  const handleItemToggle = useCallback(async (itemId: string, checked: boolean) => {
    if (!currentShoppingListId || !currentShoppingList) return;

    try {
      // Find the item and its category
      let targetCategory = '';
      let targetItem = null;

      for (const [category, items] of Object.entries(currentShoppingList)) {
        const item = items.find(item => (item.id || item.name) === itemId);
        if (item) {
          targetCategory = category;
          targetItem = item;
          break;
        }
      }

      if (!targetItem || !targetCategory) {
        throw new Error('Item not found');
      }

      // Update local state
      const updatedShoppingList = { ...currentShoppingList };
      updatedShoppingList[targetCategory] = updatedShoppingList[targetCategory].map(item => 
        (item.id || item.name) === itemId 
          ? { ...item, checked }
          : item
      );

      setCurrentShoppingList(updatedShoppingList);

      // Update the shopping lists array and save to localStorage
      setShoppingLists(prevLists => {
        const updatedLists = prevLists.map(list => 
          list.id === currentShoppingListId
            ? { ...list, shoppingList: updatedShoppingList }
            : list
        );
        
        // Save to localStorage
        saveShoppingListsToStorage(updatedLists);
        
        return updatedLists;
      });

    } catch (err) {
      console.error('Failed to update item status:', err);
      setError('Failed to update item. Please try again.');
    }
  }, [currentShoppingListId, currentShoppingList, shoppingLists]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    clearShoppingListError();
  }, [clearShoppingListError]);

  // Handle errors from hooks
  useEffect(() => {
    if (shoppingListError) {
      setError(shoppingListError);
    }
  }, [shoppingListError]);

  return {
    // State
    shoppingLists,
    currentShoppingList,
    currentShoppingListId,
    currentTitle,
    loading: loading || isGenerating,
    error,
    
    // View state
    viewMode,
    
    // Actions
    loadShoppingLists,
    selectShoppingList,
    goBackToGrid,
    handleItemToggle,
    clearError,
    
    // Utility
    hasShoppingLists: shoppingLists.length > 0,
    isOffline: !isOnline
  };
};