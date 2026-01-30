import { describe, it, expect } from 'vitest';
import { ScalingService } from '../scalingService';
import { Recipe, Ingredient } from '../../types/Recipe.types';
import { SCALING_CONSTANTS } from '../../types/Scaling.types';

describe('ScalingService', () => {
  const scalingService = new ScalingService();

  // Mock recipe data
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    name: 'Test Recipe',
    description: 'A test recipe',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: 'Easy',
    dietaryTags: [],
    ingredients: [
      {
        id: 'ingredient-1',
        name: 'Flour',
        quantity: '2',
        unit: 'cups',
        category: 'Baking'
      },
      {
        id: 'ingredient-2',
        name: 'Sugar',
        quantity: '0.5',
        unit: 'cups',
        category: 'Baking'
      },
      {
        id: 'ingredient-3',
        name: 'Salt',
        quantity: '1/4',
        unit: 'teaspoon',
        category: 'Spices'
      }
    ],
    instructions: ['Mix ingredients', 'Bake for 30 minutes'],
    createdBy: 'user-1'
  };

  describe('calculateScalingFactor', () => {
    it('should calculate correct scaling factor for normal values', () => {
      const factor = scalingService.calculateScalingFactor(4, 8);
      expect(factor).toBe(2);
    });

    it('should handle zero original servings by defaulting to 1', () => {
      const factor = scalingService.calculateScalingFactor(0, 6);
      expect(factor).toBe(6);
    });

    it('should handle negative original servings by defaulting to 1', () => {
      const factor = scalingService.calculateScalingFactor(-2, 4);
      expect(factor).toBe(4);
    });

    it('should clamp scaling factor to minimum limit', () => {
      // Normal case that doesn't hit the minimum (0.1 < 0.125, so it will be clamped)
      const factor = scalingService.calculateScalingFactor(10, 1);
      expect(factor).toBe(SCALING_CONSTANTS.MIN_SCALING_FACTOR); // 0.125
      
      // Test extreme case that would go below minimum
      const extremeFactor = scalingService.calculateScalingFactor(100, 1);
      expect(extremeFactor).toBe(SCALING_CONSTANTS.MIN_SCALING_FACTOR);
    });

    it('should clamp scaling factor to maximum limit', () => {
      const factor = scalingService.calculateScalingFactor(1, 25);
      expect(factor).toBe(SCALING_CONSTANTS.MAX_SCALING_FACTOR);
    });
  });

  describe('getEffectiveServingSize', () => {
    it('should return manual override when provided', () => {
      const effectiveSize = scalingService.getEffectiveServingSize(mockRecipe, 4, 6);
      expect(effectiveSize).toBe(6);
    });

    it('should return household size when no manual override', () => {
      const effectiveSize = scalingService.getEffectiveServingSize(mockRecipe, 4);
      expect(effectiveSize).toBe(4);
    });

    it('should ignore invalid manual override (zero or negative)', () => {
      const effectiveSize1 = scalingService.getEffectiveServingSize(mockRecipe, 4, 0);
      expect(effectiveSize1).toBe(4);
      
      const effectiveSize2 = scalingService.getEffectiveServingSize(mockRecipe, 4, -1);
      expect(effectiveSize2).toBe(4);
    });
  });

  describe('scaleIngredientQuantity', () => {
    it('should scale numeric quantities correctly', () => {
      const ingredient: Ingredient = {
        id: 'test-1',
        name: 'Flour',
        quantity: '2',
        unit: 'cups',
        category: 'Baking'
      };

      const scaled = scalingService.scaleIngredientQuantity(ingredient, 1.5);
      
      expect(scaled.originalQuantity).toBe(2);
      expect(scaled.scaledQuantity).toBe(3);
      expect(scaled.displayQuantity).toBe('3 cups');
      expect(scaled.conversionApplied).toBe(false);
    });

    it('should handle fractional quantities', () => {
      const ingredient: Ingredient = {
        id: 'test-2',
        name: 'Salt',
        quantity: '1/4',
        unit: 'teaspoon',
        category: 'Spices'
      };

      const scaled = scalingService.scaleIngredientQuantity(ingredient, 2);
      
      expect(scaled.originalQuantity).toBe(0.25);
      expect(scaled.scaledQuantity).toBe(0.5);
      expect(scaled.displayQuantity).toBe('0.5 teaspoon');
    });

    it('should handle mixed number quantities', () => {
      const ingredient: Ingredient = {
        id: 'test-3',
        name: 'Milk',
        quantity: '1 1/2',
        unit: 'cups',
        category: 'Dairy'
      };

      const scaled = scalingService.scaleIngredientQuantity(ingredient, 2);
      
      expect(scaled.originalQuantity).toBe(1.5);
      expect(scaled.scaledQuantity).toBe(3);
      expect(scaled.displayQuantity).toBe('3 cups');
    });

    it('should handle unparseable quantities gracefully', () => {
      const ingredient: Ingredient = {
        id: 'test-4',
        name: 'Onion',
        quantity: 'large',
        unit: 'piece',
        category: 'Produce'
      };

      const scaled = scalingService.scaleIngredientQuantity(ingredient, 2);
      
      expect(scaled.originalQuantity).toBe(1); // Default fallback
      expect(scaled.scaledQuantity).toBe(2);
      expect(scaled.displayQuantity).toBe('~2 piece (scaled from "large")');
      expect(scaled.parsingIssues).toBeDefined();
      expect(scaled.parsingIssues?.fallbackUsed).toBe(true);
    });
  });

  describe('scaleRecipe', () => {
    it('should scale entire recipe correctly', () => {
      const scaledRecipe = scalingService.scaleRecipe(mockRecipe, 1.5);
      
      expect(scaledRecipe.originalRecipe).toBe(mockRecipe);
      expect(scaledRecipe.scalingFactor).toBe(1.5);
      expect(scaledRecipe.effectiveServings).toBe(6); // 4 * 1.5 = 6
      expect(scaledRecipe.scaledIngredients).toHaveLength(3);
      
      // Check first ingredient scaling
      const firstIngredient = scaledRecipe.scaledIngredients[0];
      expect(firstIngredient.name).toBe('Flour');
      expect(firstIngredient.originalQuantity).toBe(2);
      expect(firstIngredient.scaledQuantity).toBe(3);
    });

    it('should preserve original recipe data', () => {
      const originalIngredientCount = mockRecipe.ingredients.length;
      const originalFirstQuantity = mockRecipe.ingredients[0].quantity;
      
      scalingService.scaleRecipe(mockRecipe, 2);
      
      // Original recipe should be unchanged
      expect(mockRecipe.ingredients).toHaveLength(originalIngredientCount);
      expect(mockRecipe.ingredients[0].quantity).toBe(originalFirstQuantity);
    });

    it('should handle recipes with zero servings', () => {
      const zeroServingRecipe = { ...mockRecipe, servings: 0 };
      const scaledRecipe = scalingService.scaleRecipe(zeroServingRecipe, 2);
      
      // Should treat as 1 serving originally, so 1 * 2 = 2
      expect(scaledRecipe.effectiveServings).toBe(2);
    });
  });
});