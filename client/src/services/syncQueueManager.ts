/**
 * Sync Queue Manager for PWA offline operations
 * Handles sync operation queuing, conflict detection, and retry logic with exponential backoff
 * 
 * Features:
 * - Sync operation queuing and tracking
 * - Operation conflict detection and resolution
 * - Retry logic with exponential backoff
 * - Background sync coordination
 * - Network state awareness
 */

import {
  SyncOperation,
  OfflineShoppingListEntry,
  SyncStatus,
  OfflineStorageError
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { connectionMonitor } from './connectionMonitor';

interface SyncQueueManagerConfig {
  maxRetries: number;
  baseRetryDelay: number; // Base delay in milliseconds
  maxRetryDelay: number; // Maximum delay in milliseconds
  batchSize: number; // Number of operations to process in one batch
  conflictResolutionStrategy: 'local-wins' | 'server-wins' | 'merge';
  enableBackgroundSync: boolean;
}

interface ConflictResolution {
  strategy: 'local-wins' | 'server-wins' | 'merge' | 'manual';
  resolvedData?: any;
  requiresUserInput?: boolean;
}

interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  error?: Error;
  conflictResolution?: ConflictResolution;
}

interface SyncBatchResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  conflicts: number;
  results: SyncResult[];
}

export class SyncQueueManager {
  private config: SyncQueueManagerConfig = {
    maxRetries: 3,
    baseRetryDelay: 1000, // 1 second
    maxRetryDelay: 30000, // 30 seconds
    batchSize: 10,
    conflictResolutionStrategy: 'local-wins',
    enableBackgroundSync: true
  };

  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  constructor(config?: Partial<SyncQueueManagerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Don't setup network listeners immediately to avoid circular dependency
    // They will be set up when first needed
  }

  /**
   * Initialize the sync queue manager (call this after all services are loaded)
   */
  initialize(): void {
    this.setupNetworkListeners();
  }

  /**
   * Configure the sync queue manager
   */
  configure(config: Partial<SyncQueueManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add operation to sync queue with validation and deduplication
   */
  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    try {
      // Validate operation
      this.validateSyncOperation(operation);

      // Check for duplicate operations
      const existingOperations = await offlineStorageManager.getSyncQueue();
      const duplicate = existingOperations.find(existing => 
        this.isDuplicateOperation(existing, operation)
      );

      if (duplicate) {
        console.log(`Duplicate operation detected, updating existing: ${operation.id}`);
        // Update the existing operation with newer data
        const updatedOperation: SyncOperation = {
          ...duplicate,
          data: operation.data,
          timestamp: operation.timestamp,
          retryCount: Math.min(duplicate.retryCount, operation.retryCount)
        };
        
        await this.updateSyncOperation(updatedOperation);
        return;
      }

      // Add to queue
      await offlineStorageManager.addToSyncQueue(operation);
      
      console.log(`Added sync operation to queue: ${operation.type} for ${operation.shoppingListId}`);
      
      // Notify listeners
      this.notifySyncStatusChange();

      // Trigger processing if online and not already processing
      if (connectionMonitor.isOnline && !this.isProcessing) {
        this.processQueue();
      }

    } catch (error) {
      console.error('Failed to add operation to sync queue:', error);
      throw error;
    }
  }

  /**
   * Process the sync queue with batch processing and error handling
   */
  async processQueue(): Promise<SyncBatchResult> {
    if (this.isProcessing) {
      console.log('Sync queue processing already in progress');
      return this.waitForCurrentProcessing();
    }

    if (!connectionMonitor.isOnline) {
      console.log('Cannot process sync queue: offline');
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        conflicts: 0,
        results: []
      };
    }

    this.isProcessing = true;
    this.processingPromise = this.doProcessQueue();

