import React from 'react';
import { ChefHat, Plus, Search } from 'lucide-react';

interface RecipeBrowserFallbackProps {
  onRetry: () => void;
  onCreateRecipe?: () => void;
  isAuthenticated: boolean;
}

export const RecipeBrowserFallback: React.FC<RecipeBrowserFallbackProps> = ({
  onRetry,
  onCreateRecipe,
  isAuthenticated,
}) => {
  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-gray-400 mb-6">
          <ChefHat className="w-24 h-24 mx-auto" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Recipe Browser Unavailable
        </h2>
        
        <p className="text-gray-600 mb-8">
          We're having trouble loading the recipe browser right now. 
          You can still create new recipes or try again.
        </p>
        
        <div className="space-y-4">
          {isAuthenticated && onCreateRecipe && (
            <button
              onClick={onCreateRecipe}
              className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New Recipe
            </button>
          )}
          
          <button
            onClick={onRetry}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Search className="w-5 h-5" />
            Try Loading Recipes Again
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            What you can do:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Create and save your own recipes</li>
            <li>• Check your internet connection</li>
            <li>• Try refreshing the page</li>
            <li>• Contact support if issues persist</li>
          </ul>
        </div>
        
        {!isAuthenticated && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Log in to create and save your own recipes, 
              even when the recipe browser is unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};