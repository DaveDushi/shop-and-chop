import React from 'react';

export const MealPlanner: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Meal Planning Calendar Coming Soon
        </h2>
        <p className="text-gray-600">
          The drag-and-drop meal planning calendar will be implemented here.
          This will allow you to plan your weekly meals by dragging recipes onto calendar slots.
        </p>
      </div>
    </div>
  );
};