import React from 'react';
import { useDrag } from 'react-dnd';
import { MealSlot, MealType } from '../../types/MealPlan.types';
import { X, ChefHat, Users, Plus, Minus, ShoppingCart } from 'lucide-react';
import { DragItemTypes, MealDragItem, DragCollectedProps } from '../../types/DragDrop.types';

interface MealCardProps {
  meal: MealSlot;
  dayIndex?: number;
  mealType?: MealType;
  onRemove: (e?: React.MouseEvent) => void;
  onClick: () => void;
  onServingChange?: (newServings: number) => void;
  isDraggable?: boolean;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  compact?: boolean;
  isInShoppingList?: boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  dayIndex,
  mealType,
  onRemove,
  onClick,
  onServingChange,
  isDraggable = false,
  onCopyMeal,
  onSwapMeals,
  onDuplicateDay,
  compact = false,
  isInShoppingList = false,
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

  const handleServingChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onServingChange) {
      const newServings = Math.max(1, servings + delta);
      onServingChange(newServings);
    }
  };

  // Compact version for meal slots
  if (compact) {
    return (
      <div
        ref={isDraggable && canDrag ? dragRef : undefined}
        className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden touch-manipulation ${
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
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center space-x-1">
            {/* Shopping List Indicator */}
            {isInShoppingList && (
              <div 
                className="p-1 rounded-full bg-green-100 border border-green-200"
                title="Included in shopping list"
                aria-label="This meal is included in the shopping list"
              >
                <ShoppingCart className="h-3 w-3 text-green-600" />
              </div>
            )}
            
            {/* Direct Delete Button */}
            <button
              onClick={handleRemove}
              className="p-2 rounded-full bg-white shadow-sm border border-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:border-red-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
              title="Remove meal"
              aria-label={`Remove ${recipe.name} from meal plan`}
            >
              <X className="h-4 w-4 text-gray-600 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Desktop Layout - Vertical Card */}
        <div className="hidden md:block">
          {/* Recipe Image */}
          <div className="relative w-full h-20">
            {recipe.imageUrl ? (
              <div className="w-full h-full overflow-hidden rounded-t-lg">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Recipe Details */}
          <div className="p-3">
            {/* Recipe Name - Visible and Prominent */}
            <h3 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
              {recipe.name}
            </h3>
            
            {/* Compact Serving Adjustment Controls */}
            <div className="flex items-center justify-between">
              <div className="flex-1"></div>
              {onServingChange ? (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                  <button
                    onClick={(e) => handleServingChange(-1, e)}
                    disabled={servings <= 1}
                    className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                    title="Decrease servings"
                    aria-label="Decrease servings"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex items-center space-x-1 min-w-[32px] justify-center">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-sm">{servings}</span>
                  </div>
                  <button
                    onClick={(e) => handleServingChange(1, e)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                    title="Increase servings"
                    aria-label="Increase servings"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">{servings}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout - Horizontal Card */}
        <div className="md:hidden flex items-center space-x-3 p-3">
          {/* Recipe Image */}
          <div className="relative flex-shrink-0 w-16 h-16">
            {recipe.imageUrl ? (
              <div className="w-full h-full overflow-hidden rounded-lg">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Recipe Details */}
          <div className="flex-1 min-w-0">
            {/* Recipe Name - Visible and Prominent */}
            <h3 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
              {recipe.name}
            </h3>
            
            {/* Compact Serving Adjustment Controls */}
            <div className="flex items-center">
              {onServingChange ? (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                  <button
                    onClick={(e) => handleServingChange(-1, e)}
                    disabled={servings <= 1}
                    className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                    title="Decrease servings"
                    aria-label="Decrease servings"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex items-center space-x-1 min-w-[32px] justify-center">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-sm">{servings}</span>
                  </div>
                  <button
                    onClick={(e) => handleServingChange(1, e)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                    title="Increase servings"
                    aria-label="Increase servings"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">{servings}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 pointer-events-none rounded-lg" />
      </div>
    );
  }

  // Full version for recipe sidebar
  return (
    <div
      ref={isDraggable && canDrag ? dragRef : undefined}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden touch-manipulation ${
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
      <div className="absolute top-2 right-2 flex items-center space-x-1 z-10">
        {/* Shopping List Indicator */}
        {isInShoppingList && (
          <div 
            className="p-1.5 rounded-full bg-green-100 border border-green-200"
            title="Included in shopping list"
            aria-label="This meal is included in the shopping list"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
          </div>
        )}
        
        {/* Direct Delete Button */}
        <button
          onClick={handleRemove}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:scale-105 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
          title="Remove meal"
          aria-label={`Remove ${recipe.name} from meal plan`}
        >
          <X className="h-4 w-4 text-gray-600 hover:text-red-600" />
        </button>
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
        </div>

        {/* Recipe Details */}
        <div className="flex-1 p-3 min-w-0">
          {/* Recipe Name - Visible and Prominent */}
          <h3 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
            {recipe.name}
          </h3>

          {/* Compact Serving Adjustment Controls */}
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            {onServingChange ? (
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                <button
                  onClick={(e) => handleServingChange(-1, e)}
                  disabled={servings <= 1}
                  className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                  title="Decrease servings"
                  aria-label="Decrease servings"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex items-center space-x-1 min-w-[32px] justify-center" title={`Serves ${servings} people`}>
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">{servings}</span>
                </div>
                <button
                  onClick={(e) => handleServingChange(1, e)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200 touch-manipulation min-h-touch min-w-touch flex items-center justify-center"
                  title="Increase servings"
                  aria-label="Increase servings"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2" title={`Serves ${servings} people`}>
                <Users className="h-4 w-4" />
                <span className="font-medium text-sm">{servings}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 pointer-events-none rounded-lg" />
    </div>
  );
};