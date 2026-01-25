import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Download, Check, AlertCircle, Loader2, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { OfflineShoppingListEntry, OfflineShoppingListItem } from '../../types/OfflineStorage.types';
import { ShoppingListService } from '../../services/shoppingListService';
import { OfflineBanner } from '../common/OfflineBanner';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface OfflineShoppingListViewProps {
  shoppingListId: string;
  onError?: (error: string) => void;
  className?: string;
}

export const OfflineShoppingListView: React.FC<OfflineShoppingListViewProps> = ({
  shoppingListId,
  onError,
  className = ''
}) => {
  const [offlineEntry, setOfflineEntry] = useState<OfflineShoppingListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState<string | null>(null);
  
  // Use offline status hook for connection monitoring
  const { 
    isOnline, 
    pendingOperations, 
    lastSync, 
    triggerManualSync 
  } = useOfflineStatus();

  // Load offline shopping list
  const loadOfflineShoppingList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const entry = await ShoppingListService.getOfflineShoppingList(shoppingListId);
      if (!entry) {
        throw new Error('Shopping list not found');
      }
      
      setOfflineEntry(entry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shopping list';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [shoppingListId, onError]);

  // Handle item toggle
  const handleItemToggle = useCallback(async (
    category: string, 
    itemId: string, 
    currentChecked: boolean
  ) => {
    if (!offlineEntry) return;

    setIsUpdatingItem(itemId);
    try {
      await ShoppingListService.updateOfflineItemStatus(
        offlineEntry.metadata.id, 
        category, 
        itemId, 
        !currentChecked
      );
      
      // Reload the shopping list to reflect changes
      await loadOfflineShoppingList();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update item';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUpdatingItem(null);
    }
  }, [offlineEntry, loadOfflineShoppingList, onError]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!offlineEntry) return;

    const shoppingList = ShoppingListService.convertFromOfflineShoppingList(offlineEntry.shoppingList);
    
    // Create text content for download
    let content = 'Shopping List\n\n';
    content += `Generated: ${offlineEntry.metadata.generatedAt.toLocaleDateString()}\n`;
    content += `Last Modified: ${offlineEntry.metadata.lastModified.toLocaleDateString()}\n`;
    content += `Status: ${isOnline ? 'Online' : 'Offline'}\n\n`;
    
    Object.entries(shoppingList).forEach(([category, items]) => {
      content += `${category.toUpperCase()}\n`;
      content += '─'.repeat(category.length) + '\n';
      
      items.forEach(item => {
        const checkmark = item.checked ? '☑' : '□';
        content += `${checkmark} ${item.quantity} ${item.unit} ${item.name}\n`;
        if (item.recipes && item.recipes.length > 0) {
          content += `  (for: ${item.recipes.join(', ')})\n`;
        }
      });
      content += '\n';
    });

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = offlineEntry.metadata.generatedAt.toISOString().split('T')[0];
    a.download = `shopping-list-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [offlineEntry, isOnline]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadOfflineShoppingList();
  }, [loadOfflineShoppingList]);

  // Load shopping list on mount
  useEffect(() => {
    loadOfflineShoppingList();
  }, [loadOfflineShoppingList]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading shopping list...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!offlineEntry) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Shopping list not found
      </div>
    );
  }

  const shoppingList = ShoppingListService.convertFromOfflineShoppingList(offlineEntry.shoppingList);
  const totalItems = ShoppingListService.getTotalItemCount(shoppingList);
  const totalCategories = ShoppingListService.getCategoryCount(shoppingList);
  const checkedItems = Object.values(shoppingList).flat().filter(item => item.checked).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Shopping List
              </h2>
              {!isOnline && <WifiOff className="w-4 h-4 text-red-500" />}
              {pendingOperations > 0 && <Clock className="w-4 h-4 text-yellow-500" />}
            </div>
            <p className="text-sm text-gray-600">
              {checkedItems}/{totalItems} items checked • {totalCategories} categories
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated: {offlineEntry.metadata.generatedAt.toLocaleDateString()}
              {offlineEntry.metadata.lastModified > offlineEntry.metadata.generatedAt && (
                <span> • Modified: {offlineEntry.metadata.lastModified.toLocaleDateString()}</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Offline Status Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingOperations={pendingOperations}
        lastSync={lastSync}
        onManualSync={triggerManualSync}
      />

      {/* Shopping List Content */}
      <div className="space-y-4">
        {Object.entries(shoppingList).map(([category, items]) => (
          <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 capitalize">{category}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                    {items.length} items
                  </span>
                  <span className="text-xs text-gray-500">
                    {items.filter(item => item.checked).length} checked
                  </span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <OfflineShoppingListItemRow 
                  key={`${category}-${index}`} 
                  item={item} 
                  category={category}
                  onToggle={handleItemToggle}
                  isUpdating={isUpdatingItem === (item as any).id}
                  offlineEntry={offlineEntry}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface OfflineShoppingListItemRowProps {
  item: any; // ShoppingListItem with potential id
  category: string;
  onToggle: (category: string, itemId: string, currentChecked: boolean) => Promise<void>;
  isUpdating: boolean;
  offlineEntry: OfflineShoppingListEntry;
}

const OfflineShoppingListItemRow: React.FC<OfflineShoppingListItemRowProps> = ({ 
  item, 
  category,
  onToggle,
  isUpdating,
  offlineEntry
}) => {
  const handleToggle = useCallback(async () => {
    const itemId = item.id || `${item.name}_${item.unit}_${category}`.toLowerCase();
    await onToggle(category, itemId, item.checked);
  }, [onToggle, item, category]);

  // Get sync status for offline items
  const getSyncStatus = () => {
    const offlineItem = offlineEntry.shoppingList[category]?.find(
      offlineItem => offlineItem.name === item.name && offlineItem.unit === item.unit
    ) as OfflineShoppingListItem;
    
    return offlineItem?.syncStatus || 'synced';
  };

  const syncStatus = getSyncStatus();

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggle}
              disabled={isUpdating}
              className={`
                w-6 h-6 border-2 rounded flex-shrink-0 mt-0.5 transition-all duration-200
                ${item.checked 
                  ? 'bg-primary-600 border-primary-600 text-white' 
                  : 'border-gray-300 hover:border-primary-400'
                }
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                min-h-touch touch-manipulation
              `}
              aria-label={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : item.checked ? (
                <Check className="w-4 h-4" />
              ) : null}
            </button>
            <div className="flex-1">
              <span className={`
                font-medium text-base transition-all duration-200
                ${item.checked 
                  ? 'text-gray-500 line-through' 
                  : 'text-gray-900'
                }
              `}>
                {item.quantity} {item.unit} {item.name}
              </span>
              {item.recipes && item.recipes.length > 0 && (
                <div className="mt-1">
                  <p className={`
                    text-sm transition-all duration-200
                    ${item.checked ? 'text-gray-400' : 'text-gray-600'}
                  `}>
                    For: {item.recipes.join(', ')}
                  </p>
                </div>
              )}
              {syncStatus && syncStatus !== 'synced' && (
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600">
                    {syncStatus === 'pending' ? 'Pending sync' : 'Sync conflict'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineShoppingListView;