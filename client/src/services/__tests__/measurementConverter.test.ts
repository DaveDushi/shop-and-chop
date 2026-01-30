import { MeasurementConverter } from '../measurementConverter';
import { StandardMeasurement, PracticalMeasurement } from '../../types/Scaling.types';

describe('MeasurementConverter', () => {
  let converter: MeasurementConverter;

  beforeEach(() => {
    converter = new MeasurementConverter();
  });

  describe('convertToCommonUnit', () => {
    it('should convert volume units to milliliters', () => {
      const result = converter.convertToCommonUnit(1, 'cup');
      expect(result).toEqual({
        quantity: 236.59,
        unit: 'milliliter',
        system: 'imperial'
      });
    });

    it('should convert weight units to grams', () => {
      const result = converter.convertToCommonUnit(1, 'pound');
      expect(result).toEqual({
        quantity: 453.59,
        unit: 'gram',
        system: 'imperial'
      });
    });

    it('should handle metric units', () => {
      const result = converter.convertToCommonUnit(500, 'milliliter');
      expect(result).toEqual({
        quantity: 500,
        unit: 'milliliter',
        system: 'metric'
      });
    });

    it('should handle non-standard units', () => {
      const result = converter.convertToCommonUnit(2, 'pieces');
      expect(result).toEqual({
        quantity: 2,
        unit: 'pieces',
        system: 'imperial'
      });
    });

    it('should normalize unit names', () => {
      const result = converter.convertToCommonUnit(1, 'tbsp');
      expect(result).toEqual({
        quantity: 14.79,
        unit: 'milliliter',
        system: 'imperial'
      });
    });
  });

  describe('roundToPracticalMeasurement', () => {
    it('should convert small quantities to fractions', () => {
      const result = converter.roundToPracticalMeasurement(0.25, 'cup');
      
      expect(result.quantity).toBe(0.25);
      expect(result.unit).toBe('cup');
      expect(result.displayText).toBe('¼ cup');
      expect(result.fraction).toEqual({ numerator: 1, denominator: 4 });
    });

    it('should handle mixed numbers', () => {
      const result = converter.roundToPracticalMeasurement(1.5, 'cup');
      
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('cup');
      expect(result.displayText).toBe('1 ½ cup');
      expect(result.mixedNumber).toEqual({
        whole: 1,
        fraction: { numerator: 1, denominator: 2 }
      });
    });

    it('should round large quantities to reasonable precision', () => {
      const result = converter.roundToPracticalMeasurement(15.7, 'ounce');
      
      expect(result.quantity).toBe(15.75); // Rounds to nearest 1/4
      expect(result.unit).toBe('ounce');
      expect(result.displayText).toBe('15.75 ounce');
    });

    it('should apply minimum limits', () => {
      const result = converter.roundToPracticalMeasurement(0.01, 'teaspoon');
      
      expect(result.quantity).toBe(1/32);
      expect(result.unit).toBe('teaspoon');
    });

    it('should convert units when exceeding maximums', () => {
      const result = converter.roundToPracticalMeasurement(20, 'teaspoons');
      
      // 20 teaspoons should convert to tablespoons (20 * 1/3 = 6.67 tbsp)
      expect(result.unit).toBe('tablespoon');
      expect(result.quantity).toBeCloseTo(6.67, 1);
    });
  });

  describe('convertBetweenSystems', () => {
    it('should convert between volume units', () => {
      const result = converter.convertBetweenSystems(1, 'cup', 'milliliter');
      expect(result).toBeCloseTo(236.59, 1);
    });

    it('should convert between weight units', () => {
      const result = converter.convertBetweenSystems(1, 'pound', 'gram');
      expect(result).toBeCloseTo(453.59, 1);
    });

    it('should handle metric to imperial conversion', () => {
      const result = converter.convertBetweenSystems(500, 'milliliter', 'cup');
      expect(result).toBeCloseTo(2.11, 1); // 500ml ≈ 2.11 cups
    });

    it('should return original quantity for incompatible units', () => {
      const result = converter.convertBetweenSystems(2, 'pieces', 'cup');
      expect(result).toBe(2);
    });

    it('should handle unit normalization in conversion', () => {
      const result = converter.convertBetweenSystems(1, 'tbsp', 'tsp');
      expect(result).toBeCloseTo(3, 1); // 1 tablespoon = 3 teaspoons
    });
  });

  describe('formatForDisplay', () => {
    it('should return the display text from practical measurement', () => {
      const measurement: PracticalMeasurement = {
        quantity: 0.5,
        unit: 'cup',
        displayText: '½ cup'
      };
      
      expect(converter.formatForDisplay(measurement)).toBe('½ cup');
    });
  });

  describe('edge cases and accuracy', () => {
    it('should maintain accuracy within 5% for conversions', () => {
      // Test round-trip conversion
      const original = 1;
      const converted = converter.convertBetweenSystems(original, 'cup', 'milliliter');
      const backConverted = converter.convertBetweenSystems(converted, 'milliliter', 'cup');
      
      const accuracy = Math.abs(original - backConverted) / original;
      expect(accuracy).toBeLessThan(0.05); // Within 5%
    });

    it('should handle zero quantities', () => {
      const result = converter.roundToPracticalMeasurement(0, 'cup');
      expect(result.quantity).toBe(0);
      expect(result.displayText).toBe('0 cup');
    });

    it('should handle very large quantities', () => {
      const result = converter.roundToPracticalMeasurement(1000, 'gram');
      
      // Should convert to kilogram
      expect(result.unit).toBe('kilogram');
      expect(result.quantity).toBe(1);
    });

    it('should handle fractional input correctly', () => {
      const result = converter.roundToPracticalMeasurement(0.333, 'cup');
      
      // Should round to 1/3 cup
      expect(result.displayText).toBe('⅓ cup');
      expect(result.fraction).toEqual({ numerator: 1, denominator: 3 });
    });
  });

  describe('unit normalization', () => {
    it('should normalize common abbreviations', () => {
      expect(converter.convertToCommonUnit(1, 'c').unit).toBe('milliliter');
      expect(converter.convertToCommonUnit(1, 'tbsp').unit).toBe('milliliter');
      expect(converter.convertToCommonUnit(1, 'tsp').unit).toBe('milliliter');
      expect(converter.convertToCommonUnit(1, 'lb').unit).toBe('gram');
      expect(converter.convertToCommonUnit(1, 'oz').unit).toBe('gram');
    });

    it('should handle plural forms', () => {
      expect(converter.convertToCommonUnit(2, 'cups').unit).toBe('milliliter');
      expect(converter.convertToCommonUnit(2, 'pounds').unit).toBe('gram');
      expect(converter.convertToCommonUnit(2, 'pieces').unit).toBe('pieces');
    });

    it('should handle case insensitive input', () => {
      expect(converter.convertToCommonUnit(1, 'CUP').unit).toBe('milliliter');
      expect(converter.convertToCommonUnit(1, 'Cup').unit).toBe('milliliter');
    });
  });
});