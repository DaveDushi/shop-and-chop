import React, { useEffect, useRef } from 'react';
import { Recipe, RecipeFormData, IngredientInput } from '../../types/Recipe.types';
import { RecipeForm } from './RecipeForm';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Validate recipe ownership
  const isOwner = recipe && currentUserId && recipe.userId === currentUserId;
  const canEdit = isOwner || (recipe && !recipe.userId); // Allow editing curated recipes for now (will be restricted in backend)

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isLoading, onClose]);

  // Focus management and focus trapping
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the modal
      modalRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.overflow = '';

        // Restore focus to the previously focused element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

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
      // Note: image is not pre-populated as it's a File object
      // The ImageUpload component will show the existing imageUrl
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

  if (!isOpen || !recipe) {
    return null;
  }

  // Show ownership error if user doesn't own the recipe
  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={modalRef}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            tabIndex={-1}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Cannot Edit Recipe
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                You can only edit recipes that you have created. This recipe belongs to another user.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          tabIndex={-1}
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2
                id="edit-recipe-modal-title"
                className="text-2xl font-bold text-gray-900"
              >
                Edit Recipe
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Editing: {recipe.name || recipe.title}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md p-1"
              disabled={isLoading}
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-4">
            {/* Error Message */}
            {error && (
              <div
                className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"
                role="alert"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Failed to update recipe
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info about image replacement */}
            {recipe.imageUrl && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
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

            {/* Recipe Form */}
            <RecipeForm
              mode="edit"
              initialData={getInitialFormData()}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
