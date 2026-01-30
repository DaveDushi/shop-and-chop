import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuantityToggle } from '../QuantityToggle';

describe('QuantityToggle', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  it('renders nothing when no scaling is applied', () => {
    const { container } = render(
      <QuantityToggle
        showScaled={true}
        onToggle={mockOnToggle}
        hasScaling={false}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders toggle when scaling is applied', () => {
    render(
      <QuantityToggle
        showScaled={true}
        onToggle={mockOnToggle}
        hasScaling={true}
      />
    );
    
    expect(screen.getByText('Scaled')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    render(
      <QuantityToggle
        showScaled={true}
        onToggle={mockOnToggle}
        hasScaling={true}
      />
    );
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('renders compact version', () => {
    render(
      <QuantityToggle
        showScaled={true}
        onToggle={mockOnToggle}
        hasScaling={true}
        compact={true}
      />
    );
    
    expect(screen.getByText('Scaled')).toBeInTheDocument();
    // Compact version should not show "Quantities:" label
    expect(screen.queryByText('Quantities:')).not.toBeInTheDocument();
  });

  it('shows correct state for original quantities', () => {
    render(
      <QuantityToggle
        showScaled={false}
        onToggle={mockOnToggle}
        hasScaling={true}
        compact={true}
      />
    );
    
    expect(screen.getByText('Original')).toBeInTheDocument();
  });
});