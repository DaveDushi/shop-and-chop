import { Recipe } from './Recipe.types';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealSlot {
  id: string;
  recipeId: string;
  recipe: Recipe;
  servings: number;
  notes?: string;
  scheduledFor: Date;
  mealType: MealType;
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStartDate: Date;
  meals: {
    [dayOfWeek: string]: {
      breakfast?: MealSlot;
      lunch?: MealSlot;
      dinner?: MealSlot;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Drag and Drop interfaces
export interface DragItem {
  type: 'RECIPE';
  recipe: Recipe;
  sourceType: 'SIDEBAR' | 'MEAL_SLOT';
  sourceLocation?: { dayIndex: number; mealType: MealType };
}

export interface DropTarget {
  dayIndex: number;
  mealType: MealType;
}

export interface DropResult {
  dayIndex: number;
  mealType: MealType;
  dropEffect: 'move' | 'copy';
}

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

// Calendar State
export interface CalendarState {
  currentWeek: Date;
  mealPlan: MealPlan | null;
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  error: string | null;
}

// UI State
export interface UIState {
  sidebarCollapsed: boolean;
  selectedMealSlot?: { dayIndex: number; mealType: MealType };
  showRecipeModal: boolean;
  selectedRecipe?: Recipe;
  dragState: DragState;
}

// Legacy interfaces for backward compatibility
export interface MealPlanItem {
  id: string;
  recipeId: string;
  recipe: Recipe;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  mealType: MealType;
  servings: number;
}

export interface CreateMealPlanData {
  weekStartDate: string;
  meals: {
    recipeId: string;
    dayOfWeek: number;
    mealType: MealType;
    servings?: number;
  }[];
}

export interface MealPlanResponse {
  mealPlans: MealPlan[];
}

export interface MealPlanDetailResponse {
  mealPlan: MealPlan;
}