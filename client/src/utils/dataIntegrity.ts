/**
 * Data Integrity Utilities for PWA Offline Storage
 * 
 * Provides comprehensive data integrity validation, checksums, backup creation,
 * and recovery mechanisms for shopping list data.
 * 
 * Features:
 * - Multiple checksum algorithms (CRC32, SHA-256, MD5-like)
 * - Data corruption detection and repair
 * - Automatic backup creation and rotation
 * - Data recovery from multiple backup sources
 * - Integrity monitoring and reporting
 */

import { 
  OfflineShoppingListEntry, 
  OfflineShoppingListItem,
  ShoppingListMetadata,
  SyncOperation,
  OfflineStorageError 
} from '../types/OfflineStorage.types';

// Integrity check configuration
export interface IntegrityConfig {
  checksumAlgorithm: 'crc32' | 'sha256' | 'md5-like' | 'simple';
  enableAutoBackup: boolean;
  backupRetentionDays: number;
  maxBackupsPerEntry: number;
  corruptionThreshold: number; // Percentage of corrupted data to trigger recovery
  enableRealTimeValidation: boolean;
}

// Integrity check result
export interface IntegrityCheckResult {
  isValid: boolean;
  checksum: string;
  expectedChecksum?: string;
  corruptionLevel: number; // 0-100 percentage
  errors: IntegrityError[];
  warnings: string[];
  repairSuggestions: string[];
  canRecover: boolean;
}

// Integrity error details
export interface IntegrityError {
  type: 'CHECKSUM_MISMATCH' | 'MISSING_FIELD' | 'INVALID_TYPE' | 'CORRUPTED_DATA' | 'SCHEMA_VIOLATION';
  field?: string;
  expected?: any;
  actual?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// Backup entry with metadata
export interface BackupEntry {
  id: string;
  originalId: string;
  timestamp: Date;
  data: OfflineShoppingListEntry;
  checksum: string;
  size: number;
  version: number;
  source: 'auto' | 'manual' | 'recovery';
  metadata: {
    createdBy: string;
    reason: string;
    tags: string[];
  };
}

// Recovery options
export interface RecoveryOptions {
  preferLatest: boolean;
  validateBeforeRestore: boolean;
  createBackupBeforeRestore: boolean;
  allowPartialRecovery: boolean;
  maxRecoveryAttempts: number;
}

/**
 * Advanced Data Integrity Manager
 */
class DataIntegrityManager {
  private static instance: DataIntegrityManager;
  private config: IntegrityConfig;
  private backupStorage: Map<string, BackupEntry[]> = new Map();
  private integrityStats: Map<string, number> = new Map();

