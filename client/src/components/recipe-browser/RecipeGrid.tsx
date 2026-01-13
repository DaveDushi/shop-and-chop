import React from 'react';
import { Recipe } from '../../types/Recipe.types';
import { RecipeCard } from './RecipeCard';
import { RecipeCardSkeleton } from './RecipeCardSkeleton';

export interface RecipeGridProps {
  recipes: Recipe[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onRecipeSelect: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
  isFavorited?: (recipeId: string) => boolean;
  isFavoriteLoading?: (recipeId: string) => boolean;
  isAuthenticated?: boolean;
}

export const RecipeGrid: React.FC<RecipeGridProps> = ({
  recipes,
  viewMode,
  isLoading,
  onRecipeSelect,
  onFavoriteToggle,
  onAddToMealPlan,
  isFavorited,
  isFavoriteLoading,
  isAuthenticated = false,
}) => {
  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <div className="p-6">
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <RecipeCardSkeleton key={index} viewMode={viewMode} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!recipes || recipes.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Recipes Found
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We couldn't find any recipes matching your criteria. Try adjusting your search or filters to discover new recipes.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Suggestions:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Clear your search and try again</li>
            <li>• Remove some filters to see more results</li>
            <li>• Browse all recipes to discover new favorites</li>
          </ul>
        </div>
      </div>
    );
  }

  // Recipe grid/list display
  return (
    <div className="p-6">
      <div className={`grid gap-6 transition-all duration-300 ease-in-out ${
        viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {recipes.map((recipe) => {
          // Merge server-side favorite status with client-side state
          const recipeWithFavoriteState = {
            ...recipe,
            isFavorited: isFavorited ? isFavorited(recipe.id) : recipe.isFavorited,
          };
          
          return (
            <RecipeCard
              key={recipe.id}
              recipe={recipeWithFavoriteState}
              viewMode={viewMode}
              onSelect={() => onRecipeSelect(recipe)}
              onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
              onAddToMealPlan={() => onAddToMealPlan(recipe)}
              isFavoriteLoading={isFavoriteLoading ? isFavoriteLoading(recipe.id) : false}
              isAuthenticated={isAuthenticated}
            />
          );
        })}
      </div>
    </div>
  );
};