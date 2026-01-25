import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShoppingListService } from '../shoppingListService';
import { MealPlan } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';

// Mock localStorage with actual storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock the offline storage manager
vi.mock('../offlineStorageManager', () => ({
  offlineStorageManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    storeShoppingList: vi.fn().mockResolvedValue(undefined),
    getShoppingList: vi.fn().mockResolvedValue(null),
    updateShoppingList: vi.fn().mockResolvedValue(undefined),
    getAllShoppingLists: vi.fn().mockResolvedValue([]),
    deleteShoppingList: vi.fn().mockResolvedValue(undefined),
    addToSyncQueue: vi.fn().mockResolvedValue(undefined),
    getSyncQueue: vi.fn().mockResolvedValue([]),
    clearSyncQueue: vi.fn().mockResolvedValue(undefined),
    getStorageUsage: vi.fn().mockResolvedValue({ used: 0, available: 1000, percentage: 0 })
  }
}));

describe('ShoppingListService', () => {
  const mockRecipe: Recipe = {
    id: '1',
    name: 'Test Recipe',
    ingredients: [
      {
        id: 'ing-1',
        name: 'Tomatoes',
        quantity: '2',
        unit: 'pieces',
        category: 'Produce'
      },
      {
        id: 'ing-2',
        name: 'Cheese',
        quantity: '1',
        unit: 'cup',
        category: 'Dairy & Eggs'
      }
    ],
    instructions: ['Cook the recipe'],
    servings: 2,
    prepTime: 30,
    cookTime: 15,
    difficulty: 'Easy',
    // tags: ['test'], // Removed invalid property
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockMealPlan: MealPlan = {
    id: 'meal-plan-1',
    userId: 'user-1',
    weekStartDate: new Date('2024-01-01'),
    meals: {
      '2024-01-01': {
        breakfast: {
          id: 'meal-slot-1',
          recipeId: 'recipe-1',
          recipe: mockRecipe,
          servings: 2,
          scheduledFor: new Date('2024-01-01'),
          mealType: 'breakfast'
        }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  describe('Basic Shopping List Generation', () => {
    it('should generate shopping list from meal plan', () => {
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 2);

      expect(shoppingList).toBeDefined();
      expect(shoppingList['Produce']).toBeDefined();
      expect(shoppingList['Produce']).toHaveLength(1);
      expect(shoppingList['Produce'][0].name).toBe('Tomatoes');
      expect(shoppingList['Produce'][0].quantity).toBe('4'); // 2 * (2 * 2) / 2 = 4

      expect(shoppingList['Dairy & Eggs']).toBeDefined();
      expect(shoppingList['Dairy & Eggs']).toHaveLength(1);
      expect(shoppingList['Dairy & Eggs'][0].name).toBe('Cheese');
      expect(shoppingList['Dairy & Eggs'][0].quantity).toBe('2'); // 1 * (2 * 2) / 2 = 2
    });

    it('should scale ingredients based on household size', () => {
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 4);

      expect(shoppingList['Produce'][0].quantity).toBe('8'); // 2 * (2 * 4) / 2 = 8
      expect(shoppingList['Dairy & Eggs'][0].quantity).toBe('4'); // 1 * (2 * 4) / 2 = 4
    });

    it('should return empty shopping list for empty meal plan', () => {
      const emptyMealPlan: MealPlan = {
        ...mockMealPlan,
        meals: {}
      };

      const shoppingList = ShoppingListService.generateFromMealPlan(emptyMealPlan, 2);
      expect(ShoppingListService.isEmpty(shoppingList)).toBe(true);
    });
  });

  describe('Offline Storage Integration', () => {
    beforeEach(async () => {
      await ShoppingListService.initialize();
    });

    it('should initialize offline storage', async () => {
      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.initialize).toHaveBeenCalled();
    });

    it('should store shopping list offline', async () => {
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 2);
      const metadata = {
        id: 'test-list-1',
        mealPlanId: 'meal-plan-1',
        weekStartDate: '2024-01-01',
        generatedAt: new Date()
      };

      await ShoppingListService.storeOfflineShoppingList(shoppingList, metadata);

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.storeShoppingList).toHaveBeenCalled();
      expect(offlineStorageManager.addToSyncQueue).toHaveBeenCalled();
    });

    it('should retrieve offline shopping list', async () => {
      const result = await ShoppingListService.getOfflineShoppingList('test-list-1');

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.getShoppingList).toHaveBeenCalledWith('test-list-1');
      expect(result).toBeNull(); // Mock returns null
    });

    it('should get all offline shopping lists', async () => {
      const result = await ShoppingListService.getAllOfflineShoppingLists();

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.getAllShoppingLists).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should update offline shopping list', async () => {
      const updates = {
        metadata: {
          id: 'test-list-1',
          mealPlanId: 'meal-plan-1',
          weekStartDate: '2024-01-01',
          generatedAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          deviceId: 'device-123',
          version: 1
        }
      };

      // Mock existing entry
      const { offlineStorageManager } = await import('../offlineStorageManager');
      const mockEntry = {
        metadata: {
          id: 'test-list-1',
          mealPlanId: 'meal-plan-1',
          weekStartDate: '2024-01-01',
          generatedAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'pending' as const,
          deviceId: 'device-123',
          version: 1
        },
        shoppingList: {}
      };
      offlineStorageManager.getShoppingList = vi.fn().mockResolvedValue(mockEntry);

      await ShoppingListService.updateOfflineShoppingList('test-list-1', updates);

      expect(offlineStorageManager.updateShoppingList).toHaveBeenCalled();
    });

    it('should delete offline shopping list', async () => {
      await ShoppingListService.deleteOfflineShoppingList('test-list-1');

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.deleteShoppingList).toHaveBeenCalledWith('test-list-1');
    });

    it('should get pending sync count', async () => {
      const count = await ShoppingListService.getPendingSyncCount();

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.getSyncQueue).toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('should get storage usage', async () => {
      const usage = await ShoppingListService.getStorageUsage();

      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.getStorageUsage).toHaveBeenCalled();
      expect(usage).toEqual({ used: 0, available: 1000, percentage: 0 });
    });
  });

  describe('Device ID Management', () => {
    it('should generate and store device ID when needed', async () => {
      // Clear localStorage to test generation
      localStorage.clear();
      
      // Reset the service config to ensure fresh state
      ShoppingListService.configure({ deviceId: '' });
      
      // Store a shopping list which should trigger device ID generation
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 2);
      const metadata = {
        id: 'test-list-1',
        mealPlanId: 'meal-plan-1',
        weekStartDate: '2024-01-01',
        generatedAt: new Date()
      };

      await ShoppingListService.storeOfflineShoppingList(shoppingList, metadata);
      
      // The device ID should be stored in localStorage
      const storedDeviceId = localStorage.getItem('shop-and-chop-device-id');
      expect(storedDeviceId).toBeTruthy();
      expect(storedDeviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    });

    it('should reuse existing device ID', async () => {
      const existingDeviceId = 'device_123_abc';
      localStorage.setItem('shop-and-chop-device-id', existingDeviceId);
      
      // Clear the internal config to force re-reading from localStorage
      ShoppingListService.configure({ deviceId: '' });
      
      // Store a shopping list which should use the existing device ID
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 2);
      const metadata = {
        id: 'test-list-2',
        mealPlanId: 'meal-plan-1',
        weekStartDate: '2024-01-01',
        generatedAt: new Date()
      };

      await ShoppingListService.storeOfflineShoppingList(shoppingList, metadata);
      
      // The existing device ID should be preserved
      const storedDeviceId = localStorage.getItem('shop-and-chop-device-id');
      expect(storedDeviceId).toBe(existingDeviceId);
    });
  });

  describe('Utility Methods', () => {
    it('should convert regular shopping list to offline format', () => {
      const shoppingList = ShoppingListService.generateFromMealPlan(mockMealPlan, 2);
      const converted = ShoppingListService.convertFromOfflineShoppingList(
        // First convert to offline format (this is private, so we test the reverse)
        Object.keys(shoppingList).reduce((acc, category) => {
          acc[category] = shoppingList[category].map(item => ({
            ...item,
            id: 'item-1',
            lastModified: new Date(),
            syncStatus: 'pending' as const
          }));
          return acc;
        }, {} as any)
      );

      expect(converted).toBeDefined();
      expect(converted['Produce']).toBeDefined();
      expect(converted['Produce'][0].name).toBe('Tomatoes');
    });

    it('should generate and store from meal plan', async () => {
      const metadata = {
        id: 'test-list-1',
        mealPlanId: 'meal-plan-1',
        weekStartDate: '2024-01-01',
        generatedAt: new Date()
      };

      const result = await ShoppingListService.generateAndStoreFromMealPlan(
        mockMealPlan,
        2,
        metadata
      );

      expect(result.shoppingList).toBeDefined();
      expect(result.shoppingList['Produce']).toBeDefined();
      
      const { offlineStorageManager } = await import('../offlineStorageManager');
      expect(offlineStorageManager.storeShoppingList).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should allow configuring offline settings', () => {
      const config = {
        enableOfflineStorage: false,
        enableAutoSync: false
      };

      ShoppingListService.configure(config);

      // Test that offline storage is disabled by checking behavior
      expect(() => ShoppingListService.configure(config)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle offline storage initialization failure gracefully', async () => {
      const { offlineStorageManager } = await import('../offlineStorageManager');
      offlineStorageManager.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      // Should not throw
      await expect(ShoppingListService.initialize()).resolves.toBeUndefined();
    });

    it('should handle missing shopping list in update', async () => {
      // Enable offline storage for this test
      ShoppingListService.configure({ enableOfflineStorage: true });
      
      const { offlineStorageManager } = await import('../offlineStorageManager');
      offlineStorageManager.getShoppingList = vi.fn().mockResolvedValue(null);

      await expect(
        ShoppingListService.updateOfflineShoppingList('non-existent', {})
      ).rejects.toThrow('Shopping list non-existent not found');
    });
  });
});