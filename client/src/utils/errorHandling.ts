/**
 * Error handling utilities for the scaling system
 * Provides consistent error handling, validation, and recovery mechanisms
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorRecoveryOptions {
  useDefault?: boolean;
  defaultValue?: any;
  logError?: boolean;
  showToast?: boolean;
  retryable?: boolean;
}

export class ScalingError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly recoverable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: string,
    field?: string,
    recoverable: boolean = true,
    userMessage?: string
  ) {
    super(message);
    this.name = 'ScalingError';
    this.code = code;
    this.field = field;
    this.recoverable = recoverable;
    this.userMessage = userMessage || message;
  }
}

export class ValidationErrorCollection extends Error {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const message = `Validation failed: ${errors.map(e => e.message).join(', ')}`;
    super(message);
    this.name = 'ValidationErrorCollection';
    this.errors = errors;
  }
}

/**
 * Error codes for different types of scaling errors
 */
export const ERROR_CODES = {
  // Input validation errors
  INVALID_HOUSEHOLD_SIZE: 'INVALID_HOUSEHOLD_SIZE',
  INVALID_SERVING_SIZE: 'INVALID_SERVING_SIZE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  
  // Data corruption errors
  CORRUPTED_PREFERENCES: 'CORRUPTED_PREFERENCES',
  CORRUPTED_MEAL_PLAN: 'CORRUPTED_MEAL_PLAN',
  CORRUPTED_RECIPE_DATA: 'CORRUPTED_RECIPE_DATA',
  
  // Network and persistence errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  
  // Calculation errors
  SCALING_CALCULATION_ERROR: 'SCALING_CALCULATION_ERROR',
  MEASUREMENT_CONVERSION_ERROR: 'MEASUREMENT_CONVERSION_ERROR',
  UNPARSEABLE_QUANTITY: 'UNPARSEABLE_QUANTITY',
  
  // System errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate household size input
   */
  static validateHouseholdSize(size: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (size === null || size === undefined) {
      errors.push({
        field: 'householdSize',
        message: 'Household size is required',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
      return errors;
    }

    if (typeof size !== 'number') {
      errors.push({
        field: 'householdSize',
        message: 'Household size must be a number',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
      return errors;
    }

    if (isNaN(size) || !isFinite(size)) {
      errors.push({
        field: 'householdSize',
        message: 'Household size must be a valid number',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
      return errors;
    }

    if (!Number.isInteger(size)) {
      errors.push({
        field: 'householdSize',
        message: 'Household size must be a whole number',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
      return errors;
    }

    if (size < 1) {
      errors.push({
        field: 'householdSize',
        message: 'Household size must be at least 1 person',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
    }

    if (size > 20) {
      errors.push({
        field: 'householdSize',
        message: 'Household size cannot exceed 20 people',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      });
    }

    return errors;
  }

  /**
   * Validate manual serving override input
   */
  static validateServingSize(servings: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (servings === null || servings === undefined) {
      errors.push({
        field: 'servings',
        message: 'Serving size is required',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
      return errors;
    }

    if (typeof servings !== 'number') {
      errors.push({
        field: 'servings',
        message: 'Serving size must be a number',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
      return errors;
    }

    if (isNaN(servings) || !isFinite(servings)) {
      errors.push({
        field: 'servings',
        message: 'Serving size must be a valid number',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
      return errors;
    }

    if (!Number.isInteger(servings)) {
      errors.push({
        field: 'servings',
        message: 'Serving size must be a whole number',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
      return errors;
    }

    if (servings < 1) {
      errors.push({
        field: 'servings',
        message: 'Serving size must be at least 1 person',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
    }

    if (servings > 50) {
      errors.push({
        field: 'servings',
        message: 'Serving size cannot exceed 50 people',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      });
    }

    return errors;
  }

  /**
   * Validate ingredient quantity string
   */
  static validateQuantityString(quantity: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (quantity === null || quantity === undefined) {
      errors.push({
        field: 'quantity',
        message: 'Quantity is required',
        code: ERROR_CODES.INVALID_QUANTITY
      });
      return errors;
    }

    if (typeof quantity !== 'string') {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be a string',
        code: ERROR_CODES.INVALID_QUANTITY
      });
      return errors;
    }

    const trimmed = quantity.trim();
    if (trimmed === '') {
      errors.push({
        field: 'quantity',
        message: 'Quantity cannot be empty',
        code: ERROR_CODES.INVALID_QUANTITY
      });
      return errors;
    }

    // Check for reasonable length
    if (trimmed.length > 50) {
      errors.push({
        field: 'quantity',
        message: 'Quantity string is too long',
        code: ERROR_CODES.INVALID_QUANTITY
      });
    }

    return errors;
  }
}

/**
 * Error recovery utilities
 */
export class ErrorRecovery {
  /**
   * Attempt to recover from corrupted preference data
   */
  static recoverPreferences(corruptedData: any): { householdSize: number; recovered: boolean } {
    try {
      // Try to extract household size from various possible formats
      let householdSize = 2; // Default
      let recovered = false;

      if (corruptedData && typeof corruptedData === 'object') {
        // Try common field names
        const possibleFields = ['householdSize', 'household_size', 'size', 'people'];
        
        for (const field of possibleFields) {
          const value = corruptedData[field];
          if (typeof value === 'number' && value >= 1 && value <= 20) {
            householdSize = value;
            recovered = true;
            break;
          }
          
          // Try parsing string values
          if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
              householdSize = parsed;
              recovered = true;
              break;
            }
          }
        }
      }

      return { householdSize, recovered };
    } catch (error) {
      console.error('Failed to recover preferences:', error);
      return { householdSize: 2, recovered: false };
    }
  }

  /**
   * Attempt to parse unparseable ingredient quantities with fallbacks
   */
  static parseQuantityWithFallback(quantityStr: string): { quantity: number; parsed: boolean; originalText: string } {
    const originalText = quantityStr.trim();
    
    try {
      // Try the standard parsing first
      const quantity = this.parseQuantityString(originalText);
      return { quantity, parsed: true, originalText };
    } catch (error) {
      // Fallback strategies
      
      // Strategy 1: Extract first number found
      const numberMatch = originalText.match(/(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        const quantity = parseFloat(numberMatch[1]);
        if (quantity > 0 && quantity <= 1000) {
          return { quantity, parsed: false, originalText };
        }
      }
      
      // Strategy 2: Look for common fraction patterns
      const fractionMatch = originalText.match(/(\d+)\/(\d+)/);
      if (fractionMatch) {
        const numerator = parseInt(fractionMatch[1], 10);
        const denominator = parseInt(fractionMatch[2], 10);
        if (denominator > 0) {
          const quantity = numerator / denominator;
          if (quantity > 0 && quantity <= 1000) {
            return { quantity, parsed: false, originalText };
          }
        }
      }
      
      // Strategy 3: Default to 1 for items that might be countable
      const countableWords = ['item', 'piece', 'whole', 'each', 'unit'];
      const lowerText = originalText.toLowerCase();
      if (countableWords.some(word => lowerText.includes(word))) {
        return { quantity: 1, parsed: false, originalText };
      }
      
      // Final fallback: return 1
      return { quantity: 1, parsed: false, originalText };
    }
  }

  private static parseQuantityString(quantityStr: string): number {
    const cleaned = quantityStr.trim();
    
    if (!cleaned || cleaned === '') {
      throw new ScalingError(
        'Empty quantity string',
        ERROR_CODES.UNPARSEABLE_QUANTITY,
        'quantity'
      );
    }
    
    // Handle mixed numbers like "1 1/2"
    const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const numerator = parseInt(mixedMatch[2], 10);
      const denominator = parseInt(mixedMatch[3], 10);
      if (denominator === 0) {
        throw new ScalingError(
          'Division by zero in fraction',
          ERROR_CODES.UNPARSEABLE_QUANTITY,
          'quantity'
        );
      }
      return whole + (numerator / denominator);
    }
    
    // Handle simple fractions like "1/4"
    const fractionMatch = cleaned.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1], 10);
      const denominator = parseInt(fractionMatch[2], 10);
      if (denominator === 0) {
        throw new ScalingError(
          'Division by zero in fraction',
          ERROR_CODES.UNPARSEABLE_QUANTITY,
          'quantity'
        );
      }
      return numerator / denominator;
    }
    
    // Handle decimal numbers like "1.5"
    const decimalMatch = cleaned.match(/^(\d+\.\d+)/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }
    
    // Handle simple numeric values like "2"
    const numericMatch = cleaned.match(/^(\d+)$/);
    if (numericMatch) {
      return parseInt(numericMatch[1], 10);
    }
    
    throw new ScalingError(
      `Could not parse quantity: "${quantityStr}"`,
      ERROR_CODES.UNPARSEABLE_QUANTITY,
      'quantity'
    );
  }
}

/**
 * Network error handling utilities
 */
export class NetworkErrorHandler {
  /**
   * Determine if an error is network-related
   */
  static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    // Check for common network error indicators
    const networkErrorMessages = [
      'network error',
      'fetch failed',
      'connection refused',
      'timeout',
      'offline',
      'no internet',
      'dns',
      'unreachable'
    ];
    
    const errorMessage = (error.message || '').toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Get user-friendly error message for network errors
   */
  static getNetworkErrorMessage(error: any): string {
    if (this.isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (error.status === 500) {
      return 'Server error occurred. Please try again in a moment.';
    }
    
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    
    return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Logging utilities for error tracking
 */
export class ErrorLogger {
  /**
   * Log error with context for debugging
   */
  static logError(error: Error, context: string, additionalData?: any): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      additionalData
    };
    
    console.error(`[${context}] Error:`, errorInfo);
    
    // In production, this could send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
    }
  }

  /**
   * Log validation errors
   */
  static logValidationErrors(errors: ValidationError[], context: string): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      validationErrors: errors
    };
    
    console.warn(`[${context}] Validation errors:`, errorInfo);
  }
}