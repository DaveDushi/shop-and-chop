import React from 'react';
import { ShoppingCart, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface EmptyShoppingListStateProps {
  onCreateMealPlan?: () => void;
}

export const EmptyShoppingListState: React.FC<EmptyShoppingListStateProps> = ({
  onCreateMealPlan
}) => {
  const { user } = useAuth();

  const handleCreateMealPlan = () => {
    if (onCreateMealPlan) {
      onCreateMealPlan();
    } else {
      // Navigate to meal planner
      window.location.href = '/meal-planner';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <ShoppingCart className="h-16 w-16 text-gray-300" />
          <div className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1">
            <Plus className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        No Shopping Lists Yet
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Create your first meal plan to automatically generate organized shopping lists 
        with consolidated ingredients grouped by store sections.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={handleCreateMealPlan}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Plan Your First Week
        </button>
        
        <div className="text-sm text-gray-500">
          <p>Once you plan meals, shopping lists will appear here</p>
        </div>
      </div>
      
      {/* Feature highlights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <ShoppingCart className="h-6 w-6 text-blue-600 mb-2" />
          <span className="font-medium text-gray-900">Auto-Generated</span>
          <span className="text-gray-600 text-center">Lists created from your meal plans</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <div className="h-6 w-6 bg-blue-600 rounded mb-2 flex items-center justify-center">
            <span className="text-white text-xs font-bold">∑</span>
          </div>
          <span className="font-medium text-gray-900">Consolidated</span>
          <span className="text-gray-600 text-center">Duplicate ingredients combined</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <div className="h-6 w-6 bg-blue-600 rounded mb-2 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="font-medium text-gray-900">Organized</span>
          <span className="text-gray-600 text-center">Grouped by store sections</span>
        </div>
      </div>
    </div>
  );
};