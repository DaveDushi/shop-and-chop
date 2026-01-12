import React, { useState } from 'react';
import { RecipeFilters as RecipeFiltersType } from '../../types/Recipe.types';

export interface RecipeFiltersProps {
  filters: RecipeFiltersType;
  onChange: (filters: Partial<RecipeFiltersType>) => void;
  onClear: () => void;
  isCollapsed?: boolean;
}

// Filter options based on the database schema and seed data
const CUISINE_OPTIONS = [
  'Italian',
  'American', 
  'Mediterranean',
  'Asian',
  'Mexican',
  'French',
  'Indian',
  'Thai',
  'Chinese',
  'Japanese'
];

const DIETARY_TAG_OPTIONS = [
  'vegetarian',
  'vegan', 
  'gluten-free',
  'keto',
  'dairy-free',
  'nut-free',
  'low-carb',
  'paleo',
  'whole30'
];

const DIFFICULTY_OPTIONS = [
  'Easy',
  'Medium', 
  'Hard'
];

const COOK_TIME_OPTIONS = [
  { label: '15 minutes or less', value: 15 },
  { label: '30 minutes or less', value: 30 },
  { label: '45 minutes or less', value: 45 },
  { label: '1 hour or less', value: 60 },
  { label: '2 hours or less', value: 120 }
];

export const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  filters,
  onChange,
  onClear,
  isCollapsed = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!isCollapsed);

  // Count active filters for display
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  }).length;

  const handleCuisineChange = (cuisine: string) => {
    onChange({ cuisine: filters.cuisine === cuisine ? undefined : cuisine });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onChange({ difficulty: filters.difficulty === difficulty ? undefined : difficulty });
  };

  const handleDietaryTagToggle = (tag: string) => {
    const currentTags = filters.dietaryTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onChange({ dietaryTags: newTags.length > 0 ? newTags : undefined });
  };

  const handleCookTimeChange = (maxCookTime: number) => {
    onChange({ 
      maxCookTime: filters.maxCookTime === maxCookTime ? undefined : maxCookTime 
    });
  };

  const handleFavoritesToggle = () => {
    onChange({ showFavoritesOnly: !filters.showFavoritesOnly });
  };

  const handleUserRecipesToggle = () => {
    onChange({ showUserRecipesOnly: !filters.showUserRecipesOnly });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Quick Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleFavoritesToggle}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.showFavoritesOnly
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Favorites Only
              </button>
              <button
                onClick={handleUserRecipesToggle}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.showUserRecipesOnly
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Recipes
              </button>
            </div>
          </div>

          {/* Cuisine Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Cuisine</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => handleCuisineChange(cuisine)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    filters.cuisine === cuisine
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Tags Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Dietary Preferences</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {DIETARY_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleDietaryTagToggle(tag)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    filters.dietaryTags?.includes(tag)
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Difficulty</h3>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => handleDifficultyChange(difficulty)}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    filters.difficulty === difficulty
                      ? 'bg-purple-50 border-purple-200 text-purple-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Cook Time Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Maximum Cook Time</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {COOK_TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCookTimeChange(option.value)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    filters.maxCookTime === option.value
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};