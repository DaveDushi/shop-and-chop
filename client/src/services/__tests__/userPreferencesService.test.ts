import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserPreferencesService } from '../userPreferencesService';
import { SCALING_CONSTANTS } from '../../types/Scaling.types';
import { api } from '../api';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn()
  }
}));

describe('UserPreferencesService', () => {
  const userPreferencesService = new UserPreferencesService();
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateHouseholdSize', () => {
    it('should validate correct household sizes', () => {
      const result1 = userPreferencesService.validateHouseholdSize(1);
      expect(result1.isValid).toBe(true);
      expect(result1.error).toBeUndefined();

      const result2 = userPreferencesService.validateHouseholdSize(4);
      expect(result2.isValid).toBe(true);
      expect(result2.error).toBeUndefined();

      const result3 = userPreferencesService.validateHouseholdSize(20);
      expect(result3.isValid).toBe(true);
      expect(result3.error).toBeUndefined();
    });

    it('should warn for large household sizes', () => {
      const result = userPreferencesService.validateHouseholdSize(15);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large household sizes may result in very large ingredient quantities');
    });

    it('should reject non-numeric values', () => {
      const result = userPreferencesService.validateHouseholdSize('4' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Household size must be a number');
    });

    it('should reject NaN values', () => {
      const result = userPreferencesService.validateHouseholdSize(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Household size must be a valid number');
    });

    it('should reject non-integer values', () => {
      const result = userPreferencesService.validateHouseholdSize(3.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Household size must be a whole number');
    });

    it('should reject values below minimum', () => {
      const result = userPreferencesService.validateHouseholdSize(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Household size must be at least 1 person');
    });

    it('should reject values above maximum', () => {
      const result = userPreferencesService.validateHouseholdSize(25);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Household size cannot exceed 20 people');
    });
  });

  describe('getHouseholdSize', () => {
    it('should return household size from API', async () => {
      const mockResponse = { data: { householdSize: 4 } };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await userPreferencesService.getHouseholdSize(mockUserId);
      
      expect(result).toBe(4);
      expect(api.get).toHaveBeenCalledWith(`/users/${mockUserId}/preferences`);
    });

    it('should return default when API returns no household size', async () => {
      const mockResponse = { data: {} };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await userPreferencesService.getHouseholdSize(mockUserId);
      
      expect(result).toBe(SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE);
    });

    it('should return default when API call fails', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await userPreferencesService.getHouseholdSize(mockUserId);
      
      expect(result).toBe(SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE);
    });
  });

  describe('setHouseholdSize', () => {
    it('should successfully set valid household size', async () => {
      vi.mocked(api.patch).mockResolvedValue({});

      await expect(
        userPreferencesService.setHouseholdSize(mockUserId, 6)
      ).resolves.not.toThrow();

      expect(api.patch).toHaveBeenCalledWith(`/users/${mockUserId}/preferences`, {
        householdSize: 6
      });
    });

    it('should reject invalid household size before API call', async () => {
      await expect(
        userPreferencesService.setHouseholdSize(mockUserId, 0)
      ).rejects.toThrow('Household size must be at least 1');

      expect(api.patch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.patch).mockRejectedValue(new Error('Server error'));

      await expect(
        userPreferencesService.setHouseholdSize(mockUserId, 4)
      ).rejects.toThrow('Server error');
    });
  });

  describe('getCurrentUserHouseholdSize', () => {
    it('should return current user household size', async () => {
      const mockResponse = { data: { householdSize: 3 } };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await userPreferencesService.getCurrentUserHouseholdSize();
      
      expect(result).toBe(3);
      expect(api.get).toHaveBeenCalledWith('/users/me');
    });

    it('should return default when current user has no household size', async () => {
      const mockResponse = { data: {} };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await userPreferencesService.getCurrentUserHouseholdSize();
      
      expect(result).toBe(SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE);
    });
  });

  describe('updateCurrentUserHouseholdSize', () => {
    it('should successfully update current user household size', async () => {
      vi.mocked(api.patch).mockResolvedValue({});

      await expect(
        userPreferencesService.updateCurrentUserHouseholdSize(5)
      ).resolves.not.toThrow();

      expect(api.patch).toHaveBeenCalledWith('/users/me', {
        householdSize: 5
      });
    });

    it('should validate before updating', async () => {
      await expect(
        userPreferencesService.updateCurrentUserHouseholdSize(-1)
      ).rejects.toThrow('Household size must be at least 1');

      expect(api.patch).not.toHaveBeenCalled();
    });
  });
});