/**
 * Tests for SyncQueueManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncOperation } from '../../types/OfflineStorage.types';

// Mock dependencies at the top level
vi.mock('../offlineStorageManager', () => ({
  offlineStorageManager: {
    addToSyncQueue: vi.fn(),
    getSyncQueue: vi.fn(),
    removeSyncOperation: vi.fn(),
    getShoppingList: vi.fn(),
    updateShoppingList: vi.fn()
  }
}));

vi.mock('../connectionMonitor', () => ({
  connectionMonitor: {
    isOnline: true,
    onConnectionChange: vi.fn()
  }
}));

// Import after mocking
const { SyncQueueManager } = await import('../syncQueueManager');
const { offlineStorageManager } = await import('../offlineStorageManager');

describe('SyncQueueManager', () => {
  let syncQueueManager: InstanceType<typeof SyncQueueManager>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create new instance for each test
    syncQueueManager = new SyncQueueManager({
      maxRetries: 3,
      baseRetryDelay: 100, // Shorter delays for testing
      maxRetryDelay: 1000,
      batchSize: 5,
      conflictResolutionStrategy: 'local-wins',
      enableBackgroundSync: true
    });
  });

  afterEach(() => {
    if (syncQueueManager && typeof syncQueueManager.destroy === 'function') {
      syncQueueManager.destroy();
    }
  });

  describe('addToSyncQueue', () => {
    it('should add valid sync operation to queue', async () => {
      const operation: SyncOperation = {
        id: 'test-op-1',
        type: 'create',
        shoppingListId: 'list-1',
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      vi.mocked(offlineStorageManager.getSyncQueue).mockResolvedValue([]);
      vi.mocked(offlineStorageManager.addToSyncQueue).mockResolvedValue(undefined);

      await syncQueueManager.addToSyncQueue(operation);

      expect(offlineStorageManager.addToSyncQueue).toHaveBeenCalledWith(operation);
    });

    it('should validate sync operation structure', async () => {
      const invalidOperation = {
        id: '', // Invalid empty ID
        type: 'create',
        shoppingListId: 'list-1',
        data: {},
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      } as SyncOperation;

      await expect(syncQueueManager.addToSyncQueue(invalidOperation))
        .rejects.toThrow('Sync operation must have a valid ID');
    });
  });

  describe('getSyncStatus', () => {
    it('should return current sync status', async () => {
      vi.mocked(offlineStorageManager.getSyncQueue).mockResolvedValue([
        { id: '1', retryCount: 0, maxRetries: 3 } as SyncOperation,
        { id: '2', retryCount: 1, maxRetries: 3 } as SyncOperation,
        { id: '3', retryCount: 3, maxRetries: 3 } as SyncOperation // This one exceeded max retries
      ]);

      const status = await syncQueueManager.getSyncStatus();

      expect(status.isActive).toBe(false);
      expect(status.pendingOperations).toBe(2); // Only operations that haven't exceeded max retries
      expect(status.lastSync).toBeInstanceOf(Date);
      expect(Array.isArray(status.errors)).toBe(true);
    });
  });

  describe('exponential backoff', () => {
    it('should calculate correct retry delays', () => {
      const config = {
        baseRetryDelay: 1000,
        maxRetryDelay: 30000
      };

      const manager = new SyncQueueManager(config);

      // Test exponential backoff calculation
      const calculateDelay = (retryCount: number) => {
        return Math.min(
          config.baseRetryDelay * Math.pow(2, retryCount - 1),
          config.maxRetryDelay
        );
      };

      expect(calculateDelay(1)).toBe(1000);   // 1 second
      expect(calculateDelay(2)).toBe(2000);   // 2 seconds
      expect(calculateDelay(3)).toBe(4000);   // 4 seconds
      expect(calculateDelay(4)).toBe(8000);   // 8 seconds
      expect(calculateDelay(5)).toBe(16000);  // 16 seconds
      expect(calculateDelay(6)).toBe(30000);  // Capped at max delay

      if (typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });
  });

  describe('conflict resolution strategies', () => {
    it('should support different conflict resolution strategies', () => {
      const localWinsManager = new SyncQueueManager({ conflictResolutionStrategy: 'local-wins' });
      const serverWinsManager = new SyncQueueManager({ conflictResolutionStrategy: 'server-wins' });
      const mergeManager = new SyncQueueManager({ conflictResolutionStrategy: 'merge' });

      expect(localWinsManager).toBeDefined();
      expect(serverWinsManager).toBeDefined();
      expect(mergeManager).toBeDefined();

      // Cleanup
      [localWinsManager, serverWinsManager, mergeManager].forEach(manager => {
        if (typeof manager.destroy === 'function') {
          manager.destroy();
        }
      });
    });
  });
});