import React from 'react';
import { format, addDays } from 'date-fns';
import { MealPlan, MealType, MealSlot } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { DayColumn } from './DayColumn';
import { MealSlotComponent } from './MealSlotComponent';
import { Trash2 } from 'lucide-react';

interface CalendarGridProps {
  weekStartDate: Date;
  mealPlan: MealPlan | null;
  onMealAssign: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove: (dayIndex: number, mealType: MealType) => void;
  onMealSlotClick: (dayIndex: number, mealType: MealType) => void;
  onMealCardClick?: (recipe: Recipe, meal?: MealSlot) => void;
  onServingChange?: (dayIndex: number, mealType: MealType, newServings: number, isManualOverride?: boolean) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onClearDay?: (dayIndex: number) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  isLoading?: boolean;
  mealsInShoppingList?: Set<string>;
  useManualOverride?: boolean;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  weekStartDate,
  mealPlan,
  onMealAssign,
  onMealRemove,
  onMealSlotClick,
  onMealCardClick,
  onServingChange,
  onSwapMeals,
  onClearDay,
  onCopyMeal,
  onDuplicateDay,
  isLoading = false,
  mealsInShoppingList = new Set(),
  useManualOverride = false,
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
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      {/* Desktop Calendar Header - Hidden on Mobile */}
      <div className="hidden lg:grid grid-cols-7 border-b border-gray-200 bg-white rounded-t-lg shadow-sm border border-gray-200">
        {DAY_LABELS.map((dayLabel, index) => {
          const currentDate = addDays(weekStartDate, index);
          const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <div
              key={dayLabel}
              className={`p-3 xl:p-4 text-center border-r border-gray-200 last:border-r-0 ${
                isToday ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm xl:text-base">{dayLabel}</div>
              <div className={`text-xs xl:text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                {format(currentDate, 'MMM d')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Layout - Single Column */}
        <div className="lg:hidden space-y-3 p-3 xs:p-4">
          {DAYS_OF_WEEK.map((dayKey, dayIndex) => {
            const currentDate = addDays(weekStartDate, dayIndex);
            const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const dayMeals = (displayMealPlan.meals as any)[dayKey] || {};
            
            return (
              <div key={dayKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Day Header */}
                <div className={`p-3 xs:p-4 border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize text-base xs:text-lg">{dayKey}</div>
                      <div className={`text-sm xs:text-base ${isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        {format(currentDate, 'MMM d')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isToday && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Today
                        </span>
                      )}
                      {/* Clear Day Button for Mobile */}
                      {(dayMeals.breakfast || dayMeals.lunch || dayMeals.dinner) && onClearDay && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to clear all meals for ${dayKey}?`)) {
                              onClearDay(dayIndex);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 touch-manipulation"
                          title={`Clear all meals for ${dayKey}`}
                          aria-label={`Clear all meals for ${dayKey}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mobile Meal Slots */}
                <div className="p-3 xs:p-4 space-y-3 xs:space-y-4">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
                    <MealSlotComponent
                      key={`mobile-${dayKey}-${mealType}`}
                      dayIndex={dayIndex}
                      mealType={mealType}
                      mealLabel={mealType}
                      meal={dayMeals[mealType]}
                      mealPlanId={mealPlan?.id}
                      onMealAssign={onMealAssign}
                      onMealRemove={onMealRemove}
                      onMealSlotClick={onMealSlotClick}
                      onMealCardClick={onMealCardClick}
                      onServingChange={onServingChange}
                      onSwapMeals={onSwapMeals}
                      onCopyMeal={onCopyMeal}
                      onDuplicateDay={onDuplicateDay}
                      weekStartDate={weekStartDate}
                      isInShoppingList={dayMeals[mealType] ? mealsInShoppingList.has(dayMeals[mealType].id) : false}
                      useManualOverride={useManualOverride}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tablet Layout - Compact Grid */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 p-4">
          {DAYS_OF_WEEK.map((dayKey, dayIndex) => {
            const currentDate = addDays(weekStartDate, dayIndex);
            const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const dayMeals = (displayMealPlan.meals as any)[dayKey] || {};
            
            return (
              <div key={dayKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Tablet Day Header */}
                <div className={`p-3 border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">{dayKey}</div>
                      <div className={`text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        {format(currentDate, 'MMM d')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isToday && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Today
                        </span>
                      )}
                      {/* Clear Day Button for Tablet */}
                      {(dayMeals.breakfast || dayMeals.lunch || dayMeals.dinner) && onClearDay && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to clear all meals for ${dayKey}?`)) {
                              onClearDay(dayIndex);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                          title={`Clear all meals for ${dayKey}`}
                          aria-label={`Clear all meals for ${dayKey}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tablet Meal Slots */}
                <div className="p-3 space-y-3">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
                    <MealSlotComponent
                      key={`tablet-${dayKey}-${mealType}`}
                      dayIndex={dayIndex}
                      mealType={mealType}
                      mealLabel={mealType}
                      meal={dayMeals[mealType]}
                      mealPlanId={mealPlan?.id}
                      onMealAssign={onMealAssign}
                      onMealRemove={onMealRemove}
                      onMealSlotClick={onMealSlotClick}
                      onMealCardClick={onMealCardClick}
                      onServingChange={onServingChange}
                      onSwapMeals={onSwapMeals}
                      onCopyMeal={onCopyMeal}
                      onDuplicateDay={onDuplicateDay}
                      weekStartDate={weekStartDate}
                      isInShoppingList={dayMeals[mealType] ? mealsInShoppingList.has(dayMeals[mealType].id) : false}
                      useManualOverride={useManualOverride}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Layout - Full Grid */}
        <div className="hidden lg:grid grid-cols-7 flex-1 bg-white rounded-b-lg shadow-sm border-l border-r border-b border-gray-200">
          {DAYS_OF_WEEK.map((dayKey, dayIndex) => {
            const dayMeals = (displayMealPlan.meals as any)[dayKey] || {};
            
            return (
              <DayColumn
                key={dayKey}
                dayIndex={dayIndex}
                dayKey={dayKey}
                meals={dayMeals}
                mealPlanId={mealPlan?.id}
                onMealAssign={onMealAssign}
                onMealRemove={onMealRemove}
                onMealSlotClick={onMealSlotClick}
                onMealCardClick={onMealCardClick}
                onServingChange={onServingChange}
                onSwapMeals={onSwapMeals}
                onClearDay={onClearDay}
                onCopyMeal={onCopyMeal}
                onDuplicateDay={onDuplicateDay}
                weekStartDate={weekStartDate}
                mealsInShoppingList={mealsInShoppingList}
                useManualOverride={useManualOverride}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};