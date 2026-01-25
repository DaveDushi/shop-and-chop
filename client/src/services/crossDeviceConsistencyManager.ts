/**
 * Cross-Device Data Consistency Manager
 * Handles device-specific storage with global consistency, new device shopping list download,
 * and cross-device change propagation for PWA offline shopping lists
 * 
 * Features:
 * - Device-specific storage with global consistency
 * - New device shopping list download and caching
 * - Cross-device change propagation
 * - Device registration and management
 * - Conflict detection for simultaneous offline edits
 * - Intelligent sync strategies for multi-device scenarios
 */

import {
  OfflineShoppingListEntry,
  ShoppingListMetadata,
  SyncOperation,
  OfflineStorageError,
  SyncStatus
} from '../types/OfflineStorage.types';
import { offlineStorageManager } from './offlineStorageManager';
import { dataSyncManager } from './dataSyncManager';
import { connectionMonitor } from './connectionMonitor';
import { multiDeviceConflictResolver } from './multiDeviceConflictResolver';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  userAgent: string;
  lastSeen: Date;
  isCurrentDevice: boolean;
}

interface CrossDeviceConfig {
  deviceSyncInterval: number; // milliseconds
  maxDevicesPerUser: number;
  deviceCacheRetentionDays: number;
  enableRealTimeSync: boolean;
  conflictResolutionStrategy: 'timestamp' | 'device-priority' | 'manual';
  syncBatchSize: number;
}

interface DeviceSyncStatus {
  deviceId: string;
  lastSyncTime: Date;
  pendingOperations: number;
  syncErrors: string[];
  isOnline: boolean;
}

interface CrossDeviceSyncResult {
  success: boolean;
  devicesUpdated: number;
  conflictsDetected: number;
  errors: string[];
  timestamp: Date;
}

interface DeviceConflict {
  shoppingListId: string;
  conflictingDevices: string[];
  localData: OfflineShoppingListEntry;
  remoteData: OfflineShoppingListEntry[];
  conflictType: 'simultaneous-edit' | 'version-mismatch' | 'timestamp-conflict';
  resolutionRequired: boolean;
}

export class CrossDeviceConsistencyManager {
  private config: CrossDeviceConfig = {
    deviceSyncInterval: 2 * 60 * 1000, // 2 minutes
    maxDevicesPerUser: 5,
    deviceCacheRetentionDays: 30,
    enableRealTimeSync: true,
    conflictResolutionStrategy: 'timestamp',
    syncBatchSize: 10
  };

  private currentDevice: DeviceInfo;
  private registeredDevices: Map<string, DeviceInfo> = new Map();
  private deviceSyncTimer: NodeJS.Timeout | null = null;
  private syncListeners: Array<(result: CrossDeviceSyncResult) => void> = [];
  private conflictListeners: Array<(conflict: DeviceConflict) => void> = [];
  private isInitialized = false;

  constructor(config?: Partial<CrossDeviceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.currentDevice = this.generateDeviceInfo();
  }

  /**
   * Initialize the cross-device consistency manager
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Cross-Device Consistency Manager...');

      // Register current device
      await this.registerCurrentDevice();

      // Load registered devices from storage
      await this.loadRegisteredDevices();

      // Setup sync listeners
      this.setupSyncListeners();

      // Start device sync if enabled
      if (this.config.enableRealTimeSync) {
        this.startDeviceSync();
      }

      // Perform initial sync for new devices
      await this.performInitialDeviceSync();

      this.isInitialized = true;
      console.log('Cross-Device Consistency Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Cross-Device Consistency Manager:', error);
      throw error;
    }
  }

  /**
   * Register current device and store device info
   */
  async registerCurrentDevice(): Promise<void> {
    try {
      // Store device info in local storage and IndexedDB
      await this.storeDeviceInfo(this.currentDevice);
      
      // Register device with server if online
      if (connectionMonitor.isOnline) {
        await this.registerDeviceWithServer(this.currentDevice);
      }

      console.log(`Registered current device: ${this.currentDevice.deviceId}`);
    } catch (error) {
      console.error('Failed to register current device:', error);
      throw error;
    }
  }