  private constructor(config?: Partial<IntegrityConfig>) {
    this.config = {
      checksumAlgorithm: 'crc32',
      enableAutoBackup: true,
      backupRetentionDays: 30,
      maxBackupsPerEntry: 5,
      corruptionThreshold: 10,
      enableRealTimeValidation: true,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<IntegrityConfig>): DataIntegrityManager {
    if (!DataIntegrityManager.instance) {
      DataIntegrityManager.instance = new DataIntegrityManager(config);
    }
    return DataIntegrityManager.instance;
  }

  /**
   * Perform comprehensive integrity check on shopping list entry
   */
  async checkIntegrity(entry: OfflineShoppingListEntry, expectedChecksum?: string): Promise<IntegrityCheckResult> {
    const errors: IntegrityError[] = [];
    const warnings: string[] = [];
    const repairSuggestions: string[] = [];

    try {
      // Calculate current checksum
      const currentChecksum = this.calculateChecksum(entry);

      // Check against expected checksum if provided
      let checksumValid = true;
      if (expectedChecksum && currentChecksum !== expectedChecksum) {
        checksumValid = false;
        errors.push({
          type: 'CHECKSUM_MISMATCH',
          expected: expectedChecksum,
          actual: currentChecksum,
          severity: 'high',
          message: 'Data checksum does not match expected value'
        });
      }

      // Validate data structure
      this.validateDataStructure(entry, errors, warnings);

      // Validate data consistency
      this.validateDataConsistency(entry, errors, warnings);

      // Validate business rules
      this.validateBusinessRules(entry, errors, warnings);

      // Calculate corruption level
      const corruptionLevel = this.calculateCorruptionLevel(errors);

      // Generate repair suggestions
      this.generateRepairSuggestions(errors, repairSuggestions);

      // Determine if recovery is possible
      const canRecover = corruptionLevel < this.config.corruptionThreshold || 
                        this.hasRecoverableBackups(entry.metadata.id);

      const result: IntegrityCheckResult = {
        isValid: errors.length === 0 && checksumValid,
        checksum: currentChecksum,
        expectedChecksum,
        corruptionLevel,
        errors,
        warnings,
        repairSuggestions,
        canRecover
      };

      // Update integrity statistics
      this.updateIntegrityStats(entry.metadata.id, result);

      return result;
    } catch (error) {
      throw this.createIntegrityError('INTEGRITY_CHECK_FAILED', 'Failed to perform integrity check', error);
    }
  }

  /**
   * Create backup of shopping list entry
   */
  async createBackup(entry: OfflineShoppingListEntry, source: 'auto' | 'manual' | 'recovery' = 'auto', reason: string = 'routine backup'): Promise<BackupEntry> {
    try {
      const backupId = `backup_${entry.metadata.id}_${Date.now()}`;
      const checksum = this.calculateChecksum(entry);
      const size = JSON.stringify(entry).length;

      const backup: BackupEntry = {
        id: backupId,
        originalId: entry.metadata.id,
        timestamp: new Date(),
        data: JSON.parse(JSON.stringify(entry)), // Deep clone
        checksum,
        size,
        version: entry.metadata.version || 1,
        source,
        metadata: {
          createdBy: entry.metadata.deviceId,
          reason,
          tags: ['shopping-list', source]
        }
      };

      // Store backup
      const existingBackups = this.backupStorage.get(entry.metadata.id) || [];
      existingBackups.push(backup);

      // Maintain backup retention policy
      this.enforceBackupRetention(existingBackups);

      this.backupStorage.set(entry.metadata.id, existingBackups);

      console.log(`Created backup ${backupId} for shopping list ${entry.metadata.id}`);
      return backup;
    } catch (error) {
      throw this.createIntegrityError('BACKUP_CREATION_FAILED', 'Failed to create backup', error);
    }
  }

  /**
   * Recover shopping list entry from backup
   */
  async recoverFromBackup(originalId: string, options?: Partial<RecoveryOptions>): Promise<OfflineShoppingListEntry | null> {
    const recoveryOptions: RecoveryOptions = {
      preferLatest: true,
      validateBeforeRestore: true,
      createBackupBeforeRestore: false,
      allowPartialRecovery: true,
      maxRecoveryAttempts: 3,
      ...options
    };

    try {
      const backups = this.backupStorage.get(originalId) || [];
      
      if (backups.length === 0) {
        console.warn(`No backups found for shopping list ${originalId}`);
        return null;
      }

      // Sort backups by preference
      const sortedBackups = recoveryOptions.preferLatest 
        ? backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        : backups.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let attempts = 0;
      for (const backup of sortedBackups) {
        if (attempts >= recoveryOptions.maxRecoveryAttempts) {
          break;
        }

        attempts++;
        console.log(`Recovery attempt ${attempts}: trying backup ${backup.id}`);

        try {
          // Validate backup integrity
          if (recoveryOptions.validateBeforeRestore) {
            const backupChecksum = this.calculateChecksum(backup.data);
            if (backupChecksum !== backup.checksum) {
              console.warn(`Backup ${backup.id} failed checksum validation, trying next backup`);
              continue;
            }
          }

          // Validate recovered data structure
          const integrityCheck = await this.checkIntegrity(backup.data);
          
          if (integrityCheck.isValid || (recoveryOptions.allowPartialRecovery && integrityCheck.canRecover)) {
            console.log(`Successfully recovered shopping list ${originalId} from backup ${backup.id}`);
            
            // Update metadata to reflect recovery
            const recovered = {
              ...backup.data,
              metadata: {
                ...backup.data.metadata,
                lastModified: new Date(),
                syncStatus: 'pending' as const,
                version: (backup.data.metadata.version || 0) + 1
              }
            };

            return recovered;
          } else {
            console.warn(`Backup ${backup.id} failed integrity check, trying next backup`);
          }
        } catch (error) {
          console.error(`Error during recovery attempt ${attempts}:`, error);
        }
      }

      console.error(`Failed to recover shopping list ${originalId} after ${attempts} attempts`);
      return null;
    } catch (error) {
      throw this.createIntegrityError('RECOVERY_FAILED', 'Failed to recover from backup', error);
    }
  }

  /**
   * Repair corrupted shopping list entry
   */
  async repairEntry(entry: OfflineShoppingListEntry, integrityResult?: IntegrityCheckResult): Promise<OfflineShoppingListEntry | null> {
    try {
      const checkResult = integrityResult || await this.checkIntegrity(entry);
      
      if (checkResult.isValid) {
        return entry; // No repair needed
      }

      if (!checkResult.canRecover) {
        console.error('Entry cannot be repaired, corruption level too high');
        return null;
      }

      let repairedEntry = JSON.parse(JSON.stringify(entry)); // Deep clone

      // Apply repairs based on error types
      for (const error of checkResult.errors) {
        switch (error.type) {
          case 'MISSING_FIELD':
            repairedEntry = this.repairMissingField(repairedEntry, error);
            break;
          case 'INVALID_TYPE':
            repairedEntry = this.repairInvalidType(repairedEntry, error);
            break;
          case 'CORRUPTED_DATA':
            repairedEntry = this.repairCorruptedData(repairedEntry, error);
            break;
          case 'SCHEMA_VIOLATION':
            repairedEntry = this.repairSchemaViolation(repairedEntry, error);
            break;
        }
      }

      // Validate repaired entry
      const repairedCheck = await this.checkIntegrity(repairedEntry);
      
      if (repairedCheck.isValid || repairedCheck.corruptionLevel < checkResult.corruptionLevel) {
        console.log(`Successfully repaired shopping list ${entry.metadata.id}`);
        
        // Update metadata to reflect repair
        repairedEntry.metadata.lastModified = new Date();
        repairedEntry.metadata.syncStatus = 'pending';
        repairedEntry.metadata.version = (repairedEntry.metadata.version || 0) + 1;
        
        return repairedEntry;
      } else {
        console.error('Repair attempt did not improve data integrity');
        return null;
      }
    } catch (error) {
      throw this.createIntegrityError('REPAIR_FAILED', 'Failed to repair entry', error);
    }
  }

  /**
   * Calculate checksum using configured algorithm
   */
  calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort()); // Deterministic serialization

