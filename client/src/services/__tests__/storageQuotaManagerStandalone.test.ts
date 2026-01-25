/**
 * Tests for Standalone Storage Quota Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageQuotaManager, StorageQuotaManager } from '../storageQuotaManagerStandalone';

// Mock navigator.storage
const mockStorageEstimate = vi.fn();
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: mockStorageEstimate
  },
  writable: true
});

describe('StorageQuotaManager Standalone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockStorageEstimate.mockResolvedValue({
      usage: 50 * 1024 * 1024, // 50MB
      quota: 100 * 1024 * 1024  // 100MB
    });
  });

  describe('singleton instance', () => {
    it('should have a singleton instance', () => {
      expect(storageQuotaManager).toBeDefined();
      expect(typeof storageQuotaManager).toBe('object');
    });

    it('should have required methods', () => {
      expect(typeof storageQuotaManager.getStorageUsage).toBe('function');
      expect(typeof storageQuotaManager.checkStorageQuota).toBe('function');
      expect(typeof storageQuotaManager.performCleanup).toBe('function');
      expect(typeof storageQuotaManager.getConfig).toBe('function');
    });
  });

  describe('getStorageUsage', () => {
    it('should return storage usage information', async () => {
      const usage = await storageQuotaManager.getStorageUsage();
      
      expect(usage).toEqual({
        used: 50 * 1024 * 1024,
        available: 100 * 1024 * 1024,
        percentage: 50
      });
    });

    it('should handle browsers without storage API', async () => {
      // Mock browser without storage API
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        writable: true
      });

      const usage = await storageQuotaManager.getStorageUsage();
      
      expect(usage.used).toBe(0);
      expect(usage.available).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBe(0);
      
      // Restore storage API
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockStorageEstimate
        },
        writable: true
      });
    });
  });

  describe('checkStorageQuota', () => {
    it('should return null when storage usage is below warning threshold', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 50 * 1024 * 1024, // 50MB
        quota: 100 * 1024 * 1024  // 100MB (50% usage)
      });

      const alert = await storageQuotaManager.checkStorageQuota();
      expect(alert).toBeNull();
    });

    it('should return warning alert when storage usage exceeds warning threshold', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 80 * 1024 * 1024, // 80MB
        quota: 100 * 1024 * 1024  // 100MB (80% usage)
      });

      const alert = await storageQuotaManager.checkStorageQuota();
      
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe('warning');
      expect(alert?.currentUsage).toBe(80);
    });

    it('should return critical alert when storage usage exceeds critical threshold', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 95 * 1024 * 1024, // 95MB
        quota: 100 * 1024 * 1024  // 100MB (95% usage)
      });

      const alert = await storageQuotaManager.checkStorageQuota();
      
      expect(alert).not.toBeNull();
      expect(alert?.level).toBe('critical');
      expect(alert?.currentUsage).toBe(95);
    });
  });

  describe('performCleanup', () => {
    it('should skip cleanup when usage is below threshold', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 50 * 1024 * 1024, // 50MB
        quota: 100 * 1024 * 1024  // 100MB (50% usage)
      });

      const result = await storageQuotaManager.performCleanup();
      
      expect(result.success).toBe(true);
      expect(result.strategiesApplied).toHaveLength(0);
      expect(result.newUsagePercentage).toBe(50);
    });

    it('should force cleanup even when usage is below threshold', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 50 * 1024 * 1024, // 50MB
        quota: 100 * 1024 * 1024  // 100MB (50% usage)
      });

      const result = await storageQuotaManager.performCleanup(true);
      
      expect(result.success).toBe(true);
      expect(result.strategiesApplied).toContain('basic-cleanup');
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = storageQuotaManager.getConfig();
      
      expect(config).toHaveProperty('warningThreshold');
      expect(config).toHaveProperty('criticalThreshold');
      expect(config).toHaveProperty('cleanupThreshold');
      expect(config).toHaveProperty('enableAutoCleanup');
    });

    it('should update configuration', () => {
      const originalConfig = storageQuotaManager.getConfig();
      
      storageQuotaManager.updateConfig({
        warningThreshold: 80,
        criticalThreshold: 95
      });
      
      const updatedConfig = storageQuotaManager.getConfig();
      
      expect(updatedConfig.warningThreshold).toBe(80);
      expect(updatedConfig.criticalThreshold).toBe(95);
      expect(updatedConfig.cleanupThreshold).toBe(originalConfig.cleanupThreshold);
    });
  });

  describe('alert management', () => {
    it('should register and trigger storage alert callbacks', async () => {
      const alertCallback = vi.fn();
      storageQuotaManager.onStorageAlert(alertCallback);

      // Trigger critical storage usage
      mockStorageEstimate.mockResolvedValue({
        usage: 95 * 1024 * 1024, // 95MB
        quota: 100 * 1024 * 1024  // 100MB (95% usage)
      });

      await storageQuotaManager.checkStorageQuota();
      
      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'critical',
          currentUsage: 95
        })
      );
    });

    it('should remove storage alert callbacks', async () => {
      const alertCallback = vi.fn();
      storageQuotaManager.onStorageAlert(alertCallback);
      storageQuotaManager.removeStorageAlertCallback(alertCallback);

      // Trigger critical storage usage
      mockStorageEstimate.mockResolvedValue({
        usage: 95 * 1024 * 1024, // 95MB
        quota: 100 * 1024 * 1024  // 100MB (95% usage)
      });

      await storageQuotaManager.checkStorageQuota();
      
      expect(alertCallback).not.toHaveBeenCalled();
    });
  });

  describe('class export', () => {
    it('should export the StorageQuotaManager class', () => {
      expect(StorageQuotaManager).toBeDefined();
      expect(typeof StorageQuotaManager).toBe('function');
    });

    it('should be able to create new instances', () => {
      const instance = new StorageQuotaManager();
      expect(instance).toBeInstanceOf(StorageQuotaManager);
      expect(typeof instance.getStorageUsage).toBe('function');
    });
  });
});