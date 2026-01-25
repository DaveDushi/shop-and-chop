import React from 'react';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useShoppingListPage } from '../../hooks/useShoppingListPage';
import { ShoppingListGrid } from './ShoppingListGrid';
import { ShoppingListView } from './ShoppingListView';
import { EmptyShoppingListState } from './EmptyShoppingListState';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { OfflineBanner } from '../common/OfflineBanner';

export const ShoppingListPage: React.FC = () => {
  const { user } = useAuth();
  const {
    // State
    shoppingLists,
    currentShoppingList,
    currentTitle,
    loading,
    error,
    
    // View state
    viewMode,
    
    // Actions
    loadShoppingLists,
    selectShoppingList,
    goBackToGrid,
    handleItemToggle,
    clearError,
    
    // Utility
    hasShoppingLists,
    isOffline
  } = useShoppingListPage();

  const handleCreateMealPlan = () => {
    window.location.href = '/meal-planner';
  };

  const handleRefresh = async () => {
    clearError();
    await loadShoppingLists();
  };

  const handleExport = () => {
    if (!currentShoppingList) return;

    // Create a simple text export
    let exportText = `${currentTitle}\n${'='.repeat(currentTitle.length)}\n\n`;
    
    Object.entries(currentShoppingList).forEach(([category, items]) => {
      if (items.length > 0) {
        exportText += `${category.toUpperCase()}\n`;
        items.forEach(item => {
          const status = item.checked ? '✓' : '☐';
          exportText += `${status} ${item.quantity} ${item.unit} ${item.name}\n`;
        });
        exportText += '\n';
      }
    });

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!currentShoppingList || !('share' in navigator)) return;

    try {
      let shareText = `${currentTitle}\n\n`;
      
      Object.entries(currentShoppingList).forEach(([category, items]) => {
        if (items.length > 0) {
          shareText += `${category}:\n`;
          items.forEach(item => {
            shareText += `• ${item.quantity} ${item.unit} ${item.name}\n`;
          });
          shareText += '\n';
        }
      });

      await navigator.share({
        title: currentTitle,
        text: shareText
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  // Show detail view
  if (viewMode === 'detail' && currentShoppingList) {
    return (
      <ShoppingListView
        shoppingList={currentShoppingList}
        title={currentTitle}
        onBack={goBackToGrid}
        onItemToggle={handleItemToggle}
        onExport={handleExport}
        onShare={'share' in navigator ? handleShare : undefined}
        showRecipes={true}
        isOffline={isOffline}
      />
    );
  }

  // Show grid view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {isOffline && <OfflineBanner isOnline={false} pendingOperations={0} />}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Lists</h1>
            <p className="text-gray-600 mt-1">
              Organized lists from your meal plans
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={handleCreateMealPlan}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Meal Plan
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error loading shopping lists</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 text-sm underline mt-2 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !hasShoppingLists && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasShoppingLists && !error && (
          <EmptyShoppingListState onCreateMealPlan={handleCreateMealPlan} />
        )}

        {/* Shopping Lists Grid */}
        {hasShoppingLists && (
          <ShoppingListGrid
            shoppingLists={shoppingLists}
            onShoppingListClick={selectShoppingList}
            loading={loading}
            error={error}
          />
        )}

        {/* Stats Footer */}
        {hasShoppingLists && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              {shoppingLists.length} shopping list{shoppingLists.length !== 1 ? 's' : ''} available
              {isOffline && ' (offline mode)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};