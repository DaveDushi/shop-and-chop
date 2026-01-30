/**
 * Tests for error handling utilities
 */

import {
  ScalingError,
  ValidationErrorCollection,
  InputValidator,
  ErrorRecovery,
  NetworkErrorHandler,
  ERROR_CODES
} from '../errorHandling';

describe('ScalingError', () => {
  it('should create error with all properties', () => {
    const error = new ScalingError(
      'Test message',
      ERROR_CODES.INVALID_HOUSEHOLD_SIZE,
      'householdSize',
      true,
      'User friendly message'
    );

    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ERROR_CODES.INVALID_HOUSEHOLD_SIZE);
    expect(error.field).toBe('householdSize');
    expect(error.recoverable).toBe(true);
    expect(error.userMessage).toBe('User friendly message');
    expect(error.name).toBe('ScalingError');
  });

  it('should use message as userMessage when not provided', () => {
    const error = new ScalingError(
      'Test message',
      ERROR_CODES.INVALID_HOUSEHOLD_SIZE
    );

    expect(error.userMessage).toBe('Test message');
  });
});

describe('ValidationErrorCollection', () => {
  it('should create collection with multiple errors', () => {
    const errors = [
      {
        field: 'householdSize',
        message: 'Invalid size',
        code: ERROR_CODES.INVALID_HOUSEHOLD_SIZE
      },
      {
        field: 'servings',
        message: 'Invalid servings',
        code: ERROR_CODES.INVALID_SERVING_SIZE
      }
    ];

    const collection = new ValidationErrorCollection(errors);

    expect(collection.errors).toEqual(errors);
    expect(collection.message).toContain('Invalid size');
    expect(collection.message).toContain('Invalid servings');
    expect(collection.name).toBe('ValidationErrorCollection');
  });
});

