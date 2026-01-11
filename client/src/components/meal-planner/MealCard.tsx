import React from 'react';
import { MealSlot } from '../../types/MealPlan.types';
import { X, Clock, Users } from 'lucide-react';

interface MealCardProps {
  meal: MealSlot;
  onRemove: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onRemove,
  onClick,
}) => {
  const { recipe, servings } = meal;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 hover:border-red-200 z-10"
        title="Remove meal"
      >
        <X className="h-4 w-4 text-gray-600 hover:text-red-600" />
      </button>

      {/* Recipe Image */}
      {recipe.imageUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gray-100 rounded-t-lg flex items-center justify-center">
          <div className="text-gray-400 text-4xl">🍽️</div>
        </div>
      )}

      {/* Recipe Details */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
          {recipe.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            {/* Prep Time */}
            {recipe.prepTime && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{recipe.prepTime}m</span>
              </div>
            )}

            {/* Servings */}
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{servings}</span>
            </div>
          </div>

          {/* Difficulty Badge */}
          {recipe.difficulty && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              recipe.difficulty === 'Easy' 
                ? 'bg-green-100 text-green-800'
                : recipe.difficulty === 'Medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {recipe.difficulty}
            </span>
          )}
        </div>

        {/* Dietary Tags */}
        {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.dietaryTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.dietaryTags.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{recipe.dietaryTags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};