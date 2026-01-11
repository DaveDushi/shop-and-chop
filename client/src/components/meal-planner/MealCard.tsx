import React from 'react';
import { useDrag } from 'react-dnd';
import { MealSlot, MealType } from '../../types/MealPlan.types';
import { X, Clock, Users, ChefHat, Star } from 'lucide-react';
import { DragItemTypes, MealDragItem, DragCollectedProps } from '../../types/DragDrop.types';
import { MealCardContextMenu } from './MealCardContextMenu';

interface MealCardProps {
  meal: MealSlot;
  dayIndex?: number;
  mealType?: MealType;
  onRemove: (e?: React.MouseEvent) => void;
  onClick: () => void;
  isDraggable?: boolean;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  dayIndex,
  mealType,
  onRemove,
  onClick,
  isDraggable = false,
  onCopyMeal,
  onSwapMeals,
  onDuplicateDay,
}) => {
  const { recipe, servings } = meal;

  // Set up drag functionality for meal-to-meal operations
  const [{ isDragging, canDrag }, dragRef] = useDrag<
    MealDragItem,
    void,
    DragCollectedProps
  >({
    type: DragItemTypes.MEAL,
    item: () => ({
      type: DragItemTypes.MEAL,
      recipe,
      sourceType: 'MEAL_SLOT',
      sourceLocation: {
        dayIndex: dayIndex!,
        mealType: mealType!,
      },
    }),
    canDrag: isDraggable && dayIndex !== undefined && mealType !== undefined,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      canDrag: monitor.canDrag(),
    }),
  });

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click when clicking remove button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick();
  };

  const handleRemove = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onRemove(e);
  };

  const getTotalTime = () => {
    const prep = recipe.prepTime || 0;
    const cook = recipe.cookTime || 0;
    return prep + cook;
  };

  return (
    <div
      ref={isDraggable && canDrag ? dragRef : undefined}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      } ${isDraggable && canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View recipe details for ${recipe.name}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        {/* Context Menu - Show when copy/duplicate functions are available */}
        {dayIndex !== undefined && mealType !== undefined && (
          <div className="opacity-100 transition-all duration-200">
            <MealCardContextMenu
              dayIndex={dayIndex}
              mealType={mealType}
              onCopyMeal={onCopyMeal || (() => {})}
              onSwapMeals={onSwapMeals}
              onRemoveMeal={(e?: React.MouseEvent) => onRemove(e)}
              onDuplicateDay={onDuplicateDay || (() => {})}
            />
          </div>
        )}
        
        {/* Remove Button - Show when no context menu or as fallback */}
        {!(dayIndex !== undefined && mealType !== undefined) && (
          <button
            onClick={handleRemove}
            className="p-1.5 rounded-full bg-white shadow-sm border border-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:scale-105 z-10"
            title="Remove meal"
            aria-label={`Remove ${recipe.name} from meal plan`}
          >
            <X className="h-3.5 w-3.5 text-gray-600 hover:text-red-600" />
          </button>
        )}
      </div>

      <div className="flex md:flex-col">
        {/* Recipe Image */}
        <div className="relative flex-shrink-0 w-20 h-20 md:w-full md:h-auto">
          {recipe.imageUrl ? (
            <div className="w-full h-full md:aspect-[4/3] overflow-hidden rounded-l-lg md:rounded-l-none md:rounded-t-lg">
              <img
                src={recipe.imageUrl}
                alt={recipe.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full h-full md:aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-l-lg md:rounded-l-none md:rounded-t-lg flex items-center justify-center">
              <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
            </div>
          )}

          {/* Rating Badge */}
          {recipe.rating && recipe.rating > 0 && (
            <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-1.5 py-0.5 md:px-2 md:py-1 flex items-center space-x-1">
              <Star className="h-2.5 w-2.5 md:h-3 md:w-3 text-yellow-500 fill-current" />
              <span className="text-xs font-medium text-gray-700">
                {recipe.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Recipe Details */}
        <div className="flex-1 p-3 min-w-0">
          {/* Recipe Name */}
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
            {recipe.name}
          </h3>

          {/* Key Details Row */}
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Total Time */}
              {getTotalTime() > 0 && (
                <div className="flex items-center space-x-1" title={`Prep: ${recipe.prepTime || 0}m, Cook: ${recipe.cookTime || 0}m`}>
                  <Clock className="h-3 w-3" />
                  <span>{getTotalTime()}m</span>
                </div>
              )}

              {/* Servings */}
              <div className="flex items-center space-x-1" title={`Serves ${servings} people`}>
                <Users className="h-3 w-3" />
                <span>{servings}</span>
              </div>
            </div>

            {/* Difficulty Badge */}
            {recipe.difficulty && (
              <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                recipe.difficulty === 'Easy' 
                  ? 'bg-green-100 text-green-800 group-hover:bg-green-200'
                  : recipe.difficulty === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200'
                  : 'bg-red-100 text-red-800 group-hover:bg-red-200'
              }`}>
                {recipe.difficulty}
              </span>
            )}
          </div>

          {/* Dietary Tags - Show fewer on mobile */}
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.dietaryTags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium group-hover:bg-blue-200 transition-colors duration-200"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {recipe.dietaryTags.length > 1 && (
                <span 
                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium group-hover:bg-gray-200 transition-colors duration-200"
                  title={`Additional tags: ${recipe.dietaryTags.slice(1).join(', ')}`}
                >
                  +{recipe.dietaryTags.length - 1}
                </span>
              )}
            </div>
          )}

          {/* Recipe Description Preview - Hidden on mobile */}
          {recipe.description && (
            <p className="hidden md:block text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 pointer-events-none rounded-lg" />
    </div>
  );
};