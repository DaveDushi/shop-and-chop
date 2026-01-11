import React from 'react';
import { MealSlot as MealSlotType, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealSlot } from './MealSlot';

interface MealSlotComponentProps {
  dayIndex: number;
  mealType: MealType;
  mealLabel: string;
  meal?: MealSlotType;
  onMealAssign: (dayIndex: number, mealType: MealType, recipe: Recipe) => void;
  onMealRemove: (dayIndex: number, mealType: MealType) => void;
  onMealSlotClick: (dayIndex: number, mealType: MealType) => void;
  onMealCardClick?: (recipe: Recipe, meal?: MealSlotType) => void;
  onServingChange?: (dayIndex: number, mealType: MealType, newServings: number) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
  weekStartDate?: Date;
  isInShoppingList?: boolean;
}

export const MealSlotComponent: React.FC<MealSlotComponentProps> = ({
  dayIndex,
  mealType,
  meal,
  onMealAssign,
  onMealRemove,
  onMealCardClick,
  onServingChange,
  onSwapMeals,
  onCopyMeal,
  onDuplicateDay,
  weekStartDate,
  isInShoppingList = false,
}) => {
  const handleMealAssign = (recipe: Recipe) => {
    onMealAssign(dayIndex, mealType, recipe);
  };

  const handleMealRemove = () => {
    onMealRemove(dayIndex, mealType);
  };

  const handleServingChange = (newServings: number) => {
    if (onServingChange) {
      onServingChange(dayIndex, mealType, newServings);
    }
  };

  return (
    <MealSlot
      dayIndex={dayIndex}
      mealType={mealType}
      meal={meal}
      onMealAssign={handleMealAssign}
      onMealRemove={handleMealRemove}
      onMealCardClick={onMealCardClick}
      onServingChange={handleServingChange}
      onSwapMeals={onSwapMeals}
      onCopyMeal={onCopyMeal}
      onDuplicateDay={onDuplicateDay}
      weekStartDate={weekStartDate}
      isInShoppingList={isInShoppingList}
    />
  );
};