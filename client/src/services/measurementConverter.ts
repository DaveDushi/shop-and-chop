import { 
  StandardMeasurement, 
  PracticalMeasurement, 
  MeasurementConverter as IMeasurementConverter,
  Fraction 
} from '../types/Scaling.types';
import { SCALING_CONSTANTS } from '../types/Scaling.types';
import { fractionCalculator } from './fractionCalculator';

/**
 * MeasurementConverter handles unit conversions and practical measurement rounding.
 * Supports both imperial and metric systems with accuracy requirements for cooking.
 */
export class MeasurementConverter implements IMeasurementConverter {

  /**
   * Convert a quantity and unit to a common standardized unit
   * @param quantity - The numeric quantity
   * @param unit - The unit string
   * @returns Standardized measurement
   */
  convertToCommonUnit(quantity: number, unit: string): StandardMeasurement {
    const normalizedUnit = this.normalizeUnit(unit);
    
    // Determine if this is a volume or weight measurement
    const volumeUnits = ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'pint', 'quart', 'gallon', 'liter', 'milliliter'];
    const weightUnits = ['pound', 'ounce', 'kilogram', 'gram'];
    
    if (volumeUnits.includes(normalizedUnit)) {
      return this.convertVolumeToCommonUnit(quantity, normalizedUnit);
    } else if (weightUnits.includes(normalizedUnit)) {
      return this.convertWeightToCommonUnit(quantity, normalizedUnit);
    } else {
      // For non-standard units (pieces, cloves, etc.), return as-is
      return {
        quantity,
        unit: normalizedUnit,
        system: 'imperial' // Default assumption
      };
    }
  }

  /**
   * Round a quantity to practical cooking measurements
   * @param quantity - The numeric quantity
   * @param unit - The unit string
   * @returns Practical measurement with fraction support
   */
  roundToPracticalMeasurement(quantity: number, unit: string): PracticalMeasurement {
    const normalizedUnit = this.normalizeUnit(unit);
    
    // Apply minimum and maximum limits
    const { adjustedQuantity, adjustedUnit } = this.applyQuantityLimits(quantity, normalizedUnit);
    
    // Convert to practical fractions for small quantities
    if (adjustedQuantity < 1 && this.isVolumeMeasurement(adjustedUnit)) {
      const fraction = fractionCalculator.toPracticalFraction(adjustedQuantity);
      const displayText = fractionCalculator.formatForCooking(fraction);
      
      return {
        quantity: adjustedQuantity,
        unit: adjustedUnit,
        displayText: `${displayText} ${adjustedUnit}`,
        fraction
      };
    }
    
    // Handle mixed numbers for quantities between 1 and 10
    if (adjustedQuantity >= 1 && adjustedQuantity < 10 && this.isVolumeMeasurement(adjustedUnit)) {
      const wholePart = Math.floor(adjustedQuantity);
      const fractionalPart = adjustedQuantity - wholePart;
      
      if (fractionalPart > 0.05) { // Only show fractions if significant
        const fraction = fractionCalculator.toPracticalFraction(fractionalPart);
        const mixedNumber = {
          whole: wholePart,
          fraction
        };
        
        const fractionDisplay = fractionCalculator.formatForCooking(fraction);
        const displayText = wholePart > 0 ? 
          `${wholePart} ${fractionDisplay} ${adjustedUnit}` : 
          `${fractionDisplay} ${adjustedUnit}`;
        
        return {
          quantity: adjustedQuantity,
          unit: adjustedUnit,
          displayText,
          mixedNumber
        };
      }
    }
    
    // For larger quantities or non-volume measurements, round to reasonable precision
    const roundedQuantity = this.roundToReasonablePrecision(adjustedQuantity);
    
    return {
      quantity: roundedQuantity,
      unit: adjustedUnit,
      displayText: `${roundedQuantity} ${adjustedUnit}`
    };
  }

  /**
   * Convert between imperial and metric systems
   * @param quantity - The numeric quantity
   * @param fromUnit - Source unit
   * @param toUnit - Target unit
   * @returns Converted quantity
   */
  convertBetweenSystems(quantity: number, fromUnit: string, toUnit: string): number {
    const normalizedFromUnit = this.normalizeUnit(fromUnit);
    const normalizedToUnit = this.normalizeUnit(toUnit);
    
    // Convert to common base unit first
    const fromStandard = this.convertToCommonUnit(quantity, normalizedFromUnit);
    
    // Convert from base unit to target unit
    const conversionFactor = this.getConversionFactor(normalizedToUnit);
    
    if (!conversionFactor) {
      // If no conversion available, return original quantity
      return quantity;
    }
    
    // Determine if we're converting volume or weight
    const volumeUnits = ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'pint', 'quart', 'gallon', 'liter', 'milliliter'];
    const weightUnits = ['pound', 'ounce', 'kilogram', 'gram'];
    
    if (volumeUnits.includes(normalizedFromUnit) && volumeUnits.includes(normalizedToUnit)) {
      // Volume to volume conversion
      return fromStandard.quantity / conversionFactor;
    } else if (weightUnits.includes(normalizedFromUnit) && weightUnits.includes(normalizedToUnit)) {
      // Weight to weight conversion  
      return fromStandard.quantity / conversionFactor;
    } else {
      // Cross-system or incompatible conversion
      return quantity;
    }
  }

  /**
   * Format a practical measurement for display
   * @param measurement - The practical measurement to format
   * @returns Formatted display string
   */
  formatForDisplay(measurement: PracticalMeasurement): string {
    return measurement.displayText;
  }

  /**
   * Normalize unit strings to standard forms
   * @param unit - The unit string to normalize
   * @returns Normalized unit string
   */
  private normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      // Volume units
      'c': 'cup',
      'cups': 'cup',
      'tbsp': 'tablespoon',
      'tablespoons': 'tablespoon',
      'tsp': 'teaspoon',
      'teaspoons': 'teaspoon',
      'fl oz': 'fluid ounce',
      'fluid ounces': 'fluid ounce',
      'pts': 'pint',
      'pints': 'pint',
      'qts': 'quart',
      'quarts': 'quart',
      'gal': 'gallon',
      'gallons': 'gallon',
      'l': 'liter',
      'liters': 'liter',
      'ml': 'milliliter',
      'milliliters': 'milliliter',
      
      // Weight units
      'lb': 'pound',
      'lbs': 'pound',
      'pounds': 'pound',
      'oz': 'ounce',
      'ounces': 'ounce',
      'kg': 'kilogram',
      'kilograms': 'kilogram',
      'g': 'gram',
      'grams': 'gram',
      
      // Count units
      'piece': 'pieces',
      'clove': 'cloves',
      'head': 'heads',
      'can': 'cans',
      'bottle': 'bottles',
      'whole': 'whole'
    };
    
    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || normalized;
  }

  /**
   * Convert volume measurements to milliliters (common base)
   * @param quantity - The quantity to convert
   * @param unit - The normalized unit
   * @returns Standard measurement in milliliters
   */
  private convertVolumeToCommonUnit(quantity: number, unit: string): StandardMeasurement {
    const conversionFactor = SCALING_CONSTANTS.UNIT_CONVERSIONS[unit as keyof typeof SCALING_CONSTANTS.UNIT_CONVERSIONS];
    
    if (!conversionFactor) {
      return { quantity, unit, system: 'imperial' };
    }
    
    const convertedQuantity = quantity * conversionFactor;
    const system = ['liter', 'milliliter'].includes(unit) ? 'metric' : 'imperial';
    
    return {
      quantity: convertedQuantity,
      unit: 'milliliter',
      system
    };
  }

  /**
   * Convert weight measurements to grams (common base)
   * @param quantity - The quantity to convert
   * @param unit - The normalized unit
   * @returns Standard measurement in grams
   */
  private convertWeightToCommonUnit(quantity: number, unit: string): StandardMeasurement {
    const conversionFactor = SCALING_CONSTANTS.UNIT_CONVERSIONS[unit as keyof typeof SCALING_CONSTANTS.UNIT_CONVERSIONS];
    
    if (!conversionFactor) {
      return { quantity, unit, system: 'imperial' };
    }
    
    const convertedQuantity = quantity * conversionFactor;
    const system = ['kilogram', 'gram'].includes(unit) ? 'metric' : 'imperial';
    
    return {
      quantity: convertedQuantity,
      unit: 'gram',
      system
    };
  }

  /**
   * Get conversion factor for a unit
   * @param unit - The normalized unit
   * @returns Conversion factor or null if not found
   */
  private getConversionFactor(unit: string): number | null {
    return SCALING_CONSTANTS.UNIT_CONVERSIONS[unit as keyof typeof SCALING_CONSTANTS.UNIT_CONVERSIONS] || null;
  }

  /**
   * Check if a unit is a volume measurement
   * @param unit - The normalized unit
   * @returns True if volume measurement
   */
  private isVolumeMeasurement(unit: string): boolean {
    const volumeUnits = ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'pint', 'quart', 'gallon', 'liter', 'milliliter'];
    return volumeUnits.includes(unit);
  }

  /**
   * Apply minimum and maximum quantity limits and unit scaling
   * @param quantity - The original quantity
   * @param unit - The normalized unit
   * @returns Adjusted quantity and unit
   */
  private applyQuantityLimits(quantity: number, unit: string): { adjustedQuantity: number; adjustedUnit: string } {
    // Handle zero quantities - don't apply minimums
    if (quantity === 0) {
      return { adjustedQuantity: quantity, adjustedUnit: unit };
    }
    
    // Minimum practical amounts
    const minimums: Record<string, number> = {
      'teaspoon': 1/32,  // Pinch
      'tablespoon': 1/8,
      'cup': 1/8,
      'gram': 1,
      'ounce': 1/16
    };
    
    // Maximum amounts before unit conversion
    const maximums: Record<string, { max: number; convertTo: string; factor: number }> = {
      'teaspoon': { max: 12, convertTo: 'tablespoon', factor: 1/3 },
      'tablespoon': { max: 8, convertTo: 'cup', factor: 1/16 },
      'fluid ounce': { max: 16, convertTo: 'cup', factor: 1/8 },
      'gram': { max: 1000, convertTo: 'kilogram', factor: 1/1000 },
      'ounce': { max: 16, convertTo: 'pound', factor: 1/16 }
    };
    
    let adjustedQuantity = quantity;
    let adjustedUnit = unit;
    
    // Apply minimum limits (only for non-zero quantities)
    const minimum = minimums[unit];
    if (minimum && adjustedQuantity < minimum) {
      adjustedQuantity = minimum;
    }
    
    // Apply maximum limits and unit conversion
    const maximum = maximums[unit];
    if (maximum && adjustedQuantity >= maximum.max) {
      adjustedQuantity = adjustedQuantity * maximum.factor;
      adjustedUnit = maximum.convertTo;
    }
    
    return { adjustedQuantity, adjustedUnit };
  }

  /**
   * Round quantity to reasonable precision based on magnitude
   * @param quantity - The quantity to round
   * @returns Rounded quantity
   */
  private roundToReasonablePrecision(quantity: number): number {
    if (quantity < 1) {
      // Round to nearest 1/32 for very small amounts
      return Math.round(quantity * 32) / 32;
    } else if (quantity < 10) {
      // Round to nearest 1/8 for small amounts
      return Math.round(quantity * 8) / 8;
    } else if (quantity < 100) {
      // Round to nearest 1/4 for medium amounts
      return Math.round(quantity * 4) / 4;
    } else {
      // Round to nearest whole number for large amounts
      return Math.round(quantity);
    }
  }
}

// Export singleton instance
export const measurementConverter = new MeasurementConverter();