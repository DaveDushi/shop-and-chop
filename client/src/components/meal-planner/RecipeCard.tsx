import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Recipe } from '../../types/Recipe.types';
import { DragItemTypes, RecipeDragItem, DragCollectedProps } from '../../types/DragDrop.types';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (recipe: Recipe) => void;
  onPreview?: (recipe: Recipe) => void;
  isDraggable?: boolean;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onPreview,
  isDraggable = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Set up drag functionality
  const [{ isDragging, canDrag }, dragRef] = useDrag<
    RecipeDragItem,
    void,
    DragCollectedProps
  >({
    type: DragItemTypes.RECIPE,
    item: () => ({
      type: DragItemTypes.RECIPE,
      recipe,
      sourceType: 'SIDEBAR',
    }),
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      canDrag: monitor.canDrag(),
    }),
  });

  // Calculate total time
  const totalTime = recipe.prepTime + recipe.cookTime;

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect?.(recipe);
  };

  // Handle preview toggle
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(!showPreview);
    if (!showPreview) {
      onPreview?.(recipe);
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 bg-green-100';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'Hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div
      ref={isDraggable ? dragRef : undefined}
      className={`group relative bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer ${
        isDraggable && canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-50' : ''} ${className}`}
      onClick={handleCardClick}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Recipe Image */}
      <div className="relative h-32 w-full">
        {recipe.imageUrl && !imageError ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover rounded-t-lg"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
            <span className="text-4xl text-gray-400">🍽️</span>
          </div>
        )}
        
        {/* Difficulty Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>
        </div>

        {/* Rating Badge */}
        {recipe.rating && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400 text-xs">⭐</span>
              <span className="text-xs font-medium text-gray-900">
                {recipe.rating.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* Preview Button */}
        <button
          onClick={handlePreviewClick}
          className="absolute bottom-2 right-2 p-1.5 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Preview recipe"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      {/* Recipe Content */}
      <div className="p-3">
        {/* Recipe Name */}
        <h3 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2">
          {recipe.name}
        </h3>

        {/* Recipe Description */}
        {recipe.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Recipe Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{totalTime}m</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{recipe.servings}</span>
            </div>
          </div>
        </div>

        {/* Dietary Tags */}
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.dietaryTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.dietaryTags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                +{recipe.dietaryTags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Drag Indicator */}
      {isDraggable && canDrag && (
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 pointer-events-none ${
          isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-20'
        }`}>
          <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
      )}

      {/* Preview Overlay */}
      {showPreview && (
        <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 text-sm">Quick Preview</h4>
              <button
                onClick={handlePreviewClick}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium text-gray-700">Prep:</span> {recipe.prepTime}m
              </div>
              <div>
                <span className="font-medium text-gray-700">Cook:</span> {recipe.cookTime}m
              </div>
              <div>
                <span className="font-medium text-gray-700">Servings:</span> {recipe.servings}
              </div>
              {recipe.ingredients.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Ingredients:</span>
                  <ul className="mt-1 space-y-1">
                    {recipe.ingredients.slice(0, 5).map((ingredient, index) => (
                      <li key={index} className="text-gray-600">
                        • {ingredient.quantity} {ingredient.unit} {ingredient.name}
                      </li>
                    ))}
                    {recipe.ingredients.length > 5 && (
                      <li className="text-gray-500">
                        ... and {recipe.ingredients.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};