import { Recipe, Ingredient } from '../types/Recipe.types';
import { 
  ScaledRecipe, 
  ScaledIngredient, 
  ScalingService as IScalingService,
  SCALING_CONSTANTS 
} from '../types/Scaling.types';
import { 
  ScalingError, 
  ErrorRecovery, 
  ErrorLogger,
  ERROR_CODES 
} from '../utils/errorHandling';

/**
 * Core scaling service for recipe ingredient calculations
 * Implements the Recipe Conversion Factor (RCF) approach where:
 * scaling factor = target servings ÷ original servings
 */
export class ScalingService implements IScalingService {
  
  /**
   * Calculate scaling factor for recipe conversion with enhanced error handling
   * @param originalServings - Original recipe serving size
   * @param targetServings - Target serving size (household size or manual override)
   * @returns Scaling factor clamped to safe limits
   */
  calculateScalingFactor(originalServings: number, targetServings: number): number {
    try {
      // Validate inputs
      if (typeof originalServings !== 'number' || typeof targetServings !== 'number') {
        throw new ScalingError(
          'Serving sizes must be numbers',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'servings'
        );
      }

      if (!isFinite(originalServings) || !isFinite(targetServings)) {
        throw new ScalingError(
          'Serving sizes must be finite numbers',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'servings'
        );
      }

      if (targetServings <= 0) {
        throw new ScalingError(
          'Target servings must be greater than zero',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'targetServings'
        );
      }

      // Handle edge cases for original servings
      const safeOriginalServings = originalServings > 0 ? originalServings : SCALING_CONSTANTS.DEFAULT_RECIPE_SERVINGS;
      
      // Calculate raw scaling factor
      const rawFactor = targetServings / safeOriginalServings;
      
      // Check for extreme scaling factors
      if (rawFactor < SCALING_CONSTANTS.MIN_SCALING_FACTOR) {
        ErrorLogger.logError(
          new Error(`Scaling factor ${rawFactor} below minimum, clamping to ${SCALING_CONSTANTS.MIN_SCALING_FACTOR}`),
          'ScalingService.calculateScalingFactor',
          { originalServings, targetServings, rawFactor }
        );
      }
      
      if (rawFactor > SCALING_CONSTANTS.MAX_SCALING_FACTOR) {
        ErrorLogger.logError(
          new Error(`Scaling factor ${rawFactor} above maximum, clamping to ${SCALING_CONSTANTS.MAX_SCALING_FACTOR}`),
          'ScalingService.calculateScalingFactor',
          { originalServings, targetServings, rawFactor }
        );
      }
      
      // Clamp to safe limits to prevent unrealistic scaling
      return Math.max(
        SCALING_CONSTANTS.MIN_SCALING_FACTOR,
        Math.min(SCALING_CONSTANTS.MAX_SCALING_FACTOR, rawFactor)
      );
    } catch (error) {
      if (error instanceof ScalingError) {
        throw error;
      }
      
      ErrorLogger.logError(
        error as Error,
        'ScalingService.calculateScalingFactor',
        { originalServings, targetServings }
      );
      
      // Return a safe default scaling factor
      return 1.0;
    }
  }

  /**
   * Determine effective serving size based on household size and manual overrides
   * @param recipe - Recipe to scale
   * @param householdSize - User's household size
   * @param manualOverride - Optional manual serving override
   * @returns Effective serving size to use for scaling
   */
  getEffectiveServingSize(recipe: Recipe, householdSize: number, manualOverride?: number): number {
    // Manual override takes precedence over household size
    if (manualOverride !== undefined && manualOverride > 0) {
      return manualOverride;
    }
    
    // Fall back to household size
    return householdSize;
  }

