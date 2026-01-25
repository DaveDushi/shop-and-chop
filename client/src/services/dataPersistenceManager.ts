/**
 * Data Persistence Manager for PWA Offline Shopping Lists
 * 
 * Provides comprehensive data persistence and recovery features including:
 * - Session-persistent shopping list storage
 * - Automatic data backup and recovery
 * - Shopping list history management
 * - Data retention policies
 * - Recovery mechanisms for corrupted data
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import {
  OfflineShoppingListEntry,
  ShoppingListMetadata,
  StorageUsage,
  OfflineStorageError
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { dataIntegrityManager } from '../utils/dataIntegrity';

// Persistence configuration
export interface PersistenceConfig {
  enableSessionPersistence: boolean;
  enableAutoBackup: boolean;
  backupInterval: number; // minutes
  historyRetentionDays: number;
  maxHistoryEntries: number;
  enableDataRecovery: boolean;
  recoveryAttempts: number;
}

// History entry for shopping list changes
export interface ShoppingListHistoryEntry {
  id: string;
  shoppingListId: string;
  timestamp: Date;
  action: 'created' | 'updated' | 'deleted' | 'item_checked' | 'item_unchecked' | 'synced';
  snapshot: OfflineShoppingListEntry;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  deviceId: string;
  sessionId: string;
}

// Session data for persistence
export interface SessionData {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  activeShoppingLists: string[];
  pendingChanges: number;
  deviceId: string;
}

// Recovery result
export interface RecoveryResult {
  success: boolean;
  recoveredEntries: number;
  failedEntries: string[];
  warnings: string[];
  totalAttempts: number;
}

/**
 * Data Persistence Manager
 */
class DataPersistenceManager {
  private static instance: DataPersistenceManager;
  private config: PersistenceConfig;
  private currentSession: SessionData | null = null;
  private historyStorage: Map<string, ShoppingListHistoryEntry[]> = new Map();
  private backupTimer: NodeJS.Timeout | null = null;
  private sessionStorageKey = 'shopAndChop_session';
  private historyStorageKey = 'shopAndChop_history';

  private constructor(config?: Partial<PersistenceConfig>) {
    this.config = {
      enableSessionPersistence: true,
      enableAutoBackup: true,
      backupInterval: 15, // 15 minutes
      historyRetentionDays: 7,
      maxHistoryEntries: 100,
      enableDataRecovery: true,
      recoveryAttempts: 3,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<PersistenceConfig>): DataPersistenceManager {
    if (!DataPersistenceManager.instance) {
      DataPersistenceManager.instance = new DataPersistenceManager(config);
    }
    return DataPersistenceManager.instance;
  }

  /**
   * Initialize the persistence manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize offline storage manager
      await offlineStorageManager.initialize();

      // Restore session data if enabled
      if (this.config.enableSessionPersistence) {
        await this.restoreSession();
      }

      // Load history from storage
      await this.loadHistoryFromStorage();

      // Start automatic backup if enabled
      if (this.config.enableAutoBackup) {
        this.startAutoBackup();
      }

      // Perform recovery check
      if (this.config.enableDataRecovery) {
        await this.performRecoveryCheck();
      }

      console.log('Data Persistence Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Data Persistence Manager:', error);
      throw this.createPersistenceError('INITIALIZATION_FAILED', 'Failed to initialize persistence manager', error);
    }
  }

  /**
   * Create or restore session
   */
  async createSession(deviceId: string): Promise<SessionData> {
    try {
      const sessionId = `session_${deviceId}_${Date.now()}`;
      
      this.currentSession = {
        sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        activeShoppingLists: [],
        pendingChanges: 0,
        deviceId
      };

      // Persist session data
      if (this.config.enableSessionPersistence) {
        await this.persistSession();
      }

      console.log(`Created new session: ${sessionId}`);
      return this.currentSession;
    } catch (error) {
      throw this.createPersistenceError('SESSION_CREATION_FAILED', 'Failed to create session', error);
    }
  }

  /**
   * Restore session from storage
   */
  private async restoreSession(): Promise<void> {
    try {
      const sessionData = sessionStorage.getItem(this.sessionStorageKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        
        // Convert date strings back to Date objects
        this.currentSession = {
          ...parsed,
          startTime: new Date(parsed.startTime),
          lastActivity: new Date(parsed.lastActivity)
        };

        // Check if session is still valid (not older than 24 hours)
        const sessionAge = Date.now() - this.currentSession.lastActivity.getTime();
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge > maxSessionAge) {
          console.log('Session expired, creating new session');
          this.currentSession = null;
          sessionStorage.removeItem(this.sessionStorageKey);
        } else {
          console.log(`Restored session: ${this.currentSession.sessionId}`);
          
          // Validate active shopping lists still exist
          await this.validateActiveShoppingLists();
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      sessionStorage.removeItem(this.sessionStorageKey);
    }
  }

  /**
   * Persist current session to storage
   */
  private async persistSession(): Promise<void> {
    if (this.currentSession && this.config.enableSessionPersistence) {
      try {
        // Update last activity
        this.currentSession.lastActivity = new Date();
        
        sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.currentSession));
      } catch (error) {
        console.error('Failed to persist session:', error);
      }
    }
  }

