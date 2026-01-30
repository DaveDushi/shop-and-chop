/**
 * Offline manager for scaling-related data
 * Handles caching and syncing of household size preferences and manual overrides
 */

import { 
  ScalingError, 
  ErrorLogger, 
  NetworkErrorHandler,
  ERROR_CODES 
} from '../utils/errorHandling';
import { userPreferencesService } from './userPreferencesService';
import { extendedMealPlanService } from './extendedMealPlanService';

export interface PendingHouseholdSizeChange {
  userId: string;
  householdSize: number;
  timestamp: number;
  retryCount: number;
}

export interface PendingManualOverride {
  mealPlanId: string;
  recipeId: string;
  servings: number | null; // null means removal
  timestamp: number;
  retryCount: number;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  syncInProgress: boolean;
}

/**
 * Manages offline caching and syncing for scaling preferences
 */
export class ScalingOfflineManager {
  private static instance: ScalingOfflineManager;
  private syncListeners: Array<(status: OfflineSyncStatus) => void> = [];
  private syncInProgress = false;
  private onlineStatus = navigator.onLine;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  private constructor() {
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  public static getInstance(): ScalingOfflineManager {
    if (!ScalingOfflineManager.instance) {
      ScalingOfflineManager.instance = new ScalingOfflineManager();
    }
    return ScalingOfflineManager.instance;
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      this.notifyStatusChange();
      // Trigger sync when coming back online
      this.syncPendingChanges().catch(error => {
        ErrorLogger.logError(
          error,
          'ScalingOfflineManager.onlineListener'
        );
      });
    });

    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      this.notifyStatusChange();
    });
  }

  /**
   * Start periodic sync attempts
   */
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.onlineStatus && !this.syncInProgress) {
        this.syncPendingChanges().catch(error => {
          ErrorLogger.logError(
            error,
            'ScalingOfflineManager.periodicSync'
          );
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Cache household size change for later sync
   */
  async cacheHouseholdSizeChange(userId: string, householdSize: number): Promise<void> {
    try {
      const change: PendingHouseholdSizeChange = {
        userId,
        householdSize,
        timestamp: Date.now(),
        retryCount: 0
      };

      const key = `pendingHouseholdSize_${userId}`;
      localStorage.setItem(key, JSON.stringify(change));
      
      // Also cache the current value for immediate use
      localStorage.setItem(`cachedHouseholdSize_${userId}`, householdSize.toString());
      
      this.notifyStatusChange();
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.cacheHouseholdSizeChange',
        { userId, householdSize }
      );
      throw new ScalingError(
        'Failed to cache household size change',
        ERROR_CODES.STORAGE_ERROR,
        'householdSize'
      );
    }
  }

  /**
   * Cache manual serving override for later sync
   */
  async cacheManualOverride(
    mealPlanId: string, 
    recipeId: string, 
    servings: number | null
  ): Promise<void> {
    try {
      const override: PendingManualOverride = {
        mealPlanId,
        recipeId,
        servings,
        timestamp: Date.now(),
        retryCount: 0
      };

      const key = `pendingOverride_${mealPlanId}_${recipeId}`;
      localStorage.setItem(key, JSON.stringify(override));
      
      // Cache the current value for immediate use
      if (servings !== null) {
        localStorage.setItem(`cachedOverride_${mealPlanId}_${recipeId}`, servings.toString());
      } else {
        localStorage.removeItem(`cachedOverride_${mealPlanId}_${recipeId}`);
      }
      
      this.notifyStatusChange();
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.cacheManualOverride',
        { mealPlanId, recipeId, servings }
      );
      throw new ScalingError(
        'Failed to cache manual override',
        ERROR_CODES.STORAGE_ERROR,
        'manualOverride'
      );
    }
  }

  /**
   * Get cached household size
   */
  getCachedHouseholdSize(userId: string): number | null {
    try {
      const cached = localStorage.getItem(`cachedHouseholdSize_${userId}`);
      if (cached) {
        const size = parseInt(cached, 10);
        return isNaN(size) ? null : size;
      }
      return null;
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.getCachedHouseholdSize',
        { userId }
      );
      return null;
    }
  }

  /**
   * Get cached manual override
   */
  getCachedManualOverride(mealPlanId: string, recipeId: string): number | null {
    try {
      const cached = localStorage.getItem(`cachedOverride_${mealPlanId}_${recipeId}`);
      if (cached) {
        const servings = parseInt(cached, 10);
        return isNaN(servings) ? null : servings;
      }
      return null;
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.getCachedManualOverride',
        { mealPlanId, recipeId }
      );
      return null;
    }
  }

  /**
   * Sync all pending changes
   */
  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.onlineStatus) {
      return;
    }

    this.syncInProgress = true;
    this.notifyStatusChange();

    try {
      await this.syncHouseholdSizeChanges();
      await this.syncManualOverrides();
      
      // Update last successful sync time
      localStorage.setItem('lastScalingSync', new Date().toISOString());
      
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.syncPendingChanges'
      );
      throw error;
    } finally {
      this.syncInProgress = false;
      localStorage.setItem('lastScalingSyncAttempt', new Date().toISOString());
      this.notifyStatusChange();
    }
  }

  /**
   * Sync pending household size changes
   */
  private async syncHouseholdSizeChanges(): Promise<void> {
    const keys = Object.keys(localStorage);
    const pendingKeys = keys.filter(key => key.startsWith('pendingHouseholdSize_'));

    for (const key of pendingKeys) {
      try {
        const changeData = localStorage.getItem(key);
        if (!changeData) continue;

        const change: PendingHouseholdSizeChange = JSON.parse(changeData);
        
        // Skip if exceeded max retries
        if (change.retryCount >= this.maxRetries) {
          ErrorLogger.logError(
            new Error(`Household size change exceeded max retries: ${change.userId}`),
            'ScalingOfflineManager.syncHouseholdSizeChanges',
            { change }
          );
          localStorage.removeItem(key);
          continue;
        }

        // Attempt to sync
        await userPreferencesService.setHouseholdSize(change.userId, change.householdSize);
        
        // Success - remove pending change
        localStorage.removeItem(key);
        
      } catch (error) {
        // Increment retry count
        const changeData = localStorage.getItem(key);
        if (changeData) {
          const change: PendingHouseholdSizeChange = JSON.parse(changeData);
          change.retryCount++;
          localStorage.setItem(key, JSON.stringify(change));
        }
        
        ErrorLogger.logError(
          error as Error,
          'ScalingOfflineManager.syncHouseholdSizeChanges.individual',
          { key }
        );
      }
    }
  }

  /**
   * Sync pending manual overrides
   */
  private async syncManualOverrides(): Promise<void> {
    const keys = Object.keys(localStorage);
    const pendingKeys = keys.filter(key => key.startsWith('pendingOverride_'));

    for (const key of pendingKeys) {
      try {
        const overrideData = localStorage.getItem(key);
        if (!overrideData) continue;

        const override: PendingManualOverride = JSON.parse(overrideData);
        
        // Skip if exceeded max retries
        if (override.retryCount >= this.maxRetries) {
          ErrorLogger.logError(
            new Error(`Manual override exceeded max retries: ${override.mealPlanId}/${override.recipeId}`),
            'ScalingOfflineManager.syncManualOverrides',
            { override }
          );
          localStorage.removeItem(key);
          continue;
        }

        // Attempt to sync
        if (override.servings !== null) {
          await extendedMealPlanService.setManualServingOverride(
            override.mealPlanId,
            override.recipeId,
            override.servings
          );
        } else {
          await extendedMealPlanService.removeManualServingOverride(
            override.mealPlanId,
            override.recipeId
          );
        }
        
        // Success - remove pending change
        localStorage.removeItem(key);
        
      } catch (error) {
        // Increment retry count
        const overrideData = localStorage.getItem(key);
        if (overrideData) {
          const override: PendingManualOverride = JSON.parse(overrideData);
          override.retryCount++;
          localStorage.setItem(key, JSON.stringify(override));
        }
        
        ErrorLogger.logError(
          error as Error,
          'ScalingOfflineManager.syncManualOverrides.individual',
          { key }
        );
      }
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): OfflineSyncStatus {
    const pendingChanges = this.getPendingChangesCount();
    
    let lastSyncAttempt: Date | undefined;
    let lastSuccessfulSync: Date | undefined;
    
    try {
      const lastAttempt = localStorage.getItem('lastScalingSyncAttempt');
      if (lastAttempt) {
        lastSyncAttempt = new Date(lastAttempt);
      }
      
      const lastSuccess = localStorage.getItem('lastScalingSync');
      if (lastSuccess) {
        lastSuccessfulSync = new Date(lastSuccess);
      }
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.getSyncStatus'
      );
    }

    return {
      isOnline: this.onlineStatus,
      pendingChanges,
      lastSyncAttempt,
      lastSuccessfulSync,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Get count of pending changes
   */
  private getPendingChangesCount(): number {
    try {
      const keys = Object.keys(localStorage);
      const pendingHouseholdChanges = keys.filter(key => key.startsWith('pendingHouseholdSize_')).length;
      const pendingOverrides = keys.filter(key => key.startsWith('pendingOverride_')).length;
      return pendingHouseholdChanges + pendingOverrides;
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.getPendingChangesCount'
      );
      return 0;
    }
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: OfflineSyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncListener(listener: (status: OfflineSyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        ErrorLogger.logError(
          error as Error,
          'ScalingOfflineManager.notifyStatusChange'
        );
      }
    });
  }

  /**
   * Force sync attempt (for manual triggers)
   */
  async forceSyncAttempt(): Promise<void> {
    if (!this.onlineStatus) {
      throw new ScalingError(
        'Cannot sync while offline',
        ERROR_CODES.NETWORK_ERROR,
        'sync',
        true,
        'You are currently offline. Changes will sync when connection is restored.'
      );
    }

    await this.syncPendingChanges();
  }

  /**
   * Clear all cached data (for logout or reset)
   */
  clearAllCachedData(): void {
    try {
      const keys = Object.keys(localStorage);
      const scalingKeys = keys.filter(key => 
        key.startsWith('pendingHouseholdSize_') ||
        key.startsWith('cachedHouseholdSize_') ||
        key.startsWith('pendingOverride_') ||
        key.startsWith('cachedOverride_') ||
        key === 'lastScalingSync' ||
        key === 'lastScalingSyncAttempt'
      );

      scalingKeys.forEach(key => localStorage.removeItem(key));
      this.notifyStatusChange();
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'ScalingOfflineManager.clearAllCachedData'
      );
    }
  }
}

// Export singleton instance
export const scalingOfflineManager = ScalingOfflineManager.getInstance();