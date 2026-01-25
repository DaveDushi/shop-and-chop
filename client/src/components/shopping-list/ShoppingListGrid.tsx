import React from 'react';
import { ShoppingList } from '../../types/ShoppingList.types';
import { ShoppingListCard } from './ShoppingListCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ShoppingListEntry {
  id: string;
  shoppingList: ShoppingList;
  title: string;
  subtitle?: string;
  createdAt?: Date;
  isOffline?: boolean;
}

interface ShoppingListGridProps {
  shoppingLists: ShoppingListEntry[];
  onShoppingListClick?: (id: string, shoppingList: ShoppingList) => void;
  loading?: boolean;
  error?: string | null;
}

export const ShoppingListGrid: React.FC<ShoppingListGridProps> = ({
  shoppingLists,
  onShoppingListClick,
  loading = false,
  error = null
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium mb-2">Failed to load shopping lists</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (shoppingLists.length === 0) {
    return null; // Parent component should handle empty state
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {shoppingLists.map((entry) => (
        <ShoppingListCard
          key={entry.id}
          shoppingList={entry.shoppingList}
          title={entry.title}
          subtitle={entry.subtitle}
          createdAt={entry.createdAt}
          isOffline={entry.isOffline}
          onClick={() => onShoppingListClick?.(entry.id, entry.shoppingList)}
          className="h-full" // Ensure cards have equal height
        />
      ))}
    </div>
  );
};