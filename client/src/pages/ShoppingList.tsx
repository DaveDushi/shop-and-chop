import React from 'react';

export const ShoppingList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Smart Shopping Lists Coming Soon
        </h2>
        <p className="text-gray-600">
          Auto-generated shopping lists organized by store sections will be implemented here.
          Ingredients will be consolidated and optimized for efficient grocery shopping.
        </p>
      </div>
    </div>
  );
};