    switch (this.config.checksumAlgorithm) {
      case 'crc32':
        return this.calculateCRC32(jsonString);
      case 'sha256':
        return this.calculateSHA256Like(jsonString);
      case 'md5-like':
        return this.calculateMD5Like(jsonString);
      case 'simple':
      default:
        return this.calculateSimpleChecksum(jsonString);
    }
  }

  /**
   * Validate data structure
   */
  private validateDataStructure(entry: OfflineShoppingListEntry, errors: IntegrityError[], warnings: string[]): void {
    // Check metadata structure
    if (!entry.metadata) {
      errors.push({
        type: 'MISSING_FIELD',
        field: 'metadata',
        severity: 'critical',
        message: 'Missing metadata object'
      });
      return;
    }

    // Check required metadata fields
    const requiredMetadataFields = ['id', 'mealPlanId', 'weekStartDate', 'generatedAt', 'lastModified', 'syncStatus', 'deviceId'];
    requiredMetadataFields.forEach(field => {
      if (!entry.metadata[field as keyof ShoppingListMetadata]) {
        errors.push({
          type: 'MISSING_FIELD',
          field: `metadata.${field}`,
          severity: 'high',
          message: `Missing required metadata field: ${field}`
        });
      }
    });

    // Check shopping list structure
    if (!entry.shoppingList || typeof entry.shoppingList !== 'object') {
      errors.push({
        type: 'MISSING_FIELD',
        field: 'shoppingList',
        severity: 'critical',
        message: 'Missing or invalid shopping list object'
      });
      return;
    }

    // Validate shopping list categories and items
    Object.keys(entry.shoppingList).forEach(category => {
      if (!Array.isArray(entry.shoppingList[category])) {
        errors.push({
          type: 'INVALID_TYPE',
          field: `shoppingList.${category}`,
          expected: 'array',
          actual: typeof entry.shoppingList[category],
          severity: 'high',
          message: `Category ${category} must be an array`
        });
        return;
      }

      entry.shoppingList[category].forEach((item, index) => {
        this.validateShoppingListItem(item, `shoppingList.${category}[${index}]`, errors, warnings);
      });
    });
  }

  /**
   * Validate individual shopping list item
   */
  private validateShoppingListItem(item: any, path: string, errors: IntegrityError[], warnings: string[]): void {
    const requiredFields = ['id', 'name', 'quantity', 'unit', 'checked', 'lastModified', 'syncStatus'];
    
    requiredFields.forEach(field => {
      if (!(field in item)) {
        errors.push({
          type: 'MISSING_FIELD',
          field: `${path}.${field}`,
          severity: 'medium',
          message: `Missing required item field: ${field}`
        });
      }
    });

    // Type validation
    if (item.id && typeof item.id !== 'string') {
      errors.push({
        type: 'INVALID_TYPE',
        field: `${path}.id`,
        expected: 'string',
        actual: typeof item.id,
        severity: 'medium',
        message: 'Item id must be a string'
      });
    }

    if (item.checked && typeof item.checked !== 'boolean') {
      errors.push({
        type: 'INVALID_TYPE',
        field: `${path}.checked`,
        expected: 'boolean',
        actual: typeof item.checked,
        severity: 'low',
        message: 'Item checked must be a boolean'
      });
    }

    if (item.lastModified && !(item.lastModified instanceof Date) && typeof item.lastModified !== 'string') {
      warnings.push(`Item lastModified should be a Date or ISO string in ${path}`);
    }
  }

