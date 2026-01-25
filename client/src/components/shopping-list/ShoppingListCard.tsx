import React from 'react';
import { Calendar, CheckCircle, Clock, ShoppingCart, WifiOff } from 'lucide-react';
import { ShoppingList } from '../../types/ShoppingList.types';

interface ShoppingListCardProps {
  shoppingList: ShoppingList;
  title: string;
  subtitle?: string;
  createdAt?: Date;
  onClick?: () => void;
  isOffline?: boolean;
  className?: string;
}

export const ShoppingListCard: React.FC<ShoppingListCardProps> = ({
  shoppingList,
  title,
  subtitle,
  createdAt,
  onClick,
  isOffline = false,
  className = ''
}) => {
  // Calculate statistics
  const stats = React.useMemo(() => {
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

  // Get preview of categories
  const categoryPreview = React.useMemo(() => {
    const categories = Object.keys(shoppingList).filter(cat => shoppingList[cat].length > 0);
    if (categories.length <= 3) {
      return categories.join(', ');
    }
    return `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more`;
  }, [shoppingList]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md 
        transition-all duration-200 cursor-pointer group
        ${className}
      `}
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center">
              {title}
              {isOffline && (
                <WifiOff className="h-4 w-4 text-orange-500 ml-2 flex-shrink-0" />
              )}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex-shrink-0 ml-4">
            {stats.isComplete ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex items-center text-blue-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              {stats.checkedItems} of {stats.totalItems} items
            </span>
            <span className="font-medium">
              {stats.completionPercentage}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                stats.isComplete ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Categories Preview */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{stats.categories} categories:</span> {categoryPreview}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            {createdAt && (
              <>
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(createdAt)}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center">
            {stats.isComplete ? (
              <span className="text-green-600 font-medium flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </span>
            ) : (
              <span className="text-blue-600 font-medium flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                In Progress
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};