import { FractionCalculator } from '../fractionCalculator';
import { Fraction } from '../../types/Scaling.types';

describe('FractionCalculator', () => {
  let calculator: FractionCalculator;

  beforeEach(() => {
    calculator = new FractionCalculator();
  });

  describe('multiply', () => {
    it('should multiply fractions correctly', () => {
      const fraction: Fraction = { numerator: 1, denominator: 2 };
      const result = calculator.multiply(fraction, 2);
      
      expect(result).toEqual({ numerator: 1, denominator: 1 });
    });

    it('should handle fractional multipliers', () => {
      const fraction: Fraction = { numerator: 1, denominator: 4 };
      const result = calculator.multiply(fraction, 1.5);
      
      // 1/4 * 1.5 = 1/4 * 3/2 = 3/8
      expect(result).toEqual({ numerator: 3, denominator: 8 });
    });

    it('should simplify results automatically', () => {
      const fraction: Fraction = { numerator: 2, denominator: 4 };
      const result = calculator.multiply(fraction, 2);
      
      expect(result).toEqual({ numerator: 1, denominator: 1 });
    });
  });

  describe('simplify', () => {
    it('should simplify fractions to lowest terms', () => {
      const fraction: Fraction = { numerator: 6, denominator: 8 };
      const result = calculator.simplify(fraction);
      
      expect(result).toEqual({ numerator: 3, denominator: 4 });
    });

    it('should handle negative fractions', () => {
      const fraction: Fraction = { numerator: -4, denominator: 8 };
      const result = calculator.simplify(fraction);
      
      expect(result).toEqual({ numerator: -1, denominator: 2 });
    });

    it('should handle zero numerator', () => {
      const fraction: Fraction = { numerator: 0, denominator: 5 };
      const result = calculator.simplify(fraction);
      
      expect(result).toEqual({ numerator: 0, denominator: 1 });
    });

    it('should throw error for zero denominator', () => {
      const fraction: Fraction = { numerator: 1, denominator: 0 };
      
      expect(() => calculator.simplify(fraction)).toThrow('Cannot simplify fraction with zero denominator');
    });
  });

  describe('toMixedNumber', () => {
    it('should convert improper fractions to mixed numbers', () => {
      const fraction: Fraction = { numerator: 7, denominator: 4 };
      const result = calculator.toMixedNumber(fraction);
      
      expect(result).toEqual({
        whole: 1,
        fraction: { numerator: 3, denominator: 4 }
      });
    });

    it('should handle proper fractions', () => {
      const fraction: Fraction = { numerator: 3, denominator: 4 };
      const result = calculator.toMixedNumber(fraction);
      
      expect(result).toEqual({
        whole: 0,
        fraction: { numerator: 3, denominator: 4 }
      });
    });

    it('should handle negative fractions', () => {
      const fraction: Fraction = { numerator: -7, denominator: 4 };
      const result = calculator.toMixedNumber(fraction);
      
      expect(result).toEqual({
        whole: -1,
        fraction: { numerator: 3, denominator: 4 }
      });
    });
  });

  describe('toPracticalFraction', () => {
    it('should convert decimals to practical cooking fractions', () => {
      expect(calculator.toPracticalFraction(0.25)).toEqual({ numerator: 1, denominator: 4 });
      expect(calculator.toPracticalFraction(0.5)).toEqual({ numerator: 1, denominator: 2 });
      expect(calculator.toPracticalFraction(0.75)).toEqual({ numerator: 3, denominator: 4 });
    });

    it('should handle whole numbers', () => {
      expect(calculator.toPracticalFraction(2)).toEqual({ numerator: 2, denominator: 1 });
      expect(calculator.toPracticalFraction(0)).toEqual({ numerator: 0, denominator: 1 });
    });

    it('should handle mixed numbers', () => {
      const result = calculator.toPracticalFraction(1.25);
      expect(result).toEqual({ numerator: 5, denominator: 4 });
    });

    it('should find closest practical fraction', () => {
      // 0.3 should round to 1/3 (0.333)
      const result = calculator.toPracticalFraction(0.3);
      expect(result).toEqual({ numerator: 1, denominator: 3 });
    });
  });

  describe('formatForCooking', () => {
    it('should format whole numbers', () => {
      const fraction: Fraction = { numerator: 2, denominator: 1 };
      expect(calculator.formatForCooking(fraction)).toBe('2');
    });

    it('should format simple fractions with Unicode', () => {
      expect(calculator.formatForCooking({ numerator: 1, denominator: 2 })).toBe('½');
      expect(calculator.formatForCooking({ numerator: 1, denominator: 4 })).toBe('¼');
      expect(calculator.formatForCooking({ numerator: 3, denominator: 4 })).toBe('¾');
    });

    it('should format mixed numbers', () => {
      const fraction: Fraction = { numerator: 5, denominator: 4 };
      expect(calculator.formatForCooking(fraction)).toBe('1 ¼');
    });

    it('should format uncommon fractions without Unicode', () => {
      const fraction: Fraction = { numerator: 2, denominator: 5 };
      expect(calculator.formatForCooking(fraction)).toBe('2/5');
    });

    it('should handle zero', () => {
      const fraction: Fraction = { numerator: 0, denominator: 1 };
      expect(calculator.formatForCooking(fraction)).toBe('0');
    });
  });

  describe('edge cases', () => {
    it('should handle very small fractions', () => {
      const result = calculator.toPracticalFraction(0.01);
      // Should round to closest practical fraction (1/8 = 0.125)
      expect(result).toEqual({ numerator: 1, denominator: 8 });
    });

    it('should handle negative decimals', () => {
      const result = calculator.toPracticalFraction(-0.5);
      expect(result).toEqual({ numerator: -1, denominator: 2 });
    });

    it('should format negative fractions', () => {
      const fraction: Fraction = { numerator: -1, denominator: 2 };
      expect(calculator.formatForCooking(fraction)).toBe('-½');
    });
  });
});