import React from 'react';
import { MealSlot as MealSlotType, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealCard } from './MealCard';
import { Plus } from 'lucide-react';

interface MealSlotProps {
  dayIndex: number;
  mealType: MealType;
  meal?: MealSlotType;
  onMealAssign: (recipe: Recipe) => void;
  onMealRemove: () => void;
  isDropTarget: boolean;
}

export const MealSlot: React.FC<MealSlotProps> = ({
  dayIndex: _dayIndex,
  mealType,
  meal,
  onMealAssign: _onMealAssign,
  onMealRemove,
  isDropTarget,
}) => {
  const handleMealCardClick = () => {
    // This will be handled by the parent component for recipe detail modal
    // For now, we'll just prevent the event from bubbling up
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMealRemove();
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

  return (
    <div
      className={`
        flex-1 min-h-[180px] border-b border-gray-200 last:border-b-0 p-3
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
            onRemove={handleRemove}
            onClick={handleMealCardClick}
          />
        </div>
      ) : (
        <div 
          className={`
            flex-1 flex items-center justify-center min-h-[120px] rounded-lg
            transition-all duration-200 ease-in-out cursor-pointer
            ${isDropTarget 
              ? 'border-2 border-dashed border-blue-400 bg-blue-25' 
              : 'border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-25'
            }
          `}
        >
          <div className={`
            text-center transition-colors duration-200
            ${isDropTarget ? 'text-blue-500' : 'text-gray-400 hover:text-gray-500'}
          `}>
            <div className="mb-2">
              <Plus className={`
                h-8 w-8 mx-auto transition-transform duration-200
                ${isDropTarget ? 'scale-110' : 'hover:scale-105'}
              `} />
            </div>
            <div className="text-sm font-medium">
              {isDropTarget ? 'Drop recipe here' : 'Add meal'}
            </div>
            {!isDropTarget && (
              <div className="text-xs text-gray-400 mt-1">
                Click to select recipe
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
  );
};