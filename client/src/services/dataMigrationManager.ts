/**
 * Data Migration Manager for PWA Offline Shopping Lists
 * Handles schema migrations, data transformations, and version management
 */

import { dataValidationSystem, CURRENT_SCHEMA_VERSION } from './dataValidationSystem';
import { dataIntegrityManager } from '../utils/dataIntegrity';
import { offlineStorageManager } from './offlineStorageManager';
import { OfflineShoppingListEntry } from '../types/OfflineStorage.types';

// Migration step definition
export interface MigrationStep {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (data: any) => Promise<any>;
  rollback?: (data: any) => Promise<any>;
  validate?: (data: any) => Promise<boolean>;
}

// Migration result
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  migratedCount: number;
  failedCount: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

// Migration status
export interface MigrationStatus {
  inProgress: boolean;
  currentStep: string;
  progress: number; // 0-100
  estimatedTimeRemaining: number; // milliseconds
}

/**
 * Data Migration Manager
 */
class DataMigrationManager {
  private static instance: DataMigrationManager;
  private migrationSteps: Map<string, MigrationStep> = new Map();
  private migrationStatus: MigrationStatus = {
    inProgress: false,
    currentStep: '',
    progress: 0,
    estimatedTimeRemaining: 0
  };

  private constructor() {
    this.initializeMigrationSteps();
  }

  static getInstance(): DataMigrationManager {
    if (!DataMigrationManager.instance) {
      DataMigrationManager.instance = new DataMigrationManager();
    }
    return DataMigrationManager.instance;
  }

  /**
   * Check if migration is needed for the entire database
   */
  async checkMigrationNeeded(): Promise<{
    needed: boolean;
    currentVersion: number;
    targetVersion: number;
    entriesNeedingMigration: number;
  }> {
    try {
      const allEntries = await offlineStorageManager.getAllShoppingLists();
      let entriesNeedingMigration = 0;
      let oldestVersion = CURRENT_SCHEMA_VERSION;

      allEntries.forEach(entry => {
        const entryVersion = entry.metadata.schemaVersion || 1;
        if (entryVersion < CURRENT_SCHEMA_VERSION) {
          entriesNeedingMigration++;
          oldestVersion = Math.min(oldestVersion, entryVersion);
        }
      });

      return {
        needed: entriesNeedingMigration > 0,
        currentVersion: oldestVersion,
        targetVersion: CURRENT_SCHEMA_VERSION,
        entriesNeedingMigration
      };
    } catch (error) {
      console.error('[Migration Manager] Failed to check migration status:', error);
      return {
        needed: false,
        currentVersion: CURRENT_SCHEMA_VERSION,
        targetVersion: CURRENT_SCHEMA_VERSION,
        entriesNeedingMigration: 0
      };
    }
  }

