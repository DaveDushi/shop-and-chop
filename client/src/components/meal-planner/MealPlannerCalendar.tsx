import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMealPlannerCalendar } from '../../hooks/useMealPlannerCalendar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAccessibleDragDrop } from '../../hooks/useAccessibleDragDrop';
import { useShoppingList } from '../../hooks/useShoppingList';
import { useHouseholdSize } from '../../contexts/HouseholdSizeContext';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { DragLayer } from './DragLayer';
import { RecipeDetailModal } from './RecipeDetailModal';
import { ShoppingListModal } from './ShoppingListModal';
import { KeyboardNavigationHelp } from './KeyboardNavigationHelp';
import { Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';

interface MealPlannerCalendarProps {
  initialWeek?: Date;
  onMealPlanChange?: (mealPlan: any) => void;
}

export const MealPlannerCalendar: React.FC<MealPlannerCalendarProps> = ({
  onMealPlanChange,
}) => {
  const { householdSize } = useHouseholdSize();
  
  // Recipe detail modal state
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(null);
  const [selectedMeal, setSelectedMeal] = React.useState<any | null>(null); // Store the meal that was clicked
  const [showRecipeDetailModal, setShowRecipeDetailModal] = React.useState(false);

  // Shopping list functionality
  const {
    shoppingList,
    isGenerating: isGeneratingShoppingList,
    error: shoppingListError,
    generateShoppingList,
    clearShoppingList,
    clearError: clearShoppingListError,
    saveToShoppingList
  } = useShoppingList({ 
    householdSize,
    enableOfflineStorage: false, // Disable offline storage to prevent duplicates
    enableAutoSync: false
  });

  // Shopping list modal state
  const [showShoppingListModal, setShowShoppingListModal] = React.useState(false);
  const [mealsInShoppingList, setMealsInShoppingList] = React.useState<Set<string>>(new Set());

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
    updateServings,

    // Event handlers
    handleMealSlotClick,

    // Auto-save status and controls
    autoSaveStatus,
    isOnline,
    forceSave,
    clearAutoSaveError,
    // Legacy props for backward compatibility
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

  // Enable accessible drag-and-drop
  const { announce } = useAccessibleDragDrop({
    onMealAssign: assignMeal,
    onMealRemove: removeMeal,
    onMealSwap: swapMeals,
    enabled: true,
  });

  // Handle meal plan changes callback
  React.useEffect(() => {
    if (mealPlan && onMealPlanChange) {
      onMealPlanChange(mealPlan);
    }
  }, [mealPlan]); // Remove onMealPlanChange from dependencies to prevent infinite loop

  // Announce meal plan changes to screen readers
  React.useEffect(() => {
    if (mealPlan && announce) {
      // Only announce after initial load
      const timer = setTimeout(() => {
        const totalMeals = Object.values(mealPlan.meals).reduce((count, dayMeals) => {
          return count + Object.values(dayMeals).filter(meal => meal).length;
        }, 0);
        
        if (totalMeals > 0) {
          announce(`Meal plan loaded with ${totalMeals} meals planned for the week`);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [mealPlan, announce]);

  // Handle meal card click to show recipe details
  const handleMealCardClick = (recipe: Recipe, meal?: any) => {
    setSelectedRecipe(recipe);
    setSelectedMeal(meal || null);
    setShowRecipeDetailModal(true);
  };

  // Handle serving size changes
  const handleServingChange = (dayIndex: number, mealType: MealType, newServings: number, isManualOverride?: boolean) => {
    if (isManualOverride) {
      // Handle manual override serving changes
      updateServings(dayIndex, mealType, newServings);
    } else {
      // Handle regular serving changes
      updateServings(dayIndex, mealType, newServings);
    }
  };

  // Handle closing recipe detail modal
  const handleCloseRecipeDetailModal = () => {
    setShowRecipeDetailModal(false);
    setSelectedRecipe(null);
    setSelectedMeal(null);
  };

  // Handle shopping list generation
  const handleGenerateShoppingList = async () => {
    if (mealPlan) {
      // Track which meals are included in the shopping list
      const mealIds = new Set<string>();
      Object.values(mealPlan.meals).forEach(dayMeals => {
        Object.values(dayMeals).forEach(mealSlot => {
          if (mealSlot) {
            mealIds.add(mealSlot.id);
          }
        });
      });
      setMealsInShoppingList(mealIds);
      
      // Generate shopping list with metadata for offline storage
      const metadata = {
        id: `mp_${mealPlan.id}_${Date.now()}`,
        mealPlanId: mealPlan.id,
        weekStartDate: currentWeek.toISOString(),
        generatedAt: new Date()
      };
      
      await generateShoppingList(mealPlan, metadata);
      setShowShoppingListModal(true);
    }
  };

  // Handle closing shopping list modal
  const handleCloseShoppingListModal = () => {
    setShowShoppingListModal(false);
    setMealsInShoppingList(new Set());
    clearShoppingList();
    clearShoppingListError();
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
      <div 
        className="flex flex-col h-full min-h-screen bg-gray-50"
        role="application"
        aria-label="Meal Planning Calendar"
      >
        {/* Skip to main content link for screen readers */}
        <a 
          href="#calendar-grid" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          Skip to calendar
        </a>

        {/* Keyboard navigation instructions for screen readers */}
        <div className="sr-only" aria-live="polite">
          Use arrow keys to navigate between meal slots. Press Enter to add meals, Delete to remove meals, and Space to move meals between slots.
        </div>
        {/* Calendar Header */}
        <CalendarHeader
          currentWeek={currentWeek}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
          onGenerateShoppingList={handleGenerateShoppingList}
          isLoading={isLoading || isGeneratingShoppingList}
          autoSaveStatus={autoSaveStatus}
          isOnline={isOnline}
          onForceSave={forceSave}
          onClearAutoSaveError={clearAutoSaveError}
          // Legacy props for backward compatibility
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
        <div className="flex-1 flex flex-col">
          {/* Calendar Grid */}
          <div className="flex-1 p-2 xs:p-3 md:p-4">
            <CalendarGrid
              weekStartDate={currentWeek}
              mealPlan={mealPlan || null}
              onMealAssign={assignMeal}
              onMealRemove={removeMeal}
              onMealSlotClick={handleMealSlotClick}
              onMealCardClick={handleMealCardClick}
              onServingChange={handleServingChange}
              onSwapMeals={swapMeals}
              onClearDay={clearDay}
              onCopyMeal={copyMeal}
              onDuplicateDay={duplicateDay}
              isLoading={isLoading}
              mealsInShoppingList={mealsInShoppingList}
              useManualOverride={true}
            />
          </div>
        </div>

        {/* Drag Layer for Custom Drag Previews */}
        <DragLayer />

        {/* Recipe Detail Modal */}
        <RecipeDetailModal
          isOpen={showRecipeDetailModal}
          onClose={handleCloseRecipeDetailModal}
          recipe={selectedRecipe}
          meal={selectedMeal}
          enableScaling={true}
          householdSize={householdSize}
        />

        {/* Shopping List Modal */}
        <ShoppingListModal
          isOpen={showShoppingListModal}
          onClose={handleCloseShoppingListModal}
          shoppingList={shoppingList}
          isGenerating={isGeneratingShoppingList}
          error={shoppingListError}
          onClearError={clearShoppingListError}
          onSaveToShoppingList={saveToShoppingList}
        />

        {/* Keyboard Navigation Help */}
        <KeyboardNavigationHelp />
      </div>
    </DndProvider>
  );
};