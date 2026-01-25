/**
 * Data Synchronization Manager
 * Handles data synchronization logic, conflict resolution, and server communication
 * 
 * Features:
 * - Sync manager for shopping list data
 * - Conflict resolution with local priority
 * - Server communication for sync operations
 * - Integration with BackgroundSyncManager and SyncQueueManager
 * - Cross-device synchronization support
 */

import {
  SyncOperation,
  OfflineShoppingListEntry,
  OfflineStorageError
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { syncQueueManager } from './syncQueueManager';
import { backgroundSyncManager } from './backgroundSyncManager';
import { connectionMonitor } from './connectionMonitor';

// Define SyncStatus type
interface SyncStatus {
  isActive: boolean;
  pendingOperations: number;
  lastSyncTime?: Date;
  lastSync?: Date;
  errors: string[];
}

interface DataSyncConfig {
  syncEndpoint: string;
  conflictResolutionStrategy: 'local-wins' | 'server-wins' | 'merge' | 'manual';
  batchSize: number;
  syncTimeout: number;
  enableRealTimeSync: boolean;
  syncInterval: number; // milliseconds for periodic sync
}

interface SyncConflict {
  operationId: string;
  shoppingListId: string;
  localData: any;
  serverData: any;
  conflictType: 'version' | 'timestamp' | 'content';
  resolutionRequired: boolean;
}

interface SyncResult {
  success: boolean;
  syncedLists: number;
  conflicts: SyncConflict[];
  errors: string[];
  timestamp: Date;
}

interface ServerSyncResponse {
  success: boolean;
  data?: any;
  conflict?: boolean;
  serverData?: any;
  version?: number;
  lastModified?: string;
}

export class DataSyncManager {
  private config: DataSyncConfig = {
    syncEndpoint: '/api/shopping-lists/sync',
    conflictResolutionStrategy: 'local-wins',
    batchSize: 5,
    syncTimeout: 30000,
    enableRealTimeSync: true,
    syncInterval: 5 * 60 * 1000 // 5 minutes
  };

  private isSyncing = false;
  private syncPromise: Promise<SyncResult> | null = null;
  private periodicSyncTimer: NodeJS.Timeout | null = null;
  private syncListeners: Array<(result: SyncResult) => void> = [];
  private conflictListeners: Array<(conflict: SyncConflict) => void> = [];

  constructor(config?: Partial<DataSyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.setupEventListeners();
  }

  /**
   * Initialize the data sync manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize background sync manager
      await backgroundSyncManager.initialize();

      // Setup background sync listeners
      backgroundSyncManager.addSyncListener((result) => {
        this.handleBackgroundSyncResult(result);
      });

      // Setup service worker message listener
      this.setupServiceWorkerMessageListener();

      // Start periodic sync if enabled
      if (this.config.enableRealTimeSync) {
        this.startPeriodicSync();
      }

      console.log('Data Sync Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Data Sync Manager:', error);
      throw error;
    }
  }

  /**
   * Perform full synchronization of all shopping lists
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress, waiting for completion');
      return this.syncPromise || this.createEmptyResult();
    }

    if (!connectionMonitor.isOnline) {
      console.log('Cannot sync: offline');
      return this.createEmptyResult();
    }

    this.isSyncing = true;
    this.syncPromise = this.performFullSync();

    try {
      const result = await this.syncPromise;
      this.notifySyncListeners(result);
      return result;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  /**
   * Sync a specific shopping list
   */
  async syncShoppingList(shoppingListId: string): Promise<SyncResult> {
    if (!connectionMonitor.isOnline) {
      console.log(`Cannot sync shopping list ${shoppingListId}: offline`);
      return this.createEmptyResult();
    }

    try {
      console.log(`Syncing shopping list: ${shoppingListId}`);

      const localEntry = await offlineStorageManager.getShoppingList(shoppingListId);
      if (!localEntry) {
        throw new Error(`Shopping list not found locally: ${shoppingListId}`);
      }

      const result = await this.syncSingleList(localEntry);
      
      const syncResult: SyncResult = {
        success: result.success,
        syncedLists: result.success ? 1 : 0,
        conflicts: result.conflicts || [],
        errors: result.errors || [],
        timestamp: new Date()
      };

      this.notifySyncListeners(syncResult);
      return syncResult;

    } catch (error) {
      console.error(`Failed to sync shopping list ${shoppingListId}:`, error);
      
      const errorResult: SyncResult = {
        success: false,
        syncedLists: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date()
      };

      this.notifySyncListeners(errorResult);
      return errorResult;
    }
  }

  /**
   * Handle incoming server changes (for real-time sync)
   */
  async handleServerUpdate(shoppingListId: string, serverData: any): Promise<void> {
    try {
      console.log(`Handling server update for shopping list: ${shoppingListId}`);

      const localEntry = await offlineStorageManager.getShoppingList(shoppingListId);
      
      if (!localEntry) {
        // New shopping list from server
        await this.handleNewServerList(shoppingListId, serverData);
        return;
      }

      // Check for conflicts
      const conflict = await this.detectConflict(localEntry, serverData);
      
      if (conflict) {
        // Handle conflict - for now, just log it
        console.warn('Sync conflict detected:', conflict);
        // TODO: Implement proper conflict resolution
      } else {
        // No conflict, update local data
        await this.updateLocalFromServer(shoppingListId, serverData);
      }

    } catch (error) {
      console.error(`Failed to handle server update for ${shoppingListId}:`, error);
    }
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    conflict: SyncConflict,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    try {
      console.log(`Resolving conflict for ${conflict.shoppingListId} with strategy: ${resolution}`);

      let resolvedData: any;

      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          if (!mergedData) {
            throw new Error('Merged data required for merge resolution');
          }
          resolvedData = mergedData;
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${resolution}`);
      }

      // Update local data
      await this.updateLocalFromServer(conflict.shoppingListId, resolvedData);

      // Send resolution to server
      await this.sendConflictResolution(conflict, resolvedData);

      console.log(`Conflict resolved successfully for ${conflict.shoppingListId}`);

    } catch (error) {
      console.error(`Failed to resolve conflict for ${conflict.shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const queueStatus = await syncQueueManager.getSyncStatus();
      const pendingSyncCount = await backgroundSyncManager.getPendingSyncCount();

      return {
        isActive: this.isSyncing || queueStatus.isActive,
        pendingOperations: queueStatus.pendingOperations + pendingSyncCount,
        lastSync: queueStatus.lastSync,
        errors: queueStatus.errors
      };

    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isActive: false,
        pendingOperations: 0,
        lastSync: new Date(0),
        errors: [`Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Perform full synchronization
   */
  private async performFullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedLists: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      console.log('Starting full synchronization...');

      // Get all local shopping lists
      const localLists = await offlineStorageManager.getAllShoppingLists();
      
      if (localLists.length === 0) {
        console.log('No local shopping lists to sync');
        return result;
      }

      // Process lists in batches
      const batches = this.createBatches(localLists, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(entry => this.syncSingleList(entry))
        );

        // Process batch results
        for (const batchResult of batchResults) {
          if (batchResult.status === 'fulfilled') {
            const syncResult = batchResult.value;
            if (syncResult.success) {
              result.syncedLists++;
            } else {
              result.success = false;
              result.errors.push(...(syncResult.errors || []));
            }
            
            if (syncResult.conflicts) {
              result.conflicts.push(...syncResult.conflicts);
            }
          } else {
            result.success = false;
            result.errors.push(batchResult.reason.message);
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process any pending sync queue operations
      await syncQueueManager.processQueue();

      console.log(`Full sync completed: ${result.syncedLists}/${localLists.length} lists synced`);
      
      return result;

    } catch (error) {
      console.error('Full sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Sync a single shopping list
   */
  private async syncSingleList(localEntry: OfflineShoppingListEntry): Promise<{
    success: boolean;
    conflicts?: SyncConflict[];
    errors?: string[];
  }> {
    try {
      const { metadata, shoppingList } = localEntry;
      
      // Send sync request to server
      const response = await this.sendSyncRequest('update', metadata.id, {
        metadata,
        shoppingList,
        localVersion: metadata.version || 0
      });

      if (response.conflict) {
        // Handle conflict
        const conflict = await this.createConflict(
          metadata.id,
          localEntry,
          response.serverData
        );

        if (this.config.conflictResolutionStrategy === 'manual') {
          // Notify conflict listeners for manual resolution
          this.notifyConflictListeners(conflict);
          return {
            success: false,
            conflicts: [conflict]
          };
        } else {
          // Auto-resolve conflict
          await this.autoResolveConflict(conflict);
          return { success: true };
        }
      }

      // Update local data with server response
      if (response.data) {
        await this.updateLocalFromServer(metadata.id, response.data);
      }

      return { success: true };

    } catch (error) {
      console.error(`Failed to sync shopping list ${localEntry.metadata.id}:`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Send sync request to server
   */
  private async sendSyncRequest(
    operation: string,
    shoppingListId: string,
    data: any
  ): Promise<ServerSyncResponse> {
    try {
      let url: string;
      let method: string;
      let body: any;

      // Determine the correct endpoint and method based on operation
      switch (operation) {
        case 'create':
          url = this.config.syncEndpoint;
          method = 'POST';
          body = { operation, data };
          break;
        case 'update':
          url = `${this.config.syncEndpoint}/${shoppingListId}`;
          method = 'PUT';
          body = { operation, data, localVersion: data.metadata?.version || 0 };
          break;
        case 'delete':
          url = `${this.config.syncEndpoint}/${shoppingListId}`;
          method = 'DELETE';
          body = { operation };
          break;
        case 'item_check':
        case 'item_uncheck':
          url = `${this.config.syncEndpoint}/${shoppingListId}/items`;
          method = 'PATCH';
          body = { operation, data };
          break;
        default:
          throw new Error(`Unknown sync operation: ${operation}`);
      }

      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Sync-Operation': 'true'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict
          const conflictData = await response.json();
          return {
            success: false,
            conflict: true,
            serverData: conflictData.serverData || conflictData
          };
        }

        if (response.status === 404 && operation === 'delete') {
          // Item already deleted, consider it successful
          return {
            success: true,
            data: null
          };
        }

        throw new Error(`Sync request failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData.data,
        version: responseData.version,
        lastModified: responseData.lastModified
      };

    } catch (error) {
      console.error(`Sync request failed for ${shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Detect conflicts between local and server data
   */
  private async detectConflict(
    localEntry: OfflineShoppingListEntry,
    serverData: any
  ): Promise<SyncConflict | null> {
    const localMetadata = localEntry.metadata;
    const serverMetadata = serverData.metadata;

    // Version conflict
    if (serverMetadata.version && localMetadata.version && 
        serverMetadata.version !== localMetadata.version) {
      return this.createConflict(localMetadata.id, localEntry, serverData, 'version');
    }

    // Timestamp conflict
    const serverModified = new Date(serverMetadata.lastModified);
    const localModified = localMetadata.lastModified;
    
    if (Math.abs(serverModified.getTime() - localModified.getTime()) > 1000) { // 1 second tolerance
      // Check if there are actual content differences
      const hasContentDifferences = await this.hasContentDifferences(
        localEntry.shoppingList,
        serverData.shoppingList
      );

      if (hasContentDifferences) {
        return this.createConflict(localMetadata.id, localEntry, serverData, 'content');
      }
    }

    return null;
  }

  /**
   * Check if there are content differences between local and server data
   */
  private async hasContentDifferences(localList: any, serverList: any): Promise<boolean> {
    try {
      // Compare shopping list structure and item states
      const localCategories = Object.keys(localList || {}).sort();
      const serverCategories = Object.keys(serverList || {}).sort();

      if (localCategories.length !== serverCategories.length) {
        return true;
      }

      for (const category of localCategories) {
        if (!serverList[category]) {
          return true;
        }

        const localItems = localList[category] || [];
        const serverItems = serverList[category] || [];

        if (localItems.length !== serverItems.length) {
          return true;
        }

        // Check item states
        for (const localItem of localItems) {
          const serverItem = serverItems.find((item: any) => item.id === localItem.id);
          if (!serverItem) {
            return true;
          }

          // Check if checked states differ
          if (localItem.checked !== serverItem.checked) {
            return true;
          }
        }
      }

      return false;

    } catch (error) {
      console.error('Error checking content differences:', error);
      return true; // Assume differences if we can't compare
    }
  }

  /**
   * Create a conflict object
   */
  private createConflict(
    shoppingListId: string,
    localEntry: OfflineShoppingListEntry,
    serverData: any,
    conflictType: 'version' | 'timestamp' | 'content' = 'content'
  ): SyncConflict {
    return {
      operationId: `conflict-${shoppingListId}-${Date.now()}`,
      shoppingListId,
      localData: localEntry,
      serverData,
      conflictType,
      resolutionRequired: this.config.conflictResolutionStrategy === 'manual'
    };
  }

  /**
   * Auto-resolve conflict based on strategy
   */
  private async autoResolveConflict(conflict: SyncConflict): Promise<void> {
    switch (this.config.conflictResolutionStrategy) {
      case 'local-wins':
        await this.resolveConflict(conflict, 'local');
        break;
      case 'server-wins':
        await this.resolveConflict(conflict, 'server');
        break;
      case 'merge':
        const mergedData = await this.mergeConflictData(conflict);
        await this.resolveConflict(conflict, 'merge', mergedData);
        break;
      default:
        throw new Error(`Unknown conflict resolution strategy: ${this.config.conflictResolutionStrategy}`);
    }
  }

  /**
   * Merge conflicting data intelligently
   */
  private async mergeConflictData(conflict: SyncConflict): Promise<any> {
    const localEntry = conflict.localData as OfflineShoppingListEntry;
    const serverData = conflict.serverData;

    // For shopping lists, merge item states intelligently
    const mergedShoppingList = { ...serverData.shoppingList };

    // Merge item checked states - prefer more recent changes
    Object.keys(localEntry.shoppingList).forEach(category => {
      if (mergedShoppingList[category]) {
        localEntry.shoppingList[category].forEach((localItem: any) => {
          const serverItemIndex = mergedShoppingList[category].findIndex(
            (item: any) => item.id === localItem.id
          );
          
          if (serverItemIndex >= 0) {
            const serverItem = mergedShoppingList[category][serverItemIndex];
            
            // If local item was modified more recently, use local checked state
            if (localItem.lastModified > new Date(serverItem.lastModified)) {
              mergedShoppingList[category][serverItemIndex].checked = localItem.checked;
              mergedShoppingList[category][serverItemIndex].lastModified = localItem.lastModified;
            }
          }
        });
      }
    });

    return {
      ...serverData,
      shoppingList: mergedShoppingList,
      metadata: {
        ...serverData.metadata,
        lastModified: new Date(),
        version: Math.max(
          localEntry.metadata.version || 0,
          serverData.metadata.version || 0
        ) + 1
      }
    };
  }

  /**
   * Update local data from server
   */
  private async updateLocalFromServer(shoppingListId: string, serverData: any): Promise<void> {
    try {
      const localEntry: OfflineShoppingListEntry = {
        metadata: {
          ...serverData.metadata,
          syncStatus: 'synced' as const,
          lastModified: new Date(serverData.metadata.lastModified),
          generatedAt: new Date(serverData.metadata.generatedAt)
        },
        shoppingList: serverData.shoppingList
      };

      await offlineStorageManager.updateShoppingList(shoppingListId, localEntry);
      console.log(`Updated local data for shopping list ${shoppingListId} from server`);

    } catch (error) {
      console.error(`Failed to update local data from server for ${shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Handle new shopping list from server
   */
  private async handleNewServerList(shoppingListId: string, serverData: any): Promise<void> {
    try {
      console.log(`Handling new shopping list from server: ${shoppingListId}`);
      
      await this.updateLocalFromServer(shoppingListId, serverData);
      
    } catch (error) {
      console.error(`Failed to handle new server list ${shoppingListId}:`, error);
    }
  }

  /**
   * Send conflict resolution to server
   */
  private async sendConflictResolution(conflict: SyncConflict, resolvedData: any): Promise<void> {
    try {
      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Sync-Operation': 'true'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.config.syncEndpoint}/${conflict.shoppingListId}/resolve-conflict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operationId: conflict.operationId,
          localData: conflict.localData,
          serverData: conflict.serverData,
          resolutionStrategy: 'local-wins', // Default to local-wins as per requirements
          resolvedData
        })
      });

      if (!response.ok) {
        throw new Error(`Conflict resolution failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Update local cache with resolved data
      if (responseData.data) {
        await this.updateLocalFromServer(conflict.shoppingListId, responseData.data);
      }

      console.log(`Conflict resolution sent to server for ${conflict.shoppingListId}`);

    } catch (error) {
      console.error(`Failed to send conflict resolution for ${conflict.shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Handle background sync results
   */
  private handleBackgroundSyncResult(result: any): void {
    console.log('Background sync result:', result);
    
    // Could trigger UI updates or notifications here
    if (!result.success && result.error) {
      console.error('Background sync failed:', result.error);
    }
  }

  /**
   * Setup service worker message listener
   */
  private setupServiceWorkerMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'UPDATE_LOCAL_CACHE':
            this.handleCacheUpdateRequest(payload);
            break;
          case 'SYNC_COMPLETE':
            console.log('Service worker sync completed:', payload);
            break;
          case 'SYNC_ERROR':
            console.error('Service worker sync error:', payload);
            break;
        }
      });
    }
  }

  /**
   * Handle cache update requests from service worker
   */
  private async handleCacheUpdateRequest(payload: any): Promise<void> {
    try {
      const { shoppingListId, data } = payload;
      await this.updateLocalFromServer(shoppingListId, data);
    } catch (error) {
      console.error('Failed to handle cache update request:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for network state changes
    connectionMonitor.onConnectionChange((isOnline) => {
      if (isOnline && this.config.enableRealTimeSync) {
        console.log('Network restored, triggering sync');
        this.syncAll().catch(error => {
          console.error('Failed to sync after network restore:', error);
        });
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
    }

    this.periodicSyncTimer = setInterval(() => {
      if (connectionMonitor.isOnline && !this.isSyncing) {
        console.log('Performing periodic sync');
        this.syncAll().catch(error => {
          console.error('Periodic sync failed:', error);
        });
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create empty sync result
   */
  private createEmptyResult(): SyncResult {
    return {
      success: true,
      syncedLists: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date()
    };
  }

  /**
   * Add sync listener
   */
  addSyncListener(listener: (result: SyncResult) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  removeSyncListener(listener: (result: SyncResult) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Add conflict listener
   */
  addConflictListener(listener: (conflict: SyncConflict) => void): void {
    this.conflictListeners.push(listener);
  }

  /**
   * Remove conflict listener
   */
  removeConflictListener(listener: (conflict: SyncConflict) => void): void {
    const index = this.conflictListeners.indexOf(listener);
    if (index > -1) {
      this.conflictListeners.splice(index, 1);
    }
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(conflict: SyncConflict): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Conflict listener error:', error);
      }
    });
  }

  /**
   * Configure sync manager
   */
  configure(config: Partial<DataSyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart periodic sync if interval changed
    if (config.syncInterval && this.config.enableRealTimeSync) {
      this.startPeriodicSync();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.syncListeners.length = 0;
    this.conflictListeners.length = 0;
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();
export default dataSyncManager;