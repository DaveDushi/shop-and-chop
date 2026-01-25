/**
 * Standalone Storage Quota Manager for testing
 */

import {
  OfflineShoppingListEntry,
  StorageUsage
} from '../types/OfflineStorage.types';

// Storage quota configuration
export interface StorageQuotaConfig {
  warningThreshold: number;
  criticalThreshold: number;
  cleanupThreshold: number;
  targetUsageAfterCleanup: number;
  enableAutoCleanup: boolean;
  cleanupInterval: number;
  preserveCurrentWeekLists: boolean;
  preserveSyncPendingLists: boolean;
  maxCacheAge: number;
  deviceInactivityThreshold: number;
}

// Storage alert information
export interface StorageAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  currentUsage: number;
  threshold: number;
  recommendedAction: string;
  timestamp: Date;
}

// Cleanup result information
export interface CleanupResult {
  success: boolean;
  bytesFreed: number;
  itemsRemoved: number;
  strategiesApplied: string[];
  errors: string[];
  newUsagePercentage: number;
}

// Default configuration
const DEFAULT_CONFIG: StorageQuotaConfig = {
  warningThreshold: 75,
  criticalThreshold: 90,
  cleanupThreshold: 85,
  targetUsageAfterCleanup: 60,
  enableAutoCleanup: true,
  cleanupInterval: 60,
  preserveCurrentWeekLists: true,
  preserveSyncPendingLists: true,
  maxCacheAge: 30,
  deviceInactivityThreshold: 7
};

export class StorageQuotaManager {
  private config: StorageQuotaConfig;
  private alertCallbacks: ((alert: StorageAlert) => void)[] = [];

  constructor(config: Partial<StorageQuotaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current storage usage information
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;

        return {
          used,
          available,
          percentage
        };
      } else {
        // Fallback for browsers without storage API
        return {
          used: 0,
          available: 50 * 1024 * 1024, // 50MB default estimate
          percentage: 0
        };
      }
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        used: 0,
        available: 0,
        percentage: 0
      };
    }
  }

  /**
   * Check storage quota and trigger alerts if necessary
   */
  async checkStorageQuota(): Promise<StorageAlert | null> {
    try {
      const usage = await this.getStorageUsage();
      
      if (usage.percentage >= this.config.criticalThreshold) {
        const alert: StorageAlert = {
          level: 'critical',
          message: `Storage usage is critically high (${usage.percentage.toFixed(1)}%). Immediate cleanup required.`,
          currentUsage: usage.percentage,
          threshold: this.config.criticalThreshold,
          recommendedAction: 'Run immediate cleanup or manually delete old data',
          timestamp: new Date()
        };
        this.triggerAlert(alert);
        return alert;
      } else if (usage.percentage >= this.config.warningThreshold) {
        const alert: StorageAlert = {
          level: 'warning',
          message: `Storage usage is high (${usage.percentage.toFixed(1)}%). Consider cleaning up old data.`,
          currentUsage: usage.percentage,
          threshold: this.config.warningThreshold,
          recommendedAction: 'Schedule cleanup or review storage settings',
          timestamp: new Date()
        };
        this.triggerAlert(alert);
        return alert;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return null;
    }
  }

  /**
   * Perform basic cleanup (simplified for testing)
   */
  async performCleanup(forceCleanup: boolean = false): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: false,
      bytesFreed: 0,
      itemsRemoved: 0,
      strategiesApplied: [],
      errors: [],
      newUsagePercentage: 0
    };

    try {
      const initialUsage = await this.getStorageUsage();
      
      // Check if cleanup is needed
      if (!forceCleanup && initialUsage.percentage < this.config.cleanupThreshold) {
        result.success = true;
        result.newUsagePercentage = initialUsage.percentage;
        return result;
      }

      // Simulate cleanup
      result.success = true;
      result.strategiesApplied = ['basic-cleanup'];
      result.newUsagePercentage = Math.max(0, initialUsage.percentage - 10);

      return result;
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageQuotaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<StorageQuotaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Register callback for storage alerts
   */
  onStorageAlert(callback: (alert: StorageAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove storage alert callback
   */
  removeStorageAlertCallback(callback: (alert: StorageAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger storage alert to registered callbacks
   */
  private triggerAlert(alert: StorageAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    });
  }
}

// Export singleton instance and class
export const storageQuotaManager = new StorageQuotaManager();