  /**
   * Validate data consistency
   */
  private validateDataConsistency(entry: OfflineShoppingListEntry, errors: IntegrityError[], warnings: string[]): void {
    // Check date consistency
    if (entry.metadata.generatedAt && entry.metadata.lastModified) {
      const generated = entry.metadata.generatedAt instanceof Date 
        ? entry.metadata.generatedAt 
        : new Date(entry.metadata.generatedAt);
      const modified = entry.metadata.lastModified instanceof Date 
        ? entry.metadata.lastModified 
        : new Date(entry.metadata.lastModified);

      if (modified < generated) {
        errors.push({
          type: 'CORRUPTED_DATA',
          field: 'metadata.lastModified',
          severity: 'medium',
          message: 'Last modified date cannot be before generated date'
        });
      }
    }

    // Check for duplicate item IDs within the same shopping list
    const itemIds = new Set<string>();
    Object.keys(entry.shoppingList).forEach(category => {
      entry.shoppingList[category].forEach((item, index) => {
        if (item.id) {
          if (itemIds.has(item.id)) {
            errors.push({
              type: 'CORRUPTED_DATA',
              field: `shoppingList.${category}[${index}].id`,
              severity: 'medium',
              message: `Duplicate item ID: ${item.id}`
            });
          } else {
            itemIds.add(item.id);
          }
        }
      });
    });
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(entry: OfflineShoppingListEntry, errors: IntegrityError[], warnings: string[]): void {
    // Check sync status validity
    const validSyncStatuses = ['synced', 'pending', 'conflict'];
    if (entry.metadata.syncStatus && !validSyncStatuses.includes(entry.metadata.syncStatus)) {
      errors.push({
        type: 'SCHEMA_VIOLATION',
        field: 'metadata.syncStatus',
        expected: validSyncStatuses,
        actual: entry.metadata.syncStatus,
        severity: 'medium',
        message: 'Invalid sync status value'
      });
    }

    // Check for empty shopping list
    const totalItems = Object.values(entry.shoppingList).reduce((sum, items) => sum + items.length, 0);
    if (totalItems === 0) {
      warnings.push('Shopping list is empty');
    }

    // Check for very old entries
    const weekOld = new Date();
    weekOld.setDate(weekOld.getDate() - 7);
    const lastModified = entry.metadata.lastModified instanceof Date 
      ? entry.metadata.lastModified 
      : new Date(entry.metadata.lastModified);

    if (lastModified < weekOld) {
      warnings.push('Shopping list is more than a week old');
    }
  }

  /**
   * Calculate corruption level based on errors
   */
  private calculateCorruptionLevel(errors: IntegrityError[]): number {
    if (errors.length === 0) return 0;

    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15
    };

    const totalWeight = errors.reduce((sum, error) => sum + severityWeights[error.severity], 0);
    const maxPossibleWeight = errors.length * severityWeights.critical;

    return Math.min(100, (totalWeight / maxPossibleWeight) * 100);
  }

  /**
   * Generate repair suggestions based on errors
   */
  private generateRepairSuggestions(errors: IntegrityError[], suggestions: string[]): void {
    const errorTypes = new Set(errors.map(e => e.type));

    if (errorTypes.has('MISSING_FIELD')) {
      suggestions.push('Add missing required fields with default values');
    }

    if (errorTypes.has('INVALID_TYPE')) {
      suggestions.push('Convert fields to correct data types');
    }

    if (errorTypes.has('CORRUPTED_DATA')) {
      suggestions.push('Restore from backup or reset corrupted values');
    }

    if (errorTypes.has('CHECKSUM_MISMATCH')) {
      suggestions.push('Recalculate checksum or restore from backup');
    }

    if (errorTypes.has('SCHEMA_VIOLATION')) {
      suggestions.push('Update data to match current schema requirements');
    }
  }

