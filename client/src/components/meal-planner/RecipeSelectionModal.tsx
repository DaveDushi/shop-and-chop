import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeFilters, Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';
import { useDebounce } from '../../hooks/useDebounce';
import { RecipeCard } from './RecipeCard';
import { Modal } from '../common/Modal';

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

  const title = mealType && dayName 
    ? `Choose ${getMealTypeLabel(mealType)} for ${dayName}`
    : 'Choose a Recipe';

  const headerContent = (
    <div className="space-y-4">
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
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base touch-manipulation"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center min-h-touch min-w-touch justify-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 min-h-touch touch-manipulation"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {Object.keys(filters).some(key => filters[key as keyof RecipeFilters]) && (
            <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </button>
        
        {(searchQuery || Object.keys(filters).some(key => filters[key as keyof RecipeFilters])) && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 px-3 py-2 min-h-touch touch-manipulation"
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
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
                  className={`px-3 py-2 text-xs rounded-full border transition-colors duration-200 min-h-touch touch-manipulation ${
                    filters.dietaryTags?.includes(tag)
                      ? 'bg-primary-100 border-primary-300 text-primary-800'
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Difficulty
            </label>
            <select
              value={filters.difficulty || ''}
              onChange={(e) => handleFilterChange({ difficulty: e.target.value || undefined })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base touch-manipulation"
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Max Cook Time (minutes)
            </label>
            <input
              type="number"
              placeholder="e.g., 30"
              value={filters.maxCookTime || ''}
              onChange={(e) => handleFilterChange({ 
                maxCookTime: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base touch-manipulation"
              min="1"
              max="300"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      loading={isLoading}
      error={error ? 'Failed to load recipes' : null}
      headerClassName="pb-0"
      contentClassName="pt-0"
    >
      {/* Search and Filters in Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        {headerContent}
      </div>

      {/* Recipe List */}
      <div className="p-6">
        {recipes.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-600">
                {searchQuery || Object.keys(filters).length > 0
                  ? 'Try adjusting your search criteria or filters'
                  : 'No recipes are available at the moment'
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
    </Modal>
  );
};