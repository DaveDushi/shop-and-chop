import { useState, useCallback, useMemo } from 'react';
import { RecipeFilters, Recipe } from '../types/Recipe.types';
import { useRecipesWithPagination } from './useRecipes';
import { useDebounce } from './useDebounce';

export interface UseRecipeBrowserReturn {
  // Data
  recipes: Recipe[];
  totalCount: number;
  
  // State
  searchQuery: string;
  filters: RecipeFilters;
  viewMode: 'grid' | 'list';
  currentPage: number;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setCurrentPage: (page: number) => void;
  clearFilters: () => void;
  refetch: () => void;
  retry: () => void;
}

const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export const useRecipeBrowser = (): UseRecipeBrowserReturn => {
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<RecipeFilters>({});
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => {
    // Load view mode from localStorage
    const saved = localStorage.getItem('recipe-browser-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Track if we're currently searching (different from general loading)
  const isSearching = useMemo(() => {
    return searchQuery !== debouncedSearchQuery && searchQuery.length > 0;
  }, [searchQuery, debouncedSearchQuery]);

  // Combine search query with filters for API call
  const combinedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearchQuery || undefined,
  }), [filters, debouncedSearchQuery]);

  // Fetch recipes with pagination
  const {
    data: recipesResponse,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useRecipesWithPagination(combinedFilters, currentPage, ITEMS_PER_PAGE);

  // Enhanced error handling
  const error = useMemo(() => {
    if (!queryError) return null;
    
    // Handle different types of errors
    if (queryError.message?.includes('Network Error') || queryError.code === 'NETWORK_ERROR') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (queryError.response?.status === 500) {
      return 'Server error occurred. Please try again in a moment.';
    }
    
    if (queryError.response?.status === 404) {
      return 'Recipe service is temporarily unavailable.';
    }
    
    return queryError.message || 'An unexpected error occurred while loading recipes.';
  }, [queryError]);

  // Actions
  const setFilters = useCallback((newFilters: Partial<RecipeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
    setRetryCount(0); // Reset retry count on new search
  }, []);

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    // Persist view mode to localStorage
    localStorage.setItem('recipe-browser-view-mode', mode);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchQuery('');
    setCurrentPage(1);
    setRetryCount(0);
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
    setRetryCount(0); // Reset retry count on new search
  }, []);

  const handleSetCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Enhanced refetch with retry logic
  const refetch = useCallback(() => {
    setRetryCount(0);
    return queryRefetch();
  }, [queryRefetch]);

  // Retry with exponential backoff
  const retry = useCallback(() => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 8s
    const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 8000);
    
    setTimeout(() => {
      queryRefetch();
    }, delay);
  }, [retryCount, queryRefetch]);

  return {
    // Data
    recipes: recipesResponse?.recipes || [],
    totalCount: recipesResponse?.pagination.total || 0,
    
    // State
    searchQuery,
    filters,
    viewMode,
    currentPage,
    isLoading,
    isSearching,
    error,
    
    // Actions
    setSearchQuery: handleSetSearchQuery,
    setFilters,
    setViewMode,
    setCurrentPage: handleSetCurrentPage,
    clearFilters,
    refetch,
    retry,
  };
};