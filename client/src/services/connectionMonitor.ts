/**
 * Connection Monitor for tracking network connectivity and managing sync triggers
 */

import { ConnectionState, SyncStatus } from '../types/OfflineStorage.types';
import { pwaManager } from './pwaManager';
// Remove circular dependency - import syncQueueManager lazily when needed

class ConnectionMonitor {
  private connectionState: ConnectionState = {
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    lastOnline: new Date()
  };

  private syncStatus: SyncStatus = {
    isActive: false,
    pendingOperations: 0,
    lastSync: new Date(0),
    errors: []
  };

  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Initialize connection monitoring
   */
  initialize(): void {
    // Set up online/offline event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Set up connection change detection
    this.setupConnectionChangeDetection();

    // Update initial connection type
    this.updateConnectionType();

    // Set up periodic sync status updates
    this.setupPeriodicUpdates();

    // Listen to sync queue manager status changes
    this.setupSyncQueueListeners();

    console.log('[ConnectionMonitor] Initialized with state:', this.connectionState);
  }

  /**
   * Set up connection change detection using Network Information API
   */
  private setupConnectionChangeDetection(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        this.updateConnectionType();
        this.notifyConnectionChange();
      });
    }
  }

  /**
   * Set up periodic updates for sync status
   */
  private setupPeriodicUpdates(): void {
    // Update pending operations count every 30 seconds
    setInterval(async () => {
      await this.updatePendingSyncCount();
    }, 30000);

    // Initial update
    this.updatePendingSyncCount();
  }

  /**
   * Set up sync queue manager listeners
   */
  private setupSyncQueueListeners(): void {
    // Listen to sync status changes from sync queue manager (lazy import to avoid circular dependency)
    import('./syncQueueManager').then(({ syncQueueManager }) => {
      syncQueueManager.addSyncStatusListener((status) => {
        this.syncStatus.isActive = status.isActive;
        this.syncStatus.pendingOperations = status.pendingOperations;
        this.syncStatus.lastSync = status.lastSync;
        this.syncStatus.errors = status.errors;
        this.notifySyncStatusChange();
      });
    }).catch(error => {
      console.error('[ConnectionMonitor] Failed to setup sync queue listeners:', error);
    });
  }

  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    console.log('[ConnectionMonitor] Connection restored');
    
    this.connectionState.isOnline = true;
    this.connectionState.lastOnline = new Date();
    this.updateConnectionType();

    // Trigger background sync when coming online
    await this.triggerBackgroundSync();

    // Notify listeners
    this.notifyConnectionChange();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('[ConnectionMonitor] Connection lost');
    
    this.connectionState.isOnline = false;
    this.updateConnectionType();

    // Notify listeners
    this.notifyConnectionChange();
  }

  /**
   * Update connection type
   */
  private updateConnectionType(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      if (connection.type === 'wifi') {
        this.connectionState.connectionType = 'wifi';
      } else if (connection.type === 'cellular') {
        this.connectionState.connectionType = 'cellular';
      } else {
        this.connectionState.connectionType = 'unknown';
      }
    } else {
      this.connectionState.connectionType = 'unknown';
    }
  }

  /**
   * Trigger background sync
   */
  private async triggerBackgroundSync(): Promise<void> {
    try {
      await pwaManager.registerBackgroundSync('shopping-list-sync');
      console.log('[ConnectionMonitor] Background sync triggered');
    } catch (error) {
      console.error('[ConnectionMonitor] Failed to trigger background sync:', error);
      
      // Fallback to manual sync
      await this.triggerManualSync();
    }
  }

  /**
   * Trigger manual sync using sync queue manager
   */
  async triggerManualSync(): Promise<void> {
    if (this.syncStatus.isActive) {
      console.log('[ConnectionMonitor] Sync already in progress');
      return;
    }

    try {
      console.log('[ConnectionMonitor] Starting manual sync...');

      // Use sync queue manager to process the queue (lazy import to avoid circular dependency)
      const { syncQueueManager } = await import('./syncQueueManager');
      const result = await syncQueueManager.processQueue();
      
      console.log(`[ConnectionMonitor] Sync completed: ${result.successfulOperations}/${result.totalOperations} successful`);
      
      if (result.conflicts > 0) {
        console.warn(`[ConnectionMonitor] ${result.conflicts} conflicts detected during sync`);
      }

      // Update sync status
      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingOperations = await this.getPendingSyncCount();
      this.syncStatus.errors = result.results
        .filter(r => !r.success)
        .map(r => r.error?.message || 'Unknown error')
        .slice(0, 5); // Keep only last 5 errors

      this.notifySyncStatusChange();

    } catch (error) {
      console.error('[ConnectionMonitor] Manual sync failed:', error);
      this.syncStatus.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      this.notifySyncStatusChange();
    }
  }

  /**
   * Update pending sync count
   */
  private async updatePendingSyncCount(): Promise<void> {
    const count = await this.getPendingSyncCount();
    if (count !== this.syncStatus.pendingOperations) {
      this.syncStatus.pendingOperations = count;
      this.notifySyncStatusChange();
    }
  }

  /**
   * Register connection change listener
   */
  onConnectionChange(callback: (isOnline: boolean) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove connection change listener
   */
  offConnectionChange(callback: (isOnline: boolean) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Register sync status change listener
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this.syncListeners.add(callback);
  }

  /**
   * Remove sync status change listener
   */
  offSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this.syncListeners.delete(callback);
  }

  /**
   * Notify connection change listeners
   */
  private notifyConnectionChange(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.connectionState.isOnline);
      } catch (error) {
        console.error('[ConnectionMonitor] Error in connection change callback:', error);
      }
    });
  }

  /**
   * Notify sync status change listeners
   */
  private notifySyncStatusChange(): void {
    this.syncListeners.forEach(callback => {
      try {
        callback({ ...this.syncStatus });
      } catch (error) {
        console.error('[ConnectionMonitor] Error in sync status change callback:', error);
      }
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if online
   */
  get isOnline(): boolean {
    return this.connectionState.isOnline;
  }

  /**
   * Get connection type
   */
  get connectionType(): 'wifi' | 'cellular' | 'unknown' {
    return this.connectionState.connectionType;
  }

  /**
   * Get pending sync count from sync queue manager
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      const { syncQueueManager } = await import('./syncQueueManager');
      const status = await syncQueueManager.getSyncStatus();
      return status.pendingOperations;
    } catch (error) {
      console.error('[ConnectionMonitor] Failed to get pending sync count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();
export default connectionMonitor;