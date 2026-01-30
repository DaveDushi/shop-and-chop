import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { MealSlot as MealSlotType, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealCard } from './MealCard';
import { RecipeSelectionModal } from './RecipeSelectionModal';
import { Plus } from 'lucide-react';
import { DragItemTypes, DragItem, DropCollectedProps, DropResult } from '../../types/DragDrop.types';
import { format, addDays } from 'date-fns';
import { useHouseholdSize } from '../../contexts/HouseholdSizeContext';

interface MealSlotProps {
  dayIndex: number;
  mealType: MealType;
  meal?: MealSlotType;
  mealPlanId?: string;
  onMealAssign: (recipe: Recipe) => void;
  onMealRemove: () => void;
  onMealCardClick?: (recipe: Recipe, meal?: MealSlotType) => void;
  onServingChange?: (newServings: number, isManualOverride?: boolean) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  weekStartDate?: Date;
  isInShoppingList?: boolean;
  useManualOverride?: boolean;
}

export const MealSlot: React.FC<MealSlotProps> = ({
  dayIndex,
  mealType,
  meal,
  mealPlanId,
  onMealAssign,
  onMealRemove,
  onMealCardClick,
  onServingChange,
  onSwapMeals,
  onCopyMeal,
  onDuplicateDay,
  weekStartDate,
  isInShoppingList = false,
  useManualOverride = false,
}) => {
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  
  // Get household size for scaling
  const { householdSize } = useHouseholdSize();

  // Make slot focusable and add keyboard event handling
  useEffect(() => {
    const slotElement = slotRef.current;
    if (!slotElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Enter key to open recipe selection
      if (event.key === 'Enter' && !meal) {
        event.preventDefault();
        setShowRecipeModal(true);
      }
      
      // Handle Delete key to remove meal
      if (event.key === 'Delete' && meal) {
        event.preventDefault();
        onMealRemove();
      }
    };

    slotElement.addEventListener('keydown', handleKeyDown);
    return () => slotElement.removeEventListener('keydown', handleKeyDown);
  }, [meal, onMealRemove]);

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
    if (meal && onMealCardClick) {
      onMealCardClick(meal.recipe, meal); // Pass both recipe and meal
    }
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

  const getSlotDescription = (): string => {
    const dayName = getDayName();
    const mealName = getMealTypeLabel(mealType);
    
    if (meal) {
      return `${dayName} ${mealName}: ${meal.recipe.name}, ${meal.servings} servings`;
    } else {
      return `${dayName} ${mealName}: Empty meal slot`;
    }
  };

  const getSlotInstructions = (): string => {
    if (meal) {
      return 'Press Enter to view recipe details, Delete to remove meal, or drag to move';
    } else {
      return 'Press Enter to add a meal, or drag a recipe here';
    }
  };

  return (
    <>
      <div
        ref={(node) => {
          dropRef(node);
          if (slotRef.current !== node) {
            (slotRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        data-meal-slot="true"
        data-day-index={dayIndex}
        data-meal-type={mealType}
        tabIndex={0}
        role="button"
        aria-label={getSlotDescription()}
        aria-describedby={`meal-slot-instructions-${dayIndex}-${mealType}`}
        aria-expanded={showRecipeModal}
        aria-haspopup={!meal ? 'dialog' : undefined}
        className={`
          flex-1 min-h-[120px] xs:min-h-[140px] border-b border-gray-200 last:border-b-0 p-3
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
          ${isDropTarget 
            ? 'bg-blue-50 border-blue-300 border-2 border-dashed shadow-inner' 
            : 'border-solid'
          }
          ${!meal && !isDropTarget ? 'hover:bg-gray-50' : ''}
        `}
      >
        {/* Screen reader instructions */}
        <div 
          id={`meal-slot-instructions-${dayIndex}-${mealType}`}
          className="sr-only"
        >
          {getSlotInstructions()}
        </div>

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
              mealPlanId={mealPlanId}
              onRemove={handleRemove}
              onClick={handleMealCardClick}
              onServingChange={onServingChange}
              isDraggable={true}
              onCopyMeal={onCopyMeal}
              onSwapMeals={onSwapMeals}
              onDuplicateDay={onDuplicateDay}
              compact={true}
              isInShoppingList={isInShoppingList}
              useManualOverride={useManualOverride}
              enableScaling={true}
              householdSize={householdSize}
            />
          </div>
        ) : (
          <div 
            className={`
              flex-1 flex items-center justify-center min-h-[80px] xs:min-h-[100px] rounded-lg
              transition-all duration-200 ease-in-out cursor-pointer touch-manipulation
              ${isDropTarget 
                ? 'border-2 border-dashed border-blue-400 bg-blue-25' 
                : 'border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-25 active:bg-gray-100'
              }
            `}
            onClick={handleAddMealClick}
            data-add-meal-button="true"
            role="button"
            aria-label={`Add meal to ${getDayName()} ${getMealTypeLabel(mealType)}`}
          >
            <div className={`
              text-center transition-colors duration-200
              ${isDropTarget ? 'text-blue-500' : 'text-gray-400 hover:text-gray-500'}
            `}>
              <div className="mb-2">
                <Plus className={`
                  h-5 w-5 xs:h-6 xs:w-6 mx-auto transition-transform duration-200
                  ${isDropTarget ? 'scale-110' : 'hover:scale-105'}
                `} />
              </div>
              <div className="text-xs xs:text-sm font-medium">
                {isDropTarget ? 'Drop recipe here' : 'Add meal'}
              </div>
              {!isDropTarget && (
                <div className="text-xs text-gray-400 mt-1">
                  Tap to browse recipes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drop Target Overlay for Visual Feedback */}
        {isDropTarget && (
          <div 
            className="absolute inset-0 pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="w-full h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 bg-opacity-50 flex items-center justify-center">
              <div className="text-blue-600 font-medium text-xs xs:text-sm">
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