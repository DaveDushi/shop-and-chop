/**
 * Tests for Data Compression Utilities
 * 
 * Tests compression, decompression, validation, and backup functionality
 * for shopping list data with comprehensive edge cases and error scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DataCompressionUtil, 
  DataValidationUtil, 
  BackupUtil,
  dataCompressionUtil 
} from '../dataCompression';
import { OfflineShoppingListEntry, OfflineShoppingListItem } from '../../types/OfflineStorage.types';

// Mock performance API for testing
global.performance = {
  now: vi.fn(() => Date.now())
} as any;

describe('DataCompressionUtil', () => {
  let compressionUtil: DataCompressionUtil;
  let sampleEntry: OfflineShoppingListEntry;

  beforeEach(() => {
    compressionUtil = DataCompressionUtil.getInstance();
    
    // Create a comprehensive sample entry for testing
    sampleEntry = {
      metadata: {
        id: 'test-shopping-list-1',
        mealPlanId: 'meal-plan-123',
        weekStartDate: '2024-01-01',
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        lastModified: new Date('2024-01-01T12:00:00Z'),
        syncStatus: 'pending',
        deviceId: 'device-123',
        version: 1
      },
      shoppingList: {
        'Produce': [
          {
            id: 'item-1',
            name: 'Organic Bananas',
            quantity: '2',
            unit: 'bunches',
            checked: false,
            lastModified: new Date('2024-01-01T10:00:00Z'),
            syncStatus: 'pending',
            recipeId: 'recipe-1',
            recipeName: 'Banana Smoothie'
          },
          {
            id: 'item-2',
            name: 'Fresh Spinach',
            quantity: '1',
            unit: 'bag',
            checked: true,
            lastModified: new Date('2024-01-01T11:00:00Z'),
            syncStatus: 'synced'
          }
        ],
        'Dairy': [
          {
            id: 'item-3',
            name: 'Whole Milk',
            quantity: '1',
            unit: 'gallon',
            checked: false,
            lastModified: new Date('2024-01-01T10:30:00Z'),
            syncStatus: 'pending',
            recipeId: 'recipe-2',
            recipeName: 'Cereal Bowl'
          }
        ],
        'Pantry': []
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Compression and Decompression', () => {
    it('should compress and decompress shopping list data correctly', async () => {
      const compressionResult = await compressionUtil.compressShoppingList(sampleEntry);
      
      expect(compressionResult).toBeDefined();
      expect(compressionResult.originalSize).toBeGreaterThan(0);
      expect(compressionResult.compressedSize).toBeGreaterThan(0);
      expect(compressionResult.compressionRatio).toBeGreaterThan(0);
      expect(compressionResult.algorithm).toBeDefined();
      expect(compressionResult.checksum).toBeDefined();

      const decompressed = await compressionUtil.decompressShoppingList(compressionResult.compressed);
      
      expect(decompressed).toEqual(sampleEntry);
      expect(decompressed.metadata.id).toBe(sampleEntry.metadata.id);
      expect(decompressed.shoppingList.Produce).toHaveLength(2);
      expect(decompressed.shoppingList.Dairy).toHaveLength(1);
      expect(decompressed.shoppingList.Pantry).toHaveLength(0);
    });

    it('should handle small data below compression threshold', async () => {
      const smallEntry = {
        ...sampleEntry,
        shoppingList: {
          'Test': [
            {
              id: 'small-item',
              name: 'Test',
              quantity: '1',
              unit: 'item',
              checked: false,
              lastModified: new Date(),
              syncStatus: 'pending' as const
            }
          ]
        }
      };

      const result = await compressionUtil.compressShoppingList(smallEntry);
      
      expect(result.algorithm).toBe('none');
      expect(result.compressionRatio).toBe(1.0);
      expect(result.originalSize).toBe(result.compressedSize);
    });

    it('should handle different compression algorithms', async () => {
      const algorithms = ['lz-string', 'json-optimize', 'hybrid'] as const;
      
      for (const algorithm of algorithms) {
        const util = DataCompressionUtil.getInstance({ algorithm });
        const result = await util.compressShoppingList(sampleEntry);
        
        expect(result.algorithm).toBe(algorithm);
        
        const decompressed = await util.decompressShoppingList(result.compressed);
        expect(decompressed).toEqual(sampleEntry);
      }
    });

    it('should preserve data types during compression/decompression', async () => {
      const result = await compressionUtil.compressShoppingList(sampleEntry);
      const decompressed = await compressionUtil.decompressShoppingList(result.compressed);
      
      // Check that dates are properly restored
      expect(decompressed.metadata.generatedAt).toBeInstanceOf(Date);
      expect(decompressed.metadata.lastModified).toBeInstanceOf(Date);
      expect(decompressed.shoppingList.Produce[0].lastModified).toBeInstanceOf(Date);
      
      // Check that booleans are preserved
      expect(typeof decompressed.shoppingList.Produce[0].checked).toBe('boolean');
      expect(typeof decompressed.shoppingList.Produce[1].checked).toBe('boolean');
      
      // Check that strings are preserved
      expect(typeof decompressed.metadata.id).toBe('string');
      expect(typeof decompressed.shoppingList.Produce[0].name).toBe('string');
    });

    it('should handle empty shopping lists', async () => {
      const emptyEntry = {
        ...sampleEntry,
        shoppingList: {}
      };

      const result = await compressionUtil.compressShoppingList(emptyEntry);
      const decompressed = await compressionUtil.decompressShoppingList(result.compressed);
      
      expect(decompressed.shoppingList).toEqual({});
    });

    it('should handle entries with missing optional fields', async () => {
      const entryWithoutOptionals = {
        ...sampleEntry,
        shoppingList: {
          'Basic': [
            {
              id: 'basic-item',
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

      const result = await compressionUtil.compressShoppingList(entryWithoutOptionals);
      const decompressed = await compressionUtil.decompressShoppingList(result.compressed);
      
      expect(decompressed).toEqual(entryWithoutOptionals);
      expect(decompressed.shoppingList.Basic[0].recipeId).toBeUndefined();
      expect(decompressed.shoppingList.Basic[0].recipeName).toBeUndefined();
    });

    it('should handle compression errors gracefully', async () => {
      const invalidEntry = null as any;
      
      await expect(compressionUtil.compressShoppingList(invalidEntry))
        .rejects.toThrow('Failed to compress shopping list data');
    });

    it('should handle decompression errors gracefully', async () => {
      const invalidCompressedData = { invalid: 'data' };
      
      await expect(compressionUtil.decompressShoppingList(invalidCompressedData))
        .rejects.toThrow('Failed to decompress shopping list data');
    });

    it('should validate checksums during decompression', async () => {
      const result = await compressionUtil.compressShoppingList(sampleEntry);
      
      // Tamper with the compressed data
      if (result.compressed._checksum) {
        result.compressed._checksum = 'invalid-checksum';
      }
      
      await expect(compressionUtil.decompressShoppingList(result.compressed))
        .rejects.toThrow('Data integrity check failed');
    });
  });

  describe('Compression Statistics', () => {
    it('should track compression statistics', async () => {
      await compressionUtil.compressShoppingList(sampleEntry);
      
      const stats = compressionUtil.getCompressionStats();
      expect(stats).toBeDefined();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it('should update statistics for different algorithms', async () => {
      const util1 = DataCompressionUtil.getInstance({ algorithm: 'lz-string' });
      const util2 = DataCompressionUtil.getInstance({ algorithm: 'json-optimize' });
      
      await util1.compressShoppingList(sampleEntry);
      await util2.compressShoppingList(sampleEntry);
      
      const stats1 = util1.getCompressionStats();
      const stats2 = util2.getCompressionStats();
      
      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();
    });
  });
});

describe('DataValidationUtil', () => {
  let validEntry: OfflineShoppingListEntry;

  beforeEach(() => {
    validEntry = {
      metadata: {
        id: 'valid-entry',
        mealPlanId: 'meal-plan-123',
        weekStartDate: '2024-01-01',
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        lastModified: new Date('2024-01-01T12:00:00Z'),
        syncStatus: 'pending',
        deviceId: 'device-123',
        version: 1
      },
      shoppingList: {
        'Test Category': [
          {
            id: 'test-item',
            name: 'Test Item',
            quantity: '1',
            unit: 'piece',
            checked: false,
            lastModified: new Date(),
            syncStatus: 'pending'
          }
        ]
      }
    };
  });

  describe('Entry Validation', () => {
    it('should validate correct shopping list entries', () => {
      const result = DataValidationUtil.validateShoppingListEntry(validEntry);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.recoverable).toBe(true);
    });

    it('should detect missing metadata', () => {
      const invalidEntry = { ...validEntry };
      delete (invalidEntry as any).metadata;
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
      expect(result.recoverable).toBe(false);
    });

    it('should detect missing required metadata fields', () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          id: undefined as any
        }
      };
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should detect invalid shopping list structure', () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: 'not an object' as any
      };
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('shopping list'))).toBe(true);
    });

    it('should detect invalid item arrays', () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'Invalid Category': 'not an array' as any
        }
      };
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('array'))).toBe(true);
    });

    it('should detect missing required item fields', () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'Test Category': [
            {
              // Missing required fields
              name: 'Incomplete Item'
            } as any
          ]
        }
      };
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid sync status values', () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          syncStatus: 'invalid-status' as any
        }
      };
      
      const result = DataValidationUtil.validateShoppingListEntry(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('syncStatus'))).toBe(true);
    });

    it('should handle null or undefined entries', () => {
      const nullResult = DataValidationUtil.validateShoppingListEntry(null);
      const undefinedResult = DataValidationUtil.validateShoppingListEntry(undefined);
      
      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
      expect(nullResult.recoverable).toBe(false);
      expect(undefinedResult.recoverable).toBe(false);
    });
  });

  describe('Entry Repair', () => {
    it('should repair entries with missing optional fields', () => {
      const repairableEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          syncStatus: undefined as any,
          version: undefined as any
        }
      };
      
      const repaired = DataValidationUtil.repairShoppingListEntry(repairableEntry);
      
      expect(repaired).toBeDefined();
      expect(repaired!.metadata.syncStatus).toBe('pending');
      expect(repaired!.metadata.version).toBe(1);
    });

    it('should repair date strings to Date objects', () => {
      const repairableEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          generatedAt: '2024-01-01T10:00:00Z' as any,
          lastModified: '2024-01-01T12:00:00Z' as any
        }
      };
      
      const repaired = DataValidationUtil.repairShoppingListEntry(repairableEntry);
      
      expect(repaired).toBeDefined();
      expect(repaired!.metadata.generatedAt).toBeInstanceOf(Date);
      expect(repaired!.metadata.lastModified).toBeInstanceOf(Date);
    });

    it('should repair boolean values in items', () => {
      const repairableEntry = {
        ...validEntry,
        shoppingList: {
          'Test Category': [
            {
              ...validEntry.shoppingList['Test Category'][0],
              checked: 'true' as any // String instead of boolean
            }
          ]
        }
      };
      
      const repaired = DataValidationUtil.repairShoppingListEntry(repairableEntry);
      
      expect(repaired).toBeDefined();
      expect(typeof repaired!.shoppingList['Test Category'][0].checked).toBe('boolean');
      expect(repaired!.shoppingList['Test Category'][0].checked).toBe(true);
    });

    it('should return null for unrepairable entries', () => {
      const unrepairableEntry = {
        // Completely invalid structure
        invalid: 'data'
      };
      
      const repaired = DataValidationUtil.repairShoppingListEntry(unrepairableEntry);
      
      expect(repaired).toBeNull();
    });
  });
});

describe('BackupUtil', () => {
  let sampleEntry: OfflineShoppingListEntry;

  beforeEach(() => {
    sampleEntry = {
      metadata: {
        id: 'backup-test-entry',
        mealPlanId: 'meal-plan-123',
        weekStartDate: '2024-01-01',
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        lastModified: new Date('2024-01-01T12:00:00Z'),
        syncStatus: 'pending',
        deviceId: 'device-123',
        version: 1
      },
      shoppingList: {
        'Test': [
          {
            id: 'test-item',
            name: 'Test Item',
            quantity: '1',
            unit: 'piece',
            checked: false,
            lastModified: new Date(),
            syncStatus: 'pending'
          }
        ]
      }
    };
  });

  describe('Backup Creation', () => {
    it('should create backup metadata correctly', () => {
      const backup = BackupUtil.createBackup(sampleEntry);
      
      expect(backup.id).toMatch(/^backup_backup-test-entry_\d+$/);
      expect(backup.originalId).toBe('backup-test-entry');
      expect(backup.timestamp).toBeInstanceOf(Date);
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.checksum).toBeDefined();
      expect(backup.version).toBe(1);
    });

    it('should generate unique backup IDs', () => {
      const backup1 = BackupUtil.createBackup(sampleEntry);
      const backup2 = BackupUtil.createBackup(sampleEntry);
      
      expect(backup1.id).not.toBe(backup2.id);
    });

    it('should calculate consistent checksums', () => {
      const backup1 = BackupUtil.createBackup(sampleEntry);
      const backup2 = BackupUtil.createBackup(sampleEntry);
      
      expect(backup1.checksum).toBe(backup2.checksum);
    });
  });

  describe('Backup Validation', () => {
    it('should validate correct backups', () => {
      const backup = BackupUtil.createBackup(sampleEntry);
      const isValid = BackupUtil.validateBackup(sampleEntry, backup);
      
      expect(isValid).toBe(true);
    });

    it('should detect corrupted backups', () => {
      const backup = BackupUtil.createBackup(sampleEntry);
      const corruptedEntry = {
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          id: 'corrupted-id'
        }
      };
      
      const isValid = BackupUtil.validateBackup(corruptedEntry, backup);
      
      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const backup = BackupUtil.createBackup(sampleEntry);
      const invalidData = null;
      
      const isValid = BackupUtil.validateBackup(invalidData, backup);
      
      expect(isValid).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with the singleton instance', async () => {
    const sampleEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'integration-test',
        mealPlanId: 'meal-plan-123',
        weekStartDate: '2024-01-01',
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: 'device-123',
        version: 1
      },
      shoppingList: {
        'Integration': [
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

    const result = await dataCompressionUtil.compressShoppingList(sampleEntry);
    const decompressed = await dataCompressionUtil.decompressShoppingList(result.compressed);
    
    expect(decompressed).toEqual(sampleEntry);
  });

  it('should handle large shopping lists efficiently', async () => {
    const largeEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'large-test',
        mealPlanId: 'meal-plan-123',
        weekStartDate: '2024-01-01',
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: 'device-123',
        version: 1
      },
      shoppingList: {}
    };

    // Create a large shopping list with many categories and items
    for (let categoryIndex = 0; categoryIndex < 10; categoryIndex++) {
      const categoryName = `Category ${categoryIndex}`;
      largeEntry.shoppingList[categoryName] = [];
      
      for (let itemIndex = 0; itemIndex < 50; itemIndex++) {
        largeEntry.shoppingList[categoryName].push({
          id: `item-${categoryIndex}-${itemIndex}`,
          name: `Item ${itemIndex} in ${categoryName}`,
          quantity: String(itemIndex + 1),
          unit: 'pieces',
          checked: itemIndex % 2 === 0,
          lastModified: new Date(),
          syncStatus: 'pending',
          recipeId: `recipe-${itemIndex}`,
          recipeName: `Recipe ${itemIndex}`
        });
      }
    }

    const startTime = performance.now();
    const result = await dataCompressionUtil.compressShoppingList(largeEntry);
    const compressionTime = performance.now() - startTime;

    const decompressStartTime = performance.now();
    const decompressed = await dataCompressionUtil.decompressShoppingList(result.compressed);
    const decompressionTime = performance.now() - decompressStartTime;

    expect(decompressed).toEqual(largeEntry);
    expect(result.compressionRatio).toBeGreaterThan(1); // Should achieve some compression
    expect(compressionTime).toBeLessThan(1000); // Should complete within 1 second
    expect(decompressionTime).toBeLessThan(1000); // Should complete within 1 second
    
    console.log(`Large list compression: ${compressionTime.toFixed(2)}ms, ratio: ${result.compressionRatio.toFixed(2)}`);
    console.log(`Large list decompression: ${decompressionTime.toFixed(2)}ms`);
  });
});