import React, { useEffect } from 'react';
import { useRecipeBrowser } from '../../hooks/useRecipeBrowser';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../hooks/useAuth';
import { RecipeGrid } from './RecipeGrid';
import { RecipeSearchBar } from './RecipeSearchBar';
import { RecipeFilters } from './RecipeFilters';
import { ViewToggle } from './ViewToggle';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface RecipeBrowserProps {
  // No props - self-contained page component
}

export const RecipeBrowser: React.FC<RecipeBrowserProps> = () => {
  const { isAuthenticated } = useAuth();
  const {
    recipes,
    totalCount,
    searchQuery,
    filters,
    viewMode,
    isLoading,
    isSearching,
    error,
    setSearchQuery,
    setFilters,
    setViewMode,
    clearFilters,
    refetch,
    retry,
  } = useRecipeBrowser();

  // Initialize favorites hook (will sync with recipe data)
  const { toggleFavorite, isFavorited, isLoading: isFavoriteLoading, syncWithRecipes } = useFavorites();

  // Sync favorites with recipe data when recipes change
  useEffect(() => {
    if (isAuthenticated && recipes.length > 0) {
      const favoriteRecipeIds = recipes
        .filter(recipe => recipe.isFavorited)
        .map(recipe => recipe.id);
      syncWithRecipes(favoriteRecipeIds);
    }
  }, [recipes, isAuthenticated, syncWithRecipes]);

  // Handle recipe selection (for future modal implementation)
  const handleRecipeSelect = (recipe: any) => {
    // TODO: Implement recipe detail modal
    console.log('Recipe selected:', recipe);
  };

  // Handle favorite toggle with authentication check
  const handleFavoriteToggle = async (recipeId: string) => {
    if (!isAuthenticated) {
      // TODO: Show login modal or redirect to login
      console.log('User must be logged in to favorite recipes');
      return;
    }

    try {
      await toggleFavorite(recipeId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // TODO: Show user-friendly error message (toast notification)
    }
  };

  // Handle add to meal plan (for future implementation)
  const handleAddToMealPlan = (recipe: any) => {
    // TODO: Implement meal plan integration
    console.log('Add to meal plan:', recipe);
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Unable to Load Recipes
          </h2>
          <p className="text-red-700 mb-4">
            {error}
          </p>
          <button
            onClick={refetch}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mr-2"
          >
            Try Again
          </button>
          <button
            onClick={retry}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Retry with Delay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
          {totalCount > 0 && (
            <p className="text-gray-600 mt-1">
              {searchQuery ? (
                <>
                  {totalCount} recipe{totalCount !== 1 ? 's' : ''} found for "{searchQuery}"
                </>
              ) : (
                <>
                  {totalCount} recipe{totalCount !== 1 ? 's' : ''} available
                </>
              )}
            </p>
          )}
          {searchQuery && totalCount === 0 && !isLoading && !error && (
            <p className="text-gray-500 mt-1">
              No recipes found for "{searchQuery}". Try a different search term.
            </p>
          )}
        </div>
        
        {/* Create Recipe Button - placeholder for future implementation */}
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
          title="Recipe creation coming soon"
        >
          Create Recipe
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <RecipeSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search recipes by name or description..."
          isLoading={isSearching}
        />
      </div>

      {/* Filters Panel and View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <RecipeFilters
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            isCollapsed={false}
          />
        </div>
        
        <div className="flex-shrink-0">
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600">Loading recipes...</span>
          </div>
        ) : (
          <RecipeGrid
            recipes={recipes}
            viewMode={viewMode}
            isLoading={isLoading}
            onRecipeSelect={handleRecipeSelect}
            onFavoriteToggle={handleFavoriteToggle}
            onAddToMealPlan={handleAddToMealPlan}
            isFavorited={isFavorited}
            isFavoriteLoading={isFavoriteLoading}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      {/* Pagination - placeholder for future implementation */}
      {totalCount > 20 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-center text-gray-600">
            Pagination coming soon ({totalCount} total recipes)
          </div>
        </div>
      )}
    </div>
  );
};