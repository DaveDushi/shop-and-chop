import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ShoppingListItem as ShoppingListItemType } from '../../types/ShoppingList.types';
import { ShoppingListItem } from './ShoppingListItem';

interface CategorySectionProps {
  category: string;
  items: ShoppingListItemType[];
  onItemToggle?: (itemId: string, checked: boolean) => Promise<void>;
  disabled?: boolean;
  showRecipes?: boolean;
  defaultExpanded?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  onItemToggle,
  disabled = false,
  showRecipes = false,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const getCategoryIcon = (categoryName: string) => {
    const category = categoryName.toLowerCase();
    
    if (category.includes('produce') || category.includes('fruit') || category.includes('vegetable')) {
      return '🥬';
    } else if (category.includes('meat') || category.includes('protein')) {
      return '🥩';
    } else if (category.includes('dairy')) {
      return '🥛';
    } else if (category.includes('bakery') || category.includes('bread')) {
      return '🍞';
    } else if (category.includes('pantry') || category.includes('canned')) {
      return '🥫';
    } else if (category.includes('frozen')) {
      return '🧊';
    } else if (category.includes('spice') || category.includes('condiment')) {
      return '🧂';
    } else if (category.includes('beverage') || category.includes('drink')) {
      return '🥤';
    } else if (category.includes('snack')) {
      return '🍿';
    } else {
      return '🛒';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg" role="img" aria-hidden="true">
            {getCategoryIcon(category)}
          </span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 capitalize">
              {category}
            </h3>
            <p className="text-sm text-gray-600">
              {checkedCount} of {totalCount} items
              {completionPercentage > 0 && (
                <span className="ml-2 text-green-600">
                  ({completionPercentage}% complete)
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Progress indicator */}
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Category Items */}
      {isExpanded && (
        <div 
          id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
          className="p-4 space-y-2"
        >
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No items in this category
            </p>
          ) : (
            items.map((item, index) => (
              <ShoppingListItem
                key={item.id || `${category}-${index}`}
                item={item}
                onToggle={onItemToggle}
                disabled={disabled}
                showRecipes={showRecipes}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};