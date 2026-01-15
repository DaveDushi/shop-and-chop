import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeForm } from './RecipeForm';

describe('RecipeForm', () => {
  it('renders form with all required fields', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <RecipeForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check for required fields
    expect(screen.getByLabelText(/recipe title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cuisine/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prep time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cook time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/servings/i)).toBeInTheDocument();
  });

  it('prevents submission when form is invalid', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <RecipeForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Submit form without filling required fields
    const submitButton = screen.getByRole('button', { name: /create recipe/i });
    fireEvent.click(submitButton);

    // Check that onSubmit was not called due to validation
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <RecipeForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('populates form with initial data in edit mode', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    const initialData = {
      title: 'Test Recipe',
      cuisine: 'Italian',
      difficulty: 'Easy' as const,
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      dietaryTags: ['Vegetarian'],
      ingredients: [{ name: 'Pasta', quantity: '1', unit: 'lb' }],
      instructions: ['Boil water', 'Cook pasta'],
    };

    render(
      <RecipeForm
        mode="edit"
        initialData={initialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check that fields are populated
    expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Italian')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
  });
});
