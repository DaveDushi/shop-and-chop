import React, { useState, useCallback, useMemo } from 'react';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeFilters, Recipe } from '../../types/Recipe.types';
import { useDebounce } from '../../hooks/useDebounce';
import { RecipeCard } from './RecipeCard';

interface RecipeSidebarProps {
  onRecipeSelect?: (recipe: Recipe) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RecipeSidebar: React.FC<RecipeSidebarProps> = ({
  onRecipeSelect,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RecipeFilters>({});
  
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

  // Handle recipe preview
  const handleRecipePreview = useCallback((recipe: Recipe) => {
    // TODO: Implement recipe preview modal or detailed view
    console.log('Preview recipe:', recipe);
  }, []);

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

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          title="Expand recipe sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-4 text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">
          Recipes
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 bg-white md:border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Header - Hidden on mobile since we have the modal header */}
      <div className="hidden md:block p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recipes</h2>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors duration-200"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Mobile: Search Input (when in mobile modal) */}
        <div className="md:hidden">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
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

        {/* Clear Filters Button */}
        {(searchQuery || Object.keys(filters).some(key => filters[key as keyof RecipeFilters])) && (
          <button
            onClick={handleClearFilters}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Recipe List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading recipes...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-red-600 text-xl mb-2">⚠️</div>
            <p className="text-sm text-gray-600">Failed to load recipes</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-gray-400 text-4xl mb-2">🔍</div>
            <p className="text-sm text-gray-600">
              {searchQuery || Object.keys(filters).length > 0
                ? 'No recipes match your search criteria'
                : 'No recipes available'
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSelect={onRecipeSelect}
                onPreview={handleRecipePreview}
                isDraggable={true}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};