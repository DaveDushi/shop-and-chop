import { Recipe } from './Recipe.types';
import { MealType } from './MealPlan.types';

// Drag item types
export const DragItemTypes = {
  RECIPE: 'RECIPE',
  MEAL: 'MEAL',
} as const;

export type DragItemType = typeof DragItemTypes[keyof typeof DragItemTypes];

// Base drag item interface
export interface BaseDragItem {
  type: DragItemType;
}

// Recipe drag item (from sidebar)
export interface RecipeDragItem extends BaseDragItem {
  type: typeof DragItemTypes.RECIPE;
  recipe: Recipe;
  sourceType: 'SIDEBAR';
}

// Meal drag item (from meal slot to meal slot)
export interface MealDragItem extends BaseDragItem {
  type: typeof DragItemTypes.MEAL;
  recipe: Recipe;
  sourceType: 'MEAL_SLOT';
  sourceLocation: {
    dayIndex: number;
    mealType: MealType;
  };
}

// Union type for all drag items
export type DragItem = RecipeDragItem | MealDragItem;

// Drop target interface
export interface DropTarget {
  dayIndex: number;
  mealType: MealType;
}

// Drop result interface
export interface DropResult extends DropTarget {
  dropEffect: 'move' | 'copy';
}

// Drag state interface
export interface DragState {
  isDragging: boolean;
  draggedItem?: DragItem;
  dropTarget?: DropTarget;
  dragPreview?: {
    x: number;
    y: number;
    recipe: Recipe;
  };
}

// Drag collection result (for useDrag hook)
export interface DragCollectedProps {
  isDragging: boolean;
  canDrag: boolean;
}

// Drop collection result (for useDrop hook)
export interface DropCollectedProps {
  isOver: boolean;
  canDrop: boolean;
  dropTarget?: DropTarget;
}