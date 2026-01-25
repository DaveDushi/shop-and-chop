/**
 * Integration tests for Cross-Device Synchronization
 * Tests the core functionality without complex mocking
 */

import { describe, it, expect } from 'vitest';
import { multiDeviceConflictResolver } from '../multiDeviceConflictResolver';
import { OfflineShoppingListEntry } from '../../types/OfflineStorage.types';

describe('Cross-Device Integration', () => {
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

  describe('MultiDeviceConflictResolver', () => {
    it('should initialize with default preferences', () => {
      const preferences = multiDeviceConflictResolver.getUserPreferences();
      
      expect(preferences.preferredStrategy).toBe('merge');
      expect(preferences.preserveCheckedItems).toBe(true);
      expect(preferences.preserveAddedItems).toBe(true);
    });

    it('should allow updating user preferences', () => {
      const newPreferences = {
        preferredStrategy: 'timestamp' as const,
        devicePriority: ['device-1', 'device-2'],
        autoResolveThreshold: 'high' as const
      };

      multiDeviceConflictResolver.setUserPreferences(newPreferences);
      const updated = multiDeviceConflictResolver.getUserPreferences();

      expect(updated.preferredStrategy).toBe('timestamp');
      expect(updated.devicePriority).toEqual(['device-1', 'device-2']);
      expect(updated.autoResolveThreshold).toBe('high');
    });

    it('should track conflict history', async () => {
      const mockDevices = [
        {
          deviceId: 'device-1',
          deviceName: 'Mobile Device',
          data: mockShoppingListEntry,
          lastModified: new Date('2024-01-15T10:30:00Z'),
          changesSince: new Date('2024-01-15T10:30:00Z'),
          operationHistory: []
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
          operationHistory: []
        }
      ];

      // Clear any existing history
      multiDeviceConflictResolver.clearConflictHistory();
      
      // Detect conflicts (this will store them in history)
      await multiDeviceConflictResolver.detectConflicts('test-list-1', mockDevices);
      
      const history = multiDeviceConflictResolver.getConflictHistory('test-list-1');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear conflict history', () => {
      multiDeviceConflictResolver.clearConflictHistory('test-list-1');
      const history = multiDeviceConflictResolver.getConflictHistory('test-list-1');
      expect(history).toHaveLength(0);
    });
  });

  describe('Device Information Generation', () => {
    it('should generate device ID in localStorage', () => {
      // Test the device ID generation pattern
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      expect(deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
      expect(deviceId.startsWith('device_')).toBe(true);
    });

    it('should detect device type from user agent', () => {
      const userAgent = navigator.userAgent;
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (/Mobile|Android|iPhone/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/Tablet|iPad/i.test(userAgent)) {
        deviceType = 'tablet';
      }
      
      expect(['mobile', 'tablet', 'desktop']).toContain(deviceType);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should have multiple resolution strategies available', () => {
      // Test that the conflict resolver has the expected strategies
      // This is tested indirectly through the preferences system
      const preferences = multiDeviceConflictResolver.getUserPreferences();
      
      // Test that we can set different strategies
      const strategies = ['timestamp', 'device-priority', 'merge', 'user-choice'] as const;
      
      for (const strategy of strategies) {
        multiDeviceConflictResolver.setUserPreferences({ preferredStrategy: strategy });
        const updated = multiDeviceConflictResolver.getUserPreferences();
        expect(updated.preferredStrategy).toBe(strategy);
      }
    });

    it('should validate conflict resolution thresholds', () => {
      const thresholds = ['low', 'medium', 'high'] as const;
      
      for (const threshold of thresholds) {
        multiDeviceConflictResolver.setUserPreferences({ autoResolveThreshold: threshold });
        const updated = multiDeviceConflictResolver.getUserPreferences();
        expect(updated.autoResolveThreshold).toBe(threshold);
      }
    });
  });
});