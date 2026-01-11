import React from 'react';
import { format, isThisWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, ShoppingCart } from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls';

interface CalendarHeaderProps {
  currentWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onGenerateShoppingList?: () => void;
  isLoading?: boolean;
  isDirty?: boolean;
  lastSaved?: Date | null;
  // Undo/Redo props
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  previousActionDescription?: string;
  nextActionDescription?: string;
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
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  previousActionDescription,
  nextActionDescription,
}) => {
  const isCurrentWeek = isThisWeek(currentWeek, { weekStartsOn: 1 });
  
  // Calculate week range display
  const weekStart = format(currentWeek, 'MMM d');
  const weekEnd = format(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy');
  const weekRange = `${weekStart} - ${weekEnd}`;

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Week Navigation */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* Previous Week Button */}
            <button
              onClick={onPreviousWeek}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            </button>

            {/* Current Week Display */}
            <div className="text-center min-w-[160px] md:min-w-[200px]">
              <div className="font-semibold text-gray-900 text-sm md:text-base">{weekRange}</div>
              <div className="text-xs md:text-sm text-gray-600">
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
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            </button>

            {/* Go to Current Week Button */}
            {!isCurrentWeek && (
              <button
                onClick={onCurrentWeek}
                disabled={isLoading}
                className="hidden md:flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Go to current week"
              >
                <Calendar className="h-4 w-4" />
                <span>Today</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Section - Undo/Redo Controls */}
        {onUndo && onRedo && (
          <div className="hidden lg:block">
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              previousActionDescription={previousActionDescription}
              nextActionDescription={nextActionDescription}
            />
          </div>
        )}

        {/* Right Section - Actions and Status */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Undo/Redo Controls - Mobile/Tablet */}
          {onUndo && onRedo && (
            <div className="lg:hidden">
              <UndoRedoControls
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                previousActionDescription={previousActionDescription}
                nextActionDescription={nextActionDescription}
              />
            </div>
          )}

          {/* Save Status */}
          <div className="text-xs md:text-sm text-gray-600 hidden sm:block">
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-blue-600"></div>
                <span className="hidden md:inline">Loading...</span>
              </span>
            ) : isDirty ? (
              <span className="text-amber-600">Saving...</span>
            ) : lastSaved ? (
              <span>Saved {format(lastSaved, 'h:mm a')}</span>
            ) : null}
          </div>

          {/* Go to Current Week Button - Mobile */}
          {!isCurrentWeek && (
            <button
              onClick={onCurrentWeek}
              disabled={isLoading}
              className="md:hidden p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              title="Go to current week"
            >
              <Calendar className="h-4 w-4" />
            </button>
          )}

          {/* Generate Shopping List Button */}
          {onGenerateShoppingList && (
            <button
              onClick={onGenerateShoppingList}
              disabled={isLoading}
              className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Generate shopping list from this week's meals"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping List</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};