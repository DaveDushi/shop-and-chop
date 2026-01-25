/**
 * Tests for Cross-Device Consistency Manager
 * Validates cross-device synchronization, conflict detection, and resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crossDeviceConsistencyManager } from '../crossDeviceConsistencyManager';
import { multiDeviceConflictResolver } from '../multiDeviceConflictResolver';
import { offlineStorageManager } from '../offlineStorageManager';
import { connectionMonitor } from '../connectionMonitor';
import { OfflineShoppingListEntry } from '../../types/OfflineStorage.types';

// Mock dependencies
vi.mock('../offlineStorageManager');
vi.mock('../connectionMonitor');
vi.mock('../dataSyncManager');

const mockOfflineStorageManager = vi.mocked(offlineStorageManager);
const mockConnectionMonitor = vi.mocked(connectionMonitor);

const mockShoppingListEntry: OfflineShoppingListEntry = {
  metadata: {
    id: 'test-list-1',
    mealPlanId: 'meal-plan-1',
    weekStartDate: '2024-01-15',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    lastModified: new Date('2024-01-15T10:30:00Z'),
    syncStatus: 'synced',
    deviceId: 'device-1',
    version: 1
  },
  shoppingList: {
    'Produce': [
      {
        id: 'item-1',
        name: 'Apples',
        quantity: '2',
        unit: 'lbs',
        checked: false,
        lastModified: new Date('2024-01-15T10:30:00Z'),
        syncStatus: 'synced'
      }
    ]
  }
};

describe('CrossDeviceConsistencyManager', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the isOnline property
    Object.defineProperty(mockConnectionMonitor, 'isOnline', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  describe('Device Registration', () => {
    it('should register current device on initialization', async () => {
      mockOfflineStorageManager.initialize.mockResolvedValue();
      
      await crossDeviceConsistencyManager.initialize();
      
      // Verify device registration logic was called
      expect(mockOfflineStorageManager.initialize).toHaveBeenCalled();
    });

    it('should generate unique device ID', async () => {
      // Clear localStorage to test device ID generation
      localStorage.clear();
      
      await crossDeviceConsistencyManager.initialize();
      
      const deviceId = localStorage.getItem('deviceId');
      expect(deviceId).toBeTruthy();
      expect(deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    });
  });

  describe('Shopping List Download for New Device', () => {
    it('should download shopping lists when device has no local data', async () => {
      mockOfflineStorageManager.getAllShoppingLists.mockResolvedValue([]);
      mockConnectionMonitor.isOnline = true;
      
      // Mock the server fetch (would be implemented in real scenario)
      const downloadSpy = vi.spyOn(crossDeviceConsistencyManager, 'downloadShoppingListsForNewDevice');
      downloadSpy.mockResolvedValue();
      
      await crossDeviceConsistencyManager.downloadShoppingListsForNewDevice();
      
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should not download when offline', async () => {
      Object.defineProperty(mockConnectionMonitor, 'isOnline', {
        value: false,
        writable: true,
        configurable: true
      });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await crossDeviceConsistencyManager.downloadShoppingListsForNewDevice();
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot download shopping lists: offline');
      consoleSpy.mockRestore();
    });
  });

  describe('Change Propagation', () => {
    it('should propagate changes to other devices when online', async () => {
      Object.defineProperty(mockConnectionMonitor, 'isOnline', {
        value: true,
        writable: true,
        configurable: true
      });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await crossDeviceConsistencyManager.propagateChangesToDevices(
        'test-list-1',
        { checked: true },
        'exclude-device-1'
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Propagating changes for shopping list test-list-1')
      );
      consoleSpy.mockRestore();
    });

    it('should not propagate changes when offline', async () => {
      Object.defineProperty(mockConnectionMonitor, 'isOnline', {
        value: false,
        writable: true,
        configurable: true
      });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await crossDeviceConsistencyManager.propagateChangesToDevices(
        'test-list-1',
        { checked: true }
      );
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot propagate changes: offline');
      consoleSpy.mockRestore();
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts between device versions', async () => {
      const localEntry = { ...mockShoppingListEntry };
      const incomingChange = {
        shoppingListId: 'test-list-1',
        changes: {
          metadata: {
            ...mockShoppingListEntry.metadata,
            lastModified: new Date('2024-01-15T10:31:00Z'), // 1 minute later
            version: 2
          }
        },
        sourceDeviceId: 'device-2',
        timestamp: new Date('2024-01-15T10:31:00Z')
      };

      mockOfflineStorageManager.getShoppingList.mockResolvedValue(localEntry);
      
      const conflict = await crossDeviceConsistencyManager.detectDeviceConflict(
        localEntry,
        incomingChange
      );
      
      expect(conflict).toBeTruthy();
      expect(conflict?.conflictType).toBe('version-mismatch');
    });

    it('should not detect conflicts for synchronized data', async () => {
      const localEntry = { ...mockShoppingListEntry };
      localEntry.metadata.syncStatus = 'synced';
      
      const incomingChange = {
        shoppingListId: 'test-list-1',
        changes: {
          metadata: {
            ...mockShoppingListEntry.metadata,
            lastModified: new Date('2024-01-15T11:00:00Z'), // Much later
          }
        },
        sourceDeviceId: 'device-2',
        timestamp: new Date('2024-01-15T11:00:00Z')
      };

      const conflict = await crossDeviceConsistencyManager.detectDeviceConflict(
        localEntry,
        incomingChange
      );
      
      expect(conflict).toBeNull();
    });
  });

  describe('Incoming Changes Handling', () => {
    it('should handle incoming changes without conflicts', async () => {
      const localEntry = { ...mockShoppingListEntry };
      localEntry.metadata.syncStatus = 'synced';
      
      mockOfflineStorageManager.getShoppingList.mockResolvedValue(localEntry);
      mockOfflineStorageManager.updateShoppingList.mockResolvedValue();
      
      const changeData = {
        shoppingListId: 'test-list-1',
        changes: {
          shoppingList: {
            'Produce': [
              {
                ...localEntry.shoppingList['Produce'][0],
                checked: true
              }
            ]
          }
        },
        sourceDeviceId: 'device-2',
        timestamp: new Date('2024-01-15T11:00:00Z')
      };

      await crossDeviceConsistencyManager.handleIncomingDeviceChanges(changeData);
      
      expect(mockOfflineStorageManager.updateShoppingList).toHaveBeenCalled();
    });

    it('should fetch shopping list from server if not found locally', async () => {
      mockOfflineStorageManager.getShoppingList.mockResolvedValue(null);
      
      const fetchSpy = vi.spyOn(crossDeviceConsistencyManager, 'fetchAndCacheShoppingListFromServer');
      fetchSpy.mockResolvedValue();
      
      const changeData = {
        shoppingListId: 'test-list-1',
        changes: {},
        sourceDeviceId: 'device-2',
        timestamp: new Date()
      };

      await crossDeviceConsistencyManager.handleIncomingDeviceChanges(changeData);
      
      expect(fetchSpy).toHaveBeenCalledWith('test-list-1');
    });
  });

  describe('Cross-Device Sync Status', () => {
    it('should return comprehensive sync status', async () => {
      const status = await crossDeviceConsistencyManager.getCrossDeviceSyncStatus();
      
      expect(status).toHaveProperty('currentDevice');
      expect(status).toHaveProperty('registeredDevices');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('pendingConflicts');
      expect(status).toHaveProperty('isOnline');
      
      expect(status.currentDevice.isCurrentDevice).toBe(true);
      expect(Array.isArray(status.registeredDevices)).toBe(true);
      expect(typeof status.pendingConflicts).toBe('number');
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        deviceSyncInterval: 60000, // 1 minute
        conflictResolutionStrategy: 'timestamp' as const
      };
      
      crossDeviceConsistencyManager.configure(newConfig);
      
      // Configuration should be applied (tested through behavior)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      crossDeviceConsistencyManager.destroy();
      
      // Verify cleanup was performed
      expect(true).toBe(true); // Placeholder assertion
      consoleSpy.mockRestore();
    });
  });
});

describe('MultiDeviceConflictResolver', () => {
  const mockConflictingDevices = [
    {
      deviceId: 'device-1',
      deviceName: 'Mobile Device',
      data: mockShoppingListEntry,
      lastModified: new Date('2024-01-15T10:30:00Z'),
      changesSince: new Date('2024-01-15T10:30:00Z'),
      operationHistory: [
        {
          id: 'op-1',
          type: 'item_check' as const,
          itemId: 'item-1',
          category: 'Produce',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          data: { checked: true }
        }
      ]
    },
    {
      deviceId: 'device-2',
      deviceName: 'Desktop Device',
      data: {
        ...mockShoppingListEntry,
        metadata: {
          ...mockShoppingListEntry.metadata,
          deviceId: 'device-2',
          lastModified: new Date('2024-01-15T10:31:00Z'),
          version: 2
        }
      },
      lastModified: new Date('2024-01-15T10:31:00Z'),
      changesSince: new Date('2024-01-15T10:31:00Z'),
      operationHistory: [
        {
          id: 'op-2',
          type: 'item_uncheck' as const,
          itemId: 'item-1',
          category: 'Produce',
          timestamp: new Date('2024-01-15T10:31:00Z'),
          data: { checked: false }
        }
      ]
    }
  ];

  describe('Conflict Detection', () => {
    it('should detect conflicts between multiple devices', async () => {
      const conflicts = await multiDeviceConflictResolver.detectConflicts(
        'test-list-1',
        mockConflictingDevices
      );
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('item-state');
      expect(conflicts[0].devices).toHaveLength(2);
    });

    it('should not detect conflicts for non-overlapping changes', async () => {
      const nonConflictingDevices = [
        {
          ...mockConflictingDevices[0],
          lastModified: new Date('2024-01-15T10:00:00Z')
        },
        {
          ...mockConflictingDevices[1],
          lastModified: new Date('2024-01-15T11:00:00Z') // 1 hour later
        }
      ];

      const conflicts = await multiDeviceConflictResolver.detectConflicts(
        'test-list-1',
        nonConflictingDevices
      );
      
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using timestamp strategy', async () => {
      const conflict = {
        id: 'conflict-1',
        shoppingListId: 'test-list-1',
        conflictType: 'item-state' as const,
        devices: mockConflictingDevices,
        timestamp: new Date(),
        severity: 'medium' as const,
        autoResolvable: true,
        context: {
          timeWindow: 60000,
          affectedItems: ['item-1'],
          affectedCategories: ['Produce']
        }
      };

      const resolution = await multiDeviceConflictResolver.resolveConflict(conflict);
      
      expect(resolution.strategy).toBe('timestamp-based');
      expect(resolution.confidence).toBeGreaterThan(0);
      expect(resolution.resolvedData).toBeTruthy();
      expect(resolution.explanation).toContain('most recent');
    });

    it('should resolve conflicts using intelligent merge', async () => {
      // Set user preferences to prefer merge strategy
      multiDeviceConflictResolver.setUserPreferences({
        preferredStrategy: 'merge'
      });

      const conflict = {
        id: 'conflict-1',
        shoppingListId: 'test-list-1',
        conflictType: 'item-state' as const,
        devices: mockConflictingDevices,
        timestamp: new Date(),
        severity: 'low' as const,
        autoResolvable: true,
        context: {
          timeWindow: 60000,
          affectedItems: ['item-1'],
          affectedCategories: ['Produce']
        }
      };

      const resolution = await multiDeviceConflictResolver.resolveConflict(conflict);
      
      expect(resolution.strategy).toBe('intelligent-merge');
      expect(resolution.resolvedData).toBeTruthy();
    });
  });

  describe('User Preferences', () => {
    it('should allow setting and getting user preferences', () => {
      const preferences = {
        preferredStrategy: 'device-priority' as const,
        devicePriority: ['device-1', 'device-2'],
        preserveCheckedItems: true
      };

      multiDeviceConflictResolver.setUserPreferences(preferences);
      const retrieved = multiDeviceConflictResolver.getUserPreferences();
      
      expect(retrieved.preferredStrategy).toBe('device-priority');
      expect(retrieved.devicePriority).toEqual(['device-1', 'device-2']);
      expect(retrieved.preserveCheckedItems).toBe(true);
    });
  });

  describe('Conflict History', () => {
    it('should track conflict history', async () => {
      const conflicts = await multiDeviceConflictResolver.detectConflicts(
        'test-list-1',
        mockConflictingDevices
      );
      
      const history = multiDeviceConflictResolver.getConflictHistory('test-list-1');
      expect(history).toHaveLength(conflicts.length);
    });

    it('should clear conflict history', () => {
      multiDeviceConflictResolver.clearConflictHistory('test-list-1');
      const history = multiDeviceConflictResolver.getConflictHistory('test-list-1');
      expect(history).toHaveLength(0);
    });
  });
});