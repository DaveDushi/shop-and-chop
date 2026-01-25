/**
 * Offline Storage Manager for PWA functionality
 * Manages IndexedDB operations for shopping lists and sync queue
 * 
 * Features:
 * - Database initialization and schema management
 * - CRUD operations for shopping lists and sync queue
 * - Storage usage monitoring and cleanup methods
 * - Data compression and integrity validation
 * - Backup and recovery mechanisms
 * - Storage quota management with LRU eviction
 */

import {
  OfflineShoppingListEntry,
  SyncOperation,
  StorageUsage,
  OfflineStorageError
} from '../types/OfflineStorage.types';
import { dataCompressionUtil, DataValidationUtil } from '../utils/dataCompression';
import { dataSerializationUtil } from '../utils/dataSerialization';
import { dataIntegrityManager } from '../utils/dataIntegrity';

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ShopAndChopDB';
  private readonly dbVersion = 1;
  private readonly maxStorageUsagePercent = 80; // Trigger cleanup at 80% usage
  private readonly compressionThreshold = 1024; // Compress data larger than 1KB
  private backupData: Map<string, OfflineShoppingListEntry> = new Map();
  private config = {
    enableBackup: true,
    enableCompression: true,
    enableValidation: true
  };

  /**
   * Initialize the IndexedDB database with enhanced error handling
   */
  async initialize(): Promise<void> {
    try {
      await this.openDatabase();
      await this.validateDatabaseIntegrity();
      await this.performMaintenanceTasks();
    } catch (error) {
      console.error('Failed to initialize OfflineStorageManager:', error);
      throw this.createStorageError('DB_ERROR', 'Database initialization failed', error);
    }
  }

  /**
   * Open the IndexedDB database
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(this.createStorageError('DB_ERROR', 'Failed to open IndexedDB', request.error));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.setupDatabaseErrorHandlers();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked. Please close other tabs.');
      };
    });
  }

  /**
   * Setup database error handlers
   */
  private setupDatabaseErrorHandlers(): void {
    if (this.db) {
      this.db.onerror = (event) => {
        console.error('Database error:', event);
      };

      this.db.onversionchange = () => {
        console.warn('Database version changed. Closing connection.');
        this.close();
      };
    }
  }

  /**
   * Create object stores for the database schema with enhanced indexes
   */
  private createObjectStores(db: IDBDatabase): void {
    // Shopping Lists store
    if (!db.objectStoreNames.contains('shoppingLists')) {
      const shoppingListsStore = db.createObjectStore('shoppingLists', { keyPath: 'metadata.id' });
      shoppingListsStore.createIndex('mealPlanId', 'metadata.mealPlanId', { unique: false });
      shoppingListsStore.createIndex('weekStartDate', 'metadata.weekStartDate', { unique: false });
      shoppingListsStore.createIndex('lastModified', 'metadata.lastModified', { unique: false });
      shoppingListsStore.createIndex('syncStatus', 'metadata.syncStatus', { unique: false });
      shoppingListsStore.createIndex('deviceId', 'metadata.deviceId', { unique: false });
      shoppingListsStore.createIndex('version', 'metadata.version', { unique: false });
    }

    // Sync Queue store
    if (!db.objectStoreNames.contains('syncQueue')) {
      const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
      syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncQueueStore.createIndex('type', 'type', { unique: false });
      syncQueueStore.createIndex('shoppingListId', 'shoppingListId', { unique: false });
      syncQueueStore.createIndex('retryCount', 'retryCount', { unique: false });
    }

    // Metadata store for configuration and backup data
    if (!db.objectStoreNames.contains('metadata')) {
      db.createObjectStore('metadata', { keyPath: 'key' });
    }

    // Backup store for data recovery
    if (!db.objectStoreNames.contains('backups')) {
      const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
      backupStore.createIndex('timestamp', 'timestamp', { unique: false });
      backupStore.createIndex('originalId', 'originalId', { unique: false });
    }
  }

  /**
   * Validate database integrity and perform recovery if needed
   */
  private async validateDatabaseIntegrity(): Promise<void> {
    try {
      // Check if all required object stores exist
      const requiredStores = ['shoppingLists', 'syncQueue', 'metadata', 'backups'];
      for (const storeName of requiredStores) {
        if (!this.db?.objectStoreNames.contains(storeName)) {
          throw new Error(`Missing required object store: ${storeName}`);
        }
      }

      // Validate a sample of stored data
      await this.validateStoredData();
    } catch (error) {
      console.error('Database integrity validation failed:', error);
      await this.attemptDatabaseRecovery();
    }
  }

  /**
   * Validate stored data integrity
   */
  private async validateStoredData(): Promise<void> {
    const shoppingLists = await this.getAllShoppingLists();
    
    for (const entry of shoppingLists.slice(0, 5)) { // Validate first 5 entries
      if (!this.isValidShoppingListEntry(entry)) {
        throw new Error(`Invalid shopping list entry: ${entry.metadata.id}`);
      }
    }
  }

  /**
   * Validate shopping list entry structure
   */
  private isValidShoppingListEntry(entry: any): entry is OfflineShoppingListEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      entry.metadata &&
      typeof entry.metadata.id === 'string' &&
      typeof entry.metadata.mealPlanId === 'string' &&
      entry.metadata.generatedAt instanceof Date &&
      entry.metadata.lastModified instanceof Date &&
      entry.shoppingList &&
      typeof entry.shoppingList === 'object'
    );
  }

  /**
   * Attempt database recovery from backup data
   */
  private async attemptDatabaseRecovery(): Promise<void> {
    console.warn('Attempting database recovery...');
    
    try {
      // Try to recover from backup data
      const backups = await this.getBackupData();
      if (backups.length > 0) {
        console.log(`Found ${backups.length} backup entries for recovery`);
        // Recovery logic would go here
      }
    } catch (error) {
      console.error('Database recovery failed:', error);
      // As a last resort, we could clear corrupted data
      await this.clearCorruptedData();
    }
  }

  /**
   * Get backup data for recovery
   */
  private async getBackupData(): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Clear corrupted data as last resort
   */
  private async clearCorruptedData(): Promise<void> {
    console.warn('Clearing corrupted data...');
    
    if (!this.db) return;

    const transaction = this.db.transaction(['shoppingLists', 'syncQueue'], 'readwrite');
    
    try {
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('shoppingLists').clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('syncQueue').clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        })
      ]);
    } catch (error) {
      console.error('Failed to clear corrupted data:', error);
    }
  }

  /**
   * Perform routine maintenance tasks
   */
  private async performMaintenanceTasks(): Promise<void> {
    try {
      // Check storage usage and cleanup if needed
      const usage = await this.getStorageUsage();
      if (usage.percentage > this.maxStorageUsagePercent) {
        await this.performStorageCleanup();
      }

      // Clean up old sync operations
      await this.cleanupOldSyncOperations();
    } catch (error) {
      console.error('Maintenance tasks failed:', error);
    }
  }

  /**
   * Perform storage cleanup using LRU eviction
   */
  private async performStorageCleanup(): Promise<void> {
    console.log('Performing storage cleanup...');
    
    const allLists = await this.getAllShoppingLists();
    
    // Sort by last modified date (oldest first)
    const sortedLists = allLists.sort((a, b) => 
      a.metadata.lastModified.getTime() - b.metadata.lastModified.getTime()
    );

    // Remove oldest entries that are synced and not from current week
    const currentWeekStart = this.getWeekStartDate(new Date());
    let cleanedCount = 0;

    for (const entry of sortedLists) {
      const entryWeekStart = new Date(entry.metadata.weekStartDate);
      
      if (entry.metadata.syncStatus === 'synced' && 
          entryWeekStart < currentWeekStart && 
          cleanedCount < 10) { // Limit cleanup to 10 entries per run
        
        await this.deleteShoppingList(entry.metadata.id);
        cleanedCount++;
      }
    }

    console.log(`Cleaned up ${cleanedCount} old shopping list entries`);
  }

  /**
   * Clean up old sync operations
   */
  private async cleanupOldSyncOperations(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // Remove operations older than 24 hours

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  /**
   * Store a shopping list entry with enhanced compression, validation, and backup
   */
  async storeShoppingList(entry: OfflineShoppingListEntry): Promise<void> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      // Validate entry using enhanced validation system
      const { dataValidationSystem } = await import('../services/dataValidationSystem');
      const validationResult = await dataValidationSystem.validateShoppingListEntry(entry);
      
      if (!validationResult.isValid) {
        console.warn('[OfflineStorage] Validation issues found, attempting to sanitize and repair data');
        
        // Try to sanitize the data first
        const sanitizedEntry = dataValidationSystem.sanitizeShoppingListEntry(entry);
        
        // Re-validate sanitized entry
        const revalidationResult = await dataValidationSystem.validateShoppingListEntry(sanitizedEntry);
        
        if (revalidationResult.isValid) {
          entry = sanitizedEntry;
          console.log('[OfflineStorage] Data sanitization successful');
        } else {
          // Try corruption detection and repair
          const { detectAndRepairCorruption } = dataValidationSystem;
          const repairResult = await detectAndRepairCorruption(entry);
          
          if (repairResult.repaired && repairResult.repairedEntry) {
            entry = repairResult.repairedEntry;
            console.log('[OfflineStorage] Data corruption repair successful:', repairResult.repairs);
          } else {
            throw this.createStorageError('VALIDATION_ERROR', 'Entry validation failed and could not be repaired', {
              errors: validationResult.errors,
              warnings: validationResult.warnings
            });
          }
        }
      }

      // Check if migration is needed
      if (validationResult.migrationRequired) {
        console.log('[OfflineStorage] Entry requires migration, attempting automatic migration');
        const { dataMigrationManager } = await import('../services/dataMigrationManager');
        const migrationResult = await dataMigrationManager.migrateEntry(entry);
        
        if (migrationResult.success && migrationResult.migratedData) {
          entry = migrationResult.migratedData;
          console.log('[OfflineStorage] Migration successful');
        } else {
          console.warn('[OfflineStorage] Migration failed, storing entry as-is:', migrationResult.errors);
        }
      }

      // Create backup before storing if enabled
      if (this.config.enableBackup) {
        await dataIntegrityManager.createBackup(entry, 'auto', 'pre-store backup');
      }

      // Compress and serialize data using enhanced utilities
      const compressionResult = await dataCompressionUtil.compressShoppingList(entry);
      const serializationResult = await dataSerializationUtil.serializeShoppingListEntry(entry);

      // Choose the better compression result
      const useCompression = compressionResult.compressionRatio > 1.1; // Use compression if it saves at least 10%
      const dataToStore = useCompression ? {
        ...compressionResult.compressed,
        _compressionMetadata: {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          algorithm: compressionResult.algorithm,
          checksum: compressionResult.checksum
        }
      } : serializationResult.data;

      await this.performStoreOperation(dataToStore);
      
      // Update in-memory backup
      this.backupData.set(entry.metadata.id, entry);

      console.log(`Stored shopping list ${entry.metadata.id} with ${useCompression ? 'compression' : 'serialization'}`);

    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to store shopping list', error);
    }
  }

  /**
   * Create backup of shopping list entry
   */
  private async createBackup(entry: OfflineShoppingListEntry): Promise<void> {
    if (!this.db) return;

    const backup = {
      id: `backup_${entry.metadata.id}_${Date.now()}`,
      originalId: entry.metadata.id,
      timestamp: new Date(),
      data: JSON.parse(JSON.stringify(entry)) // Deep clone
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.put(backup);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(entry: OfflineShoppingListEntry): boolean {
    const dataSize = JSON.stringify(entry).length;
    return dataSize > this.compressionThreshold;
  }

  /**
   * Prepare entry for storage (convert dates to strings)
   */
  private prepareForStorage(entry: OfflineShoppingListEntry): any {
    const prepared = JSON.parse(JSON.stringify(entry));
    
    // Convert dates to ISO strings for storage
    prepared.metadata.generatedAt = entry.metadata.generatedAt.toISOString();
    prepared.metadata.lastModified = entry.metadata.lastModified.toISOString();
    
    // Convert item dates - handle both Date objects and strings
    Object.keys(prepared.shoppingList).forEach(category => {
      prepared.shoppingList[category] = prepared.shoppingList[category].map((item: any) => ({
        ...item,
        lastModified: item.lastModified instanceof Date 
          ? item.lastModified.toISOString() 
          : item.lastModified
      }));
    });

    return prepared;
  }

  /**
   * Perform the actual store operation
   */
  private async performStoreOperation(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shoppingLists'], 'readwrite');
      const store = transaction.objectStore('shoppingLists');
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get a shopping list by ID with enhanced error recovery and validation
   */
  async getShoppingList(id: string): Promise<OfflineShoppingListEntry | null> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      const result = await this.performGetOperation(id);
      
      if (result) {
        let decompressed: OfflineShoppingListEntry;

        // Check if data was compressed using new utilities
        if (result._compressionMetadata) {
          // Use new decompression utility
          decompressed = await dataCompressionUtil.decompressShoppingList(result);
        } else if (result._compressed) {
          // Use legacy decompression
          decompressed = this.decompressShoppingListData(result);
        } else {
          // Use serialization utility for deserialization
          decompressed = await dataSerializationUtil.deserializeShoppingListEntry(result);
        }
        
        // Validate retrieved data using enhanced validation
        const validation = DataValidationUtil.validateShoppingListEntry(decompressed);
        if (!validation.isValid) {
          console.warn(`Retrieved data for ID ${id} has validation issues:`, validation.errors);
          
          if (validation.recoverable) {
            const repaired = DataValidationUtil.repairShoppingListEntry(decompressed);
            if (repaired) {
              console.log(`Successfully repaired data for ID ${id}`);
              return repaired;
            }
          }
          
          // Try to recover from backup
          console.warn(`Attempting recovery from backup for ID ${id}`);
          return await this.recoverShoppingListFromBackup(id);
        }
        
        return decompressed;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get shopping list ${id}:`, error);
      
      // Try to recover from backup using enhanced recovery
      return await this.recoverShoppingListFromBackup(id);
    }
  }

  /**
   * Perform the actual get operation
   */
  private async performGetOperation(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shoppingLists'], 'readonly');
      const store = transaction.objectStore('shoppingLists');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Recover shopping list from backup using enhanced recovery utilities
   */
  private async recoverShoppingListFromBackup(id: string): Promise<OfflineShoppingListEntry | null> {
    try {
      // First try enhanced recovery from data integrity manager
      const recovered = await dataIntegrityManager.recoverFromBackup(id, {
        preferLatest: true,
        validateBeforeRestore: true,
        allowPartialRecovery: true,
        maxRecoveryAttempts: 3
      });

      if (recovered) {
        console.log(`Successfully recovered shopping list ${id} using enhanced recovery`);
        return recovered;
      }

      // Fallback to legacy in-memory backup
      if (this.backupData.has(id)) {
        console.log(`Recovered shopping list ${id} from in-memory backup`);
        return this.backupData.get(id)!;
      }

      // Then check database backup store
      const backups = await this.getBackupData();
      const relevantBackup = backups
        .filter(backup => backup.originalId === id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (relevantBackup) {
        console.log(`Recovered shopping list ${id} from database backup`);
        
        // Validate backup data before returning
        const validation = DataValidationUtil.validateShoppingListEntry(relevantBackup.data);
        if (validation.isValid) {
          return relevantBackup.data;
        } else if (validation.recoverable) {
          const repaired = DataValidationUtil.repairShoppingListEntry(relevantBackup.data);
          if (repaired) {
            console.log(`Repaired backup data for shopping list ${id}`);
            return repaired;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to recover shopping list ${id} from backup:`, error);
      return null;
    }
  }

  /**
   * Get all shopping lists with error handling
   */
  async getAllShoppingLists(): Promise<OfflineShoppingListEntry[]> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      const results = await this.performGetAllOperation();
      const validEntries: OfflineShoppingListEntry[] = [];
      const corruptedIds: string[] = [];

      for (const entry of results) {
        try {
          const decompressed = this.decompressShoppingListData(entry);
          
          if (this.isValidShoppingListEntry(decompressed)) {
            validEntries.push(decompressed);
          } else {
            corruptedIds.push(entry.metadata?.id || 'unknown');
          }
        } catch (error) {
          console.error('Failed to decompress shopping list entry:', error);
          corruptedIds.push(entry.metadata?.id || 'unknown');
        }
      }

      // Log corrupted entries for monitoring
      if (corruptedIds.length > 0) {
        console.warn(`Found ${corruptedIds.length} corrupted shopping list entries:`, corruptedIds);
      }

      return validEntries;
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to get all shopping lists', error);
    }
  }

  /**
   * Perform the actual get all operation
   */
  private async performGetAllOperation(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shoppingLists'], 'readonly');
      const store = transaction.objectStore('shoppingLists');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Update a shopping list with validation and backup
   */
  async updateShoppingList(id: string, updates: Partial<OfflineShoppingListEntry>): Promise<void> {
    try {
      const existingEntry = await this.getShoppingList(id);
      if (!existingEntry) {
        throw this.createStorageError('DB_ERROR', `Shopping list with ID ${id} not found`);
      }

      const updatedEntry: OfflineShoppingListEntry = {
        ...existingEntry,
        ...updates,
        metadata: {
          ...existingEntry.metadata,
          ...updates.metadata,
          lastModified: new Date(),
          syncStatus: 'pending',
          version: (existingEntry.metadata.version || 0) + 1
        }
      };

      // Validate updated entry
      if (!this.isValidShoppingListEntry(updatedEntry)) {
        throw this.createStorageError('DB_ERROR', 'Updated shopping list entry is invalid');
      }

      await this.storeShoppingList(updatedEntry);
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to update shopping list', error);
    }
  }

  /**
   * Delete a shopping list with cleanup
   */
  async deleteShoppingList(id: string): Promise<void> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      // Remove from in-memory backup
      this.backupData.delete(id);

      // Delete from database
      await this.performDeleteOperation(id);

      // Clean up related sync operations
      await this.cleanupSyncOperationsForList(id);

    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to delete shopping list', error);
    }
  }

  /**
   * Perform the actual delete operation
   */
  private async performDeleteOperation(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shoppingLists'], 'readwrite');
      const store = transaction.objectStore('shoppingLists');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clean up sync operations for a deleted shopping list
   */
  private async cleanupSyncOperationsForList(shoppingListId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('shoppingListId');
      const request = index.openCursor(IDBKeyRange.only(shoppingListId));

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  /**
   * Add operation to sync queue with validation
   */
  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    // Validate operation structure
    if (!this.isValidSyncOperation(operation)) {
      throw this.createStorageError('DB_ERROR', 'Invalid sync operation structure');
    }

    try {
      await this.performAddToSyncQueue(operation);
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to add to sync queue', error);
    }
  }

  /**
   * Validate sync operation structure
   */
  private isValidSyncOperation(operation: any): operation is SyncOperation {
    return (
      operation &&
      typeof operation.id === 'string' &&
      typeof operation.type === 'string' &&
      typeof operation.shoppingListId === 'string' &&
      operation.timestamp instanceof Date &&
      typeof operation.retryCount === 'number' &&
      typeof operation.maxRetries === 'number'
    );
  }

  /**
   * Perform the actual add to sync queue operation
   */
  private async performAddToSyncQueue(operation: SyncOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      // Convert date to string for storage
      const operationToStore = {
        ...operation,
        timestamp: operation.timestamp.toISOString()
      };
      
      const request = store.put(operationToStore);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get all sync queue operations with date conversion
   */
  async getSyncQueue(): Promise<SyncOperation[]> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      const results = await this.performGetSyncQueue();
      
      // Convert timestamp strings back to dates and validate
      return results
        .map(op => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }))
        .filter(op => this.isValidSyncOperation(op));
        
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to get sync queue', error);
    }
  }

  /**
   * Perform the actual get sync queue operation
   */
  private async performGetSyncQueue(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Remove operation from sync queue
   */
  async removeSyncOperation(id: string): Promise<void> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      await this.performRemoveSyncOperation(id);
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to remove sync operation', error);
    }
  }

  /**
   * Perform the actual remove sync operation
   */
  private async performRemoveSyncOperation(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all sync queue operations
   */
  async clearSyncQueue(): Promise<void> {
    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      await this.performClearSyncQueue();
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to clear sync queue', error);
    }
  }

  /**
   * Perform the actual clear sync queue operation
   */
  private async performClearSyncQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get storage usage information with enhanced monitoring
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      if ('storage' in navigator && navigator.storage && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;

        // Log warning if storage usage is high
        if (percentage > this.maxStorageUsagePercent) {
          console.warn(`Storage usage is high: ${percentage.toFixed(1)}%`);
        }

        return { used, available, percentage };
      }

      // Fallback: estimate based on IndexedDB data
      return await this.estimateStorageUsage();
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Estimate storage usage when Storage API is not available
   */
  private async estimateStorageUsage(): Promise<StorageUsage> {
    try {
      const allLists = await this.getAllShoppingLists();
      const syncQueue = await this.getSyncQueue();
      
      // Rough estimation based on JSON size
      const listsSize = JSON.stringify(allLists).length;
      const queueSize = JSON.stringify(syncQueue).length;
      const totalSize = listsSize + queueSize;
      
      // Assume 50MB quota for estimation
      const estimatedQuota = 50 * 1024 * 1024;
      const percentage = (totalSize / estimatedQuota) * 100;
      
      return {
        used: totalSize,
        available: estimatedQuota,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Failed to estimate storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Clean up old data based on retention policy with enhanced logic
   */
  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (!this.db) {
      throw this.createStorageError('DB_ERROR', 'Database not initialized');
    }

    try {
      let cleanedCount = 0;
      
      const transaction = this.db.transaction(['shoppingLists', 'backups'], 'readwrite');
      
      // Clean up old shopping lists
      cleanedCount += await this.cleanupOldShoppingLists(transaction, cutoffDate);
      
      // Clean up old backups
      cleanedCount += await this.cleanupOldBackups(transaction, cutoffDate);
      
      console.log(`Cleanup completed: removed ${cleanedCount} old entries`);
      
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to cleanup old data', error);
    }
  }

  /**
   * Clean up old shopping lists
   */
  private async cleanupOldShoppingLists(transaction: IDBTransaction, cutoffDate: Date): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore('shoppingLists');
      const index = store.index('lastModified');
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      let cleanedCount = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as OfflineShoppingListEntry;
          const weekStart = new Date(entry.metadata.weekStartDate);
          const currentWeekStart = this.getWeekStartDate(new Date());
          
          // Only delete if not current week and sync status is 'synced'
          if (weekStart < currentWeekStart && entry.metadata.syncStatus === 'synced') {
            cursor.delete();
            cleanedCount++;
            
            // Remove from in-memory backup
            this.backupData.delete(entry.metadata.id);
          }
          cursor.continue();
        } else {
          resolve(cleanedCount);
        }
      };
    });
  }

  /**
   * Clean up old backup entries
   */
  private async cleanupOldBackups(transaction: IDBTransaction, cutoffDate: Date): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore('backups');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      let cleanedCount = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cleanedCount++;
          cursor.continue();
        } else {
          resolve(cleanedCount);
        }
      };
    });
  }

  /**
   * Enhanced compression with better algorithms
   */
  private compressShoppingListData(entry: OfflineShoppingListEntry): any {
    try {
      // Create a deep copy to avoid modifying original
      const compressed = JSON.parse(JSON.stringify(entry));
      
      // Convert dates to ISO strings for storage
      compressed.metadata.generatedAt = entry.metadata.generatedAt.toISOString();
      compressed.metadata.lastModified = entry.metadata.lastModified.toISOString();
      
      // Compress shopping list items with optimizations
      Object.keys(compressed.shoppingList).forEach(category => {
        compressed.shoppingList[category] = compressed.shoppingList[category].map((item: any) => {
          // Remove redundant fields and compress data
          const compressedItem = {
            id: item.id,
            name: item.name.trim(), // Remove extra whitespace
            quantity: item.quantity,
            unit: item.unit,
            checked: item.checked,
            lastModified: item.lastModified instanceof Date 
              ? item.lastModified.toISOString() 
              : item.lastModified,
            syncStatus: item.syncStatus
          };
          
          // Only include optional fields if they exist
          if (item.recipeId) compressedItem.recipeId = item.recipeId;
          if (item.recipeName) compressedItem.recipeName = item.recipeName.trim();
          
          return compressedItem;
        });
      });

      // Add compression metadata
      compressed._compressed = true;
      compressed._compressionVersion = 1;
      
      return compressed;
    } catch (error) {
      console.error('Compression failed, storing uncompressed:', error);
      return this.prepareForStorage(entry);
    }
  }

  /**
   * Enhanced decompression with error handling
   */
  private decompressShoppingListData(compressedEntry: any): OfflineShoppingListEntry {
    try {
      const decompressed = { ...compressedEntry };
      
      // Convert ISO strings back to dates
      decompressed.metadata.generatedAt = new Date(compressedEntry.metadata.generatedAt);
      decompressed.metadata.lastModified = new Date(compressedEntry.metadata.lastModified);
      
      // Decompress shopping list items
      Object.keys(decompressed.shoppingList).forEach(category => {
        decompressed.shoppingList[category] = decompressed.shoppingList[category].map((item: any) => ({
          ...item,
          lastModified: new Date(item.lastModified)
        }));
      });

      // Remove compression metadata
      delete decompressed._compressed;
      delete decompressed._compressionVersion;
      
      return decompressed;
    } catch (error) {
      console.error('Decompression failed:', error);
      throw this.createStorageError('DB_ERROR', 'Failed to decompress shopping list data', error);
    }
  }

  /**
   * Get the start date of the week for a given date
   */
  private getWeekStartDate(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day;
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Create a standardized storage error
   */
  private createStorageError(
    code: 'QUOTA_EXCEEDED' | 'DB_ERROR' | 'SYNC_ERROR' | 'NETWORK_ERROR',
    message: string,
    details?: any
  ): OfflineStorageError {
    const error = new Error(message) as OfflineStorageError;
    error.code = code;
    error.details = details;
    return error;
  }

  /**
   * Get database health status
   */
  async getDatabaseHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check database connection
      if (!this.db) {
        issues.push('Database not initialized');
        recommendations.push('Call initialize() method');
        return { isHealthy: false, issues, recommendations };
      }

      // Check storage usage
      const usage = await this.getStorageUsage();
      if (usage.percentage > this.maxStorageUsagePercent) {
        issues.push(`High storage usage: ${usage.percentage.toFixed(1)}%`);
        recommendations.push('Run cleanup operations');
      }

      // Check for corrupted data
      const allLists = await this.getAllShoppingLists();
      const corruptedCount = allLists.length - allLists.filter(entry => 
        this.isValidShoppingListEntry(entry)
      ).length;

      if (corruptedCount > 0) {
        issues.push(`${corruptedCount} corrupted shopping list entries found`);
        recommendations.push('Run data recovery operations');
      }

      // Check sync queue size
      const syncQueue = await this.getSyncQueue();
      if (syncQueue.length > 100) {
        issues.push(`Large sync queue: ${syncQueue.length} operations`);
        recommendations.push('Process sync queue or clear old operations');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      issues.push(`Health check failed: ${error.message}`);
      recommendations.push('Restart the application or clear storage');
      return { isHealthy: false, issues, recommendations };
    }
  }

  /**
   * Export data for backup purposes
   */
  async exportData(): Promise<{
    shoppingLists: OfflineShoppingListEntry[];
    syncQueue: SyncOperation[];
    exportDate: Date;
    version: string;
  }> {
    try {
      const [shoppingLists, syncQueue] = await Promise.all([
        this.getAllShoppingLists(),
        this.getSyncQueue()
      ]);

      return {
        shoppingLists,
        syncQueue,
        exportDate: new Date(),
        version: '1.0'
      };
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to export data', error);
    }
  }

  /**
   * Import data from backup
   */
  async importData(data: {
    shoppingLists: OfflineShoppingListEntry[];
    syncQueue: SyncOperation[];
    exportDate: Date;
    version: string;
  }): Promise<void> {
    try {
      // Validate import data
      if (!Array.isArray(data.shoppingLists) || !Array.isArray(data.syncQueue)) {
        throw new Error('Invalid import data structure');
      }

      // Clear existing data
      await this.clearSyncQueue();

      // Import shopping lists
      for (const entry of data.shoppingLists) {
        if (this.isValidShoppingListEntry(entry)) {
          await this.storeShoppingList(entry);
        }
      }

      // Import sync queue
      for (const operation of data.syncQueue) {
        if (this.isValidSyncOperation(operation)) {
          await this.addToSyncQueue(operation);
        }
      }

      console.log(`Imported ${data.shoppingLists.length} shopping lists and ${data.syncQueue.length} sync operations`);
    } catch (error) {
      throw this.createStorageError('DB_ERROR', 'Failed to import data', error);
    }
  }

  /**
   * Close the database connection and cleanup
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Clear in-memory backup
    this.backupData.clear();
  }
  /**
   * Detect and repair corrupted shopping list entries
   */
  async detectAndRepairCorruption(): Promise<{
    totalEntries: number;
    corruptedEntries: number;
    repairedEntries: number;
    unreparableEntries: number;
    errors: string[];
  }> {
    const result = {
      totalEntries: 0,
      corruptedEntries: 0,
      repairedEntries: 0,
      unreparableEntries: 0,
      errors: [] as string[]
    };

    try {
      const allEntries = await this.getAllShoppingLists();
      result.totalEntries = allEntries.length;

      const { dataValidationSystem } = await import('../services/dataValidationSystem');
      const { dataIntegrityManager } = await import('../utils/dataIntegrity');

      for (const entry of allEntries) {
        try {
          // Check integrity
          const integrityResult = await dataIntegrityManager.checkIntegrity(entry);
          
          if (!integrityResult.isValid) {
            result.corruptedEntries++;
            console.log(`[OfflineStorage] Corruption detected in entry ${entry.metadata.id}`);

            // Attempt repair
            const repairResult = await dataValidationSystem.detectAndRepairCorruption(entry);
            
            if (repairResult.repaired && repairResult.repairedEntry) {
              // Update the repaired entry
              await this.updateShoppingList(entry.metadata.id, repairResult.repairedEntry);
              result.repairedEntries++;
              console.log(`[OfflineStorage] Successfully repaired entry ${entry.metadata.id}`);
            } else {
              result.unreparableEntries++;
              console.error(`[OfflineStorage] Could not repair entry ${entry.metadata.id}`);
              
              // Try to recover from backup
              const recoveredEntry = await dataIntegrityManager.recoverFromBackup(entry.metadata.id);
              if (recoveredEntry) {
                await this.updateShoppingList(entry.metadata.id, recoveredEntry);
                result.repairedEntries++;
                console.log(`[OfflineStorage] Recovered entry ${entry.metadata.id} from backup`);
              }
            }
          }
        } catch (error) {
          result.errors.push(`Failed to process entry ${entry.metadata.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`[OfflineStorage] Corruption scan complete: ${result.corruptedEntries} corrupted, ${result.repairedEntries} repaired, ${result.unreparableEntries} unreparable`);
    } catch (error) {
      result.errors.push(`Corruption detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate all stored shopping list entries
   */
  async validateAllEntries(): Promise<{
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
    migrationNeeded: number;
    validationErrors: Array<{ entryId: string; errors: string[]; warnings: string[] }>;
  }> {
    const result = {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      migrationNeeded: 0,
      validationErrors: [] as Array<{ entryId: string; errors: string[]; warnings: string[] }>
    };

    try {
      const allEntries = await this.getAllShoppingLists();
      result.totalEntries = allEntries.length;

      const { dataValidationSystem } = await import('../services/dataValidationSystem');

      for (const entry of allEntries) {
        try {
          const validationResult = await dataValidationSystem.validateShoppingListEntry(entry);
          
          if (validationResult.isValid) {
            result.validEntries++;
          } else {
            result.invalidEntries++;
            result.validationErrors.push({
              entryId: entry.metadata.id,
              errors: validationResult.errors.map(e => e.message),
              warnings: validationResult.warnings.map(w => w.message)
            });
          }

          if (validationResult.migrationRequired) {
            result.migrationNeeded++;
          }
        } catch (error) {
          result.invalidEntries++;
          result.validationErrors.push({
            entryId: entry.metadata.id,
            errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            warnings: []
          });
        }
      }

      console.log(`[OfflineStorage] Validation complete: ${result.validEntries} valid, ${result.invalidEntries} invalid, ${result.migrationNeeded} need migration`);
    } catch (error) {
      console.error('[OfflineStorage] Validation failed:', error);
    }

    return result;
  }
}

// Export singleton instance
export const offlineStorageManager = new OfflineStorageManager();
export default offlineStorageManager;