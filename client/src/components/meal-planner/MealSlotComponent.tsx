import React from 'react';
import { MealSlot, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealCard } from './MealCard';

interface MealSlotComponentProps {
  dayIndex: number;
  mealType: MealType;
  mealLabel: string;
  meal?: MealSlot;
  onMealAssign: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove: (dayIndex: number, mealType: MealType) => void;
  onMealSlotClick: (dayIndex: number, mealType: MealType) => void;
  isDropTarget?: boolean;
}

export const MealSlotComponent: React.FC<MealSlotComponentProps> = ({
  dayIndex,
  mealType,
  mealLabel,
  meal,
  onMealRemove,
  onMealSlotClick,
  isDropTarget = false,
}) => {
  const handleClick = () => {
    onMealSlotClick(dayIndex, mealType);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMealRemove(dayIndex, mealType);
  };

  return (
    <div
      className={`
        flex-1 min-h-[180px] border-b border-gray-200 last:border-b-0 p-3
        ${isDropTarget ? 'bg-blue-50 border-blue-300' : ''}
        ${!meal ? 'hover:bg-gray-50 cursor-pointer' : ''}
        transition-colors duration-200
      `}
      onClick={handleClick}
    >
      {/* Meal Type Label */}
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {mealLabel}
      </div>

      {/* Meal Content */}
      {meal ? (
        <MealCard
          meal={meal}
          onRemove={handleRemove}
          onClick={handleClick}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[120px] border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center text-gray-400">
            <div className="text-2xl mb-2">+</div>
            <div className="text-sm">Add meal</div>
          </div>
        </div>
      )}
    </div>
  );
};