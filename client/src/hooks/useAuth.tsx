import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData, UpdateProfileData } from '../types/User.types';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getStoredToken();
        const storedUser = authService.getStoredUser();

        if (token && storedUser) {
          try {
            // Verify token is still valid by fetching fresh profile
            const { user: freshUser } = await authService.getProfile();
            setUser(freshUser);
            authService.storeAuthData(token, freshUser);
          } catch (error) {
            // Token is invalid, clear stored data
            console.warn('Token verification failed, clearing stored auth data');
            authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any potentially corrupted auth data
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const { user: loggedInUser, token } = await authService.login(credentials);
      
      authService.storeAuthData(token, loggedInUser);
      setUser(loggedInUser);
      
      toast.success(`Welcome back, ${loggedInUser.name}!`);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const { user: newUser, token } = await authService.register(data);
      
      authService.storeAuthData(token, newUser);
      setUser(newUser);
      
      toast.success(`Welcome to Shop&Chop, ${newUser.name}!`);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const { user: updatedUser } = await authService.updateProfile(data);
      
      const token = authService.getStoredToken();
      if (token) {
        authService.storeAuthData(token, updatedUser);
      }
      
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};