  /**
   * Scale a single ingredient quantity with enhanced error handling for unparseable quantities
   * @param ingredient - Ingredient to scale
   * @param scalingFactor - Scaling factor to apply
   * @returns Scaled ingredient with converted measurements
   */
  scaleIngredientQuantity(ingredient: Ingredient, scalingFactor: number): ScaledIngredient {
    try {
      // Validate inputs
      if (!ingredient) {
        throw new ScalingError(
          'Ingredient is required',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'ingredient'
        );
      }

      if (typeof scalingFactor !== 'number' || !isFinite(scalingFactor)) {
        throw new ScalingError(
          'Scaling factor must be a finite number',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'scalingFactor'
        );
      }

      if (scalingFactor <= 0) {
        throw new ScalingError(
          'Scaling factor must be greater than zero',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'scalingFactor'
        );
      }

      // Parse original quantity with enhanced error handling
      const quantityResult = ErrorRecovery.parseQuantityWithFallback(ingredient.quantity);
      
      if (!quantityResult.parsed) {
        // Log unparseable quantity for monitoring
        ErrorLogger.logError(
          new Error(`Unparseable ingredient quantity: "${ingredient.quantity}"`),
          'ScalingService.scaleIngredientQuantity',
          { 
            ingredient: ingredient.name, 
            originalQuantity: ingredient.quantity,
            fallbackQuantity: quantityResult.quantity
          }
        );
      }
      
      // Calculate scaled quantity
      const scaledQuantity = quantityResult.quantity * scalingFactor;
      
      // Validate scaled quantity is reasonable
      if (!isFinite(scaledQuantity) || scaledQuantity < 0) {
        throw new ScalingError(
          'Scaled quantity calculation resulted in invalid value',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'scaledQuantity'
        );
      }

      // Cap extremely large quantities
      const cappedQuantity = Math.min(scaledQuantity, 10000); // Reasonable upper limit
      if (cappedQuantity !== scaledQuantity) {
        ErrorLogger.logError(
          new Error(`Scaled quantity ${scaledQuantity} capped to ${cappedQuantity}`),
          'ScalingService.scaleIngredientQuantity',
          { 
            ingredient: ingredient.name,
            originalQuantity: quantityResult.quantity,
            scalingFactor,
            scaledQuantity,
            cappedQuantity
          }
        );
      }
      
      // For now, keep the same unit (measurement conversion will be added in task 4)
      const scaledUnit = ingredient.unit;
      
      // Create display quantity with fallback handling
      let displayQuantity: string;
      if (quantityResult.parsed) {
        displayQuantity = this.formatQuantityForDisplay(cappedQuantity, scaledUnit);
      } else {
        // For unparseable quantities, show both original and scaled info
        displayQuantity = `~${this.formatQuantityForDisplay(cappedQuantity, scaledUnit)} (scaled from "${quantityResult.originalText}")`;
      }
      
      return {
        id: ingredient.id,
        name: ingredient.name,
        originalQuantity: quantityResult.quantity,
        originalUnit: ingredient.unit,
        scaledQuantity: cappedQuantity,
        scaledUnit,
        displayQuantity,
        conversionApplied: false, // Will be true when unit conversion is applied
        category: ingredient.category,
        // Add metadata about parsing issues
        parsingIssues: !quantityResult.parsed ? {
          originalText: quantityResult.originalText,
          fallbackUsed: true,
          message: 'Original quantity could not be parsed precisely'
        } : undefined
      };
    } catch (error) {
      if (error instanceof ScalingError) {
        throw error;
      }
      
      ErrorLogger.logError(
        error as Error,
        'ScalingService.scaleIngredientQuantity',
        { ingredient: ingredient?.name, scalingFactor }
      );
      
      // Return a safe fallback scaled ingredient
      return {
        id: ingredient?.id || 'unknown',
        name: ingredient?.name || 'Unknown ingredient',
        originalQuantity: 1,
        originalUnit: ingredient?.unit || '',
        scaledQuantity: scalingFactor,
        scaledUnit: ingredient?.unit || '',
        displayQuantity: `${scalingFactor} ${ingredient?.unit || ''}`,
        conversionApplied: false,
        category: ingredient?.category,
        parsingIssues: {
          originalText: ingredient?.quantity || '',
          fallbackUsed: true,
          message: 'Error occurred during scaling calculation'
        }
      };
    }
  }

