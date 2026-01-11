import React from 'react';
import { MealSlot, MealType } from '../../types/MealPlan.types';
import { Recipe } from '../../types/Recipe.types';
import { MealSlotComponent } from './MealSlotComponent';

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
}) => {
  return (
    <div className="border-r border-gray-200 last:border-r-0 flex flex-col">
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
        />
      ))}
    </div>
  );
};