import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { MealPlannerCalendar } from './MealPlannerCalendar';

// Mock the hooks
vi.mock('../../hooks/useMealPlannerCalendar', () => ({
  useMealPlannerCalendar: () => ({
    currentWeek: new Date('2024-01-01'),
    goToPreviousWeek: vi.fn(),
    goToNextWeek: vi.fn(),
    goToCurrentWeek: vi.fn(),
    mealPlan: null,
    isLoading: false,
    error: null,
    assignMeal: vi.fn(),
    removeMeal: vi.fn(),
    handleMealSlotClick: vi.fn(),
    isDirty: false,
    lastSaved: null,
  }),
}));

vi.mock('../../hooks/useRecipes', () => ({
  useRecipes: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MealPlannerCalendar Mobile Responsiveness', () => {
  beforeEach(() => {
    // Mock window.innerWidth for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // Mobile width
    });
  });

  afterEach(() => {
    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop width
    });
  });

  it('should render calendar header with mobile-friendly navigation', () => {
    renderWithQueryClient(<MealPlannerCalendar />);
    
    // Check that navigation buttons are present
    expect(screen.getByTitle('Previous week')).toBeInTheDocument();
    expect(screen.getByTitle('Next week')).toBeInTheDocument();
    
    // Check that week display is present
    expect(screen.getByText(/Jan 1 - Jan 7, 2024/)).toBeInTheDocument();
  });

  it('should render calendar grid with proper structure', () => {
    renderWithQueryClient(<MealPlannerCalendar />);
    
    // Check that all days are present
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayLabels.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
    
    // Check that meal types are present
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    mealTypes.forEach(meal => {
      expect(screen.getAllByText(meal).length).toBeGreaterThan(0);
    });
  });

  it('should render empty meal slots with proper mobile styling', () => {
    renderWithQueryClient(<MealPlannerCalendar />);
    
    // Check that "Add meal" text is present in empty slots
    const addMealElements = screen.getAllByText('Add meal');
    expect(addMealElements.length).toBeGreaterThan(0);
    
    // Check that "Tap to browse recipes" text is present
    const browseElements = screen.getAllByText('Tap to browse recipes');
    expect(browseElements.length).toBeGreaterThan(0);
  });

  it('should render calendar without recipe sidebar', () => {
    renderWithQueryClient(<MealPlannerCalendar />);
    
    // Check that recipe sidebar is not present
    expect(screen.queryByTitle('Browse recipes')).not.toBeInTheDocument();
    
    // Check that the calendar takes full width without sidebar
    const calendarGrid = screen.getByRole('application');
    expect(calendarGrid).toBeInTheDocument();
  });
});