import React, { useState } from 'react';
import { Recipe } from '../../types/Recipe.types';
import { MealType } from '../../types/MealPlan.types';
import { startOfWeek, addDays, format } from 'date-fns';

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

  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={handleClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add to Meal Plan
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {recipe.name || recipe.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                {/* Day selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Day
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {days.map((day) => (
                      <button
                        key={day.index}
                        type="button"
                        onClick={() => setSelectedDay(day.index)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          selectedDay === day.index
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="font-semibold">{day.name.slice(0, 3)}</div>
                        <div className="text-xs opacity-75">{day.date}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal type selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {mealTypes.map((mealType) => (
                      <button
                        key={mealType.value}
                        type="button"
                        onClick={() => setSelectedMealType(mealType.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          selectedMealType === mealType.value
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {mealType.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Servings input */}
                <div>
                  <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">
                    Servings
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setServings(Math.max(1, servings - 1))}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      disabled={servings <= 1}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      id="servings"
                      min="1"
                      max="20"
                      value={servings}
                      onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                      className="block w-20 text-center rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setServings(Math.min(20, servings + 1))}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      disabled={servings >= 20}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Original recipe serves {recipe.servings}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add to Meal Plan'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
