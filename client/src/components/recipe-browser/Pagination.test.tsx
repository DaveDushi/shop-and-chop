import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 100,
    itemsPerPage: 20,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pagination info correctly', () => {
    const { container } = render(<Pagination {...defaultProps} />);
    
    expect(container.textContent).toContain('Showing');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('20');
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('recipes');
  });

  it('calls onPageChange when next button is clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    const nextButton = screen.getByLabelText('Next page');
    fireEvent.click(nextButton);
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when previous button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    
    const prevButton = screen.getByLabelText('Previous page');
    fireEvent.click(prevButton);
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    
    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('does not render when there is only one page', () => {
    render(<Pagination {...defaultProps} totalPages={1} totalItems={10} />);
    
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Pagination {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});