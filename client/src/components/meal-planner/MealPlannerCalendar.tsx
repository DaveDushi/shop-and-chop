import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMealPlannerCalendar } from '../../hooks/useMealPlannerCalendar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { RecipeSidebar } from './RecipeSidebar';
import { DragLayer } from './DragLayer';
import { Recipe } from '../../types/Recipe.types';

interface MealPlannerCalendarProps {
  initialWeek?: Date;
  onMealPlanChange?: (mealPlan: any) => void;
}

export const MealPlannerCalendar: React.FC<MealPlannerCalendarProps> = ({
  onMealPlanChange,
}) => {
  // Auto-collapse sidebar on mobile by default
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

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
    clearDay,
    copyMeal,
    duplicateDay,
    swapMeals,

    // Undo/Redo functionality
    undo,
    redo,
    canUndo,
    canRedo,
    getPreviousActionDescription,
    getNextActionDescription,

    // Event handlers
    handleMealSlotClick,

    // Auto-save status
    isDirty,
    lastSaved,
  } = useMealPlannerCalendar();

  // Enable keyboard shortcuts for undo/redo
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    enabled: true,
  });

  // Handle meal plan changes callback
  React.useEffect(() => {
    if (mealPlan && onMealPlanChange) {
      onMealPlanChange(mealPlan);
    }
  }, [mealPlan, onMealPlanChange]);

  // Handle window resize to auto-collapse sidebar on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  // Handle recipe selection from sidebar
  const handleRecipeSelect = (recipe: Recipe) => {
    // TODO: Implement recipe selection logic for drag-and-drop
    console.log('Recipe selected:', recipe);
  };

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
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full min-h-screen bg-gray-50">
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
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          previousActionDescription={getPreviousActionDescription ? getPreviousActionDescription() : ''}
          nextActionDescription={getNextActionDescription ? getNextActionDescription() : ''}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Mobile: Recipe Button - Fixed at bottom */}
          <div className="md:hidden fixed bottom-4 right-4 z-30">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
              title={sidebarCollapsed ? "Browse recipes" : "Close recipes"}
            >
              {sidebarCollapsed ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop: Recipe Sidebar */}
          <div className="hidden md:block">
            <RecipeSidebar
              onRecipeSelect={handleRecipeSelect}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>

          {/* Mobile: Full-screen Recipe Modal */}
          {!sidebarCollapsed && (
            <div className="md:hidden fixed inset-0 z-20 bg-white">
              <div className="flex flex-col h-full">
                {/* Mobile Recipe Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-semibold text-gray-900">Browse Recipes</h2>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Mobile Recipe Content */}
                <div className="flex-1 overflow-hidden">
                  <RecipeSidebar
                    onRecipeSelect={(recipe) => {
                      handleRecipeSelect(recipe);
                      setSidebarCollapsed(true); // Close modal after selection
                    }}
                    isCollapsed={false}
                    onToggleCollapse={() => setSidebarCollapsed(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="flex-1 p-4 md:p-0">
            <CalendarGrid
              weekStartDate={currentWeek}
              mealPlan={mealPlan || null}
              onMealAssign={assignMeal}
              onMealRemove={removeMeal}
              onMealSlotClick={handleMealSlotClick}
              onSwapMeals={swapMeals}
              onClearDay={clearDay}
              onCopyMeal={copyMeal}
              onDuplicateDay={duplicateDay}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Drag Layer for Custom Drag Previews */}
        <DragLayer />
      </div>
    </DndProvider>
  );
};