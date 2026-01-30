/**
 * React hook for managing scaling offline sync status
 * Provides real-time sync status and manual sync controls
 */

import { useState, useEffect, useCallback } from 'react';
import { scalingOfflineManager, OfflineSyncStatus } from '../services/scalingOfflineManager';
import { ErrorLogger } from '../utils/errorHandling';

export interface UseScalingOfflineSyncReturn {
  syncStatus: OfflineSyncStatus;
  isOnline: boolean;
  hasPendingChanges: boolean;
  syncInProgress: boolean;
  forceSyncAttempt: () => Promise<void>;
  clearAllCachedData: () => void;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
}

/**
 * Hook for managing scaling offline sync
 */
export const useScalingOfflineSync = (): UseScalingOfflineSyncReturn => {
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>(
    scalingOfflineManager.getSyncStatus()
  );

  // Update sync status when it changes
  useEffect(() => {
    const handleSyncStatusChange = (status: OfflineSyncStatus) => {
      setSyncStatus(status);
    };

    scalingOfflineManager.addSyncListener(handleSyncStatusChange);

    // Get initial status
    setSyncStatus(scalingOfflineManager.getSyncStatus());

    return () => {
      scalingOfflineManager.removeSyncListener(handleSyncStatusChange);
    };
  }, []);

  // Force sync attempt
  const forceSyncAttempt = useCallback(async () => {
    try {
      await scalingOfflineManager.forceSyncAttempt();
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'useScalingOfflineSync.forceSyncAttempt'
      );
      throw error;
    }
  }, []);

  // Clear all cached data
  const clearAllCachedData = useCallback(() => {
    try {
      scalingOfflineManager.clearAllCachedData();
    } catch (error) {
      ErrorLogger.logError(
        error as Error,
        'useScalingOfflineSync.clearAllCachedData'
      );
    }
  }, []);

  return {
    syncStatus,
    isOnline: syncStatus.isOnline,
    hasPendingChanges: syncStatus.pendingChanges > 0,
    syncInProgress: syncStatus.syncInProgress,
    forceSyncAttempt,
    clearAllCachedData,
    lastSyncAttempt: syncStatus.lastSyncAttempt,
    lastSuccessfulSync: syncStatus.lastSuccessfulSync
  };
};

/**
 * Hook for displaying sync status in UI components
 */
export const useScalingSyncStatusDisplay = () => {
  const {
    isOnline,
    hasPendingChanges,
    syncInProgress,
    syncStatus,
    forceSyncAttempt
  } = useScalingOfflineSync();

  const getSyncStatusText = useCallback(() => {
    if (!isOnline) {
      return hasPendingChanges 
        ? `Offline - ${syncStatus.pendingChanges} changes pending`
        : 'Offline';
    }

    if (syncInProgress) {
      return 'Syncing changes...';
    }

    if (hasPendingChanges) {
      return `${syncStatus.pendingChanges} changes pending sync`;
    }

    return 'All changes synced';
  }, [isOnline, hasPendingChanges, syncInProgress, syncStatus.pendingChanges]);

  const getSyncStatusColor = useCallback(() => {
    if (!isOnline) {
      return hasPendingChanges ? 'text-orange-600' : 'text-gray-500';
    }

    if (syncInProgress) {
      return 'text-blue-600';
    }

    if (hasPendingChanges) {
      return 'text-yellow-600';
    }

    return 'text-green-600';
  }, [isOnline, hasPendingChanges, syncInProgress]);

  const canManualSync = useCallback(() => {
    return isOnline && hasPendingChanges && !syncInProgress;
  }, [isOnline, hasPendingChanges, syncInProgress]);

  return {
    syncStatusText: getSyncStatusText(),
    syncStatusColor: getSyncStatusColor(),
    canManualSync: canManualSync(),
    forceSyncAttempt,
    syncStatus
  };
};