import { 
  UserPreferencesService as IUserPreferencesService, 
  ValidationResult,
  SCALING_CONSTANTS 
} from '../types/Scaling.types';
import { api } from './api';
import { 
  ScalingError, 
  ValidationErrorCollection,
  InputValidator, 
  ErrorRecovery, 
  NetworkErrorHandler,
  ErrorLogger,
  ERROR_CODES 
} from '../utils/errorHandling';
import { scalingOfflineManager } from './scalingOfflineManager';

/**
 * Service for managing user preferences including household size
 * Handles validation, persistence, and retrieval of user settings
 */
export class UserPreferencesService implements IUserPreferencesService {
  
  /**
   * Get user's household size from the server with enhanced error handling
   * @param userId - User ID
   * @returns Promise resolving to household size
   */
  async getHouseholdSize(userId: string): Promise<number> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ScalingError(
          'Invalid user ID provided',
          ERROR_CODES.INVALID_HOUSEHOLD_SIZE,
          'userId',
          false,
          'Unable to load household size. Please log in again.'
        );
      }

      const response = await api.get(`/users/${userId}/preferences`);
      
      if (!response.data) {
        ErrorLogger.logError(
          new Error('Empty response from preferences API'),
          'UserPreferencesService.getHouseholdSize',
          { userId }
        );
        return SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE;
      }

      // Validate and recover household size from response
      const householdSize = response.data.householdSize;
      
      if (householdSize !== undefined) {
        const validationErrors = InputValidator.validateHouseholdSize(householdSize);
        if (validationErrors.length === 0) {
          return householdSize;
        } else {
          // Log validation errors but attempt recovery
          ErrorLogger.logValidationErrors(
            validationErrors, 
            'UserPreferencesService.getHouseholdSize'
          );
        }
      }

      // Attempt to recover from corrupted data
      const recovery = ErrorRecovery.recoverPreferences(response.data);
      if (recovery.recovered) {
        ErrorLogger.logError(
          new Error('Recovered household size from corrupted preferences'),
          'UserPreferencesService.getHouseholdSize',
          { originalData: response.data, recoveredSize: recovery.householdSize }
        );
        
        // Try to save the recovered value
        try {
          await this.setHouseholdSize(userId, recovery.householdSize);
        } catch (saveError) {
          // Log but don't fail - we still have a recovered value
          ErrorLogger.logError(
            saveError as Error,
            'UserPreferencesService.getHouseholdSize.recovery',
            { recoveredSize: recovery.householdSize }
          );
        }
      }

      return recovery.householdSize;
      
    } catch (error: any) {
      if (error instanceof ScalingError) {
        throw error;
      }

      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      ErrorLogger.logError(
        error,
        'UserPreferencesService.getHouseholdSize',
        { userId, isNetworkError }
      );

      if (isNetworkError) {
        // Try to get cached value from offline manager as fallback
        const cachedSize = scalingOfflineManager.getCachedHouseholdSize(userId);
        if (cachedSize !== null) {
          return cachedSize;
        }
        
        // Fallback to localStorage
        try {
          const cached = localStorage.getItem(`householdSize_${userId}`);
          if (cached) {
            const cachedSize = parseInt(cached, 10);
            const validationErrors = InputValidator.validateHouseholdSize(cachedSize);
            if (validationErrors.length === 0) {
              return cachedSize;
            }
          }
        } catch (cacheError) {
          ErrorLogger.logError(
            cacheError as Error,
            'UserPreferencesService.getHouseholdSize.cache',
            { userId }
          );
        }
      }

      // Return default if all recovery attempts fail
      return SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE;
    }
  }

  /**
   * Set user's household size on the server with enhanced validation and error handling
   * @param userId - User ID
   * @param size - New household size
   * @returns Promise that resolves when saved
   */
  async setHouseholdSize(userId: string, size: number): Promise<void> {
    // Comprehensive input validation
    if (!userId || typeof userId !== 'string') {
      throw new ScalingError(
        'Invalid user ID provided',
        ERROR_CODES.INVALID_HOUSEHOLD_SIZE,
        'userId',
        false,
        'Unable to save household size. Please log in again.'
      );
    }

    const validationErrors = InputValidator.validateHouseholdSize(size);
    if (validationErrors.length > 0) {
      throw new ValidationErrorCollection(validationErrors);
    }

    try {
      await api.patch(`/users/${userId}/preferences`, {
        householdSize: size
      });

      // Cache the value locally for offline access
      try {
        localStorage.setItem(`householdSize_${userId}`, size.toString());
      } catch (cacheError) {
        // Log but don't fail the operation
        ErrorLogger.logError(
          cacheError as Error,
          'UserPreferencesService.setHouseholdSize.cache',
          { userId, size }
        );
      }

    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      
      ErrorLogger.logError(
        error,
        'UserPreferencesService.setHouseholdSize',
        { userId, size, isNetworkError }
      );

      if (isNetworkError) {
        // Cache the value for later sync when network is restored
        await scalingOfflineManager.cacheHouseholdSizeChange(userId, size);
        
        throw new ScalingError(
          'Network error while saving household size',
          ERROR_CODES.NETWORK_ERROR,
          'householdSize',
          true,
          'Unable to save household size right now. Your change will be saved when connection is restored.'
        );
      }

      const userMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      throw new ScalingError(
        error.message || 'Failed to save household size',
        ERROR_CODES.STORAGE_ERROR,
        'householdSize',
        true,
        userMessage
      );
    }
  }

  /**
   * Validate household size input with enhanced validation
   * @param size - Household size to validate
   * @returns Validation result with error details
   */
  validateHouseholdSize(size: number): ValidationResult {
    const validationErrors = InputValidator.validateHouseholdSize(size);
    
    if (validationErrors.length > 0) {
      return {
        isValid: false,
        error: validationErrors[0].message
      };
    }

    // All validations passed - check for warnings
    const warnings: string[] = [];
    if (size > 10) {
      warnings.push('Large household sizes may result in very large ingredient quantities');
    }
    if (size > 15) {
      warnings.push('Consider breaking large households into smaller meal planning groups');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get user preferences including household size from current user context with enhanced error handling
   * This method works with the current authenticated user
   * @returns Promise resolving to household size
   */
  async getCurrentUserHouseholdSize(): Promise<number> {
    try {
      const response = await api.get('/users/me');
      
      if (!response.data) {
        ErrorLogger.logError(
          new Error('Empty response from current user API'),
          'UserPreferencesService.getCurrentUserHouseholdSize'
        );
        return SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE;
      }

      const householdSize = response.data.householdSize;
      
      if (householdSize !== undefined) {
        const validationErrors = InputValidator.validateHouseholdSize(householdSize);
        if (validationErrors.length === 0) {
          return householdSize;
        }
      }

      // Attempt recovery
      const recovery = ErrorRecovery.recoverPreferences(response.data);
      return recovery.householdSize;
      
    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      ErrorLogger.logError(
        error,
        'UserPreferencesService.getCurrentUserHouseholdSize',
        { isNetworkError }
      );

      if (isNetworkError) {
        // Try to get any cached value from offline manager
        const cachedSize = scalingOfflineManager.getCachedHouseholdSize('current');
        if (cachedSize !== null) {
          return cachedSize;
        }
        
        // Fallback to localStorage
        try {
          const cached = localStorage.getItem('currentUserHouseholdSize');
          if (cached) {
            const cachedSize = parseInt(cached, 10);
            const validationErrors = InputValidator.validateHouseholdSize(cachedSize);
            if (validationErrors.length === 0) {
              return cachedSize;
            }
          }
        } catch (cacheError) {
          ErrorLogger.logError(
            cacheError as Error,
            'UserPreferencesService.getCurrentUserHouseholdSize.cache'
          );
        }
      }

      return SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE;
    }
  }

  /**
   * Update current user's household size with enhanced validation and error handling
   * @param size - New household size
   * @returns Promise that resolves when saved
   */
  async updateCurrentUserHouseholdSize(size: number): Promise<void> {
    const validationErrors = InputValidator.validateHouseholdSize(size);
    if (validationErrors.length > 0) {
      throw new ValidationErrorCollection(validationErrors);
    }

    try {
      await api.patch('/users/me', {
        householdSize: size
      });

      // Cache for offline access
      try {
        localStorage.setItem('currentUserHouseholdSize', size.toString());
      } catch (cacheError) {
        ErrorLogger.logError(
          cacheError as Error,
          'UserPreferencesService.updateCurrentUserHouseholdSize.cache',
          { size }
        );
      }

    } catch (error: any) {
      const isNetworkError = NetworkErrorHandler.isNetworkError(error);
      
      ErrorLogger.logError(
        error,
        'UserPreferencesService.updateCurrentUserHouseholdSize',
        { size, isNetworkError }
      );

      if (isNetworkError) {
        // Cache for later sync using offline manager
        await scalingOfflineManager.cacheHouseholdSizeChange('current', size);
        
        throw new ScalingError(
          'Network error while updating household size',
          ERROR_CODES.NETWORK_ERROR,
          'householdSize',
          true,
          'Unable to save household size right now. Your change will be saved when connection is restored.'
        );
      }

      const userMessage = NetworkErrorHandler.getNetworkErrorMessage(error);
      throw new ScalingError(
        error.message || 'Failed to update household size',
        ERROR_CODES.STORAGE_ERROR,
        'householdSize',
        true,
        userMessage
      );
    }
  }

  /**
   * Sync pending changes when network is restored (delegated to offline manager)
   * @returns Promise that resolves when sync is complete
   */
  async syncPendingChanges(): Promise<void> {
    return scalingOfflineManager.syncPendingChanges();
  }

  /**
   * Get count of pending changes waiting to sync (delegated to offline manager)
   * @returns Number of pending changes
   */
  getPendingChangesCount(): number {
    return scalingOfflineManager.getSyncStatus().pendingChanges;
  }

  /**
   * Get sync status from offline manager
   * @returns Current sync status
   */
  getSyncStatus() {
    return scalingOfflineManager.getSyncStatus();
  }

  /**
   * Add listener for sync status changes
   */
  addSyncListener(listener: (status: any) => void): void {
    scalingOfflineManager.addSyncListener(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncListener(listener: (status: any) => void): void {
    scalingOfflineManager.removeSyncListener(listener);
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();