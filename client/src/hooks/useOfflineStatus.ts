import { useState, useEffect, useCallback } from 'react';
import { connectionMonitor } from '../services/connectionMonitor';
// Remove direct import to avoid circular dependency - use lazy import
import { ConnectionState, SyncStatus } from '../types/OfflineStorage.types';

interface OfflineStatusHook {
  // Connection state
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
  lastOnline: Date;
  
  // Sync state
  isActive: boolean;
  pendingOperations: number;
  lastSync: Date;
  errors: string[];
  
  // Actions
  triggerManualSync: () => Promise<void>;
  
  // Combined state
  connectionState: ConnectionState;
  syncStatus: SyncStatus;
}

export const useOfflineStatus = (): OfflineStatusHook => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    lastOnline: new Date()
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    pendingOperations: 0,
    lastSync: new Date(0),
    errors: []
  });

  // Handle connection state changes
  const handleConnectionChange = useCallback(() => {
    const newState = connectionMonitor.getConnectionState();
    setConnectionState(newState);
  }, []);

  // Handle sync status changes
  const handleSyncStatusChange = useCallback((status: SyncStatus) => {
    setSyncStatus(status);
  }, []);

  // Manual sync trigger
  const triggerManualSync = useCallback(async () => {
    try {
      await connectionMonitor.triggerManualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    // Initialize connection monitor if not already done
    connectionMonitor.initialize();

    // Get initial states
    setConnectionState(connectionMonitor.getConnectionState());
    
    // Get initial sync status (lazy import to avoid circular dependency)
    import('../services/syncQueueManager').then(({ syncQueueManager }) => {
      return syncQueueManager.getSyncStatus();
    }).then(status => {
      setSyncStatus(status);
    }).catch(error => {
      console.error('Failed to get initial sync status:', error);
    });

    // Set up listeners
    connectionMonitor.onConnectionChange(handleConnectionChange);
    connectionMonitor.onSyncStatusChange(handleSyncStatusChange);

    // Cleanup listeners on unmount
    return () => {
      connectionMonitor.offConnectionChange(handleConnectionChange);
      connectionMonitor.offSyncStatusChange(handleSyncStatusChange);
    };
  }, [handleConnectionChange, handleSyncStatusChange]);

  return {
    // Connection state
    isOnline: connectionState.isOnline,
    connectionType: connectionState.connectionType,
    lastOnline: connectionState.lastOnline,
    
    // Sync state
    isActive: syncStatus.isActive,
    pendingOperations: syncStatus.pendingOperations,
    lastSync: syncStatus.lastSync,
    errors: syncStatus.errors,
    
    // Actions
    triggerManualSync,
    
    // Combined state
    connectionState,
    syncStatus
  };
};

export default useOfflineStatus;