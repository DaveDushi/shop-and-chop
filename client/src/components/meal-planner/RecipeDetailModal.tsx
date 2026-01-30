import React, { useState, useMemo } from 'react';
import { Clock, Users, ChefHat, Star } from 'lucide-react';
import { Recipe } from '../../types/Recipe.types';
import { MealSlot } from '../../types/MealPlan.types';
import { ScaledRecipe } from '../../types/Scaling.types';
import { Modal } from '../common/Modal';
import { ScalingInfoDisplay, IngredientQuantityDisplay } from '../common';
import { scalingService } from '../../services/scalingService';
import { userPreferencesService } from '../../services/userPreferencesService';

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  meal?: MealSlot | null; // Optional meal information for serving size
  /** Whether to show scaling features */
  enableScaling?: boolean;
  /** Current household size for scaling calculations */
  householdSize?: number;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  isOpen,
  onClose,
  recipe,
  meal,
  enableScaling = false,
  householdSize = 2,
}) => {
  const [showScaledQuantities, setShowScaledQuantities] = useState(true);

  // Calculate scaled recipe if scaling is enabled
  const scaledRecipe: ScaledRecipe | null = useMemo(() => {
    if (!recipe || !enableScaling) return null;

    // Determine the manual override value based on the boolean flag and servings
    const manualOverrideValue = meal?.manualServingOverride ? meal.servings : undefined;

    const effectiveServings = scalingService.getEffectiveServingSize(
      recipe,
      householdSize,
      manualOverrideValue
    );
    
    const scalingFactor = scalingService.calculateScalingFactor(
      recipe.servings || 1,
      effectiveServings
    );

    const scaled = scalingService.scaleRecipe(recipe, scalingFactor);
    
    // Set scaling source and manual override info
    scaled.scalingSource = meal?.manualServingOverride ? 'manual' : 'household';
    scaled.manualServingOverride = manualOverrideValue;
    
    return scaled;
  }, [recipe, enableScaling, householdSize, meal?.manualServingOverride, meal?.servings]);

  if (!recipe) return null;

  // Use meal's serving size if available, otherwise use recipe's default
  const displayServings = scaledRecipe?.effectiveServings ?? meal?.servings ?? recipe.servings;

  const getTotalTime = () => {
    const prep = recipe.prepTime || 0;
    const cook = recipe.cookTime || 0;
    return prep + cook;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recipe.name}
      size="xl"
      contentClassName="p-0"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Image and Quick Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recipe Image */}
          <div className="relative">
            {recipe.imageUrl ? (
              <div className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Quick Info</h3>
            
            {/* Time and Servings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-sm text-gray-600">Total Time</div>
                <div className="font-semibold text-gray-900">
                  {getTotalTime() > 0 ? `${getTotalTime()} min` : 'N/A'}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-sm text-gray-600">Servings</div>
                <div className="font-semibold text-gray-900">{displayServings}</div>
                {enableScaling && scaledRecipe && (
                  <div className="mt-2">
                    <ScalingInfoDisplay
                      scaledRecipe={scaledRecipe}
                      layout="compact"
                    />
                  </div>
                )}
                {!enableScaling && meal && meal.servings !== recipe.servings && (
                  <div className="text-xs text-blue-600 mt-1">
                    (Recipe default: {recipe.servings})
                  </div>
                )}
              </div>
            </div>

            {/* Prep and Cook Time Breakdown */}
            {(recipe.prepTime || recipe.cookTime) && (
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Prep:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {recipe.prepTime || 0} min
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cook:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {recipe.cookTime || 0} min
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Difficulty:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                  {recipe.difficulty}
                </span>
              </div>
            </div>

            {/* Rating */}
            {recipe.rating && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium text-gray-900">
                      {recipe.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dietary Tags */}
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-3">Dietary Info</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition Info */}
          {recipe.nutritionInfo && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-3">Nutrition</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {recipe.nutritionInfo.calories && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calories:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.calories}</span>
                  </div>
                )}
                {recipe.nutritionInfo.protein && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protein:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.protein}g</span>
                  </div>
                )}
                {recipe.nutritionInfo.carbs && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbs:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.carbs}g</span>
                  </div>
                )}
                {recipe.nutritionInfo.fat && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fat:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.fat}g</span>
                  </div>
                )}
                {recipe.nutritionInfo.fiber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fiber:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.fiber}g</span>
                  </div>
                )}
                {recipe.nutritionInfo.sugar && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sugar:</span>
                    <span className="font-medium text-gray-900">{recipe.nutritionInfo.sugar}g</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Ingredients and Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipe Description */}
          {recipe.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {recipe.description}
              </p>
            </div>
          )}

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-xl">Ingredients</h3>
              {enableScaling && scaledRecipe && (
                <ScalingInfoDisplay
                  scaledRecipe={scaledRecipe}
                  showQuantityToggle={true}
                  showScaled={showScaledQuantities}
                  onQuantityToggle={setShowScaledQuantities}
                  layout="compact"
                />
              )}
            </div>
            
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => {
                    const scaledIngredient = scaledRecipe?.scaledIngredients.find(
                      si => si.id === ingredient.id
                    );
                    
                    return (
                      <li key={ingredient.id || index} className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <div className="flex-1">
                          {enableScaling && scaledIngredient ? (
                            <IngredientQuantityDisplay
                              ingredient={ingredient}
                              scaledIngredient={scaledIngredient}
                              showScaled={showScaledQuantities}
                              showScalingIndicator={false}
                              compact={true}
                            />
                          ) : (
                            <span className="text-gray-900">
                              <span className="font-medium">
                                {ingredient.quantity} {ingredient.unit}
                              </span>
                              {' '}
                              <span>{ingredient.name}</span>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 italic">No ingredients listed</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-semibold text-gray-900 text-xl mb-4">Instructions</h3>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              <div className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-4 mt-1">
                      {index + 1}
                    </span>
                    <p className="text-gray-900 leading-relaxed pt-1">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No instructions provided</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};