import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HouseholdSizeSettings } from '../HouseholdSizeSettings';
import { HouseholdSizeProvider } from '../../../contexts/HouseholdSizeContext';
import { AuthProvider } from '../../../hooks/useAuth';
import { userPreferencesService } from '../../../services/userPreferencesService';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  authService: {
    getStoredToken: vi.fn(() => 'mock-token'),
    getStoredUser: vi.fn(() => mockUser),
    getProfile: vi.fn(() => Promise.resolve({ user: mockUser })),
    storeAuthData: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(() => Promise.resolve({ user: mockUser }))
  }
}));

// Mock the auth hook
const mockUpdateProfile = vi.fn();
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  householdSize: 4,
  dietaryRestrictions: [],
  favoriteCuisines: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock the services
vi.mock('../../../services/userPreferencesService');

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HouseholdSizeProvider>
          {children}
        </HouseholdSizeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('HouseholdSizeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock userPreferencesService methods
    vi.mocked(userPreferencesService.getCurrentUserHouseholdSize).mockResolvedValue(4);
    vi.mocked(userPreferencesService.validateHouseholdSize).mockReturnValue({ isValid: true });
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  it('should render household size settings component', async () => {
    render(
      <TestWrapper>
        <HouseholdSizeSettings />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Household Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of People')).toBeInTheDocument();
  });

  it('should render in compact mode', async () => {
    render(
      <TestWrapper>
        <HouseholdSizeSettings compact={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    // In compact mode, should not show the description
    expect(screen.queryByText(/Set the number of people in your household/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Household Size')).toBeInTheDocument();
  });

  it('should show save button when value changes', async () => {
    render(
      <TestWrapper>
        <HouseholdSizeSettings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText('Number of People');
    
    // Change the value
    fireEvent.change(select, { target: { value: '6' } });

    // Should show save and reset buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should validate household size input', async () => {
    // Mock validation to return error
    vi.mocked(userPreferencesService.validateHouseholdSize).mockReturnValue({
      isValid: false,
      error: 'Household size must be between 1 and 20'
    });

    render(
      <TestWrapper>
        <HouseholdSizeSettings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText('Number of People');
    fireEvent.change(select, { target: { value: '25' } });

    expect(screen.getByText('Household size must be between 1 and 20')).toBeInTheDocument();
  });

  it('should reset to original value when reset button is clicked', async () => {
    render(
      <TestWrapper>
        <HouseholdSizeSettings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText('Number of People') as HTMLSelectElement;
    
    // Change the value
    fireEvent.change(select, { target: { value: '6' } });
    expect(select.value).toBe('6');

    // Click reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    // Should revert to original value
    expect(select.value).toBe('4');
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('should call onUpdate callback when household size is saved', async () => {
    const mockOnUpdate = vi.fn();
    
    // Mock successful update
    mockUpdateProfile.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <HouseholdSizeSettings onUpdate={mockOnUpdate} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading household size...')).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText('Number of People');
    fireEvent.change(select, { target: { value: '6' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(6);
    });
  });
});