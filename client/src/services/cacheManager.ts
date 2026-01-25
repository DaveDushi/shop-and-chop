/**
 * Cache Manager Service
 * Provides interface for managing service worker caches and storage
 */

export interface CacheStatistics {
  caches: {
    [key: string]: {
      name: string;
      entries: number;
      maxEntries: number;
      estimatedSize: number;
      expiredEntries: number;
      maxAge: number;
      utilizationPercentage: number;
    };
  };
  totalSize: number;
  totalEntries: number;
  storageQuota: {
    usage: number;
    quota: number;
    percentage: number;
  } | null;
}

export interface CacheStatus {
  [key: string]: {
    name: string;
    entries: number;
    maxEntries: number;
    maxAge: number;
  };
}

export interface StorageStatus {
  usage: number;
  quota: number;
  percentage: number;
}

export class CacheManager {
  private serviceWorker: ServiceWorker | null = null;

  constructor() {
    this.initializeServiceWorker();
  }

  /**
   * Initialize service worker connection
   */
  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.serviceWorker = registration.active;
        
        // Listen for storage status updates
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      } catch (error) {
        console.error('[CacheManager] Failed to initialize service worker:', error);
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'STORAGE_STATUS':
        this.onStorageStatusUpdate(payload);
        break;
      case 'SYNC_COMPLETE':
        this.onSyncComplete(payload);
        break;
      case 'SYNC_ERROR':
        this.onSyncError(payload);
        break;
      default:
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Send message to service worker and wait for response
   */
  private async sendMessageToServiceWorker(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serviceWorker) {
        reject(new Error('Service worker not available'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      // Handle errors by rejecting the promise after timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000); // 10 second timeout

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        resolve(event.data);
      };

      this.serviceWorker.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Get current cache status
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_CACHE_STATUS'
      });
      return response.status || {};
    } catch (error) {
      console.error('[CacheManager] Failed to get cache status:', error);
      return {};
    }
  }

  /**
   * Get detailed cache statistics
   */
  async getCacheStatistics(): Promise<CacheStatistics | null> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_CACHE_STATISTICS'
      });
      return response.statistics || null;
    } catch (error) {
      console.error('[CacheManager] Failed to get cache statistics:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<boolean> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'CLEAR_CACHE'
      });
      return response.success || false;
    } catch (error) {
      console.error('[CacheManager] Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Force update all caches
   */
  async forceUpdateCaches(): Promise<boolean> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'FORCE_UPDATE'
      });
      return response.success || false;
    } catch (error) {
      console.error('[CacheManager] Failed to force update caches:', error);
      return false;
    }
  }

  /**
   * Trigger cache cleanup
   */
  async cleanupCache(aggressive: boolean = false): Promise<boolean> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'CLEANUP_CACHE',
        payload: { aggressive }
      });
      return response.success || false;
    } catch (error) {
      console.error('[CacheManager] Failed to cleanup cache:', error);
      return false;
    }
  }

  /**
   * Monitor storage quota
   */
  async monitorStorage(): Promise<boolean> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'MONITOR_STORAGE'
      });
      return response.success || false;
    } catch (error) {
      console.error('[CacheManager] Failed to monitor storage:', error);
      return false;
    }
  }

  /**
   * Get service worker version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_VERSION'
      });
      return response.version || 'unknown';
    } catch (error) {
      console.error('[CacheManager] Failed to get version:', error);
      return 'unknown';
    }
  }

  /**
   * Check if storage quota is approaching limits
   */
  async isStorageQuotaHigh(): Promise<boolean> {
    try {
      const statistics = await this.getCacheStatistics();
      if (statistics?.storageQuota) {
        return statistics.storageQuota.percentage > 80;
      }
      return false;
    } catch (error) {
      console.error('[CacheManager] Failed to check storage quota:', error);
      return false;
    }
  }

  /**
   * Get storage usage summary
   */
  async getStorageUsageSummary(): Promise<{
    totalCacheSize: number;
    totalCacheEntries: number;
    storagePercentage: number;
    recommendCleanup: boolean;
  }> {
    try {
      const statistics = await this.getCacheStatistics();
      
      if (!statistics) {
        return {
          totalCacheSize: 0,
          totalCacheEntries: 0,
          storagePercentage: 0,
          recommendCleanup: false
        };
      }

      const storagePercentage = statistics.storageQuota?.percentage || 0;
      const recommendCleanup = storagePercentage > 60;

      return {
        totalCacheSize: statistics.totalSize,
        totalCacheEntries: statistics.totalEntries,
        storagePercentage,
        recommendCleanup
      };
    } catch (error) {
      console.error('[CacheManager] Failed to get storage usage summary:', error);
      return {
        totalCacheSize: 0,
        totalCacheEntries: 0,
        storagePercentage: 0,
        recommendCleanup: false
      };
    }
  }

  /**
   * Event handlers for service worker messages
   */
  private onStorageStatusUpdate(payload: StorageStatus): void {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('storage-status-update', {
      detail: payload
    }));

    // Log warning if storage is getting full
    if (payload.percentage > 80) {
      console.warn('[CacheManager] Storage quota is high:', Math.round(payload.percentage) + '%');
    }
  }

  private onSyncComplete(payload: any): void {
    console.log('[CacheManager] Background sync completed:', payload);
    
    // Emit custom event
    window.dispatchEvent(new CustomEvent('sync-complete', {
      detail: payload
    }));
  }

  private onSyncError(payload: any): void {
    console.error('[CacheManager] Background sync error:', payload);
    
    // Emit custom event
    window.dispatchEvent(new CustomEvent('sync-error', {
      detail: payload
    }));
  }

  /**
   * Add event listener for cache manager events
   */
  addEventListener(eventType: 'storage-status-update' | 'sync-complete' | 'sync-error', handler: (event: CustomEvent) => void): void {
    window.addEventListener(eventType, handler as EventListener);
  }

  /**
   * Remove event listener for cache manager events
   */
  removeEventListener(eventType: 'storage-status-update' | 'sync-complete' | 'sync-error', handler: (event: CustomEvent) => void): void {
    window.removeEventListener(eventType, handler as EventListener);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();