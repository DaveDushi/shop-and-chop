import { Recipe, Ingredient } from './Recipe.types';

// Core scaling interfaces
export interface ScaledRecipe {
  id: string;
  originalRecipe: Recipe;
  scalingFactor: number;
  effectiveServings: number;
  scaledIngredients: ScaledIngredient[];
  scalingSource: 'household' | 'manual';
  manualServingOverride?: number;
  scalingIssues?: {
    ingredientErrorCount: number;
    hasParsingIssues: boolean;
    message: string;
  };
}

export interface ScaledIngredient {
  id: string;
  name: string;
  originalQuantity: number;
  originalUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  displayQuantity: string; // Human-readable format (e.g., "1⅓ cups")
  conversionApplied: boolean;
  category: string;
  parsingIssues?: {
    originalText: string;
    fallbackUsed: boolean;
    message: string;
  };
}

// Measurement and fraction interfaces
export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface MixedNumber {
  whole: number;
  fraction: Fraction;
}

export interface PracticalMeasurement {
  quantity: number;
  unit: string;
  displayText: string;
  fraction?: Fraction;
  mixedNumber?: MixedNumber;
}

export interface StandardMeasurement {
  quantity: number;
  unit: string;
  system: 'imperial' | 'metric';
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Service interfaces
export interface ScalingService {
  calculateScalingFactor(originalServings: number, targetServings: number): number;
  scaleRecipe(recipe: Recipe, scalingFactor: number): ScaledRecipe;
  getEffectiveServingSize(recipe: Recipe, householdSize: number, manualOverride?: number): number;
  scaleIngredientQuantity(ingredient: Ingredient, scalingFactor: number): ScaledIngredient;
}

export interface MeasurementConverter {
  convertToCommonUnit(quantity: number, unit: string): StandardMeasurement;
  roundToPracticalMeasurement(quantity: number, unit: string): PracticalMeasurement;
  convertBetweenSystems(quantity: number, fromUnit: string, toUnit: string): number;
  formatForDisplay(measurement: PracticalMeasurement): string;
}

export interface FractionCalculator {
  multiply(fraction: Fraction, factor: number): Fraction;
  simplify(fraction: Fraction): Fraction;
  toMixedNumber(improperFraction: Fraction): MixedNumber;
  toPracticalFraction(decimal: number): Fraction;
  formatForCooking(fraction: Fraction): string;
}

export interface UserPreferencesService {
  getHouseholdSize(userId: string): Promise<number>;
  setHouseholdSize(userId: string, size: number): Promise<void>;
  validateHouseholdSize(size: number): ValidationResult;
}

// Extended meal plan interfaces
export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string;
  mealType: string;
  manualServingOverride?: number; // New field for manual overrides
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtendedMealPlanService {
  setManualServingOverride(mealPlanId: string, recipeId: string, servings: number): Promise<void>;
  removeManualServingOverride(mealPlanId: string, recipeId: string): Promise<void>;
  getEffectiveServings(mealPlanId: string, recipeId: string): Promise<number>;
}

// Constants for scaling calculations
export const SCALING_CONSTANTS = {
  DEFAULT_HOUSEHOLD_SIZE: 2,
  MIN_HOUSEHOLD_SIZE: 1,
  MAX_HOUSEHOLD_SIZE: 20,
  MIN_SCALING_FACTOR: 0.125, // 1/8
  MAX_SCALING_FACTOR: 20,
  DEFAULT_RECIPE_SERVINGS: 1,
  CONVERSION_ACCURACY_THRESHOLD: 0.05, // 5%
  
  // Practical fractions for rounding
  PRACTICAL_FRACTIONS: [
    { decimal: 0.125, fraction: { numerator: 1, denominator: 8 } },
    { decimal: 0.167, fraction: { numerator: 1, denominator: 6 } },
    { decimal: 0.25, fraction: { numerator: 1, denominator: 4 } },
    { decimal: 0.333, fraction: { numerator: 1, denominator: 3 } },
    { decimal: 0.5, fraction: { numerator: 1, denominator: 2 } },
    { decimal: 0.667, fraction: { numerator: 2, denominator: 3 } },
    { decimal: 0.75, fraction: { numerator: 3, denominator: 4 } },
  ],
  
  // Unit conversion constants
  UNIT_CONVERSIONS: {
    // Volume conversions to mL
    'cup': 236.59,
    'tablespoon': 14.79,
    'teaspoon': 4.93,
    'fluid ounce': 29.57,
    'pint': 473.18,
    'quart': 946.35,
    'gallon': 3785.41,
    'liter': 1000,
    'milliliter': 1,
    
    // Weight conversions to grams
    'pound': 453.59,
    'ounce': 28.35,
    'kilogram': 1000,
    'gram': 1,
  }
} as const;