/**
 * Minimal test for Storage Quota Manager to check basic functionality
 */

import { describe, it, expect } from 'vitest';

describe('StorageQuotaManager Minimal Test', () => {
  it('should be able to import the module', async () => {
    try {
      const module = await import('../storageQuotaManager');
      console.log('Module imported:', Object.keys(module));
      expect(module).toBeDefined();
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  });
});