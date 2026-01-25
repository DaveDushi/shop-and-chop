/**
 * Tests for Data Serialization Utilities
 * 
 * Tests serialization, deserialization, migration, and schema validation
 * for shopping list data with comprehensive format support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DataSerializationUtil, 
  SyncOperationSerializer,
  dataSerializationUtil 
} from '../dataSerialization';
import { OfflineShoppingListEntry, SyncOperation } from '../../types/OfflineStorage.types';

// Mock performance API for testing
global.performance = {
  now: vi.fn(() => Date.now())
} as any;

describe('DataSerializationUtil', () => {
  let serializationUtil: DataSerializationUtil;
  let sampleEntry: OfflineShoppingListEntry;

  beforeEach(() => {
    serializationUtil = DataSerializationUtil.getInstance();
    
    sampleEntry = {
      metadata: {
        id: 'serialization-test-1',
        mealPlanId: 'meal-plan-456',
        weekStartDate: '2024-01-15',
        generatedAt: new Date('2024-01-15T09:00:00Z'),
        lastModified: new Date('2024-01-15T11:30:00Z'),
        syncStatus: 'synced',
        deviceId: 'device-456',
        version: 1
      },
      shoppingList: {
        'Vegetables': [
          {
            id: 'veg-1',
            name: 'Carrots',
            quantity: '2',
            unit: 'lbs',
            checked: false,
            lastModified: new Date('2024-01-15T09:15:00Z'),
            syncStatus: 'synced',
            recipeId: 'recipe-carrot-soup',
            recipeName: 'Carrot Soup'
          },
          {
            id: 'veg-2',
            name: 'Broccoli',
            quantity: '1',
            unit: 'head',
            checked: true,
            lastModified: new Date('2024-01-15T10:00:00Z'),
            syncStatus: 'pending'
          }
        ],
        'Meat': [
          {
            id: 'meat-1',
            name: 'Chicken Breast',
            quantity: '2',
            unit: 'lbs',
            checked: false,
            lastModified: new Date('2024-01-15T09:30:00Z'),
            syncStatus: 'synced',
            recipeId: 'recipe-chicken-dinner',
            recipeName: 'Chicken Dinner'
          }
        ]
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize shopping list entries correctly', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'json' });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      expect(serialized.format).toBe('json');
      expect(serialized.version).toBe(1);
      expect(serialized.size).toBeGreaterThan(0);
      expect(serialized.checksum).toBeDefined();
      
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      expect(deserialized).toEqual(sampleEntry);
    });

    it('should preserve data types during JSON serialization', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'json' });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      
      // Check dates are properly restored
      expect(deserialized.metadata.generatedAt).toBeInstanceOf(Date);
      expect(deserialized.metadata.lastModified).toBeInstanceOf(Date);
      expect(deserialized.shoppingList.Vegetables[0].lastModified).toBeInstanceOf(Date);
      
      // Check booleans are preserved
      expect(typeof deserialized.shoppingList.Vegetables[0].checked).toBe('boolean');
      expect(typeof deserialized.shoppingList.Vegetables[1].checked).toBe('boolean');
      
      // Check strings are preserved
      expect(typeof deserialized.metadata.id).toBe('string');
      expect(typeof deserialized.shoppingList.Vegetables[0].name).toBe('string');
    });

    it('should handle entries with missing optional fields', async () => {
      const entryWithoutOptionals = {
        ...sampleEntry,
        shoppingList: {
          'Basic': [
            {
              id: 'basic-1',
              name: 'Basic Item',
              quantity: '1',
              unit: 'piece',
              checked: false,
              lastModified: new Date(),
              syncStatus: 'pending' as const
              // No recipeId or recipeName
            }
          ]
        }
      };

      const util = DataSerializationUtil.getInstance({ format: 'json' });
      const serialized = await util.serializeShoppingListEntry(entryWithoutOptionals);
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      
      expect(deserialized).toEqual(entryWithoutOptionals);
      expect(deserialized.shoppingList.Basic[0].recipeId).toBeUndefined();
      expect(deserialized.shoppingList.Basic[0].recipeName).toBeUndefined();
    });
  });

  describe('Binary Serialization', () => {
    it('should serialize and deserialize using binary format', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'binary' });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      expect(serialized.format).toBe('binary');
      expect(serialized.data).toBeInstanceOf(ArrayBuffer);
      
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      expect(deserialized).toEqual(sampleEntry);
    });

    it('should handle binary serialization of large entries', async () => {
      const largeEntry = { ...sampleEntry };
      
      // Add many items to test binary serialization performance
      for (let i = 0; i < 100; i++) {
        largeEntry.shoppingList.Vegetables.push({
          id: `large-item-${i}`,
          name: `Large Item ${i}`,
          quantity: String(i + 1),
          unit: 'pieces',
          checked: i % 2 === 0,
          lastModified: new Date(),
          syncStatus: 'pending'
        });
      }

      const util = DataSerializationUtil.getInstance({ format: 'binary' });
      const serialized = await util.serializeShoppingListEntry(largeEntry);
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      
      expect(deserialized).toEqual(largeEntry);
      expect(deserialized.shoppingList.Vegetables).toHaveLength(102); // 2 original + 100 added
    });
  });

  describe('Compact Serialization', () => {
    it('should serialize and deserialize using compact format', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'compact' });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      expect(serialized.format).toBe('compact');
      expect(serialized.data._format).toBe('compact');
      expect(serialized.data._fieldMap).toBeDefined();
      expect(serialized.data._metadataMap).toBeDefined();
      
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      expect(deserialized).toEqual(sampleEntry);
    });

    it('should achieve space savings with compact format', async () => {
      const jsonUtil = DataSerializationUtil.getInstance({ format: 'json' });
      const compactUtil = DataSerializationUtil.getInstance({ format: 'compact' });
      
      const jsonSerialized = await jsonUtil.serializeShoppingListEntry(sampleEntry);
      const compactSerialized = await compactUtil.serializeShoppingListEntry(sampleEntry);
      
      // Compact format should generally be smaller for structured data
      expect(compactSerialized.size).toBeLessThanOrEqual(jsonSerialized.size);
    });

    it('should handle timestamps correctly in compact format', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'compact' });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      
      // Verify timestamps are preserved correctly
      expect(deserialized.metadata.generatedAt.getTime()).toBe(sampleEntry.metadata.generatedAt.getTime());
      expect(deserialized.metadata.lastModified.getTime()).toBe(sampleEntry.metadata.lastModified.getTime());
      expect(deserialized.shoppingList.Vegetables[0].lastModified.getTime())
        .toBe(sampleEntry.shoppingList.Vegetables[0].lastModified.getTime());
    });
  });

  describe('Schema Validation', () => {
    it('should validate entries against schema', async () => {
      const util = DataSerializationUtil.getInstance({ enableValidation: true });
      
      // Valid entry should serialize without issues
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      expect(serialized).toBeDefined();
    });

    it('should reject entries with missing required fields', async () => {
      const invalidEntry = {
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          id: undefined as any // Missing required field
        }
      };

      const util = DataSerializationUtil.getInstance({ enableValidation: true });
      
      await expect(util.serializeShoppingListEntry(invalidEntry))
        .rejects.toThrow('Missing required field');
    });

    it('should reject entries with invalid field types', async () => {
      const invalidEntry = {
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          generatedAt: 'not-a-date' as any // Invalid type
        }
      };

      const util = DataSerializationUtil.getInstance({ enableValidation: true });
      
      await expect(util.serializeShoppingListEntry(invalidEntry))
        .rejects.toThrow('must be a Date or ISO string');
    });

    it('should validate sync status values', async () => {
      const invalidEntry = {
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          syncStatus: 'invalid-status' as any
        }
      };

      const util = DataSerializationUtil.getInstance({ enableValidation: true });
      
      await expect(util.serializeShoppingListEntry(invalidEntry))
        .rejects.toThrow('failed custom validation');
    });

    it('should allow disabling validation', async () => {
      const invalidEntry = {
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          id: undefined as any
        }
      };

      const util = DataSerializationUtil.getInstance({ enableValidation: false });
      
      // Should not throw when validation is disabled
      const serialized = await util.serializeShoppingListEntry(invalidEntry);
      expect(serialized).toBeDefined();
    });
  });

  describe('Migration Support', () => {
    it('should handle version migration during deserialization', async () => {
      // Create a version 1 serialized entry
      const v1Util = DataSerializationUtil.getInstance({ version: 1 });
      const serialized = await v1Util.serializeShoppingListEntry(sampleEntry);
      
      // Deserialize with version 2 utility (should trigger migration)
      const v2Util = DataSerializationUtil.getInstance({ version: 2, enableMigration: true });
      
      // Add a custom migration handler for testing
      v2Util.addMigrationHandler({
        fromVersion: 1,
        toVersion: 2,
        migrate: (data: any) => ({
          ...data,
          metadata: {
            ...data.metadata,
            version: 2,
            migratedAt: new Date().toISOString()
          }
        })
      });
      
      const deserialized = await v2Util.deserializeShoppingListEntry(serialized);
      
      expect(deserialized.metadata.version).toBe(2);
      expect((deserialized.metadata as any).migratedAt).toBeDefined();
    });

    it('should skip migration when disabled', async () => {
      const v1Util = DataSerializationUtil.getInstance({ version: 1 });
      const serialized = await v1Util.serializeShoppingListEntry(sampleEntry);
      
      const v2Util = DataSerializationUtil.getInstance({ version: 2, enableMigration: false });
      const deserialized = await v2Util.deserializeShoppingListEntry(serialized);
      
      // Should remain at original version
      expect(deserialized.metadata.version).toBe(1);
    });

    it('should handle missing migration handlers gracefully', async () => {
      const v1Util = DataSerializationUtil.getInstance({ version: 1 });
      const serialized = await v1Util.serializeShoppingListEntry(sampleEntry);
      
      // Try to deserialize with version 5 (no migration handler exists)
      const v5Util = DataSerializationUtil.getInstance({ version: 5, enableMigration: true });
      const deserialized = await v5Util.deserializeShoppingListEntry(serialized);
      
      // Should still work but remain at original version
      expect(deserialized.metadata.version).toBe(1);
    });
  });

  describe('Checksum Validation', () => {
    it('should validate checksums during deserialization', async () => {
      const util = DataSerializationUtil.getInstance({ enableValidation: true });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      
      // Tamper with the checksum
      serialized.checksum = 'invalid-checksum';
      
      await expect(util.deserializeShoppingListEntry(serialized))
        .rejects.toThrow('checksum mismatch');
    });

    it('should skip checksum validation when disabled', async () => {
      const util = DataSerializationUtil.getInstance({ enableValidation: false });
      
      const serialized = await util.serializeShoppingListEntry(sampleEntry);
      serialized.checksum = 'invalid-checksum';
      
      // Should not throw when validation is disabled
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      expect(deserialized).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle serialization errors gracefully', async () => {
      const util = DataSerializationUtil.getInstance();
      
      // Try to serialize invalid data
      const invalidEntry = null as any;
      
      await expect(util.serializeShoppingListEntry(invalidEntry))
        .rejects.toThrow('Failed to serialize shopping list entry');
    });

    it('should handle deserialization errors gracefully', async () => {
      const util = DataSerializationUtil.getInstance();
      
      // Try to deserialize invalid data
      const invalidSerialized = { invalid: 'data' } as any;
      
      await expect(util.deserializeShoppingListEntry(invalidSerialized))
        .rejects.toThrow('Failed to deserialize shopping list entry');
    });

    it('should handle corrupted binary data', async () => {
      const util = DataSerializationUtil.getInstance({ format: 'binary' });
      
      const corruptedSerialized = {
        data: new ArrayBuffer(10), // Invalid binary data
        format: 'binary',
        version: 1,
        size: 10,
        checksum: 'invalid',
        timestamp: new Date()
      };
      
      await expect(util.deserializeShoppingListEntry(corruptedSerialized))
        .rejects.toThrow('Failed to deserialize shopping list entry');
    });
  });

  describe('Statistics and Metadata', () => {
    it('should provide serialization statistics', () => {
      const util = DataSerializationUtil.getInstance();
      const stats = util.getStats();
      
      expect(stats.supportedFormats).toContain('json');
      expect(stats.supportedFormats).toContain('binary');
      expect(stats.supportedFormats).toContain('compact');
      expect(stats.currentVersion).toBe(1);
      expect(Array.isArray(stats.availableVersions)).toBe(true);
      expect(Array.isArray(stats.migrationHandlers)).toBe(true);
    });

    it('should track custom schemas and migration handlers', () => {
      const util = DataSerializationUtil.getInstance();
      
      // Add custom schema
      util.addSchema({
        version: 3,
        fields: {
          'metadata.id': { type: 'string' },
          'customField': { type: 'string', optional: true }
        },
        required: ['metadata.id']
      });
      
      // Add custom migration handler
      util.addMigrationHandler({
        fromVersion: 2,
        toVersion: 3,
        migrate: (data: any) => ({ ...data, customField: 'added' })
      });
      
      const stats = util.getStats();
      expect(stats.availableVersions).toContain(3);
      expect(stats.migrationHandlers).toContain('2->3');
    });
  });
});

describe('SyncOperationSerializer', () => {
  let sampleSyncOperation: SyncOperation;

  beforeEach(() => {
    sampleSyncOperation = {
      id: 'sync-op-1',
      type: 'update',
      shoppingListId: 'shopping-list-123',
      data: {
        itemId: 'item-456',
        checked: true
      },
      timestamp: new Date('2024-01-15T12:00:00Z'),
      retryCount: 0,
      maxRetries: 3
    };
  });

  describe('Single Operation Serialization', () => {
    it('should serialize sync operations correctly', () => {
      const serialized = SyncOperationSerializer.serialize(sampleSyncOperation);
      
      expect(serialized.id).toBe(sampleSyncOperation.id);
      expect(serialized.type).toBe(sampleSyncOperation.type);
      expect(serialized.shoppingListId).toBe(sampleSyncOperation.shoppingListId);
      expect(serialized.data).toEqual(sampleSyncOperation.data);
      expect(serialized.timestamp).toBe('2024-01-15T12:00:00.000Z');
      expect(serialized.retryCount).toBe(0);
      expect(serialized.maxRetries).toBe(3);
    });

    it('should deserialize sync operations correctly', () => {
      const serialized = SyncOperationSerializer.serialize(sampleSyncOperation);
      const deserialized = SyncOperationSerializer.deserialize(serialized);
      
      expect(deserialized).toEqual(sampleSyncOperation);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
      expect(deserialized.timestamp.getTime()).toBe(sampleSyncOperation.timestamp.getTime());
    });

    it('should handle missing optional fields', () => {
      const serializedWithDefaults = {
        id: 'sync-op-2',
        type: 'create',
        shoppingListId: 'shopping-list-456',
        data: { test: 'data' },
        timestamp: '2024-01-15T13:00:00.000Z'
        // Missing retryCount and maxRetries
      };

      const deserialized = SyncOperationSerializer.deserialize(serializedWithDefaults);
      
      expect(deserialized.retryCount).toBe(0);
      expect(deserialized.maxRetries).toBe(3);
    });
  });

  describe('Batch Serialization', () => {
    it('should serialize multiple sync operations', () => {
      const operations: SyncOperation[] = [
        sampleSyncOperation,
        {
          ...sampleSyncOperation,
          id: 'sync-op-2',
          type: 'create',
          timestamp: new Date('2024-01-15T13:00:00Z')
        },
        {
          ...sampleSyncOperation,
          id: 'sync-op-3',
          type: 'delete',
          timestamp: new Date('2024-01-15T14:00:00Z')
        }
      ];

      const serialized = SyncOperationSerializer.serializeBatch(operations);
      
      expect(serialized).toHaveLength(3);
      expect(serialized[0].id).toBe('sync-op-1');
      expect(serialized[1].id).toBe('sync-op-2');
      expect(serialized[2].id).toBe('sync-op-3');
      
      // Check that timestamps are converted to strings
      expect(typeof serialized[0].timestamp).toBe('string');
      expect(typeof serialized[1].timestamp).toBe('string');
      expect(typeof serialized[2].timestamp).toBe('string');
    });

    it('should deserialize multiple sync operations', () => {
      const operations: SyncOperation[] = [
        sampleSyncOperation,
        {
          ...sampleSyncOperation,
          id: 'sync-op-2',
          type: 'item_check',
          timestamp: new Date('2024-01-15T13:00:00Z')
        }
      ];

      const serialized = SyncOperationSerializer.serializeBatch(operations);
      const deserialized = SyncOperationSerializer.deserializeBatch(serialized);
      
      expect(deserialized).toEqual(operations);
      expect(deserialized).toHaveLength(2);
      expect(deserialized[0].timestamp).toBeInstanceOf(Date);
      expect(deserialized[1].timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty batch operations', () => {
      const emptyBatch: SyncOperation[] = [];
      
      const serialized = SyncOperationSerializer.serializeBatch(emptyBatch);
      const deserialized = SyncOperationSerializer.deserializeBatch(serialized);
      
      expect(serialized).toHaveLength(0);
      expect(deserialized).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all sync operation types', () => {
      const operationTypes: SyncOperation['type'][] = [
        'create', 'update', 'delete', 'item_check', 'item_uncheck'
      ];

      operationTypes.forEach(type => {
        const operation: SyncOperation = {
          ...sampleSyncOperation,
          id: `sync-op-${type}`,
          type
        };

        const serialized = SyncOperationSerializer.serialize(operation);
        const deserialized = SyncOperationSerializer.deserialize(serialized);
        
        expect(deserialized.type).toBe(type);
      });
    });

    it('should preserve complex data objects', () => {
      const complexOperation: SyncOperation = {
        ...sampleSyncOperation,
        data: {
          itemUpdates: [
            { id: 'item-1', checked: true, quantity: '2' },
            { id: 'item-2', checked: false, name: 'Updated Name' }
          ],
          metadata: {
            updatedBy: 'user-123',
            reason: 'bulk update'
          },
          timestamp: new Date().toISOString()
        }
      };

      const serialized = SyncOperationSerializer.serialize(complexOperation);
      const deserialized = SyncOperationSerializer.deserialize(serialized);
      
      expect(deserialized.data).toEqual(complexOperation.data);
      expect(deserialized.data.itemUpdates).toHaveLength(2);
      expect(deserialized.data.metadata.updatedBy).toBe('user-123');
    });
  });
});

describe('Integration Tests', () => {
  it('should work with the singleton instance', async () => {
    const testEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'integration-serialization-test',
        mealPlanId: 'meal-plan-789',
        weekStartDate: '2024-01-20',
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: 'device-789',
        version: 1
      },
      shoppingList: {
        'Integration Test': [
          {
            id: 'integration-item',
            name: 'Integration Test Item',
            quantity: '1',
            unit: 'piece',
            checked: false,
            lastModified: new Date(),
            syncStatus: 'pending'
          }
        ]
      }
    };

    const serialized = await dataSerializationUtil.serializeShoppingListEntry(testEntry);
    const deserialized = await dataSerializationUtil.deserializeShoppingListEntry(serialized);
    
    expect(deserialized).toEqual(testEntry);
  });

  it('should handle round-trip serialization with different formats', async () => {
    const testEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'format-test',
        mealPlanId: 'meal-plan-format',
        weekStartDate: '2024-01-25',
        generatedAt: new Date('2024-01-25T08:00:00Z'),
        lastModified: new Date('2024-01-25T10:00:00Z'),
        syncStatus: 'synced',
        deviceId: 'device-format',
        version: 1
      },
      shoppingList: {
        'Format Test': [
          {
            id: 'format-item',
            name: 'Format Test Item',
            quantity: '5',
            unit: 'units',
            checked: true,
            lastModified: new Date('2024-01-25T09:00:00Z'),
            syncStatus: 'synced'
          }
        ]
      }
    };

    const formats: ('json' | 'binary' | 'compact')[] = ['json', 'binary', 'compact'];
    
    for (const format of formats) {
      const util = DataSerializationUtil.getInstance({ format });
      const serialized = await util.serializeShoppingListEntry(testEntry);
      const deserialized = await util.deserializeShoppingListEntry(serialized);
      
      expect(deserialized).toEqual(testEntry);
      expect(serialized.format).toBe(format);
    }
  });
});