    try {
      const result = await this.processingPromise;
      return result;
    } finally {
      this.isProcessing = false;
      this.processingPromise = null;
    }
  }

  /**
   * Wait for current processing to complete
   */
  private async waitForCurrentProcessing(): Promise<SyncBatchResult> {
    if (this.processingPromise) {
      return await this.processingPromise;
    }
    
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      conflicts: 0,
      results: []
    };
  }

  /**
   * Internal queue processing logic
   */
  private async doProcessQueue(): Promise<SyncBatchResult> {
    const result: SyncBatchResult = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      conflicts: 0,
      results: []
    };

    try {
      // Get pending operations
      const operations = await this.getPendingOperations();
      result.totalOperations = operations.length;

      if (operations.length === 0) {
        console.log('No pending sync operations');
        return result;
      }

      console.log(`Processing ${operations.length} sync operations`);

      // Process operations in batches
      const batches = this.createBatches(operations, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        result.results.push(...batchResults);
        
        // Update counters
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            result.successfulOperations++;
          } else {
            result.failedOperations++;
          }
          
          if (batchResult.conflictResolution) {
            result.conflicts++;
          }
        }
      }

      console.log(`Sync processing completed: ${result.successfulOperations}/${result.totalOperations} successful`);
      
      // Notify listeners
      this.notifySyncStatusChange();

      return result;

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      throw error;
    }
  }

  /**
   * Get pending operations sorted by priority and timestamp
   */
  private async getPendingOperations(): Promise<SyncOperation[]> {
    const allOperations = await offlineStorageManager.getSyncQueue();
    
    // Filter operations that haven't exceeded max retries
    const pendingOperations = allOperations.filter(op => 
      op.retryCount < this.config.maxRetries
    );

    // Sort by priority (deletes first, then creates, then updates) and timestamp
    return pendingOperations.sort((a, b) => {
      const priorityOrder = { 'delete': 0, 'create': 1, 'update': 2, 'item_check': 3, 'item_uncheck': 4 };
      const aPriority = priorityOrder[a.type] ?? 999;
      const bPriority = priorityOrder[b.type] ?? 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Create batches from operations array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(operations: SyncOperation[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const operation of operations) {
      try {
        const result = await this.processSingleOperation(operation);
        results.push(result);

        // Remove successful operations from queue
        if (result.success) {
          await offlineStorageManager.removeSyncOperation(operation.id);
        } else {
          // Schedule retry for failed operations
          await this.scheduleRetry(operation, result.error);
        }

      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
        results.push({
          success: false,
          operation,
          error: error as Error
        });
        
        await this.scheduleRetry(operation, error as Error);
      }
    }

    return results;
  }

  /**
   * Process a single sync operation
   */
  private async processSingleOperation(operation: SyncOperation): Promise<SyncResult> {
    console.log(`Processing sync operation: ${operation.type} for ${operation.shoppingListId}`);

    try {
      switch (operation.type) {
        case 'create':
          return await this.processCreateOperation(operation);
        case 'update':
          return await this.processUpdateOperation(operation);
        case 'delete':
          return await this.processDeleteOperation(operation);
        case 'item_check':
        case 'item_uncheck':
          return await this.processItemStatusOperation(operation);
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      return {
        success: false,
        operation,
        error: error as Error
      };
    }
  }

  /**
   * Process create operation
   */
  private async processCreateOperation(operation: SyncOperation): Promise<SyncResult> {
    try {
      const response = await this.apiCall('POST', '/api/shopping-lists/sync', {
        operation: 'create',
        data: operation.data
      });

      if (response.conflict) {
        // Handle conflict
        const conflictResolution = await this.resolveConflict(operation, response.serverData);
        return {
          success: conflictResolution.strategy !== 'manual',
          operation,
          conflictResolution
        };
      }

      // Update local data with server response
      if (response.data) {
        await this.updateLocalDataFromServer(operation.shoppingListId, response.data);
      }

      return { success: true, operation };

    } catch (error) {
      return { success: false, operation, error: error as Error };
    }
  }

  /**
   * Process update operation
   */
  private async processUpdateOperation(operation: SyncOperation): Promise<SyncResult> {
    try {
      // Get current local data for conflict detection
      const localData = await offlineStorageManager.getShoppingList(operation.shoppingListId);
      
      const response = await this.apiCall('PUT', `/api/shopping-lists/sync/${operation.shoppingListId}`, {
        operation: 'update',
        data: operation.data,
        localVersion: localData?.metadata.version || 0
      });

      if (response.conflict) {
        const conflictResolution = await this.resolveConflict(operation, response.serverData, localData);
        return {
          success: conflictResolution.strategy !== 'manual',
          operation,
          conflictResolution
        };
      }

      // Update local data with server response
      if (response.data) {
        await this.updateLocalDataFromServer(operation.shoppingListId, response.data);
      }

      return { success: true, operation };

    } catch (error) {
      return { success: false, operation, error: error as Error };
    }
  }

  /**
   * Process delete operation
   */
  private async processDeleteOperation(operation: SyncOperation): Promise<SyncResult> {
    try {
      const response = await this.apiCall('DELETE', `/api/shopping-lists/sync/${operation.shoppingListId}`);

      // For deletes, we generally don't need conflict resolution
      // If the item is already deleted on server, that's fine
      return { success: true, operation };

    } catch (error) {
      // If it's a 404 (not found), consider it successful
      if ((error as any).status === 404) {
        return { success: true, operation };
      }
      
      return { success: false, operation, error: error as Error };
    }
  }

  /**
   * Process item status change operation (check/uncheck)
   */
  private async processItemStatusOperation(operation: SyncOperation): Promise<SyncResult> {
    try {
      const response = await this.apiCall('PATCH', `/api/shopping-lists/sync/${operation.shoppingListId}/items`, {
        operation: operation.type,
        data: operation.data
      });

      if (response.conflict) {
        const conflictResolution = await this.resolveConflict(operation, response.serverData);
        return {
          success: conflictResolution.strategy !== 'manual',
          operation,
          conflictResolution
        };
      }

      return { success: true, operation };

    } catch (error) {
      return { success: false, operation, error: error as Error };
    }
  }

  /**
   * Resolve conflicts between local and server data
   */
  private async resolveConflict(
    operation: SyncOperation,
    serverData: any,
    localData?: OfflineShoppingListEntry | null
  ): Promise<ConflictResolution> {
    console.log(`Resolving conflict for operation ${operation.id} using strategy: ${this.config.conflictResolutionStrategy}`);

    switch (this.config.conflictResolutionStrategy) {
      case 'local-wins':
        // Local changes take precedence (default for shopping lists)
        return {
          strategy: 'local-wins',
          resolvedData: operation.data
        };

      case 'server-wins':
        // Server data takes precedence
        if (localData) {
          await this.updateLocalDataFromServer(operation.shoppingListId, serverData);
        }
        return {
          strategy: 'server-wins',
          resolvedData: serverData
        };

      case 'merge':
        // Attempt to merge changes intelligently
        const mergedData = await this.mergeConflictingData(operation, serverData, localData);
        return {
          strategy: 'merge',
          resolvedData: mergedData
        };

      default:
        // Manual resolution required
        return {
          strategy: 'manual',
          requiresUserInput: true
        };
    }
  }

  /**
   * Merge conflicting data intelligently
   */
  private async mergeConflictingData(
    operation: SyncOperation,
    serverData: any,
    localData?: OfflineShoppingListEntry | null
  ): Promise<any> {
    if (!localData) {
      return serverData;
    }

    // For shopping lists, merge item states intelligently
    if (operation.type === 'update' && localData.shoppingList && serverData.shoppingList) {
      const mergedShoppingList = { ...serverData.shoppingList };

      // Merge item checked states - prefer local changes for checked items
      Object.keys(localData.shoppingList).forEach(category => {
        if (mergedShoppingList[category]) {
          localData.shoppingList[category].forEach(localItem => {
            const serverItemIndex = mergedShoppingList[category].findIndex(
              (item: any) => item.id === localItem.id
            );
            
            if (serverItemIndex >= 0) {
              // If local item was modified more recently, use local checked state
              const serverItem = mergedShoppingList[category][serverItemIndex];
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
          version: Math.max(localData.metadata.version || 0, serverData.metadata.version || 0) + 1
        }
      };
    }

    // For other types, default to server data
    return serverData;
  }

  /**
   * Update local data from server response
   */
  private async updateLocalDataFromServer(shoppingListId: string, serverData: any): Promise<void> {
    try {
      // Convert server data to local format if needed
      const localData: OfflineShoppingListEntry = {
        metadata: {
          ...serverData.metadata,
          syncStatus: 'synced' as const,
          lastModified: new Date(serverData.metadata.lastModified),
          generatedAt: new Date(serverData.metadata.generatedAt)
        },
        shoppingList: serverData.shoppingList
      };

      await offlineStorageManager.updateShoppingList(shoppingListId, localData);
      console.log(`Updated local data for shopping list ${shoppingListId} from server`);

    } catch (error) {
      console.error(`Failed to update local data from server for ${shoppingListId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule retry for failed operation with exponential backoff
   */
  private async scheduleRetry(operation: SyncOperation, error: Error): Promise<void> {
    const newRetryCount = operation.retryCount + 1;

    if (newRetryCount >= this.config.maxRetries) {
      console.error(`Operation ${operation.id} exceeded max retries (${this.config.maxRetries})`);
      // Could emit an event here for UI notification
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, newRetryCount - 1),
      this.config.maxRetryDelay
    );

    console.log(`Scheduling retry ${newRetryCount}/${this.config.maxRetries} for operation ${operation.id} in ${delay}ms`);

    // Update operation with new retry count
    const updatedOperation: SyncOperation = {
      ...operation,
      retryCount: newRetryCount
    };

    await this.updateSyncOperation(updatedOperation);

    // Clear any existing timeout for this operation
    const existingTimeout = this.retryTimeouts.get(operation.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule retry
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(operation.id);
      
      if (connectionMonitor.isOnline) {
        console.log(`Retrying operation ${operation.id} (attempt ${newRetryCount})`);
        await this.processQueue();
      } else {
        console.log(`Skipping retry for operation ${operation.id}: offline`);
      }
    }, delay);

    this.retryTimeouts.set(operation.id, timeout);
  }

  /**
   * Update an existing sync operation
   */
  private async updateSyncOperation(operation: SyncOperation): Promise<void> {
    // Remove old operation
    await offlineStorageManager.removeSyncOperation(operation.id);
    // Add updated operation
    await offlineStorageManager.addToSyncQueue(operation);
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const operations = await offlineStorageManager.getSyncQueue();
      const pendingOperations = operations.filter(op => op.retryCount < this.config.maxRetries);
      
      return {
        isActive: this.isProcessing,
        pendingOperations: pendingOperations.length,
        lastSync: this.getLastSyncTime(),
        errors: this.getRecentErrors(operations)
      };
    } catch (error) {
      return {
        isActive: false,
        pendingOperations: 0,
        lastSync: new Date(0),
        errors: [`Failed to get sync status: ${error.message}`]
      };
    }
  }

  /**
   * Get the last successful sync time
   */
  private getLastSyncTime(): Date {
    // This could be stored in localStorage or IndexedDB
    const lastSync = localStorage.getItem('last-sync-time');
    return lastSync ? new Date(lastSync) : new Date(0);
  }

  /**
   * Get recent error messages from failed operations
   */
  private getRecentErrors(operations: SyncOperation[]): string[] {
    const failedOperations = operations.filter(op => op.retryCount >= this.config.maxRetries);
    return failedOperations.slice(0, 5).map(op => 
      `Operation ${op.type} for ${op.shoppingListId} failed after ${op.retryCount} retries`
    );
  }

  /**
   * Clear all retry timeouts
   */
  private clearRetryTimeouts(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Setup network state listeners
   */
  private setupNetworkListeners(): void {
    // Listen for online/offline events
    connectionMonitor.onConnectionChange((isOnline) => {
      if (isOnline && !this.isProcessing) {
        console.log('Network restored, processing sync queue');
        this.processQueue().catch(error => {
          console.error('Failed to process sync queue after network restore:', error);
        });
      }
    });
  }

  /**
   * Add sync status listener
   */
  addSyncStatusListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncStatusListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of sync status changes
   */
  private async notifySyncStatusChange(): Promise<void> {
    if (this.syncListeners.length === 0) return;

    try {
      const status = await this.getSyncStatus();
      this.syncListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Sync status listener error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to notify sync status change:', error);
    }
  }

  /**
   * Validate sync operation structure
   */
  private validateSyncOperation(operation: SyncOperation): void {
    if (!operation.id || typeof operation.id !== 'string') {
      throw new Error('Sync operation must have a valid ID');
    }

    if (!operation.type || !['create', 'update', 'delete', 'item_check', 'item_uncheck'].includes(operation.type)) {
      throw new Error('Sync operation must have a valid type');
    }

    if (!operation.shoppingListId || typeof operation.shoppingListId !== 'string') {
      throw new Error('Sync operation must have a valid shopping list ID');
    }

    if (!(operation.timestamp instanceof Date)) {
      throw new Error('Sync operation must have a valid timestamp');
    }

    if (typeof operation.retryCount !== 'number' || operation.retryCount < 0) {
      throw new Error('Sync operation must have a valid retry count');
    }

    if (typeof operation.maxRetries !== 'number' || operation.maxRetries < 1) {
      throw new Error('Sync operation must have a valid max retries value');
    }
  }

  /**
   * Check if two operations are duplicates
   */
  private isDuplicateOperation(existing: SyncOperation, newOp: SyncOperation): boolean {
    return (
      existing.type === newOp.type &&
      existing.shoppingListId === newOp.shoppingListId &&
      // For item operations, also check the specific item
      (newOp.type.startsWith('item_') ? 
        existing.data?.itemId === newOp.data?.itemId : true)
    );
  }

  /**
   * Simulate API call (replace with actual API implementation)
   */
  private async apiCall(method: string, url: string, data?: any): Promise<any> {
    try {
      // Get auth token if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Not found - could be normal for delete operations
          const error = new Error(`Resource not found: ${response.status} ${response.statusText}`);
          (error as any).status = response.status;
          throw error;
        }

        if (response.status === 409) {
          // Conflict
          const conflictData = await response.json();
          return {
            conflict: true,
            serverData: conflictData.serverData || conflictData
          };
        }

        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData.data,
        version: responseData.version,
        lastModified: responseData.lastModified
      };

    } catch (error) {
      console.error(`API call failed: ${method} ${url}`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearRetryTimeouts();
    this.syncListeners.length = 0;
  }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManager();
export default syncQueueManager;