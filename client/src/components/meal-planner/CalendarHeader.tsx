import React from 'react';
import { format, isThisWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, ShoppingCart } from 'lucide-react';

interface CalendarHeaderProps {
  currentWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onGenerateShoppingList?: () => void;
  isLoading?: boolean;
  isDirty?: boolean;
  lastSaved?: Date | null;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentWeek,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onGenerateShoppingList,
  isLoading = false,
  isDirty = false,
  lastSaved,
}) => {
  const isCurrentWeek = isThisWeek(currentWeek, { weekStartsOn: 1 });
  
  // Calculate week range display
  const weekStart = format(currentWeek, 'MMM d');
  const weekEnd = format(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy');
  const weekRange = `${weekStart} - ${weekEnd}`;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Week Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {/* Previous Week Button */}
            <button
              onClick={onPreviousWeek}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Previous week"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>

            {/* Current Week Display */}
            <div className="text-center min-w-[200px]">
              <div className="font-semibold text-gray-900">{weekRange}</div>
              <div className="text-sm text-gray-600">
                {isCurrentWeek ? 'This Week' : format(currentWeek, 'yyyy')}
              </div>
            </div>

            {/* Next Week Button */}
            <button
              onClick={onNextWeek}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Next week"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>

            {/* Go to Current Week Button */}
            {!isCurrentWeek && (
              <button
                onClick={onCurrentWeek}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Go to current week"
              >
                <Calendar className="h-4 w-4" />
                <span>Today</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Section - Actions and Status */}
        <div className="flex items-center space-x-4">
          {/* Save Status */}
          <div className="text-sm text-gray-600">
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </span>
            ) : isDirty ? (
              <span className="text-amber-600">Saving changes...</span>
            ) : lastSaved ? (
              <span>Saved {format(lastSaved, 'h:mm a')}</span>
            ) : null}
          </div>

          {/* Generate Shopping List Button */}
          {onGenerateShoppingList && (
            <button
              onClick={onGenerateShoppingList}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Generate shopping list from this week's meals"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Shopping List</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};