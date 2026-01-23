import React, { useEffect, useState, useRef } from 'react';
import { useRecipeBrowser } from '../../hooks/useRecipeBrowser';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../hooks/useAuth';
import { useCreateRecipe, useDeleteRecipe, useUpdateRecipe } from '../../hooks/useRecipes';
import { useAddToMealPlan } from '../../hooks/useAddToMealPlan';
import { useRecipeBrowserKeyboard } from '../../hooks/useRecipeBrowserKeyboard';
import { useLiveRegion } from '../common/LiveRegion';
import { Breadcrumb } from '../common/Breadcrumb';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { NetworkErrorRecovery } from '../common/NetworkErrorRecovery';
import { useToast } from '../common/Toast';
import { preloadRecipeImages } from '../../utils/imagePreloader';
import { RecipeGrid } from './RecipeGrid';
import { RecipeSearchBar } from './RecipeSearchBar';
import { RecipeFilters } from './RecipeFilters';
import { ViewToggle } from './ViewToggle';
import { Pagination } from './Pagination';
import { VirtualizedRecipeGrid } from './VirtualizedRecipeGrid';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CreateRecipeModal } from './CreateRecipeModal';
import { EditRecipeModal } from './EditRecipeModal';
import { AddToMealPlanModal } from './AddToMealPlanModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { KeyboardNavigationHelp } from './KeyboardNavigationHelp';
import { RecipeDetailModal } from '../meal-planner/RecipeDetailModal';
import { RecipeFormData, Recipe } from '../../types/Recipe.types';

export interface RecipeBrowserProps {
  // No props - self-contained page component
}

