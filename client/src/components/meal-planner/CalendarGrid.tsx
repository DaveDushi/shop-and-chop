import React from 'react';
import { format, addDays } from 'date-fns';
import { MealPlan, MealType, MealSlot } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { DayColumn } from './DayColumn';

interface CalendarGridProps {
  weekStartDate: Date;
  mealPlan: MealPlan | null;
  onMealAssign: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove: (dayIndex: number, mealType: MealType) => void;
  onMealSlotClick: (dayIndex: number, mealType: MealType) => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  weekStartDate,
  mealPlan,
  onMealAssign,
  onMealRemove,
  onMealSlotClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  // Create empty meal plan structure if none exists
  const displayMealPlan = mealPlan || {
    meals: {
      monday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      tuesday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      wednesday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      thursday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      friday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      saturday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
      sunday: {} as { breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot },
    }
  };

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_LABELS.map((dayLabel, index) => {
          const currentDate = addDays(weekStartDate, index);
          const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <div
              key={dayLabel}
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                isToday ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">{dayLabel}</div>
              <div className={`text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                {format(currentDate, 'MMM d')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar Body */}
      <div className="grid grid-cols-7 flex-1">
        {DAYS_OF_WEEK.map((dayKey, dayIndex) => {
          const dayMeals = (displayMealPlan.meals as any)[dayKey] || {};
          
          return (
            <DayColumn
              key={dayKey}
              dayIndex={dayIndex}
              dayKey={dayKey}
              meals={dayMeals}
              onMealAssign={onMealAssign}
              onMealRemove={onMealRemove}
              onMealSlotClick={onMealSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
};