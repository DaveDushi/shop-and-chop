import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { MealSlot as MealSlotType, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealCard } from './MealCard';
import { RecipeSelectionModal } from './RecipeSelectionModal';
import { Plus } from 'lucide-react';
import { DragItemTypes, DragItem, DropCollectedProps, DropResult } from '../../types/DragDrop.types';
import { format, addDays } from 'date-fns';

interface MealSlotProps {
  dayIndex: number;
  mealType: MealType;
  meal?: MealSlotType;
  onMealAssign: (recipe: Recipe) => void;
  onMealRemove: () => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  weekStartDate?: Date;
}

export const MealSlot: React.FC<MealSlotProps> = ({
  dayIndex,
  mealType,
  meal,
  onMealAssign,
  onMealRemove,
  onSwapMeals,
  onCopyMeal,
  onDuplicateDay,
  weekStartDate,
}) => {
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Set up drop functionality
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem,
    DropResult,
    DropCollectedProps
  >({
    accept: [DragItemTypes.RECIPE, DragItemTypes.MEAL],
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        if (item.type === DragItemTypes.RECIPE) {
          // Handle recipe drop from sidebar
          onMealAssign(item.recipe);
        } else if (item.type === DragItemTypes.MEAL) {
          // Always use swapMeals for meal-to-meal operations
          if (onSwapMeals) {
            onSwapMeals(
              item.sourceLocation.dayIndex,
              item.sourceLocation.mealType,
              dayIndex,
              mealType
            );
          }
        }
        
        return {
          dayIndex,
          mealType,
          dropEffect: item.type === DragItemTypes.MEAL ? 'move' : 'copy',
        };
      }
    },
    canDrop: (item) => {
      // Allow recipe drops from sidebar
      if (item.type === DragItemTypes.RECIPE) {
        return true;
      }
      
      // Allow meal swaps only if it's a different slot
      if (item.type === DragItemTypes.MEAL) {
        return !(
          item.sourceLocation.dayIndex === dayIndex &&
          item.sourceLocation.mealType === mealType
        );
      }
      
      return false;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isDropTarget = isOver && canDrop;

  const handleMealCardClick = () => {
    // This will be handled by the parent component for recipe detail modal
    // For now, we'll just prevent the event from bubbling up
  };

  const handleRemove = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onMealRemove();
  };

  const handleAddMealClick = () => {
    setShowRecipeModal(true);
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    onMealAssign(recipe);
    setShowRecipeModal(false);
  };

  const getMealTypeLabel = (type: MealType): string => {
    switch (type) {
      case 'breakfast':
        return 'Breakfast';
      case 'lunch':
        return 'Lunch';
      case 'dinner':
        return 'Dinner';
      default:
        return type;
    }
  };

  const getDayName = (): string => {
    if (!weekStartDate) return '';
    const currentDate = addDays(weekStartDate, dayIndex);
    return format(currentDate, 'EEEE');
  };

  return (
    <>
      <div
        ref={dropRef}
        className={`
          flex-1 min-h-[140px] border-b border-gray-200 last:border-b-0 p-3
          transition-all duration-200 ease-in-out
          ${isDropTarget 
            ? 'bg-blue-50 border-blue-300 border-2 border-dashed shadow-inner' 
            : 'border-solid'
          }
          ${!meal && !isDropTarget ? 'hover:bg-gray-50' : ''}
        `}
      >
        {/* Meal Type Label */}
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          {getMealTypeLabel(mealType)}
        </div>

        {/* Meal Content */}
        {meal ? (
          <div className="h-full">
            <MealCard
              meal={meal}
              dayIndex={dayIndex}
              mealType={mealType}
              onRemove={handleRemove}
              onClick={handleMealCardClick}
              isDraggable={true}
              onCopyMeal={onCopyMeal}
              onSwapMeals={onSwapMeals}
              onDuplicateDay={onDuplicateDay}
              compact={true}
            />
          </div>
        ) : (
          <div 
            className={`
              flex-1 flex items-center justify-center min-h-[100px] rounded-lg
              transition-all duration-200 ease-in-out cursor-pointer
              ${isDropTarget 
                ? 'border-2 border-dashed border-blue-400 bg-blue-25' 
                : 'border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-25'
              }
            `}
            onClick={handleAddMealClick}
          >
            <div className={`
              text-center transition-colors duration-200
              ${isDropTarget ? 'text-blue-500' : 'text-gray-400 hover:text-gray-500'}
            `}>
              <div className="mb-2">
                <Plus className={`
                  h-6 w-6 mx-auto transition-transform duration-200
                  ${isDropTarget ? 'scale-110' : 'hover:scale-105'}
                `} />
              </div>
              <div className="text-sm font-medium">
                {isDropTarget ? 'Drop recipe here' : 'Add meal'}
              </div>
              {!isDropTarget && (
                <div className="text-xs text-gray-400 mt-1">
                  Click to browse recipes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drop Target Overlay for Visual Feedback */}
        {isDropTarget && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 bg-opacity-50 flex items-center justify-center">
              <div className="text-blue-600 font-medium text-sm">
                Drop to add meal
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recipe Selection Modal */}
      <RecipeSelectionModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        onSelectRecipe={handleRecipeSelect}
        mealType={mealType}
        dayName={getDayName()}
      />
    </>
  );
};