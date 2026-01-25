/**
 * Background Sync Manager for Service Worker
 * Handles background sync event registration, queue processing, and automatic sync triggering
 * 
 * Features:
 * - Background sync event registration
 * - Sync event handling and queue processing
 * - Automatic sync triggering on connectivity restore
 * - Integration with SyncQueueManager
 * - Service worker communication
 */

import {
  SyncOperation,
  OfflineShoppingListEntry,
  OfflineStorageError
} from '../types/OfflineStorage.types';

interface BackgroundSyncConfig {
  syncTag: string;
  maxSyncAttempts: number;
  syncTimeout: number; // milliseconds
  enablePeriodicSync: boolean;
  periodicSyncInterval: number; // milliseconds
}

interface SyncEventData {
  tag: string;
  lastChance: boolean;
}

interface BackgroundSyncResult {
  success: boolean;
  processedOperations: number;
  failedOperations: number;
  error?: Error;
}

export class BackgroundSyncManager {
  private config: BackgroundSyncConfig = {
    syncTag: 'shopping-list-sync',
    maxSyncAttempts: 3,
    syncTimeout: 30000, // 30 seconds
    enablePeriodicSync: false, // Disabled by default due to browser limitations
    periodicSyncInterval: 24 * 60 * 60 * 1000 // 24 hours
  };

  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private syncListeners: Array<(result: BackgroundSyncResult) => void> = [];
  private isInitialized = false;

  constructor(config?: Partial<BackgroundSyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the background sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers not supported');
      }

      // Check if background sync is supported
      if (!('sync' in window.ServiceWorkerRegistration.prototype)) {
        console.warn('Background Sync not supported, falling back to manual sync');
        this.isInitialized = true;
        return;
      }

      // Get service worker registration
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      
      // Setup message listener for sync events
      this.setupServiceWorkerMessageListener();

      // Setup network state listeners
      this.setupNetworkListeners();