  /**
   * Repair methods for different error types
   */
  private repairMissingField(entry: OfflineShoppingListEntry, error: IntegrityError): OfflineShoppingListEntry {
    const field = error.field;
    
    if (field?.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      switch (metadataField) {
        case 'syncStatus':
          entry.metadata.syncStatus = 'pending';
          break;
        case 'version':
          entry.metadata.version = 1;
          break;
        case 'deviceId':
          entry.metadata.deviceId = 'unknown';
          break;
        case 'lastModified':
          entry.metadata.lastModified = new Date();
          break;
      }
    }

    return entry;
  }

  private repairInvalidType(entry: OfflineShoppingListEntry, error: IntegrityError): OfflineShoppingListEntry {
    // Type conversion logic based on field and expected type
    // This is a simplified implementation
    return entry;
  }

  private repairCorruptedData(entry: OfflineShoppingListEntry, error: IntegrityError): OfflineShoppingListEntry {
    // Data corruption repair logic
    // This might involve resetting to default values or removing corrupted items
    return entry;
  }

  private repairSchemaViolation(entry: OfflineShoppingListEntry, error: IntegrityError): OfflineShoppingListEntry {
    // Schema violation repair logic
    return entry;
  }

  /**
   * Checksum calculation methods
   */
  private calculateCRC32(data: string): string {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16);
  }

  private calculateSHA256Like(data: string): string {
    // Simplified SHA-256-like hash
    let hash = 0x6A09E667;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xFFFFFFFF;
    }
    return Math.abs(hash).toString(16);
  }

  private calculateMD5Like(data: string): string {
    // Simplified MD5-like hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private calculateSimpleChecksum(data: string): string {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data.charCodeAt(i);
    }
    return sum.toString(16);
  }

  /**
   * Utility methods
   */
  private enforceBackupRetention(backups: BackupEntry[]): void {
    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove excess backups
    if (backups.length > this.config.maxBackupsPerEntry) {
      backups.splice(this.config.maxBackupsPerEntry);
    }

    // Remove old backups
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.backupRetentionDays);

    const validBackups = backups.filter(backup => backup.timestamp > cutoffDate);
    backups.length = 0;
    backups.push(...validBackups);
  }

  private hasRecoverableBackups(originalId: string): boolean {
    const backups = this.backupStorage.get(originalId) || [];
    return backups.length > 0;
  }

  private updateIntegrityStats(entryId: string, result: IntegrityCheckResult): void {
    this.integrityStats.set(`${entryId}_corruption_level`, result.corruptionLevel);
    this.integrityStats.set(`${entryId}_error_count`, result.errors.length);
    this.integrityStats.set(`${entryId}_last_check`, Date.now());
  }

  private createIntegrityError(
    code: 'INTEGRITY_CHECK_FAILED' | 'BACKUP_CREATION_FAILED' | 'RECOVERY_FAILED' | 'REPAIR_FAILED',
    message: string,
    details?: any
  ): OfflineStorageError {
    const error = new Error(message) as OfflineStorageError;
    error.code = 'DB_ERROR';
    error.details = { integrityCode: code, ...details };
    return error;
  }

  /**
   * Get integrity statistics
   */
  getIntegrityStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.integrityStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  /**
   * Get all backups for an entry
   */
  getBackups(originalId: string): BackupEntry[] {
    return this.backupStorage.get(originalId) || [];
  }

  /**
   * Clear all backups (use with caution)
   */
  clearAllBackups(): void {
    this.backupStorage.clear();
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(retentionDays: number = this.config.backupRetentionDays): Promise<{
    success: boolean;
    bytesFreed: number;
    itemsRemoved: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      bytesFreed: 0,
      itemsRemoved: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let totalBytesFreed = 0;
      let totalItemsRemoved = 0;

      // Process each entry's backups
      this.backupStorage.forEach((backups, originalId) => {
        const originalLength = backups.length;
        
        // Filter out old backups
        const validBackups = backups.filter(backup => {
          if (backup.timestamp < cutoffDate) {
            totalBytesFreed += backup.size;
            totalItemsRemoved++;
            return false;
          }
          return true;
        });

        // Update the backup storage
        if (validBackups.length < originalLength) {
          this.backupStorage.set(originalId, validBackups);
          console.log(`Cleaned up ${originalLength - validBackups.length} old backups for ${originalId}`);
        }
      });

      result.bytesFreed = totalBytesFreed;
      result.itemsRemoved = totalItemsRemoved;

      console.log(`Backup cleanup completed: ${totalItemsRemoved} backups removed, ${totalBytesFreed} bytes freed`);
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Backup cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}

// Export singleton instance
export const dataIntegrityManager = DataIntegrityManager.getInstance();
export { DataIntegrityManager };