  /**
   * Validate that active shopping lists still exist
   */
  private async validateActiveShoppingLists(): Promise<void> {
    if (!this.currentSession) return;

    const validLists: string[] = [];
    
    for (const listId of this.currentSession.activeShoppingLists) {
      try {
        const entry = await offlineStorageManager.getShoppingList(listId);
        if (entry) {
          validLists.push(listId);
        }
      } catch (error) {
        console.warn(`Shopping list ${listId} no longer exists, removing from session`);
      }
    }

    this.currentSession.activeShoppingLists = validLists;
    await this.persistSession();
  }

  /**
   * Store shopping list with persistence features
   */
  async storeShoppingList(entry: OfflineShoppingListEntry, action: 'created' | 'updated' = 'created'): Promise<void> {
    try {
      // Create backup before storing
      if (this.config.enableAutoBackup) {
        await dataIntegrityManager.createBackup(entry, 'auto', `${action} operation`);
      }

      // Store in offline storage
      await offlineStorageManager.storeShoppingList(entry);

      // Add to history
      await this.addToHistory(entry, action);

      // Update session
      await this.updateSession(entry.metadata.id, action);

      console.log(`Stored shopping list ${entry.metadata.id} with persistence features`);
    } catch (error) {
      throw this.createPersistenceError('STORE_FAILED', 'Failed to store shopping list with persistence', error);
    }
  }

  /**
   * Get shopping list with recovery fallback
   */
  async getShoppingList(id: string): Promise<OfflineShoppingListEntry | null> {
    try {
      // Try to get from primary storage
      let entry = await offlineStorageManager.getShoppingList(id);
      
      if (!entry && this.config.enableDataRecovery) {
        // Attempt recovery from backup
        console.log(`Shopping list ${id} not found, attempting recovery`);
        entry = await this.recoverShoppingList(id);
        
        if (entry) {
          // Re-store recovered entry
          await offlineStorageManager.storeShoppingList(entry);
          await this.addToHistory(entry, 'recovered' as any);
        }
      }

      // Update session activity
      if (entry && this.currentSession) {
        if (!this.currentSession.activeShoppingLists.includes(id)) {
          this.currentSession.activeShoppingLists.push(id);
          await this.persistSession();
        }
      }

      return entry;
    } catch (error) {
      console.error(`Failed to get shopping list ${id}:`, error);
      
      // Try recovery as last resort
      if (this.config.enableDataRecovery) {
        return await this.recoverShoppingList(id);
      }
      
      return null;
    }
  }

  /**
   * Update shopping list with history tracking
   */
  async updateShoppingList(id: string, updates: Partial<OfflineShoppingListEntry>, changes?: { field: string; oldValue: any; newValue: any }[]): Promise<void> {
    try {
      // Get current entry for comparison
      const currentEntry = await this.getShoppingList(id);
      if (!currentEntry) {
        throw new Error(`Shopping list ${id} not found`);
      }

      // Create backup before update
      if (this.config.enableAutoBackup) {
        await dataIntegrityManager.createBackup(currentEntry, 'auto', 'pre-update backup');
      }

      // Update in storage
      await offlineStorageManager.updateShoppingList(id, updates);

      // Get updated entry for history
      const updatedEntry = await offlineStorageManager.getShoppingList(id);
      if (updatedEntry) {
        // Add to history with changes
        await this.addToHistory(updatedEntry, 'updated', changes);
      }

      // Update session
      await this.updateSession(id, 'updated');

    } catch (error) {
      throw this.createPersistenceError('UPDATE_FAILED', 'Failed to update shopping list with persistence', error);
    }
  }