      this.isInitialized = true;
      console.log('Background Sync Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Background Sync Manager:', error);
      throw error;
    }
  }

  /**
   * Register a background sync event
   */
  async registerSync(tag?: string, data?: any): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.serviceWorkerRegistration) {
      throw new Error('Service Worker not available');
    }

    const syncTag = tag || this.config.syncTag;

    try {
      // Register background sync
      await this.serviceWorkerRegistration?.sync.register(syncTag);
      
      console.log(`Background sync registered: ${syncTag}`);

      // Send additional data to service worker if provided
      if (data && this.serviceWorkerRegistration.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'SYNC_DATA',
          tag: syncTag,
          data
        });
      }

    } catch (error) {
      console.error(`Failed to register background sync: ${syncTag}`, error);
      throw error;
    }
  }

  /**
   * Handle sync event (called from service worker)
   */
  async handleSyncEvent(event: SyncEventData): Promise<BackgroundSyncResult> {
    console.log(`Handling background sync event: ${event.tag}`);

    const result: BackgroundSyncResult = {
      success: false,
      processedOperations: 0,
      failedOperations: 0
    };

    try {
      // Set timeout for sync operation
      const syncPromise = this.processSyncQueue();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), this.config.syncTimeout);
      });

      const syncResult = await Promise.race([syncPromise, timeoutPromise]);
      
      result.success = true;
      result.processedOperations = syncResult.processedOperations;
      result.failedOperations = syncResult.failedOperations;

      console.log(`Background sync completed: ${result.processedOperations} processed, ${result.failedOperations} failed`);

    } catch (error) {
      console.error('Background sync failed:', error);
      result.error = error as Error;
      
      // If this is the last chance and we still have failures, log for debugging
      if (event.lastChance) {
        console.error('Background sync failed on last chance:', error);
        await this.handleSyncFailure(error as Error);
      }
    }

    // Notify listeners
    this.notifySyncListeners(result);

    return result;
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue(): Promise<{ processedOperations: number; failedOperations: number }> {
    try {
      // Get sync operations from IndexedDB
      const operations = await this.getSyncOperations();
      
      if (operations.length === 0) {
        return { processedOperations: 0, failedOperations: 0 };
      }

      console.log(`Processing ${operations.length} sync operations in background`);

      let processedOperations = 0;
      let failedOperations = 0;

      // Process operations sequentially to avoid overwhelming the server
      for (const operation of operations) {
        try {
          const success = await this.processSyncOperation(operation);
          
          if (success) {
            await this.removeSyncOperation(operation.id);
            processedOperations++;
          } else {
            await this.handleOperationFailure(operation);
            failedOperations++;
          }

        } catch (error) {
          console.error(`Failed to process sync operation ${operation.id}:`, error);
          await this.handleOperationFailure(operation);
          failedOperations++;
        }
      }

      // Update last sync time
      await this.updateLastSyncTime();

      return { processedOperations, failedOperations };

    } catch (error) {
      console.error('Failed to process sync queue:', error);
      throw error;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processSyncOperation(operation: SyncOperation): Promise<boolean> {
    try {
      const { type, shoppingListId, data } = operation;
      
      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response: Response;
      
      switch (type) {
        case 'create':
          response = await fetch('/api/shopping-lists/sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              operation: 'create',
              data
            })
          });
          break;

        case 'update':
          response = await fetch(`/api/shopping-lists/sync/${shoppingListId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              operation: 'update',
              data,
              localVersion: data.metadata?.version || 0
            })
          });
          break;

        case 'delete':
          response = await fetch(`/api/shopping-lists/sync/${shoppingListId}`, {
            method: 'DELETE',
            headers
          });
          break;

        case 'item_check':
        case 'item_uncheck':
          response = await fetch(`/api/shopping-lists/sync/${shoppingListId}/items`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              operation: type,
              data
            })
          });
          break;

        default:
          throw new Error(`Unknown sync operation type: ${type}`);
      }

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 404 && type === 'delete') {
          // Item already deleted on server, consider it successful
          console.log(`Delete operation successful (item not found): ${shoppingListId}`);
          return true;
        }
        
        if (response.status === 409) {
          // Conflict - handle with conflict resolution
          const conflictData = await response.json();
          return await this.handleConflict(operation, conflictData);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local cache with server response if needed
      const responseData = await response.json();
      if (responseData.data) {
        await this.updateLocalCache(shoppingListId, responseData.data);
      }

      console.log(`Sync operation successful: ${type} for ${shoppingListId}`);
      return true;

    } catch (error) {
      console.error(`Sync operation failed: ${operation.type} for ${operation.shoppingListId}`, error);
      return false;
    }
  }

  /**
   * Handle conflict resolution during sync
   */
  private async handleConflict(operation: SyncOperation, conflictData: any): Promise<boolean> {
    try {
      // For shopping lists, we typically prioritize local changes (local-wins strategy)
      console.log(`Handling conflict for operation ${operation.id}, using local-wins strategy`);

      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Send conflict resolution request with local data taking precedence
      const response = await fetch(`/api/shopping-lists/sync/${operation.shoppingListId}/resolve-conflict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operationId: operation.id,
          localData: operation.data,
          serverData: conflictData.serverData || conflictData,
          resolutionStrategy: 'local-wins'
        })
      });

      if (!response.ok) {
        throw new Error(`Conflict resolution failed: ${response.status} ${response.statusText}`);
      }

      const resolvedData = await response.json();
      
      // Update local cache with resolved data
      if (resolvedData.data) {
        await this.updateLocalCache(operation.shoppingListId, resolvedData.data);
      }

      console.log(`Conflict resolved successfully for operation ${operation.id}`);
      return true;

    } catch (error) {
      console.error(`Failed to resolve conflict for operation ${operation.id}:`, error);
      return false;
    }
  }

  /**
   * Update local cache with server data
   */
  private async updateLocalCache(shoppingListId: string, serverData: any): Promise<void> {
    try {
      // This would typically update IndexedDB through the OfflineStorageManager
      // For now, we'll send a message to the main thread to handle the update
      if (this.serviceWorkerRegistration?.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'UPDATE_LOCAL_CACHE',
          shoppingListId,
          data: serverData
        });
      }
    } catch (error) {
      console.error(`Failed to update local cache for ${shoppingListId}:`, error);
    }
  }

  /**
   * Handle operation failure with retry logic
   */
  private async handleOperationFailure(operation: SyncOperation): Promise<void> {
    const newRetryCount = operation.retryCount + 1;

    if (newRetryCount >= this.config.maxSyncAttempts) {
      console.error(`Operation ${operation.id} exceeded max sync attempts (${this.config.maxSyncAttempts})`);
      
      // Move to failed operations store or remove
      await this.removeSyncOperation(operation.id);
      await this.storeFailedOperation(operation);
      
      // Could store in a separate "failed operations" store for manual retry
      console.warn(`Operation ${operation.id} failed after ${operation.retryCount} attempts`);
      
      return;
    }

    // Update retry count
    const updatedOperation: SyncOperation = {
      ...operation,
      retryCount: newRetryCount
    };

    await this.updateSyncOperation(updatedOperation);
    
    console.log(`Operation ${operation.id} will be retried (attempt ${newRetryCount}/${this.config.maxSyncAttempts})`);
  }

  /**
   * Store failed operation for potential manual retry
   */
  private async storeFailedOperation(operation: SyncOperation): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['failedOperations'], 'readwrite');
      const store = transaction.objectStore('failedOperations');
      
      const failedOperation = {
        ...operation,
        failedAt: new Date(),
        reason: 'Max retry attempts exceeded'
      };
      
      await store.put(failedOperation);
      
    } catch (error) {
      console.error('Failed to store failed operation:', error);
    }
  }

  /**
   * Handle sync failure
   */
  private async handleSyncFailure(error: Error): Promise<void> {
    console.error('Background sync failed completely:', error);
    
    // Could implement additional failure handling here:
    // - Store failure information
    // - Schedule manual retry
    // - Notify user through notification
    
    // For now, just log the failure
    try {
      const failureInfo = {
        timestamp: new Date(),
        error: error.message,
        stack: error.stack
      };
      
      localStorage.setItem('last-sync-failure', JSON.stringify(failureInfo));
      
    } catch (storageError) {
      console.error('Failed to store sync failure info:', storageError);
    }
  }

  /**
   * Setup service worker message listener
   */
  private setupServiceWorkerMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'SYNC_COMPLETE':
          console.log('Background sync completed:', payload);
          break;
          
        case 'SYNC_ERROR':
          console.error('Background sync error:', payload);
          break;
          
        case 'UPDATE_LOCAL_CACHE':
          // Handle cache update requests from service worker
          this.handleCacheUpdateRequest(payload);
          break;
          
        default:
          // Ignore unknown message types
          break;
      }
    });
  }

  /**
   * Handle cache update requests from service worker
   */
  private async handleCacheUpdateRequest(payload: any): Promise<void> {
    try {
      // This would typically delegate to the OfflineStorageManager
      // For now, we'll just log the request
      console.log('Cache update requested:', payload);
      
    } catch (error) {
      console.error('Failed to handle cache update request:', error);
    }
  }

  /**
   * Setup network state listeners
   */
  private setupNetworkListeners(): void {
    // Listen for online events to trigger sync
    window.addEventListener('online', () => {
      console.log('Network restored, triggering background sync');
      this.triggerSync().catch(error => {
        console.error('Failed to trigger sync on network restore:', error);
      });
    });

    // Listen for visibility change to trigger sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        console.log('App became visible and online, triggering background sync');
        this.triggerSync().catch(error => {
          console.error('Failed to trigger sync on visibility change:', error);
        });
      }
    });
  }

  /**
   * Trigger background sync manually
   */
  async triggerSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Cannot trigger sync: offline');
      return;
    }

    try {
      await this.registerSync();
    } catch (error) {
      console.error('Failed to trigger background sync:', error);
      throw error;
    }
  }

  /**
   * Get pending sync operations count
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      const operations = await this.getSyncOperations();
      return operations.length;
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
      return 0;
    }
  }

  /**
   * Add sync result listener
   */
  addSyncListener(listener: (result: BackgroundSyncResult) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync result listener
   */
  removeSyncListener(listener: (result: BackgroundSyncResult) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(result: BackgroundSyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * IndexedDB helper functions
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ShopAndChopDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('type', 'type');
          syncStore.createIndex('shoppingListId', 'shoppingListId');
        }
        
        if (!db.objectStoreNames.contains('failedOperations')) {
          const failedStore = db.createObjectStore('failedOperations', { keyPath: 'id' });
          failedStore.createIndex('failedAt', 'failedAt');
        }
      };
    });
  }

  private async getSyncOperations(): Promise<SyncOperation[]> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const operations = request.result.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        resolve(operations);
      };
    });
  }

  private async removeSyncOperation(operationId: string): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(operationId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateSyncOperation(operation: SyncOperation): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put({
        ...operation,
        timestamp: operation.timestamp.toISOString()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      localStorage.setItem('last-sync-time', new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.syncListeners.length = 0;
    // Remove event listeners if needed
  }
}

// Export singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();
export default backgroundSyncManager;