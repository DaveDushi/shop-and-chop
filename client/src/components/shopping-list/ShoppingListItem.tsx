import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ShoppingListItem as ShoppingListItemType } from '../../types/ShoppingList.types';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle?: (itemId: string, checked: boolean) => Promise<void>;
  disabled?: boolean;
  showRecipes?: boolean;
}

export const ShoppingListItem: React.FC<ShoppingListItemProps> = ({
  item,
  onToggle,
  disabled = false,
  showRecipes = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localChecked, setLocalChecked] = useState(item.checked || false);

  const handleToggle = async () => {
    if (disabled || isUpdating || !onToggle) return;

    const newChecked = !localChecked;
    setLocalChecked(newChecked);
    setIsUpdating(true);

    try {
      await onToggle(item.id || item.name, newChecked);
    } catch (error) {
      // Revert on error
      setLocalChecked(!newChecked);
      console.error('Failed to update item status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const itemId = item.id || `item-${item.name.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
        localChecked 
          ? 'bg-green-50 border-green-200' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleToggle}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <button
          type="button"
          disabled={disabled || isUpdating}
          className={`
            relative w-6 h-6 rounded border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${localChecked 
              ? 'bg-green-600 border-green-600' 
              : 'bg-white border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{ minWidth: '24px', minHeight: '24px' }} // Ensure 44px touch target with padding
          aria-label={`${localChecked ? 'Uncheck' : 'Check'} ${item.name}`}
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute inset-0 m-auto" />
          ) : localChecked ? (
            <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
          ) : null}
        </button>
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span 
            className={`font-medium ${
              localChecked ? 'text-green-800 line-through' : 'text-gray-900'
            }`}
          >
            {item.name}
          </span>
          <span 
            className={`text-sm font-medium ml-2 ${
              localChecked ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            {item.quantity} {item.unit}
          </span>
        </div>
        
        {showRecipes && item.recipes && item.recipes.length > 0 && (
          <div className="mt-1">
            <span className="text-xs text-gray-500">
              From: {item.recipes.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};