import React, { useState, useRef, useEffect } from 'react';
import { Copy, MoreVertical, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { MealType } from '../../types/MealPlan.types';

interface MealCardContextMenuProps {
  dayIndex: number;
  mealType: MealType;
  onCopyMeal: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onRemoveMeal: (e?: React.MouseEvent) => void;
  onDuplicateDay: (sourceDayIndex: number, targetDayIndex: number) => void;
}

interface CopyMenuProps {
  dayIndex: number;
  mealType: MealType;
  onCopyMeal: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onSwapMeals?: (sourceDayIndex: number, sourceMealType: MealType, targetDayIndex: number, targetMealType: MealType) => void;
  onClose: () => void;
  isSwapMode?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

const CopyMenu: React.FC<CopyMenuProps> = ({ dayIndex, mealType, onCopyMeal, onSwapMeals, onClose, isSwapMode = false }) => {
  return (
    <div className="absolute left-full top-0 ml-2 bg-white border border-gray-300 rounded-lg shadow-xl py-2 z-[60] min-w-[220px] max-h-[400px] overflow-y-auto">
      <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200 bg-gray-50">
        {isSwapMode ? 'Swap with:' : 'Copy to:'}
      </div>
      {DAYS_OF_WEEK.map((dayName, targetDayIndex) => (
        <div key={dayName} className="px-2 py-1">
          <div className="text-sm font-medium text-gray-800 mb-2 px-2 py-1 bg-gray-50 rounded">{dayName}</div>
          {MEAL_TYPES.map(({ value: targetMealType, label }) => {
            const isCurrentSlot = targetDayIndex === dayIndex && targetMealType === mealType;
            return (
              <button
                key={targetMealType}
                onClick={() => {
                  if (!isCurrentSlot) {
                    if (isSwapMode && onSwapMeals) {
                      onSwapMeals(dayIndex, mealType, targetDayIndex, targetMealType);
                    } else {
                      onCopyMeal(dayIndex, mealType, targetDayIndex, targetMealType);
                    }
                  }
                  onClose();
                }}
                disabled={isCurrentSlot}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                  isCurrentSlot
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {label} {isCurrentSlot && '(current)'}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const MealCardContextMenu: React.FC<MealCardContextMenuProps> = ({
  dayIndex,
  mealType,
  onCopyMeal,
  onSwapMeals,
  onRemoveMeal,
  onDuplicateDay,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showSwapMenu, setShowSwapMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCopyMenu(false);
        setShowSwapMenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDuplicateDay = () => {
    // Show a simple prompt for target day selection
    const targetDayNames = DAYS_OF_WEEK.filter((_, index) => index !== dayIndex);
    const selectedDay = window.prompt(
      `Duplicate ${DAYS_OF_WEEK[dayIndex]} to which day?\n\nAvailable days:\n${targetDayNames.map((day, index) => `${index + 1}. ${day}`).join('\n')}\n\nEnter the number (1-${targetDayNames.length}):`
    );
    
    if (selectedDay) {
      const dayNumber = parseInt(selectedDay, 10);
      if (dayNumber >= 1 && dayNumber <= targetDayNames.length) {
        const targetDayIndex = DAYS_OF_WEEK.findIndex(day => day === targetDayNames[dayNumber - 1]);
        if (targetDayIndex !== -1) {
          onDuplicateDay(dayIndex, targetDayIndex);
        }
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowCopyMenu(false);
          setShowSwapMenu(false);
        }}
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-md rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm transition-all duration-150"
        title="More options"
        aria-label="More meal options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-[45] md:hidden" onClick={() => setIsOpen(false)} />
          
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl py-2 z-[50] min-w-[180px] max-w-[220px]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCopyMenu(!showCopyMenu);
                setShowSwapMenu(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors duration-150"
            >
              <Copy className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Copy meal</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
            </button>

            {onSwapMeals && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSwapMenu(!showSwapMenu);
                  setShowCopyMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors duration-150"
              >
                <ArrowLeftRight className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Swap meal</span>
                <ArrowRight className="h-3 w-3 flex-shrink-0" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateDay();
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors duration-150"
            >
              <Copy className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Duplicate day</span>
            </button>

            <hr className="my-2 border-gray-200" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMeal(e);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center space-x-3 transition-colors duration-150"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Remove meal</span>
            </button>

            {showCopyMenu && (
              <CopyMenu
                dayIndex={dayIndex}
                mealType={mealType}
                onCopyMeal={onCopyMeal}
                onClose={() => {
                  setShowCopyMenu(false);
                  setIsOpen(false);
                }}
              />
            )}

            {showSwapMenu && onSwapMeals && (
              <CopyMenu
                dayIndex={dayIndex}
                mealType={mealType}
                onCopyMeal={onCopyMeal}
                onSwapMeals={onSwapMeals}
                isSwapMode={true}
                onClose={() => {
                  setShowSwapMenu(false);
                  setIsOpen(false);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};