  /**
   * Migrate all shopping list entries to current schema version
   */
  async migrateAllEntries(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      fromVersion: 1,
      toVersion: CURRENT_SCHEMA_VERSION,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      this.migrationStatus.inProgress = true;
      this.migrationStatus.currentStep = 'Initializing migration';
      this.migrationStatus.progress = 0;

      // Get all entries that need migration
      const allEntries = await offlineStorageManager.getAllShoppingLists();
      const entriesToMigrate = allEntries.filter(entry => 
        (entry.metadata.schemaVersion || 1) < CURRENT_SCHEMA_VERSION
      );

      if (entriesToMigrate.length === 0) {
        result.success = true;
        result.warnings.push('No entries require migration');
        return result;
      }

      console.log(`[Migration Manager] Starting migration of ${entriesToMigrate.length} entries`);

      // Create backup before migration
      this.migrationStatus.currentStep = 'Creating backup';
      await this.createMigrationBackup(entriesToMigrate);

      // Migrate each entry
      for (let i = 0; i < entriesToMigrate.length; i++) {
        const entry = entriesToMigrate[i];
        const entryVersion = entry.metadata.schemaVersion || 1;
        
        this.migrationStatus.currentStep = `Migrating entry ${i + 1}/${entriesToMigrate.length}`;
        this.migrationStatus.progress = (i / entriesToMigrate.length) * 100;
        
        try {
          const migrationResult = await this.migrateEntry(entry, CURRENT_SCHEMA_VERSION);
          
          if (migrationResult.success && migrationResult.migratedData) {
            // Update the entry in storage
            await offlineStorageManager.updateShoppingList(
              entry.metadata.id,
              migrationResult.migratedData
            );
            
            result.migratedCount++;
            console.log(`[Migration Manager] Successfully migrated entry ${entry.metadata.id} from v${entryVersion} to v${CURRENT_SCHEMA_VERSION}`);
          } else {
            result.failedCount++;
            result.errors.push(`Failed to migrate entry ${entry.metadata.id}: ${migrationResult.errors.join(', ')}`);
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push(`Error migrating entry ${entry.metadata.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update migration metadata
      await this.updateMigrationMetadata(CURRENT_SCHEMA_VERSION);

      result.success = result.failedCount === 0;
      result.duration = Date.now() - startTime;

      console.log(`[Migration Manager] Migration completed: ${result.migratedCount} successful, ${result.failedCount} failed`);

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[Migration Manager] Migration failed:', error);
    } finally {
      this.migrationStatus.inProgress = false;
      this.migrationStatus.currentStep = '';
      this.migrationStatus.progress = 100;
    }

    return result;
  }

  /**
   * Migrate a single entry
   */
  async migrateEntry(entry: OfflineShoppingListEntry, targetVersion: number = CURRENT_SCHEMA_VERSION): Promise<{
    success: boolean;
    migratedData?: OfflineShoppingListEntry;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      success: false,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      const currentVersion = entry.metadata.schemaVersion || 1;
      
      if (currentVersion >= targetVersion) {
        result.success = true;
        result.migratedData = entry;
        result.warnings.push('Entry already at target version or newer');
        return result;
      }

      // Create backup before migration
      await dataIntegrityManager.createBackup(entry, 'manual', 'pre-migration backup');

      let migratedData = JSON.parse(JSON.stringify(entry)); // Deep clone

      // Apply migration steps sequentially
      for (let version = currentVersion; version < targetVersion; version++) {
        const stepKey = `${version}-${version + 1}`;
        const migrationStep = this.migrationSteps.get(stepKey);

        if (!migrationStep) {
          result.errors.push(`No migration step found from v${version} to v${version + 1}`);
          return result;
        }

        console.log(`[Migration Manager] Applying migration step: ${migrationStep.description}`);

        try {
          migratedData = await migrationStep.migrate(migratedData);

          // Validate migrated data if validator is provided
          if (migrationStep.validate) {
            const isValid = await migrationStep.validate(migratedData);
            if (!isValid) {
              result.errors.push(`Migration step validation failed: ${migrationStep.description}`);
              return result;
            }
          }
        } catch (error) {
          result.errors.push(`Migration step failed: ${migrationStep.description} - ${error instanceof Error ? error.message : 'Unknown error'}`);
          return result;
        }
      }

      // Final validation using the validation system
      const validationResult = await dataValidationSystem.validateShoppingListEntry(migratedData);
      if (!validationResult.isValid) {
        result.errors.push('Migrated data failed final validation');
        validationResult.errors.forEach(error => {
          result.errors.push(`Validation error: ${error.message}`);
        });
        return result;
      }

      result.success = true;
      result.migratedData = migratedData;
      result.warnings.push(...validationResult.warnings.map(w => w.message));

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Rollback migration for a single entry
   */
  async rollbackEntry(entryId: string, targetVersion: number): Promise<{
    success: boolean;
    rolledBackData?: OfflineShoppingListEntry;
    errors: string[];
  }> {
    const result = {
      success: false,
      errors: [] as string[]
    };

    try {
      // Get current entry
      const currentEntry = await offlineStorageManager.getShoppingList(entryId);
      if (!currentEntry) {
        result.errors.push('Entry not found');
        return result;
      }

      const currentVersion = currentEntry.metadata.schemaVersion || 1;
      
      if (currentVersion <= targetVersion) {
        result.success = true;
        result.rolledBackData = currentEntry;
        return result;
      }

      // Try to restore from backup first
      const backupEntry = await dataIntegrityManager.recoverFromBackup(entryId, {
        preferLatest: false, // Prefer older backup for rollback
        validateBeforeRestore: true
      });

      if (backupEntry && (backupEntry.metadata.schemaVersion || 1) === targetVersion) {
        result.success = true;
        result.rolledBackData = backupEntry;
        return result;
      }

      // If no suitable backup, try to apply rollback steps
      let rolledBackData = JSON.parse(JSON.stringify(currentEntry));

      for (let version = currentVersion; version > targetVersion; version--) {
        const stepKey = `${version - 1}-${version}`;
        const migrationStep = this.migrationSteps.get(stepKey);

        if (migrationStep && migrationStep.rollback) {
          try {
            rolledBackData = await migrationStep.rollback(rolledBackData);
          } catch (error) {
            result.errors.push(`Rollback step failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
          }
        } else {
          result.errors.push(`No rollback available from v${version} to v${version - 1}`);
          return result;
        }
      }

      result.success = true;
      result.rolledBackData = rolledBackData;

    } catch (error) {
      result.errors.push(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus };
  }

  /**
   * Get available migration steps
   */
  getAvailableMigrationSteps(): Array<{
    fromVersion: number;
    toVersion: number;
    description: string;
    hasRollback: boolean;
  }> {
    return Array.from(this.migrationSteps.values()).map(step => ({
      fromVersion: step.fromVersion,
      toVersion: step.toVersion,
      description: step.description,
      hasRollback: !!step.rollback
    }));
  }

  /**
   * Initialize migration steps
   */
  private initializeMigrationSteps(): void {
    // Migration from v1 to v2
    this.migrationSteps.set('1-2', {
      fromVersion: 1,
      toVersion: 2,
      description: 'Add schema version and enhance metadata structure',
      migrate: async (data: any) => {
        // Add schema version
        if (!data.metadata) {
          data.metadata = {};
        }
        data.metadata.schemaVersion = 2;

        // Add version field if missing
        if (!data.metadata.version) {
          data.metadata.version = 1;
        }

        // Ensure all items have syncStatus
        if (data.shoppingList) {
          Object.keys(data.shoppingList).forEach(category => {
            if (Array.isArray(data.shoppingList[category])) {
              data.shoppingList[category].forEach((item: any) => {
                if (!item.syncStatus) {
                  item.syncStatus = 'pending';
                }
                if (!item.lastModified) {
                  item.lastModified = new Date();
                }
              });
            }
          });
        }

        // Update lastModified to reflect migration
        data.metadata.lastModified = new Date();

        return data;
      },
      rollback: async (data: any) => {
        // Remove v2 specific fields
        if (data.metadata) {
          delete data.metadata.schemaVersion;
          if (data.metadata.version === 1) {
            delete data.metadata.version;
          }
        }

        // Remove syncStatus from items (v1 didn't have this)
        if (data.shoppingList) {
          Object.keys(data.shoppingList).forEach(category => {
            if (Array.isArray(data.shoppingList[category])) {
              data.shoppingList[category].forEach((item: any) => {
                delete item.syncStatus;
              });
            }
          });
        }

        return data;
      },
      validate: async (data: any) => {
        return data.metadata && 
               data.metadata.schemaVersion === 2 && 
               data.metadata.version !== undefined;
      }
    });

    // Add more migration steps as schema evolves
    // Example for future v2 to v3 migration:
    /*
    this.migrationSteps.set('2-3', {
      fromVersion: 2,
      toVersion: 3,
      description: 'Add new features for v3',
      migrate: async (data: any) => {
        // Migration logic for v2 to v3
        data.metadata.schemaVersion = 3;
        // Add new fields, transform data, etc.
        return data;
      },
      rollback: async (data: any) => {
        // Rollback logic from v3 to v2
        data.metadata.schemaVersion = 2;
        // Remove v3 specific fields
        return data;
      }
    });
    */
  }

  /**
   * Create backup before migration
   */
  private async createMigrationBackup(entries: OfflineShoppingListEntry[]): Promise<void> {
    try {
      const backupPromises = entries.map(entry => 
        dataIntegrityManager.createBackup(entry, 'manual', 'pre-migration backup')
      );
      
      await Promise.all(backupPromises);
      console.log(`[Migration Manager] Created backups for ${entries.length} entries`);
    } catch (error) {
      console.error('[Migration Manager] Failed to create migration backup:', error);
      throw error;
    }
  }

  /**
   * Update migration metadata
   */
  private async updateMigrationMetadata(version: number): Promise<void> {
    try {
      const metadata = {
        lastMigrationVersion: version,
        lastMigrationDate: new Date().toISOString(),
        migrationHistory: await this.getMigrationHistory()
      };

      // Store migration metadata (implementation depends on storage system)
      localStorage.setItem('pwa-migration-metadata', JSON.stringify(metadata));
      
    } catch (error) {
      console.error('[Migration Manager] Failed to update migration metadata:', error);
    }
  }

  /**
   * Get migration history
   */
  private async getMigrationHistory(): Promise<Array<{
    version: number;
    date: string;
    entriesCount: number;
  }>> {
    try {
      const stored = localStorage.getItem('pwa-migration-metadata');
      if (stored) {
        const metadata = JSON.parse(stored);
        return metadata.migrationHistory || [];
      }
    } catch (error) {
      console.error('[Migration Manager] Failed to get migration history:', error);
    }
    return [];
  }

  /**
   * Clean up old migration backups
   */
  async cleanupMigrationBackups(olderThanDays: number = 30): Promise<{
    success: boolean;
    cleanedCount: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      cleanedCount: 0,
      errors: [] as string[]
    };

    try {
      const cleanupResult = await dataIntegrityManager.cleanupOldBackups(olderThanDays);
      
      result.success = cleanupResult.success;
      result.cleanedCount = cleanupResult.itemsRemoved;
      result.errors = cleanupResult.errors;

      console.log(`[Migration Manager] Cleaned up ${result.cleanedCount} old migration backups`);
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate all entries after migration
   */
  async validateAllEntries(): Promise<{
    validCount: number;
    invalidCount: number;
    errors: Array<{ entryId: string; errors: string[] }>;
  }> {
    const result = {
      validCount: 0,
      invalidCount: 0,
      errors: [] as Array<{ entryId: string; errors: string[] }>
    };

    try {
      const allEntries = await offlineStorageManager.getAllShoppingLists();
      
      for (const entry of allEntries) {
        const validationResult = await dataValidationSystem.validateShoppingListEntry(entry);
        
        if (validationResult.isValid) {
          result.validCount++;
        } else {
          result.invalidCount++;
          result.errors.push({
            entryId: entry.metadata.id,
            errors: validationResult.errors.map(e => e.message)
          });
        }
      }

      console.log(`[Migration Manager] Validation complete: ${result.validCount} valid, ${result.invalidCount} invalid`);
    } catch (error) {
      console.error('[Migration Manager] Validation failed:', error);
    }

    return result;
  }
}

// Export singleton instance
export const dataMigrationManager = DataMigrationManager.getInstance();
export { DataMigrationManager };