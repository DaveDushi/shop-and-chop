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
  onMealSwap?: (sourceLocation: { dayIndex: number; mealType: MealType }, targetDayIndex: number, targetMealType: MealType, recipe: Recipe) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onCopyMeal?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onDuplicateDay?: (sourceDayIndex: number, targetDayIndex: number) => void;
}

export const MealSlotComponent: React.FC<MealSlotComponentProps> = ({
  dayIndex,
  mealType,
  meal,
  onMealAssign,
  onMealRemove,
  onMealSwap,
  onSwapMeals,
  onCopyMeal,
  onDuplicateDay,
}) => {
  const handleMealAssign = (recipe: Recipe) => {
    onMealAssign(dayIndex, mealType, recipe);
  };

  const handleMealRemove = () => {
    onMealRemove(dayIndex, mealType);
  };

  const handleMealSwap = (sourceLocation: { dayIndex: number; mealType: MealType }, recipe: Recipe) => {
    if (onMealSwap) {
      onMealSwap(sourceLocation, dayIndex, mealType, recipe);
    }
  };

  return (
    <MealSlot
      dayIndex={dayIndex}
      mealType={mealType}
      meal={meal}
      onMealAssign={handleMealAssign}
      onMealRemove={handleMealRemove}
      onMealSwap={handleMealSwap}
      onSwapMeals={onSwapMeals}
      onCopyMeal={onCopyMeal}
      onDuplicateDay={onDuplicateDay}
    />
  );
};