export const RecipeBrowser: React.FC<RecipeBrowserProps> = () => {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(() => {
    // Enable virtual scrolling for large datasets by default
    const saved = localStorage.getItem('recipe-browser-virtual-scrolling');
    return saved ? JSON.parse(saved) : true;
  });

  // Refs for keyboard navigation
  const searchBarRef = useRef<HTMLInputElement>(null);
  const recipeGridRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Live region for screen reader announcements
  const { announce, LiveRegionComponent } = useLiveRegion();
  
  // Create recipe mutation
  const { 
    mutate: createRecipe, 
    isPending: isCreating, 
    error: createError 
  } = useCreateRecipe();

  // Delete recipe mutation
  const {
    mutate: deleteRecipe,
    isPending: isDeleting,
  } = useDeleteRecipe();

  // Update recipe mutation
  const {
    mutate: updateRecipe,
    isPending: isUpdating,
  } = useUpdateRecipe();

  // Add to meal plan functionality
  const {
    isModalOpen: isMealPlanModalOpen,
    selectedRecipe: mealPlanRecipe,
    openModal: openMealPlanModal,
    closeModal: closeMealPlanModal,
    addToMealPlan,
  } = useAddToMealPlan();
  const {
    recipes,
    totalCount,
    searchQuery,
    filters,
    viewMode,
    currentPage,
    isLoading,
    isSearching,
    error,
    setSearchQuery,
    setFilters,
    setViewMode,
    setCurrentPage,
    clearFilters,
    refetch,
    retry,
  } = useRecipeBrowser();

  // Initialize favorites hook (will sync with recipe data)
  const { toggleFavorite, isFavorited, isLoading: isFavoriteLoading, syncWithRecipes } = useFavorites();

  // Keyboard navigation handlers
  const handleFocusSearch = () => {
    searchBarRef.current?.focus();
  };

  const handleFocusFirstRecipe = () => {
    if (recipeGridRef.current) {
      const firstRecipe = recipeGridRef.current.querySelector<HTMLElement>('[data-recipe-card]');
      firstRecipe?.focus();
    }
  };

  const handleFocusLastRecipe = () => {
    if (recipeGridRef.current) {
      const recipes = recipeGridRef.current.querySelectorAll<HTMLElement>('[data-recipe-card]');
      const lastRecipe = recipes[recipes.length - 1];
      lastRecipe?.focus();
    }
  };

  const handleNextPage = () => {
    if (currentPage < Math.ceil(totalCount / 20)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleToggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  // Handle create recipe button click
  const handleCreateRecipe = () => {
    if (!isAuthenticated) {
      showWarning('Authentication Required', 'Please log in to create recipes');
      return;
    }
    setShowCreateModal(true);
  };

  // Initialize keyboard navigation
  useRecipeBrowserKeyboard({
    onSearch: handleFocusSearch,
    onCreateRecipe: handleCreateRecipe,
    onToggleView: handleToggleViewMode,
    onClearFilters: clearFilters,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onFocusFirstRecipe: handleFocusFirstRecipe,
    onFocusLastRecipe: handleFocusLastRecipe,
    onRefresh: refetch,
    enabled: true,
  });

  // Sync favorites with recipe data when recipes change
  useEffect(() => {
    if (isAuthenticated && recipes.length > 0) {
      const favoriteRecipeIds = recipes
        .filter(recipe => recipe.isFavorited)
        .map(recipe => recipe.id);
      syncWithRecipes(favoriteRecipeIds);
    }
  }, [recipes, isAuthenticated, syncWithRecipes]);

  // Announce search results
  useEffect(() => {
    if (!isLoading && searchQuery) {
      const resultText = totalCount === 0 
        ? `No recipes found for "${searchQuery}"`
        : `${totalCount} recipe${totalCount !== 1 ? 's' : ''} found for "${searchQuery}"`;
      announce(resultText, 'polite');
    }
  }, [totalCount, searchQuery, isLoading, announce]);

  // Announce filter changes
  useEffect(() => {
    if (!isLoading && (filters.cuisine || filters.difficulty || filters.dietaryTags?.length || filters.maxCookTime)) {
      const activeFilters = [];
      if (filters.cuisine) activeFilters.push(`cuisine: ${filters.cuisine}`);
      if (filters.difficulty) activeFilters.push(`difficulty: ${filters.difficulty}`);
      if (filters.dietaryTags?.length) activeFilters.push(`dietary tags: ${filters.dietaryTags.join(', ')}`);
      if (filters.maxCookTime) activeFilters.push(`max cook time: ${filters.maxCookTime} minutes`);
      
      if (activeFilters.length > 0) {
        announce(`Filters applied: ${activeFilters.join(', ')}. ${totalCount} recipes match your criteria.`, 'polite');
      }
    }
  }, [filters, totalCount, isLoading, announce]);

  // Preload recipe images for better performance
  useEffect(() => {
    if (recipes.length > 0) {
      preloadRecipeImages(recipes, { priority: 'low' });
    }
  }, [recipes]);

  // Handle recipe selection (opens recipe detail modal)
  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowDetailModal(true);
    announce(`Opening recipe details for ${recipe.name || recipe.title}`, 'polite');
  };

  // Handle favorite toggle with authentication check
  const handleFavoriteToggle = async (recipeId: string) => {
    if (!isAuthenticated) {
      showWarning('Authentication Required', 'Please log in to favorite recipes');
      announce('Please log in to favorite recipes', 'assertive');
      return;
    }

    try {
      await toggleFavorite(recipeId);
      const recipe = recipes.find(r => r.id === recipeId);
      const recipeName = recipe?.name || recipe?.title || 'Recipe';
      const isFavorited = recipe?.isFavorited;
      
      const message = isFavorited 
        ? `${recipeName} removed from favorites` 
        : `${recipeName} added to favorites`;
      
      showSuccess('Favorites Updated', message);
      announce(message, 'polite');
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update favorite status. Please try again.';
      showError('Favorite Update Failed', errorMessage);
      announce(`Failed to update favorite status: ${errorMessage}`, 'assertive');
    }
  };

  // Handle add to meal plan (for future implementation)
  const handleAddToMealPlan = (recipe: Recipe) => {
    if (!isAuthenticated) {
      showWarning('Authentication Required', 'Please log in to add recipes to your meal plan');
      announce('Please log in to add recipes to your meal plan', 'assertive');
      return;
    }
    openMealPlanModal(recipe);
    announce(`Opening meal plan options for ${recipe.name || recipe.title}`, 'polite');
  };

  // Handle recipe form submission
  const handleRecipeSubmit = (data: RecipeFormData) => {
    createRecipe(data, {
      onSuccess: () => {
        setShowCreateModal(false);
        showSuccess('Recipe Created', `"${data.title}" has been created successfully`);
        announce(`Recipe "${data.title}" created successfully`, 'polite');
        refetch(); // Refresh the recipe list
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create recipe. Please try again.';
        showError('Recipe Creation Failed', errorMessage);
        announce(`Failed to create recipe: ${errorMessage}`, 'assertive');
      },
    });
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Recipe) => {
    if (!isAuthenticated) {
      showWarning('Authentication Required', 'Please log in to edit recipes');
      return;
    }
    setSelectedRecipe(recipe);
    setShowEditModal(true);
  };

  // Handle edit recipe submission
  const handleEditRecipeSubmit = (recipeId: string, data: RecipeFormData) => {
    updateRecipe(
      { id: recipeId, data },
      {
        onSuccess: () => {
          setShowEditModal(false);
          setSelectedRecipe(null);
          showSuccess('Recipe Updated', `"${data.title}" has been updated successfully`);
          announce(`Recipe "${data.title}" updated successfully`, 'polite');
          refetch(); // Refresh the recipe list
        },
        onError: (error: any) => {
          console.error('Failed to update recipe:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Failed to update recipe. Please try again.';
          showError('Recipe Update Failed', errorMessage);
          announce(`Failed to update recipe: ${errorMessage}`, 'assertive');
        },
      }
    );
  };

  // Handle delete recipe
  const handleDeleteRecipe = (recipe: Recipe) => {
    if (!isAuthenticated) {
      showWarning('Authentication Required', 'Please log in to delete recipes');
      return;
    }
    setSelectedRecipe(recipe);
    setShowDeleteModal(true);
  };

  // Confirm delete recipe
  const handleConfirmDelete = () => {
    if (!selectedRecipe) return;

    const recipeName = selectedRecipe.title || selectedRecipe.name || 'Recipe';
    
    deleteRecipe(selectedRecipe.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedRecipe(null);
        showSuccess('Recipe Deleted', `${recipeName} has been deleted successfully`);
        announce(`${recipeName} deleted successfully`, 'polite');
        refetch(); // Refresh the recipe list
      },
      onError: (error: any) => {
        console.error('Failed to delete recipe:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete recipe. Please try again.';
        showError('Recipe Deletion Failed', errorMessage);
        announce(`Failed to delete recipe: ${errorMessage}`, 'assertive');
      },
    });
  };

  // Toggle virtual scrolling
  const handleToggleVirtualScrolling = () => {
    const newValue = !useVirtualScrolling;
    setUseVirtualScrolling(newValue);
    localStorage.setItem('recipe-browser-virtual-scrolling', JSON.stringify(newValue));
  };

  // Calculate pagination info
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;

  // Error state with enhanced error handling
  if (error) {
    const isNetworkError = error.includes('connect') || error.includes('Network') || error.includes('fetch');
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
        </div>
        
        {isNetworkError ? (
          <NetworkErrorRecovery
            error={new Error(error)}
            onRetry={refetch}
            isRetrying={isLoading}
            className="max-w-2xl mx-auto"
          />
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Unable to Load Recipes
            </h2>
            <p className="text-red-700 mb-6">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={refetch}
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Retrying...' : 'Try Again'}
              </button>
              <button
                onClick={retry}
                disabled={isLoading}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Retry with Delay
              </button>
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 transition-colors"
              >
                Clear Filters
              </button>
            </div>
            
            {/* Fallback suggestions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Troubleshooting Tips
              </h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Clear your search and filters</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Live Region for Screen Reader Announcements */}
      <LiveRegionComponent />
      
      {/* Skip Link for Keyboard Navigation */}
      <a 
        href="#recipe-grid" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to recipe list
      </a>
      {/* Header */}
      <header className="space-y-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={[
            { label: 'Recipes', current: true }
          ]}
        />
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
            {totalCount > 0 && (
              <p className="text-gray-600 mt-1" aria-live="polite">
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
              <p className="text-gray-500 mt-1" role="status" aria-live="polite">
                No recipes found for "{searchQuery}". Try a different search term.
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Keyboard Navigation Help */}
            <KeyboardNavigationHelp />
            
            {/* Create Recipe Button */}
            <button
              ref={createButtonRef}
              onClick={handleCreateRecipe}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              title={isAuthenticated ? "Create a new recipe (Ctrl+N)" : "Log in to create recipes"}
              aria-label={isAuthenticated ? "Create a new recipe" : "Log in to create recipes"}
            >
              Create Recipe
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters Section */}
      <section aria-labelledby="search-filters-heading">
        <h2 id="search-filters-heading" className="sr-only">Search and Filter Recipes</h2>
        
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <RecipeSearchBar
            ref={searchBarRef}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search recipes by name or description... (Press / or Ctrl+K to focus)"
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
          
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Virtual Scrolling Toggle */}
            {totalCount > 50 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600" htmlFor="virtual-scrolling-toggle">
                  Virtual Scrolling:
                </label>
                <button
                  id="virtual-scrolling-toggle"
                  onClick={handleToggleVirtualScrolling}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    useVirtualScrolling ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                  title={useVirtualScrolling ? 'Disable virtual scrolling' : 'Enable virtual scrolling for better performance'}
                  aria-pressed={useVirtualScrolling}
                  aria-describedby="virtual-scrolling-description"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useVirtualScrolling ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div id="virtual-scrolling-description" className="sr-only">
                  {useVirtualScrolling 
                    ? 'Virtual scrolling is enabled for better performance with large recipe lists'
                    : 'Virtual scrolling is disabled. Enable for better performance with large recipe lists'
                  }
                </div>
              </div>
            )}
            
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </section>

      {/* Main Recipe Content */}
      <main>
        <section 
          id="recipe-grid"
          aria-labelledby="recipe-list-heading"
          className="bg-white rounded-lg shadow"
        >
          <h2 id="recipe-list-heading" className="sr-only">
            Recipe List - {totalCount} recipes {searchQuery ? `matching "${searchQuery}"` : 'available'}
          </h2>
          
          {isLoading && recipes.length === 0 ? (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Loading recipes...</span>
            </div>
          ) : useVirtualScrolling && totalCount > 50 ? (
            <VirtualizedRecipeGrid
              recipes={recipes}
              viewMode={viewMode}
              isLoading={isLoading}
              hasNextPage={hasNextPage}
              onRecipeSelect={handleRecipeSelect}
              onFavoriteToggle={handleFavoriteToggle}
              onAddToMealPlan={handleAddToMealPlan}
              onEdit={handleEditRecipe}
              onDelete={handleDeleteRecipe}
              isFavorited={isFavorited}
              isFavoriteLoading={isFavoriteLoading}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              containerHeight={600}
            />
          ) : (
            <RecipeGrid
              ref={recipeGridRef}
              recipes={recipes}
              viewMode={viewMode}
              isLoading={isLoading}
              onRecipeSelect={handleRecipeSelect}
              onFavoriteToggle={handleFavoriteToggle}
              onAddToMealPlan={handleAddToMealPlan}
              onEdit={handleEditRecipe}
              onDelete={handleDeleteRecipe}
              isFavorited={isFavorited}
              isFavoriteLoading={isFavoriteLoading}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
            />
          )}
        </section>
      </main>

      {/* Pagination */}
      {!useVirtualScrolling && totalCount > itemsPerPage && (
        <div className="bg-white rounded-lg shadow">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Create Recipe Modal */}
      {showCreateModal && (
        <CreateRecipeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleRecipeSubmit}
          isLoading={isCreating}
          error={createError?.message || null}
        />
      )}

      {/* Edit Recipe Modal */}
      {showEditModal && selectedRecipe && (
        <EditRecipeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRecipe(null);
          }}
          recipe={selectedRecipe}
          currentUserId={user?.id}
          onSubmit={handleEditRecipeSubmit}
          isLoading={isUpdating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRecipe && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRecipe(null);
          }}
          onConfirm={handleConfirmDelete}
          recipeName={selectedRecipe.title || selectedRecipe.name || 'this recipe'}
          isDeleting={isDeleting}
        />
      )}

      {/* Add to Meal Plan Modal */}
      <AddToMealPlanModal
        isOpen={isMealPlanModalOpen}
        onClose={closeMealPlanModal}
        recipe={mealPlanRecipe}
        onAddToMealPlan={addToMealPlan}
      />

      {/* Recipe Detail Modal */}
      {showDetailModal && selectedRecipe && (
        <RecipeDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecipe(null);
          }}
          recipe={selectedRecipe}
        />
      )}
    </div>
    </ErrorBoundary>
  );
};