  /**
   * Download and cache shopping lists for new device
   */
  async downloadShoppingListsForNewDevice(): Promise<void> {
    if (!connectionMonitor.isOnline) {
      console.log('Cannot download shopping lists: offline');
      return;
    }

    try {
      console.log('Downloading shopping lists for new device...');

      // Get recent shopping lists from server
      const recentLists = await this.fetchRecentShoppingListsFromServer();
      
      if (recentLists.length === 0) {
        console.log('No recent shopping lists found on server');
        return;
      }

      // Cache shopping lists locally
      let cachedCount = 0;
      for (const listData of recentLists) {
        try {
          const entry: OfflineShoppingListEntry = {
            metadata: {
              ...listData.metadata,
              deviceId: this.currentDevice.deviceId,
              syncStatus: 'synced' as const,
              generatedAt: new Date(listData.metadata.generatedAt),
              lastModified: new Date(listData.metadata.lastModified)
            },
            shoppingList: listData.shoppingList
          };

          await offlineStorageManager.storeShoppingList(entry);
          cachedCount++;
        } catch (error) {
          console.error(`Failed to cache shopping list ${listData.metadata.id}:`, error);
        }
      }

      console.log(`Downloaded and cached ${cachedCount} shopping lists for new device`);
    } catch (error) {
      console.error('Failed to download shopping lists for new device:', error);
      throw error;
    }
  }

  /**
   * Propagate changes to other devices
   */
  async propagateChangesToDevices(
    shoppingListId: string,
    changes: any,
    excludeDeviceId?: string
  ): Promise<void> {
    if (!connectionMonitor.isOnline) {
      console.log('Cannot propagate changes: offline');
      return;
    }

    try {
      console.log(`Propagating changes for shopping list ${shoppingListId} to other devices`);

      // Get list of active devices (excluding current device and specified exclusion)
      const targetDevices = Array.from(this.registeredDevices.values())
        .filter(device => 
          !device.isCurrentDevice && 
          device.deviceId !== excludeDeviceId &&
          this.isDeviceActive(device)
        );

      if (targetDevices.length === 0) {
        console.log('No target devices for change propagation');
        return;
      }

      // Send change notifications to server for device propagation
      await this.sendChangeNotificationToServer({
        shoppingListId,
        changes,
        sourceDeviceId: this.currentDevice.deviceId,
        targetDeviceIds: targetDevices.map(d => d.deviceId),
        timestamp: new Date()
      });

      console.log(`Change propagation initiated for ${targetDevices.length} devices`);
    } catch (error) {
      console.error('Failed to propagate changes to devices:', error);
    }
  }

  /**
   * Handle incoming changes from other devices
   */
  async handleIncomingDeviceChanges(changeData: {
    shoppingListId: string;
    changes: any;
    sourceDeviceId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      console.log(`Handling incoming changes from device ${changeData.sourceDeviceId}`);

      const localEntry = await offlineStorageManager.getShoppingList(changeData.shoppingListId);
      
      if (!localEntry) {
        // Shopping list doesn't exist locally, fetch from server
        await this.fetchAndCacheShoppingListFromServer(changeData.shoppingListId);
        return;
      }

      // Check for conflicts
      const conflict = await this.detectDeviceConflict(localEntry, changeData);
      
      if (conflict) {
        await this.handleDeviceConflict(conflict);
      } else {
        // No conflict, apply changes
        await this.applyIncomingChanges(localEntry, changeData.changes);
      }

    } catch (error) {
      console.error('Failed to handle incoming device changes:', error);
    }
  }

