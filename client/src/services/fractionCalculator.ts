import { Fraction, MixedNumber, FractionCalculator as IFractionCalculator } from '../types/Scaling.types';
import { SCALING_CONSTANTS } from '../types/Scaling.types';

/**
 * FractionCalculator handles fractional arithmetic and simplification for cooking measurements.
 * Implements practical fraction rounding suitable for cooking applications.
 */
export class FractionCalculator implements IFractionCalculator {
  
  /**
   * Multiply a fraction by a numeric factor
   * @param fraction - The fraction to multiply
   * @param factor - The numeric factor to multiply by
   * @returns Simplified fraction result
   */
  multiply(fraction: Fraction, factor: number): Fraction {
    // Convert factor to fraction for precise multiplication
    const factorFraction = this.decimalToFraction(factor);
    
    // Multiply: (a/b) * (c/d) = (a*c)/(b*d)
    const numerator = fraction.numerator * factorFraction.numerator;
    const denominator = fraction.denominator * factorFraction.denominator;
    
    return this.simplify({ numerator, denominator });
  }

  /**
   * Simplify a fraction to its lowest terms
   * @param fraction - The fraction to simplify
   * @returns Simplified fraction
   */
  simplify(fraction: Fraction): Fraction {
    const { numerator, denominator } = fraction;
    
    // Handle edge cases
    if (denominator === 0) {
      throw new Error('Cannot simplify fraction with zero denominator');
    }
    
    if (numerator === 0) {
      return { numerator: 0, denominator: 1 };
    }
    
    // Find greatest common divisor
    const gcd = this.greatestCommonDivisor(Math.abs(numerator), Math.abs(denominator));
    
    // Simplify and handle sign
    const simplifiedNumerator = numerator / gcd;
    const simplifiedDenominator = denominator / gcd;
    
    // Ensure denominator is positive
    if (simplifiedDenominator < 0) {
      return {
        numerator: -simplifiedNumerator,
        denominator: -simplifiedDenominator
      };
    }
    
    return {
      numerator: simplifiedNumerator,
      denominator: simplifiedDenominator
    };
  }

  /**
   * Convert an improper fraction to a mixed number
   * @param improperFraction - The improper fraction to convert
   * @returns Mixed number representation
   */
  toMixedNumber(improperFraction: Fraction): MixedNumber {
    const simplified = this.simplify(improperFraction);
    const { numerator, denominator } = simplified;
    
    // Calculate whole part and remainder
    const whole = Math.floor(Math.abs(numerator) / denominator);
    const remainder = Math.abs(numerator) % denominator;
    
    // Handle sign
    const sign = numerator < 0 ? -1 : 1;
    
    return {
      whole: whole * sign,
      fraction: {
        numerator: remainder,
        denominator: denominator
      }
    };
  }

  /**
   * Convert a decimal to the nearest practical cooking fraction
   * @param decimal - The decimal value to convert
   * @returns Practical fraction for cooking
   */
  toPracticalFraction(decimal: number): Fraction {
    // Handle whole numbers
    if (Math.abs(decimal - Math.round(decimal)) < 0.001) {
      return { numerator: Math.round(decimal), denominator: 1 };
    }
    
    // Handle sign
    const sign = decimal < 0 ? -1 : 1;
    const absDecimal = Math.abs(decimal);
    
    // Find the closest practical fraction for the absolute value
    let closestFraction = SCALING_CONSTANTS.PRACTICAL_FRACTIONS[0].fraction;
    let smallestDifference = Math.abs(absDecimal - SCALING_CONSTANTS.PRACTICAL_FRACTIONS[0].decimal);
    
    for (const practicalFraction of SCALING_CONSTANTS.PRACTICAL_FRACTIONS) {
      const difference = Math.abs(absDecimal - practicalFraction.decimal);
      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestFraction = practicalFraction.fraction;
      }
    }
    
    // If the decimal is close to a whole number plus a fraction, handle mixed numbers
    const wholePart = Math.floor(absDecimal);
    const fractionalPart = absDecimal - wholePart;
    
    if (wholePart > 0 && fractionalPart > 0.05) {
      // Find best fraction for the fractional part
      let bestFractionalFraction = SCALING_CONSTANTS.PRACTICAL_FRACTIONS[0].fraction;
      let smallestFractionalDifference = Math.abs(fractionalPart - SCALING_CONSTANTS.PRACTICAL_FRACTIONS[0].decimal);
      
      for (const practicalFraction of SCALING_CONSTANTS.PRACTICAL_FRACTIONS) {
        const difference = Math.abs(fractionalPart - practicalFraction.decimal);
        if (difference < smallestFractionalDifference) {
          smallestFractionalDifference = difference;
          bestFractionalFraction = practicalFraction.fraction;
        }
      }
      
      // Convert mixed number back to improper fraction
      const improperNumerator = (wholePart * bestFractionalFraction.denominator + bestFractionalFraction.numerator) * sign;
      
      return this.simplify({
        numerator: improperNumerator,
        denominator: bestFractionalFraction.denominator
      });
    }
    