describe('InputValidator', () => {
  describe('validateHouseholdSize', () => {
    it('should validate valid household sizes', () => {
      expect(InputValidator.validateHouseholdSize(1)).toEqual([]);
      expect(InputValidator.validateHouseholdSize(5)).toEqual([]);
      expect(InputValidator.validateHouseholdSize(20)).toEqual([]);
    });

    it('should reject null/undefined values', () => {
      const errors = InputValidator.validateHouseholdSize(null as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('required');
    });

    it('should reject non-numbers', () => {
      const errors = InputValidator.validateHouseholdSize('5' as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be a number');
    });

    it('should reject NaN and infinite values', () => {
      expect(InputValidator.validateHouseholdSize(NaN)).toHaveLength(1);
      expect(InputValidator.validateHouseholdSize(Infinity)).toHaveLength(1);
    });

    it('should reject non-integers', () => {
      const errors = InputValidator.validateHouseholdSize(2.5);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('whole number');
    });

    it('should reject values outside valid range', () => {
      expect(InputValidator.validateHouseholdSize(0)).toHaveLength(1);
      expect(InputValidator.validateHouseholdSize(-1)).toHaveLength(1);
      expect(InputValidator.validateHouseholdSize(21)).toHaveLength(1);
    });
  });

  describe('validateServingSize', () => {
    it('should validate valid serving sizes', () => {
      expect(InputValidator.validateServingSize(1)).toEqual([]);
      expect(InputValidator.validateServingSize(25)).toEqual([]);
      expect(InputValidator.validateServingSize(50)).toEqual([]);
    });

    it('should reject values outside valid range', () => {
      expect(InputValidator.validateServingSize(0)).toHaveLength(1);
      expect(InputValidator.validateServingSize(51)).toHaveLength(1);
    });
  });

  describe('validateQuantityString', () => {
    it('should validate valid quantity strings', () => {
      expect(InputValidator.validateQuantityString('1')).toEqual([]);
      expect(InputValidator.validateQuantityString('1.5')).toEqual([]);
      expect(InputValidator.validateQuantityString('1/2')).toEqual([]);
      expect(InputValidator.validateQuantityString('2 cups')).toEqual([]);
    });

    it('should reject null/undefined/empty values', () => {
      expect(InputValidator.validateQuantityString(null as any)).toHaveLength(1);
      expect(InputValidator.validateQuantityString('')).toHaveLength(1);
      expect(InputValidator.validateQuantityString('   ')).toHaveLength(1);
    });

    it('should reject non-strings', () => {
      const errors = InputValidator.validateQuantityString(5 as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be a string');
    });

    it('should reject overly long strings', () => {
      const longString = 'a'.repeat(51);
      const errors = InputValidator.validateQuantityString(longString);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('too long');
    });
  });
});

describe('ErrorRecovery', () => {
  describe('recoverPreferences', () => {
    it('should recover valid household size from various field names', () => {
      const testCases = [
        { householdSize: 4 },
        { household_size: 3 },
        { size: 5 },
        { people: 2 }
      ];

      testCases.forEach(data => {
        const result = ErrorRecovery.recoverPreferences(data);
        expect(result.recovered).toBe(true);
        expect(result.householdSize).toBeGreaterThan(0);
      });
    });

    it('should parse string values', () => {
      const result = ErrorRecovery.recoverPreferences({ householdSize: '4' });
      expect(result.recovered).toBe(true);
      expect(result.householdSize).toBe(4);
    });

    it('should return default for invalid data', () => {
      const testCases = [
        null,
        undefined,
        {},
        { householdSize: -1 },
        { householdSize: 'invalid' },
        { householdSize: 25 }
      ];

      testCases.forEach(data => {
        const result = ErrorRecovery.recoverPreferences(data);
        expect(result.householdSize).toBe(2);
        if (data === null || data === undefined || Object.keys(data || {}).length === 0) {
          expect(result.recovered).toBe(false);
        }
      });
    });
  });

  describe('parseQuantityWithFallback', () => {
    it('should parse valid quantities', () => {
      const testCases = [
        { input: '2', expected: 2 },
        { input: '1.5', expected: 1.5 },
        { input: '1/2', expected: 0.5 },
        { input: '1 1/2', expected: 1.5 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = ErrorRecovery.parseQuantityWithFallback(input);
        expect(result.quantity).toBe(expected);
        expect(result.parsed).toBe(true);
        expect(result.originalText).toBe(input);
      });
    });

    it('should fallback for unparseable quantities', () => {
      const testCases = [
        'a pinch',
        'some salt',
        'to taste',
        '???'
      ];

      testCases.forEach(input => {
        const result = ErrorRecovery.parseQuantityWithFallback(input);
        expect(result.quantity).toBe(1);
        expect(result.parsed).toBe(false);
        expect(result.originalText).toBe(input);
      });
    });

    it('should extract numbers from text', () => {
      const result = ErrorRecovery.parseQuantityWithFallback('about 3 cups');
      expect(result.quantity).toBe(3);
      expect(result.parsed).toBe(false);
    });

    it('should handle countable items', () => {
      const testCases = [
        { input: '1 whole onion', expected: 1 },
        { input: '2 pieces bread', expected: 2 }, // Should extract the 2
        { input: 'each apple', expected: 1 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = ErrorRecovery.parseQuantityWithFallback(input);
        expect(result.quantity).toBe(expected);
        expect(result.parsed).toBe(false);
      });
    });
  });
});

describe('NetworkErrorHandler', () => {
  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkErrors = [
        new Error('network error'),
        new Error('fetch failed'),
        new Error('connection refused'),
        new Error('timeout occurred'),
        { message: 'DNS resolution failed' }
      ];

      networkErrors.forEach(error => {
        expect(NetworkErrorHandler.isNetworkError(error)).toBe(true);
      });
    });

    it('should not identify non-network errors', () => {
      const nonNetworkErrors = [
        new Error('validation failed'),
        new Error('invalid input'),
        { message: 'business logic error' },
        null,
        undefined
      ];

      nonNetworkErrors.forEach(error => {
        expect(NetworkErrorHandler.isNetworkError(error)).toBe(false);
      });
    });
  });

  describe('getNetworkErrorMessage', () => {
    it('should return appropriate messages for different error types', () => {
      const testCases = [
        { error: { message: 'network error' }, expected: 'Unable to connect' },
        { error: { status: 500 }, expected: 'Server error' },
        { error: { status: 404 }, expected: 'not found' },
        { error: { status: 403 }, expected: 'permission' },
        { error: { status: 401 }, expected: 'session has expired' }
      ];

      testCases.forEach(({ error, expected }) => {
        const message = NetworkErrorHandler.getNetworkErrorMessage(error);
        expect(message.toLowerCase()).toContain(expected.toLowerCase());
      });
    });

    it('should return generic message for unknown errors', () => {
      const message = NetworkErrorHandler.getNetworkErrorMessage({});
      expect(message).toContain('unexpected error');
    });
  });
});