  /**
   * Delete shopping list with cleanup
   */
  async deleteShoppingList(id: string): Promise<void> {
    try {
      // Get entry before deletion for history
      const entry = await this.getShoppingList(id);
      
      if (entry) {
        // Create final backup
        if (this.config.enableAutoBackup) {
          await dataIntegrityManager.createBackup(entry, 'manual', 'pre-deletion backup');
        }

        // Add to history
        await this.addToHistory(entry, 'deleted');
      }

      // Delete from storage
      await offlineStorageManager.deleteShoppingList(id);

      // Update session
      await this.updateSession(id, 'deleted');

      console.log(`Deleted shopping list ${id} with persistence cleanup`);
    } catch (error) {
      throw this.createPersistenceError('DELETE_FAILED', 'Failed to delete shopping list with persistence', error);
    }
  }

  /**
   * Add entry to history
   */
  private async addToHistory(
    entry: OfflineShoppingListEntry, 
    action: ShoppingListHistoryEntry['action'],
    changes?: { field: string; oldValue: any; newValue: any }[]
  ): Promise<void> {
    try {
      const historyEntry: ShoppingListHistoryEntry = {
        id: `history_${entry.metadata.id}_${Date.now()}`,
        shoppingListId: entry.metadata.id,
        timestamp: new Date(),
        action,
        snapshot: JSON.parse(JSON.stringify(entry)), // Deep clone
        changes,
        deviceId: entry.metadata.deviceId,
        sessionId: this.currentSession?.sessionId || 'unknown'
      };

      // Add to in-memory storage
      const existingHistory = this.historyStorage.get(entry.metadata.id) || [];
      existingHistory.push(historyEntry);

      // Enforce retention policy
      this.enforceHistoryRetention(existingHistory);

      this.historyStorage.set(entry.metadata.id, existingHistory);

      // Persist to storage
      await this.persistHistoryToStorage();

    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  }

  /**
   * Get shopping list history
   */
  getShoppingListHistory(id: string): ShoppingListHistoryEntry[] {
    return this.historyStorage.get(id) || [];
  }

  /**
   * Get all history entries
   */
  getAllHistory(): ShoppingListHistoryEntry[] {
    const allHistory: ShoppingListHistoryEntry[] = [];
    this.historyStorage.forEach(entries => {
      allHistory.push(...entries);
    });
    return allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Recover shopping list from backup or history
   */
  private async recoverShoppingList(id: string): Promise<OfflineShoppingListEntry | null> {
    try {
      console.log(`Attempting to recover shopping list ${id}`);

      // Try recovery from data integrity manager first
      let recovered = await dataIntegrityManager.recoverFromBackup(id, {
        preferLatest: true,
        validateBeforeRestore: true,
        allowPartialRecovery: true,
        maxRecoveryAttempts: this.config.recoveryAttempts
      });

      if (recovered) {
        console.log(`Recovered shopping list ${id} from backup`);
        return recovered;
      }

      // Try recovery from history
      const history = this.getShoppingListHistory(id);
      if (history.length > 0) {
        // Get the most recent non-deleted entry
        const lastValidEntry = history
          .filter(entry => entry.action !== 'deleted')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (lastValidEntry) {
          console.log(`Recovered shopping list ${id} from history`);
          
          // Update metadata to reflect recovery
          recovered = {
            ...lastValidEntry.snapshot,
            metadata: {
              ...lastValidEntry.snapshot.metadata,
              lastModified: new Date(),
              syncStatus: 'pending',
              version: (lastValidEntry.snapshot.metadata.version || 0) + 1
            }
          };

          return recovered;
        }
      }

      console.warn(`Could not recover shopping list ${id}`);
      return null;
    } catch (error) {
      console.error(`Recovery failed for shopping list ${id}:`, error);
      return null;
    }
  }

  /**
   * Perform recovery check on initialization
   */
  private async performRecoveryCheck(): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: true,
      recoveredEntries: 0,
      failedEntries: [],
      warnings: [],
      totalAttempts: 0
    };

    try {
      // Get all shopping lists
      const allLists = await offlineStorageManager.getAllShoppingLists();
      
      for (const entry of allLists) {
        try {
          // Check integrity
          const integrityResult = await dataIntegrityManager.checkIntegrity(entry);
          
          if (!integrityResult.isValid && integrityResult.canRecover) {
            result.totalAttempts++;
            
            // Attempt repair
            const repaired = await dataIntegrityManager.repairEntry(entry, integrityResult);
            
            if (repaired) {
              await offlineStorageManager.storeShoppingList(repaired);
              result.recoveredEntries++;
              console.log(`Repaired shopping list ${entry.metadata.id}`);
            } else {
              result.failedEntries.push(entry.metadata.id);
              result.warnings.push(`Could not repair shopping list ${entry.metadata.id}`);
            }
          } else if (!integrityResult.isValid) {
            result.failedEntries.push(entry.metadata.id);
            result.warnings.push(`Shopping list ${entry.metadata.id} is corrupted and cannot be recovered`);
          }
        } catch (error) {
          result.failedEntries.push(entry.metadata.id);
          result.warnings.push(`Recovery check failed for ${entry.metadata.id}: ${error.message}`);
        }
      }

      if (result.failedEntries.length > 0) {
        result.success = false;
      }

      console.log(`Recovery check completed: ${result.recoveredEntries} recovered, ${result.failedEntries.length} failed`);
      return result;
    } catch (error) {
      result.success = false;
      result.warnings.push(`Recovery check failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Update session information
   */
  private async updateSession(shoppingListId: string, action: string): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Update active lists
      if (action === 'created' || action === 'updated') {
        if (!this.currentSession.activeShoppingLists.includes(shoppingListId)) {
          this.currentSession.activeShoppingLists.push(shoppingListId);
        }
      } else if (action === 'deleted') {
        this.currentSession.activeShoppingLists = this.currentSession.activeShoppingLists
          .filter(id => id !== shoppingListId);
      }

      // Update pending changes count
      if (action === 'updated') {
        this.currentSession.pendingChanges++;
      }

      // Persist session
      await this.persistSession();
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }

  /**
   * Start automatic backup timer
   */
  private startAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      try {
        await this.performAutoBackup();
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, this.config.backupInterval * 60 * 1000); // Convert minutes to milliseconds

    console.log(`Auto backup started with ${this.config.backupInterval} minute interval`);
  }

  /**
   * Perform automatic backup of active shopping lists
   */
  private async performAutoBackup(): Promise<void> {
    if (!this.currentSession) return;

    try {
      let backupCount = 0;
      
      for (const listId of this.currentSession.activeShoppingLists) {
        try {
          const entry = await offlineStorageManager.getShoppingList(listId);
          if (entry) {
            await dataIntegrityManager.createBackup(entry, 'auto', 'scheduled backup');
            backupCount++;
          }
        } catch (error) {
          console.error(`Failed to backup shopping list ${listId}:`, error);
        }
      }

      if (backupCount > 0) {
        console.log(`Auto backup completed: ${backupCount} shopping lists backed up`);
      }
    } catch (error) {
      console.error('Auto backup process failed:', error);
    }
  }

  /**
   * Load history from storage
   */
  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const historyData = localStorage.getItem(this.historyStorageKey);
      if (historyData) {
        const parsed = JSON.parse(historyData);
        
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(listId => {
          const entries = parsed[listId].map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
            snapshot: {
              ...entry.snapshot,
              metadata: {
                ...entry.snapshot.metadata,
                generatedAt: new Date(entry.snapshot.metadata.generatedAt),
                lastModified: new Date(entry.snapshot.metadata.lastModified)
              }
            }
          }));
          
          this.historyStorage.set(listId, entries);
        });

        console.log('History loaded from storage');
      }
    } catch (error) {
      console.error('Failed to load history from storage:', error);
      localStorage.removeItem(this.historyStorageKey);
    }
  }

  /**
   * Persist history to storage
   */
  private async persistHistoryToStorage(): Promise<void> {
    try {
      const historyData: { [key: string]: ShoppingListHistoryEntry[] } = {};
      
      this.historyStorage.forEach((entries, listId) => {
        historyData[listId] = entries;
      });

      localStorage.setItem(this.historyStorageKey, JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to persist history to storage:', error);
    }
  }

  /**
   * Enforce history retention policy
   */
  private enforceHistoryRetention(history: ShoppingListHistoryEntry[]): void {
    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove entries exceeding max count
    if (history.length > this.config.maxHistoryEntries) {
      history.splice(this.config.maxHistoryEntries);
    }

    // Remove old entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.historyRetentionDays);

    const validEntries = history.filter(entry => entry.timestamp > cutoffDate);
    history.length = 0;
    history.push(...validEntries);
  }

  /**
   * Get storage usage including persistence data
   */
  async getStorageUsage(): Promise<StorageUsage & { historySize: number; sessionSize: number }> {
    try {
      const baseUsage = await offlineStorageManager.getStorageUsage();
      
      // Calculate history storage size
      const historyData = localStorage.getItem(this.historyStorageKey);
      const historySize = historyData ? historyData.length : 0;
      
      // Calculate session storage size
      const sessionData = sessionStorage.getItem(this.sessionStorageKey);
      const sessionSize = sessionData ? sessionData.length : 0;

      return {
        ...baseUsage,
        historySize,
        sessionSize,
        used: baseUsage.used + historySize + sessionSize
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        used: 0,
        available: 0,
        percentage: 0,
        historySize: 0,
        sessionSize: 0
      };
    }
  }

  /**
   * Clean up old data including history
   */
  async cleanupOldData(retentionDays: number = this.config.historyRetentionDays): Promise<void> {
    try {
      // Clean up base storage
      await offlineStorageManager.cleanupOldData(retentionDays);

      // Clean up history
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let cleanedHistoryCount = 0;
      this.historyStorage.forEach((entries, listId) => {
        const originalLength = entries.length;
        const validEntries = entries.filter(entry => entry.timestamp > cutoffDate);
        
        if (validEntries.length < originalLength) {
          cleanedHistoryCount += originalLength - validEntries.length;
          this.historyStorage.set(listId, validEntries);
        }
      });

      // Persist cleaned history
      await this.persistHistoryToStorage();

      console.log(`Cleanup completed: ${cleanedHistoryCount} history entries removed`);
    } catch (error) {
      throw this.createPersistenceError('CLEANUP_FAILED', 'Failed to cleanup old data', error);
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(retentionDays: number = 7): Promise<{
    success: boolean;
    bytesFreed?: number;
    itemsRemoved?: number;
    errors?: string[];
  }> {
    try {
      // Use data integrity manager to clean up old backups
      const result = await dataIntegrityManager.cleanupOldBackups(retentionDays);
      
      return {
        success: true,
        bytesFreed: result.bytesFreed || 0,
        itemsRemoved: result.itemsRemoved || 0,
        errors: result.errors || []
      };
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      return {
        success: false,
        errors: [`Failed to cleanup old backups: ${error.message}`]
      };
    }
  }

  /**
   * Get current session information
   */
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    try {
      if (this.currentSession) {
        // Perform final backup
        if (this.config.enableAutoBackup) {
          await this.performAutoBackup();
        }

        // Clear session
        this.currentSession = null;
        sessionStorage.removeItem(this.sessionStorageKey);

        // Stop auto backup timer
        if (this.backupTimer) {
          clearInterval(this.backupTimer);
          this.backupTimer = null;
        }

        console.log('Session ended successfully');
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Create persistence error
   */
  private createPersistenceError(
    code: 'INITIALIZATION_FAILED' | 'SESSION_CREATION_FAILED' | 'STORE_FAILED' | 'UPDATE_FAILED' | 'DELETE_FAILED' | 'CLEANUP_FAILED',
    message: string,
    details?: any
  ): OfflineStorageError {
    const error = new Error(message) as OfflineStorageError;
    error.code = 'DB_ERROR';
    error.details = { persistenceCode: code, ...details };
    return error;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      await this.endSession();
      
      // Clear in-memory data
      this.historyStorage.clear();
      
      console.log('Data Persistence Manager shutdown completed');
    } catch (error) {
      console.error('Failed to shutdown Data Persistence Manager:', error);
    }
  }
}

// Export singleton instance
export const dataPersistenceManager = DataPersistenceManager.getInstance();
export { DataPersistenceManager };
export type { PersistenceConfig, ShoppingListHistoryEntry, SessionData, RecoveryResult };