    // Apply sign to the result
    return {
      numerator: closestFraction.numerator * sign,
      denominator: closestFraction.denominator
    };
  }

  /**
   * Format a fraction for cooking display with Unicode fractions where possible
   * @param fraction - The fraction to format
   * @returns Human-readable fraction string
   */
  formatForCooking(fraction: Fraction): string {
    const simplified = this.simplify(fraction);
    const { numerator, denominator } = simplified;
    
    // Handle whole numbers
    if (denominator === 1) {
      return numerator.toString();
    }
    
    // Handle zero
    if (numerator === 0) {
      return '0';
    }
    
    // Convert to mixed number if improper
    if (Math.abs(numerator) >= denominator) {
      const mixed = this.toMixedNumber(simplified);
      
      if (mixed.fraction.numerator === 0) {
        return mixed.whole.toString();
      }
      
      const fractionPart = this.formatSimpleFraction(mixed.fraction);
      return mixed.whole === 0 ? fractionPart : `${mixed.whole} ${fractionPart}`;
    }
    
    // Format simple fraction
    return this.formatSimpleFraction(simplified);
  }

  /**
   * Format a simple fraction with Unicode characters where available
   * @param fraction - The simple fraction to format
   * @returns Formatted fraction string
   */
  private formatSimpleFraction(fraction: Fraction): string {
    const { numerator, denominator } = fraction;
    
    // Unicode fraction mappings for common cooking fractions
    const unicodeFractions: Record<string, string> = {
      '1/8': '⅛',
      '1/6': '⅙', 
      '1/4': '¼',
      '1/3': '⅓',
      '1/2': '½',
      '2/3': '⅔',
      '3/4': '¾',
      '3/8': '⅜',
      '5/8': '⅝',
      '7/8': '⅞'
    };
    
    // Handle negative fractions
    const isNegative = numerator < 0;
    const absNumerator = Math.abs(numerator);
    const fractionKey = `${absNumerator}/${denominator}`;
    
    // Return Unicode version if available
    if (unicodeFractions[fractionKey]) {
      return isNegative ? `-${unicodeFractions[fractionKey]}` : unicodeFractions[fractionKey];
    }
    
    // Return standard fraction notation
    return `${numerator}/${denominator}`;
  }

  /**
   * Convert a decimal to a fraction using continued fractions algorithm
   * @param decimal - The decimal to convert
   * @returns Fraction representation
   */
  private decimalToFraction(decimal: number): Fraction {
    // Handle whole numbers
    if (Math.abs(decimal - Math.round(decimal)) < 0.000001) {
      return { numerator: Math.round(decimal), denominator: 1 };
    }
    
    // Use continued fractions algorithm for precise conversion
    const sign = decimal < 0 ? -1 : 1;
    const absDecimal = Math.abs(decimal);
    
    let wholePart = Math.floor(absDecimal);
    let fractionalPart = absDecimal - wholePart;
    
    // Simple cases for common decimals
    if (Math.abs(fractionalPart - 0.5) < 0.000001) {
      return { numerator: (wholePart * 2 + 1) * sign, denominator: 2 };
    }
    if (Math.abs(fractionalPart - 0.25) < 0.000001) {
      return { numerator: (wholePart * 4 + 1) * sign, denominator: 4 };
    }
    if (Math.abs(fractionalPart - 0.75) < 0.000001) {
      return { numerator: (wholePart * 4 + 3) * sign, denominator: 4 };
    }
    
    // For more complex decimals, use a reasonable approximation
    // Limit denominator to practical cooking values
    const maxDenominator = 32;
    let bestNumerator = 1;
    let bestDenominator = 1;
    let smallestError = Math.abs(decimal - 1);
    
    for (let denominator = 1; denominator <= maxDenominator; denominator++) {
      const numerator = Math.round(decimal * denominator);
      const approximation = numerator / denominator;
      const error = Math.abs(decimal - approximation);
      
      if (error < smallestError) {
        smallestError = error;
        bestNumerator = numerator;
        bestDenominator = denominator;
      }
      
      // If we found an exact match, stop
      if (error < 0.000001) {
        break;
      }
    }
    
    return this.simplify({ numerator: bestNumerator, denominator: bestDenominator });
  }

  /**
   * Calculate the greatest common divisor of two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Greatest common divisor
   */
  private greatestCommonDivisor(a: number, b: number): number {
    // Euclidean algorithm
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}

// Export singleton instance
export const fractionCalculator = new FractionCalculator();