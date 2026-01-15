import React, { useEffect, useState } from 'react';
import { useRecipeBrowser } from '../../hooks/useRecipeBrowser';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../hooks/useAuth';
import { useCreateRecipe, useDeleteRecipe, useUpdateRecipe } from '../../hooks/useRecipes';
import { useAddToMealPlan } from '../../hooks/useAddToMealPlan';
import { RecipeGrid } from './RecipeGrid';
import { RecipeSearchBar } from './RecipeSearchBar';
import { RecipeFilters } from './RecipeFilters';
import { ViewToggle } from './ViewToggle';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CreateRecipeModal } from './CreateRecipeModal';
import { EditRecipeModal } from './EditRecipeModal';
import { AddToMealPlanModal } from './AddToMealPlanModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { RecipeFormData, Recipe } from '../../types/Recipe.types';

export interface RecipeBrowserProps {
  // No props - self-contained page component
}

export const RecipeBrowser: React.FC<RecipeBrowserProps> = () => {
  const { isAuthenticated, user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
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
  const handleAddToMealPlan = (recipe: Recipe) => {
    if (!isAuthenticated) {
      // TODO: Show login modal or redirect to login
      console.log('User must be logged in to add recipes to meal plan');
      alert('Please log in to add recipes to your meal plan');
      return;
    }
    openMealPlanModal(recipe);
  };

  // Handle create recipe button click
  const handleCreateRecipe = () => {
    if (!isAuthenticated) {
      // TODO: Show login modal or redirect to login
      console.log('User must be logged in to create recipes');
      alert('Please log in to create recipes');
      return;
    }
    setShowCreateModal(true);
  };

  // Handle recipe form submission
  const handleRecipeSubmit = (data: RecipeFormData) => {
    createRecipe(data, {
      onSuccess: () => {
        setShowCreateModal(false);
        refetch(); // Refresh the recipe list
      },
    });
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Recipe) => {
    if (!isAuthenticated) {
      alert('Please log in to edit recipes');
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
          refetch(); // Refresh the recipe list
        },
        onError: (error: any) => {
          console.error('Failed to update recipe:', error);
          // Error will be displayed in the modal
        },
      }
    );
  };

  // Handle delete recipe
  const handleDeleteRecipe = (recipe: Recipe) => {
    if (!isAuthenticated) {
      alert('Please log in to delete recipes');
      return;
    }
    setSelectedRecipe(recipe);
    setShowDeleteModal(true);
  };

  // Confirm delete recipe
  const handleConfirmDelete = () => {
    if (!selectedRecipe) return;

    deleteRecipe(selectedRecipe.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedRecipe(null);
        refetch(); // Refresh the recipe list
      },
      onError: (error: any) => {
        console.error('Failed to delete recipe:', error);
        alert(error.response?.data?.message || 'Failed to delete recipe. Please try again.');
      },
    });
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
        
        {/* Create Recipe Button */}
        <button
          onClick={handleCreateRecipe}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isAuthenticated ? "Create a new recipe" : "Log in to create recipes"}
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
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
            isFavorited={isFavorited}
            isFavoriteLoading={isFavoriteLoading}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id}
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
    </div>
  );
};