  /**
   * Detect conflicts between devices
   */
  async detectDeviceConflict(
    localEntry: OfflineShoppingListEntry,
    incomingChange: {
      shoppingListId: string;
      changes: any;
      sourceDeviceId: string;
      timestamp: Date;
    }
  ): Promise<DeviceConflict | null> {
    try {
      // Check if local entry has pending changes
      if (localEntry.metadata.syncStatus === 'pending') {
        // Check timestamp to determine conflict
        const localModified = localEntry.metadata.lastModified.getTime();
        const incomingModified = incomingChange.timestamp.getTime();
        
        // If changes happened within 30 seconds of each other, consider it a conflict
        if (Math.abs(localModified - incomingModified) < 30000) {
          return {
            shoppingListId: localEntry.metadata.id,
            conflictingDevices: [this.currentDevice.deviceId, incomingChange.sourceDeviceId],
            localData: localEntry,
            remoteData: [incomingChange.changes],
            conflictType: 'simultaneous-edit',
            resolutionRequired: this.config.conflictResolutionStrategy === 'manual'
          };
        }
      }

      // Check version conflicts
      if (incomingChange.changes.metadata?.version && 
          localEntry.metadata.version &&
          incomingChange.changes.metadata.version !== localEntry.metadata.version) {
        return {
          shoppingListId: localEntry.metadata.id,
          conflictingDevices: [this.currentDevice.deviceId, incomingChange.sourceDeviceId],
          localData: localEntry,
          remoteData: [incomingChange.changes],
          conflictType: 'version-mismatch',
          resolutionRequired: this.config.conflictResolutionStrategy === 'manual'
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting device conflict:', error);
      return null;
    }
  }

  /**
   * Handle device conflicts using the multi-device conflict resolver
   */
  async handleDeviceConflict(conflict: DeviceConflict): Promise<void> {
    try {
      console.log(`Handling device conflict for shopping list ${conflict.shoppingListId}`);

      // Convert to multi-device conflict format
      const multiDeviceConflict = {
        id: `conflict_${conflict.shoppingListId}_${Date.now()}`,
        shoppingListId: conflict.shoppingListId,
        conflictType: 'item-state' as const,
        devices: [
          {
            deviceId: this.currentDevice.deviceId,
            deviceName: this.currentDevice.deviceName,
            data: conflict.localData,
            lastModified: conflict.localData.metadata.lastModified,
            changesSince: conflict.localData.metadata.lastModified,
            operationHistory: [] // Would be populated with actual operation history
          },
          ...conflict.remoteData.map((remoteData, index) => ({
            deviceId: conflict.conflictingDevices[index + 1] || `remote_${index}`,
            deviceName: `Remote Device ${index + 1}`,
            data: remoteData,
            lastModified: new Date(remoteData.metadata?.lastModified || Date.now()),
            changesSince: new Date(remoteData.metadata?.lastModified || Date.now()),
            operationHistory: [] // Would be populated with actual operation history
          }))
        ],
        timestamp: new Date(),
        severity: 'medium' as const,
        autoResolvable: this.config.conflictResolutionStrategy !== 'manual',
        context: {
          timeWindow: 30000, // 30 seconds
          affectedItems: [],
          affectedCategories: Object.keys(conflict.localData.shoppingList)
        }
      };

      // Use the multi-device conflict resolver
      const resolution = await multiDeviceConflictResolver.resolveConflict(multiDeviceConflict);
      
      if (resolution.requiresUserConfirmation) {
        // Notify conflict listeners for manual resolution
        this.notifyConflictListeners(conflict);
        return;
      }

      // Apply the resolution
      await offlineStorageManager.updateShoppingList(conflict.shoppingListId, resolution.resolvedData);
      
      // Propagate the resolved data to other devices
      await this.propagateChangesToDevices(
        conflict.shoppingListId,
        resolution.resolvedData
      );

      console.log(`Device conflict resolved using strategy: ${resolution.strategy}`);
    } catch (error) {
      console.error('Failed to handle device conflict:', error);
      
      // Fallback to manual resolution
      this.notifyConflictListeners(conflict);
    }
  }

  /**
   * Auto-resolve device conflicts
   */
  async autoResolveDeviceConflict(conflict: DeviceConflict): Promise<void> {
    try {
      switch (this.config.conflictResolutionStrategy) {
        case 'timestamp':
          await this.resolveConflictByTimestamp(conflict);
          break;
        case 'device-priority':
          await this.resolveConflictByDevicePriority(conflict);
          break;
        default:
          throw new Error(`Unknown conflict resolution strategy: ${this.config.conflictResolutionStrategy}`);
      }
    } catch (error) {
      console.error('Failed to auto-resolve device conflict:', error);
    }
  }

  /**
   * Resolve conflict by timestamp (most recent wins)
   */
  async resolveConflictByTimestamp(conflict: DeviceConflict): Promise<void> {
    const localModified = conflict.localData.metadata.lastModified.getTime();
    const remoteModified = conflict.remoteData[0].metadata?.lastModified 
      ? new Date(conflict.remoteData[0].metadata.lastModified).getTime()
      : 0;

    if (remoteModified > localModified) {
      // Remote data is newer, apply remote changes
      await this.applyIncomingChanges(conflict.localData, conflict.remoteData[0]);
      console.log(`Conflict resolved: applied remote changes (newer timestamp)`);
    } else {
      // Local data is newer or same, keep local and propagate to other devices
      await this.propagateChangesToDevices(
        conflict.shoppingListId,
        conflict.localData,
        conflict.conflictingDevices[1] // Exclude the conflicting device
      );
      console.log(`Conflict resolved: kept local changes (newer timestamp)`);
    }
  }

  /**
   * Resolve conflict by device priority (current device wins)
   */
  async resolveConflictByDevicePriority(conflict: DeviceConflict): Promise<void> {
    // Current device always wins in device-priority strategy
    await this.propagateChangesToDevices(
      conflict.shoppingListId,
      conflict.localData,
      conflict.conflictingDevices[1] // Exclude the conflicting device
    );
    console.log(`Conflict resolved: current device priority`);
  }

  /**
   * Apply incoming changes to local shopping list
   */
  async applyIncomingChanges(localEntry: OfflineShoppingListEntry, changes: any): Promise<void> {
    try {
      // Merge changes intelligently
      const updatedEntry: OfflineShoppingListEntry = {
        ...localEntry,
        ...changes,
        metadata: {
          ...localEntry.metadata,
          ...changes.metadata,
          lastModified: new Date(changes.metadata?.lastModified || Date.now()),
          syncStatus: 'synced' as const,
          version: Math.max(
            localEntry.metadata.version || 0,
            changes.metadata?.version || 0
          ) + 1
        }
      };

      // Update local storage
      await offlineStorageManager.updateShoppingList(localEntry.metadata.id, updatedEntry);
      
      console.log(`Applied incoming changes to shopping list ${localEntry.metadata.id}`);
    } catch (error) {
      console.error('Failed to apply incoming changes:', error);
      throw error;
    }
  }

  /**
   * Perform initial sync for new devices
   */
  async performInitialDeviceSync(): Promise<void> {
    try {
      // Check if this is a new device (no local shopping lists)
      const localLists = await offlineStorageManager.getAllShoppingLists();
      
      if (localLists.length === 0 && connectionMonitor.isOnline) {
        console.log('New device detected, performing initial sync...');
        await this.downloadShoppingListsForNewDevice();
      }
    } catch (error) {
      console.error('Failed to perform initial device sync:', error);
    }
  }

  /**
   * Get cross-device sync status
   */
  async getCrossDeviceSyncStatus(): Promise<{
    currentDevice: DeviceInfo;
    registeredDevices: DeviceInfo[];
    lastSyncTime: Date;
    pendingConflicts: number;
    isOnline: boolean;
  }> {
    try {
      const conflicts = await this.getPendingConflicts();
      
      return {
        currentDevice: this.currentDevice,
        registeredDevices: Array.from(this.registeredDevices.values()),
        lastSyncTime: await this.getLastSyncTime(),
        pendingConflicts: conflicts.length,
        isOnline: connectionMonitor.isOnline
      };
    } catch (error) {
      console.error('Failed to get cross-device sync status:', error);
      return {
        currentDevice: this.currentDevice,
        registeredDevices: [],
        lastSyncTime: new Date(0),
        pendingConflicts: 0,
        isOnline: false
      };
    }
  }

  /**
   * Generate device information
   */
  private generateDeviceInfo(): DeviceInfo {
    const deviceId = this.getOrCreateDeviceId();
    const userAgent = navigator.userAgent;
    
    // Detect device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/Mobile|Android|iPhone/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Generate device name
    const deviceName = this.generateDeviceName(deviceType);

    return {
      deviceId,
      deviceName,
      deviceType,
      userAgent,
      lastSeen: new Date(),
      isCurrentDevice: true
    };
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Generate human-readable device name
   */
  private generateDeviceName(deviceType: string): string {
    const platform = navigator.platform || 'Unknown';
    const timestamp = new Date().toLocaleDateString();
    
    return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} (${platform}) - ${timestamp}`;
  }

  /**
   * Store device info in local storage and IndexedDB
   */
  private async storeDeviceInfo(device: DeviceInfo): Promise<void> {
    try {
      // Store in localStorage for quick access
      localStorage.setItem('currentDeviceInfo', JSON.stringify(device));
      
      // Store in IndexedDB for persistence
      await this.storeDeviceInfoInDB(device);
    } catch (error) {
      console.error('Failed to store device info:', error);
    }
  }

  /**
   * Store device info in IndexedDB
   */
  private async storeDeviceInfoInDB(device: DeviceInfo): Promise<void> {
    // This would use the metadata store in IndexedDB
    // Implementation would depend on the offlineStorageManager's metadata store
    console.log('Storing device info in IndexedDB:', device.deviceId);
  }

  /**
   * Load registered devices from storage
   */
  private async loadRegisteredDevices(): Promise<void> {
    try {
      // Load from server if online
      if (connectionMonitor.isOnline) {
        const serverDevices = await this.fetchRegisteredDevicesFromServer();
        serverDevices.forEach(device => {
          this.registeredDevices.set(device.deviceId, device);
        });
      }
      
      // Add current device to registered devices
      this.registeredDevices.set(this.currentDevice.deviceId, this.currentDevice);
    } catch (error) {
      console.error('Failed to load registered devices:', error);
    }
  }

  /**
   * Setup sync listeners
   */
  private setupSyncListeners(): void {
    // Listen for network state changes
    connectionMonitor.onConnectionChange((isOnline) => {
      if (isOnline) {
        console.log('Network restored, triggering cross-device sync');
        this.performCrossDeviceSync().catch(error => {
          console.error('Failed to perform cross-device sync:', error);
        });
      }
    });

    // Listen for data sync events
    dataSyncManager.addSyncListener((result) => {
      if (result.success) {
        // Propagate successful syncs to other devices
        this.handleSuccessfulSync(result);
      }
    });
  }

  /**
   * Start device sync timer
   */
  private startDeviceSync(): void {
    if (this.deviceSyncTimer) {
      clearInterval(this.deviceSyncTimer);
    }

    this.deviceSyncTimer = setInterval(() => {
      if (connectionMonitor.isOnline) {
        this.performCrossDeviceSync().catch(error => {
          console.error('Periodic cross-device sync failed:', error);
        });
      }
    }, this.config.deviceSyncInterval);
  }

  /**
   * Stop device sync timer
   */
  private stopDeviceSync(): void {
    if (this.deviceSyncTimer) {
      clearInterval(this.deviceSyncTimer);
      this.deviceSyncTimer = null;
    }
  }

  /**
   * Perform cross-device synchronization
   */
  private async performCrossDeviceSync(): Promise<CrossDeviceSyncResult> {
    const result: CrossDeviceSyncResult = {
      success: true,
      devicesUpdated: 0,
      conflictsDetected: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      // Update device registry
      await this.updateDeviceRegistry();

      // Check for changes from other devices
      const deviceChanges = await this.fetchDeviceChangesFromServer();
      
      for (const change of deviceChanges) {
        try {
          await this.handleIncomingDeviceChanges(change);
          result.devicesUpdated++;
        } catch (error) {
          result.errors.push(`Failed to handle change from ${change.sourceDeviceId}: ${error.message}`);
          result.success = false;
        }
      }

      // Propagate local changes to other devices
      await this.propagateLocalChanges();

    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
    }

    this.notifySyncListeners(result);
    return result;
  }

  /**
   * Check if device is active (seen recently)
   */
  private isDeviceActive(device: DeviceInfo): boolean {
    const now = new Date();
    const daysSinceLastSeen = (now.getTime() - device.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastSeen <= this.config.deviceCacheRetentionDays;
  }

  /**
   * Handle successful sync events
   */
  private handleSuccessfulSync(result: any): void {
    // This could trigger additional cross-device propagation
    console.log('Handling successful sync for cross-device propagation');
  }

  /**
   * Server communication methods (stubs for now)
   */
  private async registerDeviceWithServer(device: DeviceInfo): Promise<void> {
    // Implementation would make API call to register device
    console.log('Registering device with server:', device.deviceId);
  }

  private async fetchRecentShoppingListsFromServer(): Promise<any[]> {
    // Implementation would fetch recent shopping lists from server
    console.log('Fetching recent shopping lists from server');
    return [];
  }

  private async sendChangeNotificationToServer(notification: any): Promise<void> {
    // Implementation would send change notification to server
    console.log('Sending change notification to server');
  }

  private async fetchAndCacheShoppingListFromServer(shoppingListId: string): Promise<void> {
    // Implementation would fetch specific shopping list from server
    console.log('Fetching shopping list from server:', shoppingListId);
  }

  private async fetchRegisteredDevicesFromServer(): Promise<DeviceInfo[]> {
    // Implementation would fetch registered devices from server
    console.log('Fetching registered devices from server');
    return [];
  }

  private async updateDeviceRegistry(): Promise<void> {
    // Implementation would update device registry with server
    console.log('Updating device registry');
  }

  private async fetchDeviceChangesFromServer(): Promise<any[]> {
    // Implementation would fetch changes from other devices
    console.log('Fetching device changes from server');
    return [];
  }

  private async propagateLocalChanges(): Promise<void> {
    // Implementation would propagate local changes to server
    console.log('Propagating local changes to server');
  }

  private async getPendingConflicts(): Promise<DeviceConflict[]> {
    // Implementation would get pending conflicts
    return [];
  }

  private async getLastSyncTime(): Promise<Date> {
    // Implementation would get last sync time
    return new Date();
  }

  /**
   * Listener management
   */
  addSyncListener(listener: (result: CrossDeviceSyncResult) => void): void {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (result: CrossDeviceSyncResult) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  addConflictListener(listener: (conflict: DeviceConflict) => void): void {
    this.conflictListeners.push(listener);
  }

  removeConflictListener(listener: (conflict: DeviceConflict) => void): void {
    const index = this.conflictListeners.indexOf(listener);
    if (index > -1) {
      this.conflictListeners.splice(index, 1);
    }
  }

  private notifySyncListeners(result: CrossDeviceSyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  private notifyConflictListeners(conflict: DeviceConflict): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Conflict listener error:', error);
      }
    });
  }

  /**
   * Configuration and cleanup
   */
  configure(config: Partial<CrossDeviceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart device sync if interval changed
    if (config.deviceSyncInterval && this.config.enableRealTimeSync) {
      this.startDeviceSync();
    }
  }

  destroy(): void {
    this.stopDeviceSync();
    this.syncListeners.length = 0;
    this.conflictListeners.length = 0;
    this.registeredDevices.clear();
  }
}

// Export singleton instance
export const crossDeviceConsistencyManager = new CrossDeviceConsistencyManager();
export default crossDeviceConsistencyManager;