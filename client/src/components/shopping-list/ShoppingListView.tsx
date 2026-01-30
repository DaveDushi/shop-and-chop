import React, { useMemo } from 'react';
import { ArrowLeft, Download, Share2, CheckCircle, Clock, WifiOff } from 'lucide-react';
import { ShoppingList } from '../../types/ShoppingList.types';
import { CategorySection } from './CategorySection';
import { ScalingInfo } from './ScalingInfo';
import { OfflineBanner } from '../common/OfflineBanner';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface ShoppingListViewProps {
  shoppingList: ShoppingList;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onItemToggle?: (itemId: string, checked: boolean) => Promise<void>;
  onExport?: () => void;
  onShare?: () => void;
  showRecipes?: boolean;
  showScaling?: boolean; // New prop to show scaling information
  isOffline?: boolean;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  shoppingList,
  title = "Shopping List",
  subtitle,
  onBack,
  onItemToggle,
  onExport,
  onShare,
  showRecipes = false,
  showScaling = true, // Show scaling by default
  isOffline = false
}) => {
  const { isOnline } = useOfflineStatus();

  // Calculate progress statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let checkedItems = 0;
    let categories = 0;

    Object.entries(shoppingList).forEach(([category, items]) => {
      if (items.length > 0) {
        categories++;
        totalItems += items.length;
        checkedItems += items.filter(item => item.checked).length;
      }
    });

    const completionPercentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      checkedItems,
      categories,
      completionPercentage,
      isComplete: completionPercentage === 100
    };
  }, [shoppingList]);

  // Sort categories by typical grocery store layout
  const sortedCategories = useMemo(() => {
    const categoryOrder = [
      'produce',
      'meat',
      'seafood',
      'dairy',
      'bakery',
      'frozen',
      'pantry',
      'canned goods',
      'condiments',
      'spices',
      'beverages',
      'snacks',
      'household',
      'other'
    ];

    return Object.entries(shoppingList)
      .filter(([_, items]) => items.length > 0)
      .sort(([a], [b]) => {
        const aIndex = categoryOrder.findIndex(cat => 
          a.toLowerCase().includes(cat) || cat.includes(a.toLowerCase())
        );
        const bIndex = categoryOrder.findIndex(cat => 
          b.toLowerCase().includes(cat) || cat.includes(b.toLowerCase())
        );
        
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [shoppingList]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner isOnline={false} pendingOperations={0} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  {title}
                  {isOffline && (
                    <WifiOff className="h-4 w-4 text-orange-500 ml-2" />
                  )}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Export shopping list"
                >
                  <Download className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              {onShare && (
                <button
                  onClick={onShare}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Share shopping list"
                >
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                {stats.checkedItems} of {stats.totalItems} items completed
              </span>
              <span className="flex items-center">
                {stats.isComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    Complete!
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-blue-600 mr-1" />
                    {stats.completionPercentage}%
                  </>
                )}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  stats.isComplete ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Scaling Information */}
        {showScaling && (
          <ScalingInfo className="mb-6" />
        )}

        {sortedCategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No items in this shopping list</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map(([category, items]) => (
              <CategorySection
                key={category}
                category={category}
                items={items}
                onItemToggle={onItemToggle}
                showRecipes={showRecipes}
                defaultExpanded={true}
              />
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {stats.totalItems > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {stats.categories} categories
                </span>
                <span className="text-gray-600">
                  {stats.totalItems} total items
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {stats.isComplete ? (
                  <span className="text-green-600 font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Shopping Complete!
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium">
                    {stats.totalItems - stats.checkedItems} items remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};