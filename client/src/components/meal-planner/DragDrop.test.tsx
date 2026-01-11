import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RecipeCard } from './RecipeCard';
import { MealSlot } from './MealSlot';
import { Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';

// Mock recipe data
const mockRecipe: Recipe = {
  id: '1',
  name: 'Test Recipe',
  description: 'A test recipe',
  imageUrl: 'https://example.com/image.jpg',
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  difficulty: 'Easy',
  dietaryTags: ['vegetarian'],
  ingredients: [
    { id: '1', name: 'Test Ingredient', quantity: '1', unit: 'cup', category: 'produce' }
  ],
  instructions: ['Test instruction'],
  createdBy: 'test-user',
};

// Test wrapper with DnD provider
const DnDTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('Drag and Drop Components', () => {
  it('renders draggable recipe card', () => {
    render(
      <DnDTestWrapper>
        <RecipeCard
          recipe={mockRecipe}
          isDraggable={true}
        />
      </DnDTestWrapper>
    );

    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('renders meal slot as drop target', () => {
    const mockHandlers = {
      onMealAssign: () => {},
      onMealRemove: () => {},
    };

    render(
      <DnDTestWrapper>
        <MealSlot
          dayIndex={0}
          mealType={'breakfast' as MealType}
          onMealAssign={mockHandlers.onMealAssign}
          onMealRemove={mockHandlers.onMealRemove}
        />
      </DnDTestWrapper>
    );

    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Add meal')).toBeInTheDocument();
  });

  it('renders meal slot with existing meal', () => {
    const mockMeal = {
      id: '1',
      recipeId: '1',
      recipe: mockRecipe,
      servings: 4,
      scheduledFor: new Date(),
      mealType: 'breakfast' as MealType,
    };

    const mockHandlers = {
      onMealAssign: () => {},
      onMealRemove: () => {},
    };

    render(
      <DnDTestWrapper>
        <MealSlot
          dayIndex={0}
          mealType={'breakfast' as MealType}
          meal={mockMeal}
          onMealAssign={mockHandlers.onMealAssign}
          onMealRemove={mockHandlers.onMealRemove}
        />
      </DnDTestWrapper>
    );

    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });
});