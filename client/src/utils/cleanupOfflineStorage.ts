/**
 * Utility to clean up offline storage and remove duplicate shopping lists
 */

import { LocalStorageService } from '../services/localStorageService';

export class OfflineStorageCleanup {
  /**
   * Clear all IndexedDB data to remove offline shopping list duplicates
   */
  static async clearIndexedDB(): Promise<boolean> {
    try {
      console.log('[OfflineStorageCleanup] Attempting to delete ShopAndChopDB...');
      
      return new Promise<boolean>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('ShopAndChopDB');
        
        deleteRequest.onsuccess = () => {
          console.log('[OfflineStorageCleanup] Successfully deleted ShopAndChopDB');
          resolve(true);
        };
        
        deleteRequest.onerror = () => {
          console.error('[OfflineStorageCleanup] Failed to delete ShopAndChopDB:', deleteRequest.error);
          resolve(false);
        };
        
        deleteRequest.onblocked = () => {
          console.warn('[OfflineStorageCleanup] Database deletion blocked - will be deleted when possible');
          resolve(true); // Consider it successful as it will be deleted eventually
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          console.warn('[OfflineStorageCleanup] Database deletion timeout');
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('[OfflineStorageCleanup] Error clearing IndexedDB:', error);
      return false;
    }
  }

  /**
   * Clean up localStorage duplicates
   */
  static cleanupLocalStorage(): number {
    try {
      return LocalStorageService.removeDuplicates();
    } catch (error) {
      console.error('[OfflineStorageCleanup] Error cleaning localStorage:', error);
      return 0;
    }
  }

  /**
   * Comprehensive cleanup of all storage systems
   */
  static async performFullCleanup(): Promise<{
    indexedDBCleared: boolean;
    localStorageDuplicatesRemoved: number;
    success: boolean;
  }> {
    console.log('[OfflineStorageCleanup] Starting full cleanup...');
    
    const indexedDBCleared = await this.clearIndexedDB();
    const localStorageDuplicatesRemoved = this.cleanupLocalStorage();
    
    const result = {
      indexedDBCleared,
      localStorageDuplicatesRemoved,
      success: indexedDBCleared
    };
    
    console.log('[OfflineStorageCleanup] Cleanup completed:', result);
    return result;
  }

  /**
   * Check if cleanup is needed
   */
  static async isCleanupNeeded(): Promise<boolean> {
    try {
      // Check for localStorage duplicates
      const lists = LocalStorageService.loadShoppingLists();
      const uniqueContent = new Set();
      
      for (const list of lists) {
        const content = JSON.stringify(list.shoppingList);
        if (uniqueContent.has(content)) {
          return true; // Found duplicate
        }
        uniqueContent.add(content);
      }
      
      return false;
    } catch (error) {
      console.error('[OfflineStorageCleanup] Error checking cleanup need:', error);
      return false;
    }
  }
}