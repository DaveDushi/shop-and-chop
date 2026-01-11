import React, { useState, useCallback, useMemo } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeFilters, Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';
import { useDebounce } from '../../hooks/useDebounce';
import { RecipeCard } from './RecipeCard';

interface RecipeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  mealType?: MealType;
  dayName?: string;
}

export const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
  mealType,
  dayName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Fetch recipes with current search and filters
  const { data: recipes = [], isLoading, error } = useRecipes(debouncedSearchQuery, filters);

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<RecipeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handle recipe selection
  const handleRecipeSelect = useCallback((recipe: Recipe) => {
    onSelectRecipe(recipe);
    onClose();
  }, [onSelectRecipe, onClose]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
  }, []);

  // Close modal on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Dietary tag options for filtering
  const dietaryTagOptions = useMemo(() => [
    'vegetarian',
    'vegan',
    'gluten-free',
    'dairy-free',
    'keto',
    'paleo',
    'low-carb',
    'high-protein',
  ], []);

  // Difficulty options
  const difficultyOptions = useMemo(() => [
    'Easy',
    'Medium',
    'Hard',
  ], []);

  if (!isOpen) return null;

  const getMealTypeLabel = (type?: MealType): string => {
    if (!type) return '';
    switch (type) {
      case 'breakfast':
        return 'Breakfast';
      case 'lunch':
        return 'Lunch';
      case 'dinner':
        return 'Dinner';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Choose a Recipe
              </h2>
              {mealType && dayName && (
                <p className="text-sm text-gray-600 mt-1">
                  for {getMealTypeLabel(mealType)} on {dayName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {Object.keys(filters).some(key => filters[key as keyof RecipeFilters]) && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </button>
              
              {(searchQuery || Object.keys(filters).some(key => filters[key as keyof RecipeFilters])) && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                {/* Dietary Tags Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Preferences
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryTagOptions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          const currentTags = filters.dietaryTags || [];
                          const newTags = currentTags.includes(tag)
                            ? currentTags.filter(t => t !== tag)
                            : [...currentTags, tag];
                          handleFilterChange({ dietaryTags: newTags });
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors duration-200 ${
                          filters.dietaryTags?.includes(tag)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={filters.difficulty || ''}
                    onChange={(e) => handleFilterChange({ difficulty: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All difficulties</option>
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Cook Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Cook Time (minutes)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 30"
                    value={filters.maxCookTime || ''}
                    onChange={(e) => handleFilterChange({ 
                      maxCookTime: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="1"
                    max="300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recipe List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading recipes...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-red-600 text-xl mb-2">⚠️</div>
                  <p className="text-sm text-gray-600">Failed to load recipes</p>
                </div>
              </div>
            ) : recipes.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-gray-400 text-4xl mb-2">🔍</div>
                  <p className="text-sm text-gray-600">
                    {searchQuery || Object.keys(filters).length > 0
                      ? 'No recipes match your search criteria'
                      : 'No recipes available'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSelect={handleRecipeSelect}
                    isDraggable={false}
                    className="w-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    showSelectButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};