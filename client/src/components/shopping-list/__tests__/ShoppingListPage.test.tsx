import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ShoppingListPage } from '../ShoppingListPage';

// Mock the hooks
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true
  })
}));

vi.mock('../../../hooks/useShoppingListPage', () => ({
  useShoppingListPage: () => ({
    shoppingLists: [],
    currentShoppingList: null,
    currentTitle: 'Shopping List',
    loading: false,
    error: null,
    viewMode: 'grid',
    loadShoppingLists: vi.fn(),
    selectShoppingList: vi.fn(),
    goBackToGrid: vi.fn(),
    handleItemToggle: vi.fn(),
    clearError: vi.fn(),
    hasShoppingLists: false,
    isOffline: false
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ShoppingListPage', () => {
  it('renders shopping list page', () => {
    renderWithProviders(<ShoppingListPage />);
    
    expect(screen.getByText('Shopping Lists')).toBeInTheDocument();
    expect(screen.getByText('Organized lists from your meal plans')).toBeInTheDocument();
  });

  it('shows empty state when no shopping lists exist', () => {
    renderWithProviders(<ShoppingListPage />);
    
    expect(screen.getByText('No Shopping Lists Yet')).toBeInTheDocument();
    expect(screen.getByText('Plan Your First Week')).toBeInTheDocument();
  });

  it('shows refresh and new meal plan buttons', () => {
    renderWithProviders(<ShoppingListPage />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('New Meal Plan')).toBeInTheDocument();
  });
});