import { MealPlan } from '../types/MealPlan.types';
import { Recipe } from '../types/Recipe.types';
import { ShoppingList, ShoppingListItem } from '../types/ShoppingList.types';
import { 
  OfflineShoppingListEntry, 
  ShoppingListMetadata, 
  SyncOperation,
  OfflineShoppingList,
  OfflineShoppingListItem
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { syncQueueManager } from './syncQueueManager';

interface MealPlanItem {
  servings: number;
  recipe: Recipe;
}

interface OfflineShoppingListServiceConfig {
  enableOfflineStorage: boolean;
  enableAutoSync: boolean;
  compressionEnabled: boolean;
  deviceId: string;
}

export class ShoppingListService {
  private static config: OfflineShoppingListServiceConfig = {
    enableOfflineStorage: false, // Disabled by default to prevent duplicates
    enableAutoSync: false, // Disabled by default
    compressionEnabled: true,
    deviceId: '' // Will be generated when needed
  };
  private static isInitialized = false;

  /**
   * Check if the service is initialized and auto-initialize if needed
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      console.log('[ShoppingListService] Auto-initializing service...');
      await this.initialize();
    }
  }

  /**
   * Get or generate device ID
   */
  private static getDeviceId(): string {
    if (!this.config.deviceId) {
      this.config.deviceId = this.generateDeviceId();
    }
    return this.config.deviceId;
  }

  /**
   * Initialize the offline storage manager
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ShoppingListService] Already initialized, skipping...');
      return;
    }

    try {
      console.log('[ShoppingListService] Initializing offline storage...');
      await offlineStorageManager.initialize();
      this.isInitialized = true;
      console.log('[ShoppingListService] Offline capabilities initialized successfully');
    } catch (error) {
      console.error('[ShoppingListService] Failed to initialize offline storage:', error);
      // Continue without offline capabilities
      this.config.enableOfflineStorage = false;
      this.isInitialized = true; // Mark as initialized even if offline storage failed
      console.warn('[ShoppingListService] Continuing without offline storage capabilities');
    }
  }

  /**
   * Generate a unique device ID for cross-device sync
   */
  private static generateDeviceId(): string {
    // Try to get existing device ID from localStorage
    const existingId = localStorage.getItem('shop-and-chop-device-id');
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('shop-and-chop-device-id', deviceId);
    return deviceId;
  }

  /**
   * Configure offline service settings
   */
  static configure(config: Partial<OfflineShoppingListServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If deviceId is being set to empty, generate a new one
    if (config.deviceId === '') {
      this.config.deviceId = this.generateDeviceId();
    }
  }

  /**
   * Check if the service is initialized
   */
  static isServiceInitialized(): boolean {
    return this.isInitialized;
  }
  /**
   * Generate a shopping list from a meal plan
   */
  static generateFromMealPlan(mealPlan: MealPlan, householdSize: number = 2): ShoppingList {
    const meals: MealPlanItem[] = [];

    // Extract all meals from the meal plan
    Object.values(mealPlan.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(mealSlot => {
        if (mealSlot) {
          meals.push({
            servings: mealSlot.servings,
            recipe: mealSlot.recipe
          });
        }
      });
    });

    return this.generateFromMeals(meals, householdSize);
  }

  /**
   * Generate a shopping list from an array of meals
   */
  static generateFromMeals(meals: MealPlanItem[], householdSize: number = 2): ShoppingList {
    const consolidatedIngredients = new Map<string, ShoppingListItem>();

    // Process each meal
    meals.forEach(meal => {
      const { recipe, servings } = meal;
      const scalingFactor = (servings * householdSize) / recipe.servings;

      recipe.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
        
        if (consolidatedIngredients.has(key)) {
          // Consolidate existing ingredient
          const existing = consolidatedIngredients.get(key)!;
          const existingQuantity = this.parseQuantity(existing.quantity);
          const newQuantity = this.parseQuantity(ingredient.quantity) * scalingFactor;
          
          existing.quantity = this.formatQuantity(existingQuantity + newQuantity);
          const recipeName = recipe.name || recipe.title || 'Unknown Recipe';
          if (!existing.recipes.includes(recipeName)) {
            existing.recipes.push(recipeName);
          }
        } else {
          // Add new ingredient
          const scaledQuantity = this.parseQuantity(ingredient.quantity) * scalingFactor;
          const recipeName = recipe.name || recipe.title || 'Unknown Recipe';
          consolidatedIngredients.set(key, {
            name: ingredient.name,
            quantity: this.formatQuantity(scaledQuantity),
            unit: ingredient.unit,
            category: ingredient.category,
            recipes: [recipeName],
            checked: false
          });
        }
      });
    });

    // Group by category
    const shoppingList: ShoppingList = {};
    
    consolidatedIngredients.forEach(item => {
      if (!shoppingList[item.category]) {
        shoppingList[item.category] = [];
      }
      shoppingList[item.category].push(item);
    });

    // Sort categories and items
    return this.sortShoppingList(shoppingList);
  }

  /**
   * Sort shopping list by category priority and item names
   */
  private static sortShoppingList(shoppingList: ShoppingList): ShoppingList {
    const sortedShoppingList: ShoppingList = {};
    const categoryOrder = [
      'Produce',
      'Meat & Seafood',
      'Dairy & Eggs',
      'Pantry',
      'Grains & Bread',
      'Frozen',
      'Beverages',
      'Other'
    ];

    // Add categories in preferred order
    categoryOrder.forEach(category => {
      if (shoppingList[category]) {
        sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      }
    });

    // Add any remaining categories
    Object.keys(shoppingList).forEach(category => {
      if (!categoryOrder.includes(category)) {
        sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      }
    });

    return sortedShoppingList;
  }

  /**
   * Parse quantity string to number
   */
  private static parseQuantity(quantity: string): number {
    // Handle fractions and mixed numbers
    const fractionMatch = quantity.match(/(\d+)?\s*(\d+)\/(\d+)/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1] || '0', 10);
      const numerator = parseInt(fractionMatch[2], 10);
      const denominator = parseInt(fractionMatch[3], 10);
      return whole + (numerator / denominator);
    }

    // Handle decimal numbers
    const decimalMatch = quantity.match(/(\d+\.?\d*)/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }

    // Default to 1 if no number found
    return 1;
  }

  /**
   * Format quantity number to string
   */
  private static formatQuantity(quantity: number): string {
    // Round to reasonable precision
    if (quantity < 1) {
      // Convert to fraction for small amounts
      const fractions = [
        [0.125, '1/8'],
        [0.25, '1/4'],
        [0.33, '1/3'],
        [0.5, '1/2'],
        [0.67, '2/3'],
        [0.75, '3/4']
      ];

      for (const [decimal, fraction] of fractions) {
        if (Math.abs(quantity - (decimal as number)) < 0.05) {
          return fraction as string;
        }
      }
    }

    // Round to 2 decimal places and remove trailing zeros
    return parseFloat(quantity.toFixed(2)).toString();
  }

  /**
   * Get total number of items in shopping list
   */
  static getTotalItemCount(shoppingList: ShoppingList): number {
    return Object.values(shoppingList).reduce((total, items) => total + items.length, 0);
  }

  /**
   * Get total number of categories in shopping list
   */
  static getCategoryCount(shoppingList: ShoppingList): number {
    return Object.keys(shoppingList).length;
  }

  /**
   * Check if shopping list is empty
   */
  static isEmpty(shoppingList: ShoppingList): boolean {
    return Object.keys(shoppingList).length === 0;
  }

  // ============================================================================
  // OFFLINE STORAGE METHODS
  // ============================================================================

  /**
   * Store a shopping list offline with metadata
   */
  static async storeOfflineShoppingList(
    shoppingList: ShoppingList, 
    metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'>
  ): Promise<void> {
    // Ensure service is initialized
    await this.ensureInitialized();

    if (!this.config.enableOfflineStorage) {
      console.log('[ShoppingListService] Offline storage is disabled, skipping...');
      return;
    }

    try {
      const offlineShoppingList = this.convertToOfflineShoppingList(shoppingList);
      
      const fullMetadata: ShoppingListMetadata = {
        ...metadata,
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: this.getDeviceId(),
        version: 1
      };

      const entry: OfflineShoppingListEntry = {
        metadata: fullMetadata,
        shoppingList: offlineShoppingList
      };

      await offlineStorageManager.storeShoppingList(entry);

      // Queue for sync if auto-sync is enabled
      if (this.config.enableAutoSync) {
        await this.queueForSync({
          id: `sync_${metadata.id}_${Date.now()}`,
          type: 'create',
          shoppingListId: metadata.id,
          data: entry,
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
      }

      console.log(`[ShoppingListService] Stored shopping list ${metadata.id} offline successfully`);
    } catch (error) {
      console.warn('[ShoppingListService] Failed to store shopping list offline:', error);
      // Don't throw error - just log warning and continue
    }
  }

  /**
   * Get an offline shopping list by ID
   */
  static async getOfflineShoppingList(id: string): Promise<OfflineShoppingListEntry | null> {
    // Ensure service is initialized
    await this.ensureInitialized();

    if (!this.config.enableOfflineStorage) {
      console.warn('Offline storage is disabled');
      return null;
    }

    try {
      const entry = await offlineStorageManager.getShoppingList(id);
      return entry;
    } catch (error) {
      console.error(`Failed to get offline shopping list ${id}:`, error);
      return null;
    }
  }

  /**
   * Update an offline shopping list
   */
  static async updateOfflineShoppingList(
    id: string, 
    updates: Partial<OfflineShoppingListEntry>
  ): Promise<void> {
    if (!this.config.enableOfflineStorage) {
      throw new Error('Offline storage is disabled');
    }

    try {
      // Get existing entry
      const existingEntry = await this.getOfflineShoppingList(id);
      if (!existingEntry) {
        throw new Error(`Shopping list ${id} not found`);
      }

      // Prepare updated entry
      const updatedEntry: OfflineShoppingListEntry = {
        ...existingEntry,
        ...updates,
        metadata: {
          ...existingEntry.metadata,
          ...updates.metadata,
          lastModified: new Date(),
          syncStatus: 'pending',
          version: (existingEntry.metadata.version || 0) + 1
        }
      };

      await offlineStorageManager.updateShoppingList(id, updatedEntry);

      // Queue for sync if auto-sync is enabled
      if (this.config.enableAutoSync) {
        await this.queueForSync({
          id: `sync_${id}_${Date.now()}`,
          type: 'update',
          shoppingListId: id,
          data: updates,
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
      }

      console.log(`Updated shopping list ${id} offline`);
    } catch (error) {
      console.error(`Failed to update offline shopping list ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all offline shopping lists
   */
  static async getAllOfflineShoppingLists(): Promise<OfflineShoppingListEntry[]> {
    if (!this.config.enableOfflineStorage) {
      console.warn('Offline storage is disabled');
      return [];
    }

    try {
      const entries = await offlineStorageManager.getAllShoppingLists();
      return entries;
    } catch (error) {
      console.error('Failed to get all offline shopping lists:', error);
      return [];
    }
  }

  /**
   * Delete an offline shopping list
   */
  static async deleteOfflineShoppingList(id: string): Promise<void> {
    if (!this.config.enableOfflineStorage) {
      console.warn('Offline storage is disabled');
      return;
    }

    try {
      await offlineStorageManager.deleteShoppingList(id);

      // Queue for sync if auto-sync is enabled
      if (this.config.enableAutoSync) {
        await this.queueForSync({
          id: `sync_${id}_${Date.now()}`,
          type: 'delete',
          shoppingListId: id,
          data: { id },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
      }

      console.log(`Deleted shopping list ${id} offline`);
    } catch (error) {
      console.error(`Failed to delete offline shopping list ${id}:`, error);
      throw error;
    }
  }

  /**
   * Queue an operation for synchronization using the sync queue manager
   */
  static async queueForSync(operation: SyncOperation): Promise<void> {
    // Ensure service is initialized
    await this.ensureInitialized();

    if (!this.config.enableOfflineStorage) {
      return;
    }

    try {
      await syncQueueManager.addToSyncQueue(operation);
      console.log(`Queued sync operation: ${operation.type} for ${operation.shoppingListId}`);
    } catch (error) {
      console.error('Failed to queue sync operation:', error);
      throw error;
    }
  }

  /**
   * Update shopping list item status (checked/unchecked) offline
   */
  static async updateOfflineItemStatus(
    shoppingListId: string,
    category: string,
    itemId: string,
    checked: boolean
  ): Promise<void> {
    if (!this.config.enableOfflineStorage) {
      console.warn('Offline storage is disabled');
      return;
    }

    try {
      const entry = await this.getOfflineShoppingList(shoppingListId);
      if (!entry) {
        throw new Error(`Shopping list ${shoppingListId} not found`);
      }

      // Find and update the item
      const categoryItems = entry.shoppingList[category];
      if (!categoryItems) {
        throw new Error(`Category ${category} not found in shopping list`);
      }

      const itemIndex = categoryItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error(`Item ${itemId} not found in category ${category}`);
      }

      // Update the item
      const updatedItem: OfflineShoppingListItem = {
        ...categoryItems[itemIndex],
        checked,
        lastModified: new Date(),
        syncStatus: 'pending'
      };

      categoryItems[itemIndex] = updatedItem;

      // Update the entire shopping list
      await this.updateOfflineShoppingList(shoppingListId, {
        shoppingList: entry.shoppingList
      });

      console.log(`Updated item ${itemId} status to ${checked ? 'checked' : 'unchecked'}`);
    } catch (error) {
      console.error('Failed to update offline item status:', error);
      throw error;
    }
  }

  /**
   * Get shopping lists for a specific week
   */
  static async getOfflineShoppingListsForWeek(weekStartDate: string): Promise<OfflineShoppingListEntry[]> {
    if (!this.config.enableOfflineStorage) {
      return [];
    }

    try {
      const allLists = await this.getAllOfflineShoppingLists();
      return allLists.filter(entry => entry.metadata.weekStartDate === weekStartDate);
    } catch (error) {
      console.error('Failed to get shopping lists for week:', error);
      return [];
    }
  }

  /**
   * Get shopping lists by meal plan ID
   */
  static async getOfflineShoppingListsByMealPlan(mealPlanId: string): Promise<OfflineShoppingListEntry[]> {
    if (!this.config.enableOfflineStorage) {
      return [];
    }

    try {
      const allLists = await this.getAllOfflineShoppingLists();
      return allLists.filter(entry => entry.metadata.mealPlanId === mealPlanId);
    } catch (error) {
      console.error('Failed to get shopping lists by meal plan:', error);
      return [];
    }
  }

  /**
   * Get pending sync operations count using sync queue manager
   */
  static async getPendingSyncCount(): Promise<number> {
    if (!this.config.enableOfflineStorage) {
      return 0;
    }

    try {
      const status = await syncQueueManager.getSyncStatus();
      return status.pendingOperations;
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
      return 0;
    }
  }

  /**
   * Trigger manual sync using sync queue manager
   */
  static async triggerManualSync(): Promise<any> {
    if (!this.config.enableOfflineStorage) {
      console.warn('Offline storage is disabled');
      return;
    }

    try {
      const result = await syncQueueManager.processQueue();
      console.log(`Manual sync completed: ${result.successfulOperations}/${result.totalOperations} successful`);
      
      if (result.conflicts > 0) {
        console.warn(`${result.conflicts} conflicts detected during sync`);
      }
      
      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  static async getSyncStatus(): Promise<{
    isActive: boolean;
    pendingOperations: number;
    lastSync: Date;
    errors: string[];
  }> {
    if (!this.config.enableOfflineStorage) {
      return {
        isActive: false,
        pendingOperations: 0,
        lastSync: new Date(0),
        errors: ['Offline storage is disabled']
      };
    }

    try {
      return await syncQueueManager.getSyncStatus();
    } catch (error) {
      return {
        isActive: false,
        pendingOperations: 0,
        lastSync: new Date(0),
        errors: [`Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Clear all offline data (for testing or reset purposes)
   */
  static async clearOfflineData(): Promise<void> {
    if (!this.config.enableOfflineStorage) {
      return;
    }

    try {
      const allLists = await this.getAllOfflineShoppingLists();
      
      // Delete all shopping lists
      for (const entry of allLists) {
        await offlineStorageManager.deleteShoppingList(entry.metadata.id);
      }

      // Clear sync queue
      await offlineStorageManager.clearSyncQueue();

      console.log('Cleared all offline shopping list data');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageUsage(): Promise<{ used: number; available: number; percentage: number }> {
    if (!this.config.enableOfflineStorage) {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      return await offlineStorageManager.getStorageUsage();
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // ============================================================================
  // UTILITY METHODS FOR OFFLINE CONVERSION
  // ============================================================================

  /**
   * Convert regular shopping list to offline shopping list format
   */
  private static convertToOfflineShoppingList(shoppingList: ShoppingList): OfflineShoppingList {
    const offlineShoppingList: OfflineShoppingList = {};

    Object.keys(shoppingList).forEach(category => {
      offlineShoppingList[category] = shoppingList[category].map(item => ({
        ...item,
        id: item.id || this.generateItemId(item),
        lastModified: new Date(),
        syncStatus: 'pending' as const,
        checked: item.checked ?? false // Ensure checked is always boolean
      }));
    });

    return offlineShoppingList;
  }

  /**
   * Convert offline shopping list to regular shopping list format
   */
  static convertFromOfflineShoppingList(offlineShoppingList: OfflineShoppingList): ShoppingList {
    const shoppingList: ShoppingList = {};

    Object.keys(offlineShoppingList).forEach(category => {
      shoppingList[category] = offlineShoppingList[category].map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category,
        recipes: item.recipeName ? [item.recipeName] : [],
        checked: item.checked
      }));
    });

    return shoppingList;
  }

  /**
   * Generate a unique ID for shopping list items
   */
  private static generateItemId(item: ShoppingListItem): string {
    const baseString = `${item.name}_${item.unit}_${item.category}`.toLowerCase();
    const hash = this.simpleHash(baseString);
    return `item_${hash}_${Date.now()}`;
  }

  /**
   * Simple hash function for generating item IDs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate shopping list from meal plan with offline storage
   */
  static async generateAndStoreFromMealPlan(
    mealPlan: MealPlan, 
    householdSize: number = 2,
    metadata: Omit<ShoppingListMetadata, 'lastModified' | 'syncStatus' | 'deviceId' | 'version'>
  ): Promise<{ shoppingList: ShoppingList; offlineEntry?: OfflineShoppingListEntry }> {
    // Generate the shopping list using existing logic
    const shoppingList = this.generateFromMealPlan(mealPlan, householdSize);

    let offlineEntry: OfflineShoppingListEntry | undefined;

    // Store offline if enabled
    if (this.config.enableOfflineStorage) {
      try {
        await this.storeOfflineShoppingList(shoppingList, metadata);
        const retrievedEntry = await this.getOfflineShoppingList(metadata.id);
        offlineEntry = retrievedEntry || undefined;
      } catch (error) {
        console.error('Failed to store shopping list offline, continuing without offline storage:', error);
      }
    }

    return { shoppingList, offlineEntry };
  }
}