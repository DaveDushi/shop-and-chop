import React from 'react';
import { Recipe, RecipeFormData, IngredientInput } from '../../types/Recipe.types';
import { RecipeForm } from './RecipeForm';
import { Modal } from '../common/Modal';

export interface EditRecipeModalProps {
  isOpen: boolean;
  recipe: Recipe | null;
  currentUserId?: string;
  onClose: () => void;
  onSubmit: (recipeId: string, data: RecipeFormData) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({
  isOpen,
  recipe,
  currentUserId,
  onClose,
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  // Validate recipe ownership
  const isOwner = recipe && currentUserId && recipe.userId === currentUserId;
  const canEdit = isOwner || (recipe && !recipe.userId); // Allow editing curated recipes for now

  // Convert Recipe to RecipeFormData for pre-population
  const getInitialFormData = (): Partial<RecipeFormData> | undefined => {
    if (!recipe) return undefined;

    // Convert Recipe ingredients to IngredientInput format
    const ingredients: IngredientInput[] = recipe.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category: ing.category,
    }));

    return {
      title: recipe.name || recipe.title || '',
      description: recipe.description,
      cuisine: recipe.cuisine || '',
      cookTime: recipe.cookTime,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      dietaryTags: recipe.dietaryTags || [],
      ingredients,
      instructions: recipe.instructions || [],
    };
  };

  // Handle form submission
  const handleSubmit = (data: RecipeFormData) => {
    if (!recipe) return;
    onSubmit(recipe.id, data);
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Show ownership error if user doesn't own the recipe
  if (isOpen && recipe && !canEdit) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cannot Edit Recipe"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-6">
            You can only edit recipes that you have created. This recipe belongs to another user.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors min-h-touch touch-manipulation"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (!recipe) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Recipe: ${recipe.name || recipe.title}`}
      size="xl"
      loading={isLoading}
      error={error}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      contentClassName="p-0"
    >
      <div className="p-6">
        {/* Info about image replacement */}
        {recipe.imageUrl && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This recipe has an existing image. Upload a new image to replace it, or leave it unchanged.
                </p>
              </div>
            </div>
          </div>
        )}

        <RecipeForm
          mode="edit"
          initialData={getInitialFormData()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </Modal>
  );
};