import React from 'react';
import { useMealPlannerCalendar } from '../../hooks/useMealPlannerCalendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';

interface MealPlannerCalendarProps {
  initialWeek?: Date;
  onMealPlanChange?: (mealPlan: any) => void;
}

export const MealPlannerCalendar: React.FC<MealPlannerCalendarProps> = ({
  onMealPlanChange,
}) => {
  const {
    // Calendar state and navigation
    currentWeek,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,

    // Meal plan data and operations
    mealPlan,
    isLoading,
    error,
    assignMeal,
    removeMeal,

    // Event handlers
    handleMealSlotClick,

    // Auto-save status
    isDirty,
    lastSaved,
  } = useMealPlannerCalendar();

  // Handle meal plan changes callback
  React.useEffect(() => {
    if (mealPlan && onMealPlanChange) {
      onMealPlanChange(mealPlan);
    }
  }, [mealPlan, onMealPlanChange]);

  // Handle shopping list generation (placeholder for now)
  const handleGenerateShoppingList = () => {
    // TODO: Implement shopping list generation
    console.log('Generate shopping list for week:', currentWeek);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load meal planner
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <CalendarHeader
        currentWeek={currentWeek}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onCurrentWeek={goToCurrentWeek}
        onGenerateShoppingList={handleGenerateShoppingList}
        isLoading={isLoading}
        isDirty={isDirty}
        lastSaved={lastSaved}
      />

      {/* Main Calendar Content */}
      <div className="flex flex-1 bg-gray-50">
        {/* Recipe Sidebar - Placeholder for now */}
        <div className="w-80 bg-white border-r border-gray-200 p-4">
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">🍳</div>
            <h3 className="font-medium text-gray-900 mb-2">Recipe Sidebar</h3>
            <p className="text-sm">
              Recipe search and browsing will be implemented here
            </p>
          </div>
        </div>

        {/* Calendar Grid */}
        <CalendarGrid
          weekStartDate={currentWeek}
          mealPlan={mealPlan || null}
          onMealAssign={assignMeal}
          onMealRemove={removeMeal}
          onMealSlotClick={handleMealSlotClick}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};