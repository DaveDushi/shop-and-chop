/**
 * Local Storage Service for Shopping Lists
 * Provides reliable localStorage operations with error handling
 */

import { ShoppingList } from '../types/ShoppingList.types';

export interface LocalShoppingListEntry {
  id: string;
  shoppingList: ShoppingList;
  title: string;
  subtitle?: string;
  createdAt: string;
  isOffline?: boolean;
}

const STORAGE_KEY = 'shop-and-chop-shopping-lists';
const MAX_STORED_LISTS = 20;

export class LocalStorageService {
  /**
   * Save shopping lists to localStorage
   */
  static saveShoppingLists(lists: LocalShoppingListEntry[]): boolean {
    try {
      const serializedLists = lists.map(list => ({
        ...list,
        createdAt: typeof list.createdAt === 'string' ? list.createdAt : new Date(list.createdAt).toISOString()
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedLists));
      console.log(`[LocalStorageService] Saved ${lists.length} shopping lists to localStorage`);
      return true;
    } catch (error) {
      console.error('[LocalStorageService] Failed to save shopping lists to localStorage:', error);
      return false;
    }
  }

  /**
   * Load shopping lists from localStorage
   */
  static loadShoppingLists(): LocalShoppingListEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('[LocalStorageService] No shopping lists found in localStorage');
        return [];
      }
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('[LocalStorageService] Invalid data format in localStorage, clearing');
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }

      const lists = parsed.map((list: any) => ({
        ...list,
        createdAt: typeof list.createdAt === 'string' ? list.createdAt : new Date().toISOString()
      }));

      console.log(`[LocalStorageService] Loaded ${lists.length} shopping lists from localStorage`);
      return lists;
    } catch (error) {
      console.error('[LocalStorageService] Failed to load shopping lists from localStorage:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.error('[LocalStorageService] Failed to clear corrupted localStorage data:', clearError);
      }
      return [];
    }
  }

  /**
   * Add a new shopping list to localStorage
   */
  static addShoppingList(shoppingList: ShoppingList, title?: string): boolean {
    try {
      const existingLists = this.loadShoppingLists();
      
      // More robust duplicate detection
      const isDuplicate = existingLists.some(existing => {
        // Check if shopping lists have the same content
        const existingContent = this.normalizeShoppingListForComparison(existing.shoppingList);
        const newContent = this.normalizeShoppingListForComparison(shoppingList);
        return JSON.stringify(existingContent) === JSON.stringify(newContent);
      });

      if (isDuplicate) {
        console.log('[LocalStorageService] Shopping list already exists, skipping duplicate');
        return true; // Return true since the list is already saved
      }

      const newEntry: LocalShoppingListEntry = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shoppingList,
        title: title || `Shopping List ${new Date().toLocaleDateString()}`,
        subtitle: 'Saved shopping list',
        createdAt: new Date().toISOString(),
        isOffline: false
      };

      // Add to beginning and limit total count
      const updatedLists = [newEntry, ...existingLists.slice(0, MAX_STORED_LISTS - 1)];
      
      return this.saveShoppingLists(updatedLists);
    } catch (error) {
      console.error('[LocalStorageService] Failed to add shopping list:', error);
      return false;
    }
  }

  /**
   * Normalize shopping list for comparison (removes timestamps, IDs, etc.)
   */
  private static normalizeShoppingListForComparison(shoppingList: ShoppingList): any {
    const normalized: any = {};
    
    Object.keys(shoppingList).forEach(category => {
      normalized[category] = shoppingList[category]
        .map(item => ({
          name: item.name.trim().toLowerCase(),
          quantity: item.quantity.trim(),
          unit: item.unit.trim().toLowerCase(),
          category: item.category.trim().toLowerCase(),
          recipes: (item.recipes || []).map(r => r.trim().toLowerCase()).sort()
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return normalized;
  }

  /**
   * Update an existing shopping list in localStorage
   */
  static updateShoppingList(id: string, updates: Partial<LocalShoppingListEntry>): boolean {
    try {
      const existingLists = this.loadShoppingLists();
      const listIndex = existingLists.findIndex(list => list.id === id);
      
      if (listIndex === -1) {
        console.warn(`[LocalStorageService] Shopping list with ID ${id} not found`);
        return false;
      }

      existingLists[listIndex] = {
        ...existingLists[listIndex],
        ...updates,
        createdAt: existingLists[listIndex].createdAt // Preserve original creation date
      };

      return this.saveShoppingLists(existingLists);
    } catch (error) {
      console.error('[LocalStorageService] Failed to update shopping list:', error);
      return false;
    }
  }

  /**
   * Remove a shopping list from localStorage
   */
  static removeShoppingList(id: string): boolean {
    try {
      const existingLists = this.loadShoppingLists();
      const filteredLists = existingLists.filter(list => list.id !== id);
      
      if (filteredLists.length === existingLists.length) {
        console.warn(`[LocalStorageService] Shopping list with ID ${id} not found`);
        return false;
      }

      return this.saveShoppingLists(filteredLists);
    } catch (error) {
      console.error('[LocalStorageService] Failed to remove shopping list:', error);
      return false;
    }
  }

  /**
   * Clear all shopping lists from localStorage
   */
  static clearAllShoppingLists(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[LocalStorageService] Cleared all shopping lists from localStorage');
      return true;
    } catch (error) {
      console.error('[LocalStorageService] Failed to clear shopping lists from localStorage:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { 
    totalLists: number; 
    storageSize: number; 
    isAvailable: boolean;
  } {
    try {
      const lists = this.loadShoppingLists();
      const storageSize = localStorage.getItem(STORAGE_KEY)?.length || 0;
      
      return {
        totalLists: lists.length,
        storageSize,
        isAvailable: true
      };
    } catch (error) {
      console.error('[LocalStorageService] Failed to get storage info:', error);
      return {
        totalLists: 0,
        storageSize: 0,
        isAvailable: false
      };
    }
  }

  /**
   * Remove duplicate shopping lists from localStorage
   */
  static removeDuplicates(): number {
    try {
      const lists = this.loadShoppingLists();
      const uniqueLists: LocalShoppingListEntry[] = [];
      const seenContent = new Set<string>();

      for (const list of lists) {
        const normalizedContent = JSON.stringify(
          this.normalizeShoppingListForComparison(list.shoppingList)
        );
        
        if (!seenContent.has(normalizedContent)) {
          seenContent.add(normalizedContent);
          uniqueLists.push(list);
        }
      }

      const duplicatesRemoved = lists.length - uniqueLists.length;
      
      if (duplicatesRemoved > 0) {
        this.saveShoppingLists(uniqueLists);
        console.log(`[LocalStorageService] Removed ${duplicatesRemoved} duplicate shopping lists`);
      }

      return duplicatesRemoved;
    } catch (error) {
      console.error('[LocalStorageService] Failed to remove duplicates:', error);
      return 0;
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('[LocalStorageService] localStorage is not available:', error);
      return false;
    }
  }
}