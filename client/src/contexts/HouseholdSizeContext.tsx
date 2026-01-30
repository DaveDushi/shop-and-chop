import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SCALING_CONSTANTS } from '../types/Scaling.types';

interface HouseholdSizeContextType {
  householdSize: number;
  isLoading: boolean;
  updateHouseholdSize: (newSize: number) => Promise<void>;
  // Event system for real-time updates
  onHouseholdSizeChange: (callback: (newSize: number, previousSize: number) => void) => () => void;
}

const HouseholdSizeContext = createContext<HouseholdSizeContextType | undefined>(undefined);

interface HouseholdSizeProviderProps {
  children: ReactNode;
}

/**
 * Household Size Context Provider
 * 
 * Manages household size state and provides real-time updates to all components
 * that need to react to household size changes. This enables automatic
 * recalculation of recipe scaling throughout the application.
 */
export const HouseholdSizeProvider: React.FC<HouseholdSizeProviderProps> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [householdSize, setHouseholdSize] = useState<number>(SCALING_CONSTANTS.DEFAULT_HOUSEHOLD_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  
  // Store callbacks for household size change events using useRef to avoid re-renders
  const changeCallbacksRef = useRef<Set<(newSize: number, previousSize: number) => void>>(new Set());

  // Initialize household size from user data
  useEffect(() => {
    if (user?.householdSize) {
      setHouseholdSize(user.householdSize);
    }
  }, [user?.householdSize]);

  // Register a callback for household size changes
  const onHouseholdSizeChange = useCallback((callback: (newSize: number, previousSize: number) => void) => {
    changeCallbacksRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      changeCallbacksRef.current.delete(callback);
    };
  }, []);

  // Notify all registered callbacks when household size changes
  const notifyHouseholdSizeChange = useCallback((newSize: number, previousSize: number) => {
    changeCallbacksRef.current.forEach(callback => {
      try {
        callback(newSize, previousSize);
      } catch (error) {
        console.error('Error in household size change callback:', error);
      }
    });
  }, []);

  // Update household size with real-time notifications
  const updateHouseholdSize = useCallback(async (newSize: number) => {
    if (newSize === householdSize) {
      return; // No change needed
    }

    const previousSize = householdSize;
    setIsLoading(true);

    try {
      // Update via auth service to keep user context in sync
      await updateProfile({ householdSize: newSize });
      
      // Update local state
      setHouseholdSize(newSize);
      
      // Notify all listeners about the change
      notifyHouseholdSizeChange(newSize, previousSize);
      
    } catch (error) {
      console.error('Failed to update household size:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [householdSize, updateProfile, notifyHouseholdSizeChange]);

  const value: HouseholdSizeContextType = {
    householdSize,
    isLoading,
    updateHouseholdSize,
    onHouseholdSizeChange,
  };

  return (
    <HouseholdSizeContext.Provider value={value}>
      {children}
    </HouseholdSizeContext.Provider>
  );
};

/**
 * Hook to access household size context
 * @returns Household size context with current size and update methods
 */
export const useHouseholdSize = (): HouseholdSizeContextType => {
  const context = useContext(HouseholdSizeContext);
  if (context === undefined) {
    throw new Error('useHouseholdSize must be used within a HouseholdSizeProvider');
  }
  return context;
};

/**
 * Hook to listen for household size changes
 * @param callback - Function to call when household size changes
 * @param deps - Dependencies for the callback (similar to useEffect deps)
 */
export const useHouseholdSizeChange = (
  callback: (newSize: number, previousSize: number) => void,
  deps: React.DependencyList = []
) => {
  const { onHouseholdSizeChange } = useHouseholdSize();

  useEffect(() => {
    const unsubscribe = onHouseholdSizeChange(callback);
    return unsubscribe;
  }, [onHouseholdSizeChange, ...deps]);
};