/**
 * React hook for cache management functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheManager, CacheStatistics, CacheStatus, StorageStatus } from '../services/cacheManager';

export interface CacheManagerState {
  statistics: CacheStatistics | null;
  status: CacheStatus;
  storageStatus: StorageStatus | null;
  isLoading: boolean;
  error: string | null;
}

export interface CacheManagerActions {
  refreshStatistics: () => Promise<void>;
  clearAllCaches: () => Promise<boolean>;
  forceUpdateCaches: () => Promise<boolean>;
  cleanupCache: (aggressive?: boolean) => Promise<boolean>;
  monitorStorage: () => Promise<boolean>;
  getVersion: () => Promise<string>;
}

export function useCacheManager(): CacheManagerState & CacheManagerActions {
  const [state, setState] = useState<CacheManagerState>({
    statistics: null,
    status: {},
    storageStatus: null,
    isLoading: true,
    error: null
  });

  /**
   * Refresh cache statistics and status
   */
  const refreshStatistics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [statistics, status] = await Promise.all([
        cacheManager.getCacheStatistics(),
        cacheManager.getCacheStatus()
      ]);

      setState(prev => ({
        ...prev,
        statistics,
        status,
        storageStatus: statistics?.storageQuota || null,
        isLoading: false
      }));
    } catch (error) {
      console.error('[useCacheManager] Failed to refresh statistics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh cache statistics',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Clear all caches
   */
  const clearAllCaches = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await cacheManager.clearAllCaches();
      
      if (success) {
        // Refresh statistics after clearing
        await refreshStatistics();
      }
      
      return success;
    } catch (error) {
      console.error('[useCacheManager] Failed to clear caches:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear caches'
      }));
      return false;
    }
  }, [refreshStatistics]);

  /**
   * Force update all caches
   */
  const forceUpdateCaches = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await cacheManager.forceUpdateCaches();
      
      if (success) {
        // Refresh statistics after updating
        await refreshStatistics();
      }
      
      return success;
    } catch (error) {
      console.error('[useCacheManager] Failed to force update caches:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update caches'
      }));
      return false;
    }
  }, [refreshStatistics]);

  /**
   * Cleanup cache
   */
  const cleanupCache = useCallback(async (aggressive: boolean = false): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const success = await cacheManager.cleanupCache(aggressive);
      
      if (success) {
        // Refresh statistics after cleanup
        await refreshStatistics();
      }
      
      return success;
    } catch (error) {
      console.error('[useCacheManager] Failed to cleanup cache:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to cleanup cache'
      }));
      return false;
    }
  }, [refreshStatistics]);

  /**
   * Monitor storage
   */
  const monitorStorage = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return await cacheManager.monitorStorage();
    } catch (error) {
      console.error('[useCacheManager] Failed to monitor storage:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to monitor storage'
      }));
      return false;
    }
  }, []);

  /**
   * Get service worker version
   */
  const getVersion = useCallback(async (): Promise<string> => {
    try {
      return await cacheManager.getVersion();
    } catch (error) {
      console.error('[useCacheManager] Failed to get version:', error);
      return 'unknown';
    }
  }, []);

  /**
   * Handle storage status updates from service worker
   */
  useEffect(() => {
    const handleStorageStatusUpdate = (event: CustomEvent<StorageStatus>) => {
      setState(prev => ({
        ...prev,
        storageStatus: event.detail
      }));
    };

    const handleSyncComplete = (event: CustomEvent) => {
      console.log('[useCacheManager] Sync completed:', event.detail);
      // Refresh statistics after sync
      refreshStatistics();
    };

    const handleSyncError = (event: CustomEvent) => {
      console.error('[useCacheManager] Sync error:', event.detail);
      setState(prev => ({
        ...prev,
        error: `Sync error: ${event.detail.error || 'Unknown error'}`
      }));
    };

    // Add event listeners
    cacheManager.addEventListener('storage-status-update', handleStorageStatusUpdate);
    cacheManager.addEventListener('sync-complete', handleSyncComplete);
    cacheManager.addEventListener('sync-error', handleSyncError);

    // Initial load
    refreshStatistics();

    // Cleanup
    return () => {
      cacheManager.removeEventListener('storage-status-update', handleStorageStatusUpdate);
      cacheManager.removeEventListener('sync-complete', handleSyncComplete);
      cacheManager.removeEventListener('sync-error', handleSyncError);
    };
  }, [refreshStatistics]);

  return {
    ...state,
    refreshStatistics,
    clearAllCaches,
    forceUpdateCaches,
    cleanupCache,
    monitorStorage,
    getVersion
  };
}

/**
 * Hook for simplified cache status monitoring
 */
export function useCacheStatus() {
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [isHighUsage, setIsHighUsage] = useState(false);
  const [recommendCleanup, setRecommendCleanup] = useState(false);

  useEffect(() => {
    const handleStorageStatusUpdate = (event: CustomEvent<StorageStatus>) => {
      const status = event.detail;
      setStorageStatus(status);
      setIsHighUsage(status.percentage > 80);
      setRecommendCleanup(status.percentage > 60);
    };

    cacheManager.addEventListener('storage-status-update', handleStorageStatusUpdate);

    // Initial check
    cacheManager.getCacheStatistics().then(statistics => {
      if (statistics?.storageQuota) {
        const status = statistics.storageQuota;
        setStorageStatus(status);
        setIsHighUsage(status.percentage > 80);
        setRecommendCleanup(status.percentage > 60);
      }
    });

    return () => {
      cacheManager.removeEventListener('storage-status-update', handleStorageStatusUpdate);
    };
  }, []);

  return {
    storageStatus,
    isHighUsage,
    recommendCleanup,
    cleanupCache: (aggressive?: boolean) => cacheManager.cleanupCache(aggressive)
  };
}