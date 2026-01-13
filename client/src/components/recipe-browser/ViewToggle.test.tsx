import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ViewToggle } from './ViewToggle';

describe('ViewToggle', () => {
  const mockOnViewModeChange = vi.fn();

  beforeEach(() => {
    mockOnViewModeChange.mockClear();
  });

  it('renders both grid and list view buttons', () => {
    render(
      <ViewToggle
        viewMode="grid"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
  });

  it('highlights the active view mode', () => {
    render(
      <ViewToggle
        viewMode="grid"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const gridButton = screen.getByRole('button', { name: /grid view/i });
    const listButton = screen.getByRole('button', { name: /list view/i });

    expect(gridButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm');
    expect(listButton).toHaveClass('text-gray-600');
  });

  it('calls onViewModeChange when grid button is clicked', () => {
    render(
      <ViewToggle
        viewMode="list"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const gridButton = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('calls onViewModeChange when list button is clicked', () => {
    render(
      <ViewToggle
        viewMode="grid"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const listButton = screen.getByRole('button', { name: /list view/i });
    fireEvent.click(listButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ViewToggle
        viewMode="grid"
        onViewModeChange={mockOnViewModeChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});