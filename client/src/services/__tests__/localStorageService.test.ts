/**
 * Tests for LocalStorageService
 */

import { LocalStorageService } from '../localStorageService';
import { ShoppingList } from '../../types/ShoppingList.types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('LocalStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockShoppingList: ShoppingList = {
    'Produce': [
      {
        name: 'Tomatoes',
        quantity: '2',
        unit: 'lbs',
        category: 'Produce',
        recipes: ['Test Recipe'],
        checked: false
      }
    ],
    'Pantry': [
      {
        name: 'Olive Oil',
        quantity: '1',
        unit: 'bottle',
        category: 'Pantry',
        recipes: ['Test Recipe'],
        checked: false
      }
    ]
  };

  describe('isAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(LocalStorageService.isAvailable()).toBe(true);
    });
  });

  describe('addShoppingList', () => {
    it('should add a shopping list to localStorage', () => {
      const success = LocalStorageService.addShoppingList(mockShoppingList, 'Test List');
      expect(success).toBe(true);

      const lists = LocalStorageService.loadShoppingLists();
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('Test List');
      expect(lists[0].shoppingList).toEqual(mockShoppingList);
    });

    it('should not add duplicate shopping lists', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List 1');
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List 2'); // Same content

      const lists = LocalStorageService.loadShoppingLists();
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('Test List 1');
    });

    it('should generate default title when none provided', () => {
      const success = LocalStorageService.addShoppingList(mockShoppingList);
      expect(success).toBe(true);

      const lists = LocalStorageService.loadShoppingLists();
      expect(lists[0].title).toContain('Shopping List');
    });
  });

  describe('loadShoppingLists', () => {
    it('should return empty array when no lists stored', () => {
      const lists = LocalStorageService.loadShoppingLists();
      expect(lists).toEqual([]);
    });

    it('should load stored shopping lists', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List');
      const lists = LocalStorageService.loadShoppingLists();
      
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('Test List');
      expect(lists[0].shoppingList).toEqual(mockShoppingList);
    });

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem('shop-and-chop-shopping-lists', 'invalid json');
      const lists = LocalStorageService.loadShoppingLists();
      expect(lists).toEqual([]);
    });
  });

  describe('updateShoppingList', () => {
    it('should update an existing shopping list', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Original Title');
      const lists = LocalStorageService.loadShoppingLists();
      const listId = lists[0].id;

      const success = LocalStorageService.updateShoppingList(listId, {
        title: 'Updated Title'
      });

      expect(success).toBe(true);
      const updatedLists = LocalStorageService.loadShoppingLists();
      expect(updatedLists[0].title).toBe('Updated Title');
    });

    it('should return false for non-existent list', () => {
      const success = LocalStorageService.updateShoppingList('non-existent', {
        title: 'New Title'
      });
      expect(success).toBe(false);
    });
  });

  describe('removeShoppingList', () => {
    it('should remove a shopping list', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List');
      const lists = LocalStorageService.loadShoppingLists();
      const listId = lists[0].id;

      const success = LocalStorageService.removeShoppingList(listId);
      expect(success).toBe(true);

      const remainingLists = LocalStorageService.loadShoppingLists();
      expect(remainingLists).toHaveLength(0);
    });

    it('should return false for non-existent list', () => {
      const success = LocalStorageService.removeShoppingList('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('clearAllShoppingLists', () => {
    it('should clear all shopping lists', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List 1');
      LocalStorageService.addShoppingList({
        'Dairy': [
          {
            name: 'Milk',
            quantity: '1',
            unit: 'gallon',
            category: 'Dairy',
            recipes: ['Test Recipe 2'],
            checked: false
          }
        ]
      }, 'Test List 2');

      expect(LocalStorageService.loadShoppingLists()).toHaveLength(2);

      const success = LocalStorageService.clearAllShoppingLists();
      expect(success).toBe(true);
      expect(LocalStorageService.loadShoppingLists()).toHaveLength(0);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate shopping lists', () => {
      // Add the same shopping list twice with different titles
      LocalStorageService.addShoppingList(mockShoppingList, 'First List');
      
      // Manually add a duplicate by bypassing the duplicate check
      const existingLists = LocalStorageService.loadShoppingLists();
      const duplicateEntry = {
        ...existingLists[0],
        id: 'duplicate_id',
        title: 'Duplicate List',
        createdAt: new Date().toISOString()
      };
      
      // Manually save with duplicate
      localStorage.setItem('shop-and-chop-shopping-lists', JSON.stringify([...existingLists, duplicateEntry]));
      
      // Verify we have 2 lists
      expect(LocalStorageService.loadShoppingLists()).toHaveLength(2);
      
      // Remove duplicates
      const removed = LocalStorageService.removeDuplicates();
      expect(removed).toBe(1);
      
      // Verify only 1 list remains
      const finalLists = LocalStorageService.loadShoppingLists();
      expect(finalLists).toHaveLength(1);
      expect(finalLists[0].title).toBe('First List'); // Should keep the first one
    });

    it('should return 0 when no duplicates exist', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Unique List');
      const removed = LocalStorageService.removeDuplicates();
      expect(removed).toBe(0);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      LocalStorageService.addShoppingList(mockShoppingList, 'Test List');
      const info = LocalStorageService.getStorageInfo();

      expect(info.totalLists).toBe(1);
      expect(info.storageSize).toBeGreaterThan(0);
      expect(info.isAvailable).toBe(true);
    });
  });
});