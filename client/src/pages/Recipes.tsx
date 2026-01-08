import React from 'react';

export const Recipes: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recipe Browser Coming Soon
        </h2>
        <p className="text-gray-600">
          The recipe collection with search and filtering will be implemented here.
          Browse 100+ curated recipes with dietary filters and favorites.
        </p>
      </div>
    </div>
  );
};