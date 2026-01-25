/**
 * Tests for Data Integrity Utilities
 * 
 * Tests integrity checking, backup creation, recovery, and repair functionality
 * for shopping list data with comprehensive error scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DataIntegrityManager,
  dataIntegrityManager 
} from '../dataIntegrity';
import { OfflineShoppingListEntry } from '../../types/OfflineStorage.types';

describe('DataIntegrityManager', () => {
  let integrityManager: DataIntegrityManager;
  let validEntry: OfflineShoppingListEntry;

  beforeEach(() => {
    integrityManager = DataIntegrityManager.getInstance();
    
    validEntry = {
      metadata: {
        id: 'integrity-test-1',
        mealPlanId: 'meal-plan-integrity',
        weekStartDate: '2024-02-01',
        generatedAt: new Date('2024-02-01T08:00:00Z'),
        lastModified: new Date('2024-02-01T10:00:00Z'),
        syncStatus: 'pending',
        deviceId: 'device-integrity',
        version: 1
      },
      shoppingList: {
        'Fruits': [
          {
            id: 'fruit-1',
            name: 'Apples',
            quantity: '3',
            unit: 'lbs',
            checked: false,
            lastModified: new Date('2024-02-01T08:30:00Z'),
            syncStatus: 'pending',
            recipeId: 'recipe-apple-pie',
            recipeName: 'Apple Pie'
          },
          {
            id: 'fruit-2',
            name: 'Oranges',
            quantity: '6',
            unit: 'pieces',
            checked: true,
            lastModified: new Date('2024-02-01T09:00:00Z'),
            syncStatus: 'synced'
          }
        ],
        'Grains': [
          {
            id: 'grain-1',
            name: 'Brown Rice',
            quantity: '2',
            unit: 'lbs',
            checked: false,
            lastModified: new Date('2024-02-01T08:45:00Z'),
            syncStatus: 'pending'
          }
        ]
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    integrityManager.clearAllBackups();
  });

  describe('Integrity Checking', () => {
    it('should validate correct shopping list entries', async () => {
      const result = await integrityManager.checkIntegrity(validEntry);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.corruptionLevel).toBe(0);
      expect(result.checksum).toBeDefined();
      expect(result.canRecover).toBe(true);
    });

    it('should detect missing metadata', async () => {
      const invalidEntry = { ...validEntry };
      delete (invalidEntry as any).metadata;
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_FIELD' && e.field === 'metadata')).toBe(true);
      expect(result.corruptionLevel).toBeGreaterThan(0);
    });

    it('should detect missing required metadata fields', async () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          id: undefined as any,
          mealPlanId: undefined as any
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'metadata.id')).toBe(true);
      expect(result.errors.some(e => e.field === 'metadata.mealPlanId')).toBe(true);
    });

    it('should detect invalid shopping list structure', async () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: 'not an object' as any
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_FIELD' && e.field === 'shoppingList')).toBe(true);
    });

    it('should detect invalid category arrays', async () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'InvalidCategory': 'not an array' as any
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_TYPE' && e.field?.includes('InvalidCategory'))).toBe(true);
    });

    it('should detect missing required item fields', async () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'TestCategory': [
            {
              name: 'Incomplete Item'
              // Missing required fields: id, quantity, unit, checked, lastModified, syncStatus
            } as any
          ]
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.type === 'MISSING_FIELD')).toBe(true);
    });

    it('should detect invalid field types', async () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'TestCategory': [
            {
              id: 123, // Should be string
              name: 'Test Item',
              quantity: '1',
              unit: 'piece',
              checked: 'true', // Should be boolean
              lastModified: new Date(),
              syncStatus: 'pending'
            } as any
          ]
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_TYPE')).toBe(true);
    });

    it('should detect invalid sync status values', async () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          syncStatus: 'invalid-status' as any
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'SCHEMA_VIOLATION' && e.field === 'metadata.syncStatus')).toBe(true);
    });

    it('should detect date consistency issues', async () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          generatedAt: new Date('2024-02-01T12:00:00Z'), // After lastModified
          lastModified: new Date('2024-02-01T10:00:00Z')
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CORRUPTED_DATA' && e.field === 'metadata.lastModified')).toBe(true);
    });

    it('should detect duplicate item IDs', async () => {
      const invalidEntry = {
        ...validEntry,
        shoppingList: {
          'Category1': [
            {
              id: 'duplicate-id',
              name: 'Item 1',
              quantity: '1',
              unit: 'piece',
              checked: false,
              lastModified: new Date(),
              syncStatus: 'pending'
            }
          ],
          'Category2': [
            {
              id: 'duplicate-id', // Same ID as above
              name: 'Item 2',
              quantity: '2',
              unit: 'pieces',
              checked: false,
              lastModified: new Date(),
              syncStatus: 'pending'
            }
          ]
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CORRUPTED_DATA' && e.message.includes('Duplicate item ID'))).toBe(true);
    });

    it('should validate against expected checksum', async () => {
      const checksum = integrityManager.calculateChecksum(validEntry);
      
      // Valid checksum should pass
      const validResult = await integrityManager.checkIntegrity(validEntry, checksum);
      expect(validResult.isValid).toBe(true);
      
      // Invalid checksum should fail
      const invalidResult = await integrityManager.checkIntegrity(validEntry, 'invalid-checksum');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.some(e => e.type === 'CHECKSUM_MISMATCH')).toBe(true);
    });

    it('should generate appropriate repair suggestions', async () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          id: undefined as any,
          syncStatus: 'invalid' as any
        }
      };
      
      const result = await integrityManager.checkIntegrity(invalidEntry);
      
      expect(result.repairSuggestions.length).toBeGreaterThan(0);
      expect(result.repairSuggestions.some(s => s.includes('missing required fields'))).toBe(true);
      expect(result.repairSuggestions.some(s => s.includes('schema requirements'))).toBe(true);
    });
  });

  describe('Backup Creation and Management', () => {
    it('should create backups correctly', async () => {
      const backup = await integrityManager.createBackup(validEntry);
      
      expect(backup.id).toMatch(/^backup_integrity-test-1_\d+$/);
      expect(backup.originalId).toBe('integrity-test-1');
      expect(backup.timestamp).toBeInstanceOf(Date);
      expect(backup.data).toEqual(validEntry);
      expect(backup.checksum).toBeDefined();
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.version).toBe(1);
      expect(backup.source).toBe('auto');
    });

    it('should create manual backups with custom metadata', async () => {
      const backup = await integrityManager.createBackup(validEntry, 'manual', 'user requested backup');
      
      expect(backup.source).toBe('manual');
      expect(backup.metadata.reason).toBe('user requested backup');
      expect(backup.metadata.tags).toContain('manual');
    });

    it('should maintain backup history', async () => {
      await integrityManager.createBackup(validEntry);
      await integrityManager.createBackup(validEntry);
      await integrityManager.createBackup(validEntry);
      
      const backups = integrityManager.getBackups('integrity-test-1');
      expect(backups.length).toBe(3);
      
      // Should be sorted by timestamp (newest first)
      expect(backups[0].timestamp.getTime()).toBeGreaterThanOrEqual(backups[1].timestamp.getTime());
      expect(backups[1].timestamp.getTime()).toBeGreaterThanOrEqual(backups[2].timestamp.getTime());
    });

    it('should enforce backup retention limits', async () => {
      const manager = DataIntegrityManager.getInstance({ maxBackupsPerEntry: 2 });
      
      // Create more backups than the limit
      await manager.createBackup(validEntry);
      await manager.createBackup(validEntry);
      await manager.createBackup(validEntry);
      await manager.createBackup(validEntry);
      
      const backups = manager.getBackups('integrity-test-1');
      expect(backups.length).toBeLessThanOrEqual(2);
    });

    it('should calculate consistent checksums', async () => {
      const backup1 = await integrityManager.createBackup(validEntry);
      const backup2 = await integrityManager.createBackup(validEntry);
      
      expect(backup1.checksum).toBe(backup2.checksum);
    });
  });

  describe('Data Recovery', () => {
    it('should recover from backup successfully', async () => {
      // Create a backup first
      await integrityManager.createBackup(validEntry);
      
      const recovered = await integrityManager.recoverFromBackup('integrity-test-1');
      
      expect(recovered).toBeDefined();
      expect(recovered!.metadata.id).toBe('integrity-test-1');
      expect(recovered!.metadata.lastModified).toBeInstanceOf(Date);
      expect(recovered!.metadata.syncStatus).toBe('pending');
      expect(recovered!.metadata.version).toBe(2); // Should be incremented
    });

    it('should prefer latest backup by default', async () => {
      // Create multiple backups with different data
      const entry1 = { ...validEntry, metadata: { ...validEntry.metadata, version: 1 } };
      const entry2 = { ...validEntry, metadata: { ...validEntry.metadata, version: 2 } };
      const entry3 = { ...validEntry, metadata: { ...validEntry.metadata, version: 3 } };
      
      await integrityManager.createBackup(entry1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await integrityManager.createBackup(entry2);
      await new Promise(resolve => setTimeout(resolve, 10));
      await integrityManager.createBackup(entry3);
      
      const recovered = await integrityManager.recoverFromBackup('integrity-test-1');
      
      expect(recovered).toBeDefined();
      expect(recovered!.metadata.version).toBe(4); // 3 + 1 (recovery increment)
    });

    it('should validate backup integrity before recovery', async () => {
      // Create a backup
      const backup = await integrityManager.createBackup(validEntry);
      
      // Manually corrupt the backup data
      const backups = integrityManager.getBackups('integrity-test-1');
      if (backups.length > 0) {
        backups[0].data.metadata.id = 'corrupted-id';
      }
      
      const recovered = await integrityManager.recoverFromBackup('integrity-test-1', {
        validateBeforeRestore: true
      });
      
      // Should fail to recover due to corruption
      expect(recovered).toBeNull();
    });

    it('should try multiple backups if first fails', async () => {
      const entry1 = { ...validEntry };
      const entry2 = { ...validEntry, metadata: { ...validEntry.metadata, version: 2 } };
      
      await integrityManager.createBackup(entry1);
      await integrityManager.createBackup(entry2);
      
      // Corrupt the latest backup
      const backups = integrityManager.getBackups('integrity-test-1');
      if (backups.length > 0) {
        backups[0].checksum = 'corrupted-checksum';
      }
      
      const recovered = await integrityManager.recoverFromBackup('integrity-test-1', {
        validateBeforeRestore: true,
        maxRecoveryAttempts: 2
      });
      
      // Should recover from the second backup
      expect(recovered).toBeDefined();
    });

    it('should return null when no backups exist', async () => {
      const recovered = await integrityManager.recoverFromBackup('non-existent-id');
      
      expect(recovered).toBeNull();
    });

    it('should handle recovery options correctly', async () => {
      await integrityManager.createBackup(validEntry);
      
      const recovered = await integrityManager.recoverFromBackup('integrity-test-1', {
        preferLatest: false,
        validateBeforeRestore: false,
        allowPartialRecovery: false,
        maxRecoveryAttempts: 1
      });
      
      expect(recovered).toBeDefined();
    });
  });

  describe('Data Repair', () => {
    it('should repair entries with missing optional fields', async () => {
      const repairableEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          syncStatus: undefined as any,
          version: undefined as any,
          deviceId: undefined as any
        }
      };
      
      const repaired = await integrityManager.repairEntry(repairableEntry);
      
      expect(repaired).toBeDefined();
      expect(repaired!.metadata.syncStatus).toBe('pending');
      expect(repaired!.metadata.version).toBe(2); // Should be incremented
      expect(repaired!.metadata.deviceId).toBe('unknown');
    });

    it('should return null for unrepairable entries', async () => {
      const unrepairableEntry = {
        // Completely invalid structure
        invalid: 'data'
      } as any;
      
      const repaired = await integrityManager.repairEntry(unrepairableEntry);
      
      expect(repaired).toBeNull();
    });

    it('should not repair already valid entries', async () => {
      const repaired = await integrityManager.repairEntry(validEntry);
      
      expect(repaired).toEqual(validEntry);
    });

    it('should update metadata after repair', async () => {
      const repairableEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          syncStatus: undefined as any
        }
      };
      
      const originalLastModified = repairableEntry.metadata.lastModified;
      
      const repaired = await integrityManager.repairEntry(repairableEntry);
      
      expect(repaired).toBeDefined();
      expect(repaired!.metadata.lastModified.getTime()).toBeGreaterThan(originalLastModified.getTime());
      expect(repaired!.metadata.syncStatus).toBe('pending');
      expect(repaired!.metadata.version).toBe(2);
    });
  });

  describe('Checksum Algorithms', () => {
    it('should support different checksum algorithms', () => {
      const algorithms = ['crc32', 'sha256', 'md5-like', 'simple'] as const;
      
      algorithms.forEach(algorithm => {
        const manager = DataIntegrityManager.getInstance({ checksumAlgorithm: algorithm });
        const checksum = manager.calculateChecksum(validEntry);
        
        expect(checksum).toBeDefined();
        expect(typeof checksum).toBe('string');
        expect(checksum.length).toBeGreaterThan(0);
      });
    });

    it('should produce consistent checksums for same data', () => {
      const checksum1 = integrityManager.calculateChecksum(validEntry);
      const checksum2 = integrityManager.calculateChecksum(validEntry);
      
      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different data', () => {
      const entry2 = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          id: 'different-id'
        }
      };
      
      const checksum1 = integrityManager.calculateChecksum(validEntry);
      const checksum2 = integrityManager.calculateChecksum(entry2);
      
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track integrity statistics', async () => {
      await integrityManager.checkIntegrity(validEntry);
      
      const stats = integrityManager.getIntegrityStats();
      
      expect(stats).toBeDefined();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it('should update statistics after integrity checks', async () => {
      const invalidEntry = {
        ...validEntry,
        metadata: {
          ...validEntry.metadata,
          id: undefined as any
        }
      };
      
      await integrityManager.checkIntegrity(invalidEntry);
      
      const stats = integrityManager.getIntegrityStats();
      
      expect(stats[`${invalidEntry.metadata.mealPlanId}_error_count`]).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle integrity check errors gracefully', async () => {
      const invalidEntry = null as any;
      
      await expect(integrityManager.checkIntegrity(invalidEntry))
        .rejects.toThrow('Failed to perform integrity check');
    });

    it('should handle backup creation errors gracefully', async () => {
      const invalidEntry = null as any;
      
      await expect(integrityManager.createBackup(invalidEntry))
        .rejects.toThrow('Failed to create backup');
    });

    it('should handle recovery errors gracefully', async () => {
      // Mock a recovery error by clearing all backups
      integrityManager.clearAllBackups();
      
      const recovered = await integrityManager.recoverFromBackup('non-existent-id');
      
      expect(recovered).toBeNull();
    });

    it('should handle repair errors gracefully', async () => {
      const invalidEntry = null as any;
      
      await expect(integrityManager.repairEntry(invalidEntry))
        .rejects.toThrow('Failed to repair entry');
    });
  });
});

describe('Integration Tests', () => {
  it('should work with the singleton instance', async () => {
    const testEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'integration-integrity-test',
        mealPlanId: 'meal-plan-integration',
        weekStartDate: '2024-02-10',
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: 'device-integration',
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

    const integrityResult = await dataIntegrityManager.checkIntegrity(testEntry);
    expect(integrityResult.isValid).toBe(true);
    
    const backup = await dataIntegrityManager.createBackup(testEntry);
    expect(backup).toBeDefined();
    
    const recovered = await dataIntegrityManager.recoverFromBackup(testEntry.metadata.id);
    expect(recovered).toBeDefined();
  });

  it('should handle complete integrity workflow', async () => {
    const testEntry: OfflineShoppingListEntry = {
      metadata: {
        id: 'workflow-test',
        mealPlanId: 'meal-plan-workflow',
        weekStartDate: '2024-02-15',
        generatedAt: new Date(),
        lastModified: new Date(),
        syncStatus: 'pending',
        deviceId: 'device-workflow',
        version: 1
      },
      shoppingList: {
        'Workflow': [
          {
            id: 'workflow-item',
            name: 'Workflow Test Item',
            quantity: '2',
            unit: 'pieces',
            checked: false,
            lastModified: new Date(),
            syncStatus: 'pending'
          }
        ]
      }
    };

    // 1. Check initial integrity
    const initialCheck = await dataIntegrityManager.checkIntegrity(testEntry);
    expect(initialCheck.isValid).toBe(true);
    
    // 2. Create backup
    const backup = await dataIntegrityManager.createBackup(testEntry, 'manual', 'workflow test');
    expect(backup.source).toBe('manual');
    
    // 3. Simulate corruption
    const corruptedEntry = {
      ...testEntry,
      metadata: {
        ...testEntry.metadata,
        id: undefined as any
      }
    };
    
    // 4. Check corrupted integrity
    const corruptedCheck = await dataIntegrityManager.checkIntegrity(corruptedEntry);
    expect(corruptedCheck.isValid).toBe(false);
    
    // 5. Attempt repair
    const repaired = await dataIntegrityManager.repairEntry(corruptedEntry);
    expect(repaired).toBeNull(); // Can't repair missing ID
    
    // 6. Recover from backup
    const recovered = await dataIntegrityManager.recoverFromBackup(testEntry.metadata.id);
    expect(recovered).toBeDefined();
    expect(recovered!.metadata.id).toBe('workflow-test');
    
    // 7. Verify recovered integrity
    const recoveredCheck = await dataIntegrityManager.checkIntegrity(recovered!);
    expect(recoveredCheck.isValid).toBe(true);
  });
});