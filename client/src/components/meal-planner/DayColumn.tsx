import React from 'react';
import { MealSlot, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealSlotComponent } from './MealSlotComponent';
import { Trash2 } from 'lucide-react';

interface DayColumnProps {
  dayIndex: number;
  dayKey: string;
  meals: {
    breakfast?: MealSlot;
    lunch?: MealSlot;
    dinner?: MealSlot;
  };
  onMealAssign: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove: (dayIndex: number, mealType: MealType) => void;
  onMealSlotClick: (dayIndex: number, mealType: MealType) => void;
  onMealSwap?: (sourceLocation: { dayIndex: number; mealType: MealType }, targetDayIndex: number, targetMealType: MealType, recipe: Recipe) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onClearDay?: (dayIndex: number) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  weekStartDate?: Date;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export const DayColumn: React.FC<DayColumnProps> = ({
  dayIndex,
  dayKey,
  meals,
  onMealAssign,
  onMealRemove,
  onMealSlotClick,
  onSwapMeals,
  onClearDay,
  onCopyMeal,
  onDuplicateDay,
  weekStartDate,
}) => {
  // Check if the day has any meals
  const hasMeals = meals.breakfast || meals.lunch || meals.dinner;

  const handleClearDay = () => {
    if (onClearDay && hasMeals) {
      if (window.confirm(`Are you sure you want to clear all meals for ${dayKey}?`)) {
        onClearDay(dayIndex);
      }
    }
  };

  return (
    <div className="border-r border-gray-200 last:border-r-0 flex flex-col md:min-h-[500px] min-h-[400px]">
      {/* Mobile Day Header - only show on mobile when using single column layout */}
      <div className="md:hidden bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="font-semibold text-gray-900 capitalize">{dayKey}</div>
        {hasMeals && onClearDay && (
          <button
            onClick={handleClearDay}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
            title={`Clear all meals for ${dayKey}`}
            aria-label={`Clear all meals for ${dayKey}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {MEAL_TYPES.map((mealType) => (
        <MealSlotComponent
          key={`${dayKey}-${mealType}`}
          dayIndex={dayIndex}
          mealType={mealType}
          mealLabel={MEAL_LABELS[mealType]}
          meal={meals[mealType]}
          onMealAssign={onMealAssign}
          onMealRemove={onMealRemove}
          onMealSlotClick={onMealSlotClick}
          onSwapMeals={onSwapMeals}
          onCopyMeal={onCopyMeal}
          onDuplicateDay={onDuplicateDay}
          weekStartDate={weekStartDate}
        />
      ))}

      {/* Desktop Clear Day Button - show at bottom of column */}
      <div className="hidden md:block mt-auto p-2 border-t border-gray-100">
        {hasMeals && onClearDay && (
          <button
            onClick={handleClearDay}
            className="w-full p-2 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
            title={`Clear all meals for ${dayKey}`}
            aria-label={`Clear all meals for ${dayKey}`}
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Day</span>
          </button>
        )}
      </div>
    </div>
  );
};