  /**
   * Scale an entire recipe with comprehensive error handling
   * @param recipe - Recipe to scale
   * @param scalingFactor - Scaling factor to apply
   * @returns Scaled recipe with all ingredients scaled
   */
  scaleRecipe(recipe: Recipe, scalingFactor: number): ScaledRecipe {
    try {
      // Validate inputs
      if (!recipe) {
        throw new ScalingError(
          'Recipe is required',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'recipe'
        );
      }

      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        throw new ScalingError(
          'Recipe must have ingredients array',
          ERROR_CODES.CORRUPTED_RECIPE_DATA,
          'ingredients'
        );
      }

      if (typeof scalingFactor !== 'number' || !isFinite(scalingFactor) || scalingFactor <= 0) {
        throw new ScalingError(
          'Scaling factor must be a positive finite number',
          ERROR_CODES.SCALING_CALCULATION_ERROR,
          'scalingFactor'
        );
      }

      // Scale all ingredients with error handling for individual ingredients
      const scaledIngredients: ScaledIngredient[] = [];
      const ingredientErrors: Array<{ ingredient: string; error: Error }> = [];

      for (const ingredient of recipe.ingredients) {
        try {
          const scaledIngredient = this.scaleIngredientQuantity(ingredient, scalingFactor);
          scaledIngredients.push(scaledIngredient);
        } catch (error) {
          // Log individual ingredient errors but continue with others
          const ingredientError = {
            ingredient: ingredient?.name || 'Unknown',
            error: error as Error
          };
          ingredientErrors.push(ingredientError);
          
          ErrorLogger.logError(
            error as Error,
            'ScalingService.scaleRecipe.ingredient',
            { 
              recipe: recipe.name,
              ingredient: ingredient?.name,
              scalingFactor
            }
          );

          // Add a fallback scaled ingredient
          scaledIngredients.push({
            id: ingredient?.id || 'error',
            name: ingredient?.name || 'Unknown ingredient',
            originalQuantity: 1,
            originalUnit: ingredient?.unit || '',
            scaledQuantity: scalingFactor,
            scaledUnit: ingredient?.unit || '',
            displayQuantity: `${scalingFactor} ${ingredient?.unit || ''} (error in scaling)`,
            conversionApplied: false,
            category: ingredient?.category,
            parsingIssues: {
              originalText: ingredient?.quantity || '',
              fallbackUsed: true,
              message: 'Error occurred during ingredient scaling'
            }
          });
        }
      }

      // Log if there were ingredient errors
      if (ingredientErrors.length > 0) {
        ErrorLogger.logError(
          new Error(`${ingredientErrors.length} ingredients had scaling errors`),
          'ScalingService.scaleRecipe',
          { 
            recipe: recipe.name,
            ingredientErrors: ingredientErrors.map(e => ({
              ingredient: e.ingredient,
              error: e.error.message
            }))
          }
        );
      }
      
      // Calculate effective servings - handle zero servings by using default
      const originalServings = recipe.servings > 0 ? recipe.servings : SCALING_CONSTANTS.DEFAULT_RECIPE_SERVINGS;
      const effectiveServings = Math.round(originalServings * scalingFactor);
      
      return {
        id: recipe.id,
        originalRecipe: recipe,
        scalingFactor,
        effectiveServings,
        scaledIngredients,
        scalingSource: 'household', // Will be determined by caller based on override presence
        manualServingOverride: undefined, // Will be set by caller if applicable
        scalingIssues: ingredientErrors.length > 0 ? {
          ingredientErrorCount: ingredientErrors.length,
          hasParsingIssues: scaledIngredients.some(ing => ing.parsingIssues?.fallbackUsed),
          message: `${ingredientErrors.length} ingredients had scaling issues`
        } : undefined
      };
    } catch (error) {
      if (error instanceof ScalingError) {
        throw error;
      }
      
      ErrorLogger.logError(
        error as Error,
        'ScalingService.scaleRecipe',
        { recipe: recipe?.name, scalingFactor }
      );
      
      // Return a minimal fallback scaled recipe
      throw new ScalingError(
        'Failed to scale recipe',
        ERROR_CODES.SCALING_CALCULATION_ERROR,
        'recipe',
        true,
        'Unable to scale this recipe. Please try again or contact support.'
      );
    }
  }

  /**
   * Parse quantity string to numeric value
   * Handles common cooking quantity formats
   * @param quantityStr - Quantity string from ingredient
   * @returns Numeric quantity value
   */
  private parseQuantity(quantityStr: string): number {
    // Remove extra whitespace
    const cleaned = quantityStr.trim();
    
    // Handle empty or non-numeric quantities
    if (!cleaned || cleaned === '') {
      return 1; // Default to 1 for items like "1 onion" where quantity might be implicit
    }
    
    // Handle mixed numbers like "1 1/2" first (before simple fractions)
    const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const numerator = parseInt(mixedMatch[2]);
      const denominator = parseInt(mixedMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fractions like "1/4"
    const fractionMatch = cleaned.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    }
    
    // Handle decimal numbers like "1.5"
    const decimalMatch = cleaned.match(/^(\d+\.\d+)/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }
    
    // Handle simple numeric values like "2"
    const numericMatch = cleaned.match(/^(\d+)$/);
    if (numericMatch) {
      return parseInt(numericMatch[1]);
    }
    
    // If we can't parse it, return 1 as a safe default
    console.warn(`Could not parse quantity: "${quantityStr}", defaulting to 1`);
    return 1;
  }

  /**
   * Format quantity for display
   * Basic formatting - will be enhanced with fraction support in task 4
   * @param quantity - Numeric quantity
   * @param unit - Unit string
   * @returns Formatted display string
   */
  private formatQuantityForDisplay(quantity: number, unit: string): string {
    // Round to reasonable precision for cooking
    const rounded = Math.round(quantity * 100) / 100;
    
    // Handle whole numbers
    if (rounded === Math.floor(rounded)) {
      return `${rounded} ${unit}`;
    }
    
    // Handle decimals (will be converted to fractions in task 4)
    return `${rounded} ${unit}`;
  }
}

// Export singleton instance
export const scalingService = new ScalingService();