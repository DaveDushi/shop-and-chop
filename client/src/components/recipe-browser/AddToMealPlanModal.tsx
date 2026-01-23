import React, { useState } from 'react';
import { Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';
import { startOfWeek, addDays, format } from 'date-fns';
import { Plus, Minus } from 'lucide-react';
import { Modal } from '../common/Modal';

export interface AddToMealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onAddToMealPlan: (dayIndex: number, mealType: MealType, servings: number) => Promise<void>;
}

export const AddToMealPlanModal: React.FC<AddToMealPlanModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onAddToMealPlan,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
  const [servings, setServings] = useState<number>(recipe?.servings || 4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate current week dates
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => ({
    index: i,
    name: format(addDays(weekStart, i), 'EEEE'),
    date: format(addDays(weekStart, i), 'MMM d'),
  }));

  const mealTypes: { value: MealType; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipe) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddToMealPlan(selectedDay, selectedMealType, servings);
      onClose();
      // Reset form
      setSelectedDay(0);
      setSelectedMealType('dinner');
      setServings(recipe.servings);
    } catch (err) {
      console.error('Failed to add recipe to meal plan:', err);
      setError('Failed to add recipe to meal plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  if (!recipe) return null;

  const footerContent = (
    <div className="flex flex-col-reverse xs:flex-row gap-3 xs:justify-end">
      <button
        type="button"
        onClick={handleClose}
        disabled={isSubmitting}
        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-touch touch-manipulation"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-touch touch-manipulation flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Adding...
          </>
        ) : (
          'Add to Meal Plan'
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add "${recipe.name || recipe.title}" to Meal Plan`}
      size="md"
      loading={false}
      error={error}
      onClearError={() => setError(null)}
      closeOnBackdropClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footerContent={footerContent}
      headerClassName="bg-primary-50/50"
    >
      <div className="space-y-6">
        {/* Day selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Day
          </label>
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
            {days.map((day) => (
              <button
                key={day.index}
                type="button"
                onClick={() => setSelectedDay(day.index)}
                className={`px-3 py-3 text-sm font-medium rounded-lg transition-colors min-h-touch touch-manipulation ${
                  selectedDay === day.index
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <div className="font-semibold">{day.name.slice(0, 3)}</div>
                <div className="text-xs opacity-75 mt-1">{day.date}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Meal type selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Meal Type
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
            {mealTypes.map((mealType) => (
              <button
                key={mealType.value}
                type="button"
                onClick={() => setSelectedMealType(mealType.value)}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-touch touch-manipulation ${
                  selectedMealType === mealType.value
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                {mealType.label}
              </button>
            ))}
          </div>
        </div>

        {/* Servings input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Servings
          </label>
          <div className="flex items-center justify-center space-x-4">
            <button
              type="button"
              onClick={() => setServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-touch min-w-touch flex items-center justify-center touch-manipulation"
              aria-label="Decrease servings"
            >
              <Minus className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{servings}</div>
              <div className="text-sm text-gray-600">servings</div>
            </div>
            
            <button
              type="button"
              onClick={() => setServings(Math.min(20, servings + 1))}
              disabled={servings >= 20}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-touch min-w-touch flex items-center justify-center touch-manipulation"
              aria-label="Increase servings"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">
              Original recipe serves {recipe.servings}
              {servings !== recipe.servings && (
                <span className="ml-2 text-primary-600 font-medium">
                  (adjusted from {recipe.servings})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
