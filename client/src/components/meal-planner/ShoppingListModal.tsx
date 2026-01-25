import React, { useState, useCallback } from 'react';
import { ShoppingCart, Download, Check, AlertCircle, Loader2, WifiOff, Clock } from 'lucide-react';
import { ShoppingList, ShoppingListItem } from '../../types/ShoppingList.types';
import { OfflineShoppingListEntry, OfflineShoppingListItem } from '../../types/OfflineStorage.types';
import { ShoppingListService } from '../../services/shoppingListService';
import { Modal } from '../common/Modal';
import { OfflineBanner } from '../common/OfflineBanner';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: ShoppingList | null;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveToShoppingList?: (shoppingList: ShoppingList) => Promise<void>;
  // New offline-specific props
  offlineEntry?: OfflineShoppingListEntry | null;
  enableOfflineMode?: boolean;
  onOfflineItemToggle?: (shoppingListId: string, category: string, itemId: string, checked: boolean) => Promise<void>;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  shoppingList,
  isGenerating,
  error,
  onClearError,
  onSaveToShoppingList,
  offlineEntry,
  enableOfflineMode = false,
  onOfflineItemToggle
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState<string | null>(null);
  
  // Use offline status hook for connection monitoring
  const { 
    isOnline, 
    pendingOperations, 
    lastSync, 
    triggerManualSync 
  } = useOfflineStatus();

  // Determine which shopping list to display (offline or regular)
  const displayShoppingList = enableOfflineMode && offlineEntry 
    ? ShoppingListService.convertFromOfflineShoppingList(offlineEntry.shoppingList)
    : shoppingList;

  // Handle offline item toggle
  const handleOfflineItemToggle = useCallback(async (
    category: string, 
    itemId: string, 
    currentChecked: boolean
  ) => {
    if (!offlineEntry || !onOfflineItemToggle) return;

    setIsUpdatingItem(itemId);
    try {
      await onOfflineItemToggle(
        offlineEntry.metadata.id, 
        category, 
        itemId, 
        !currentChecked
      );
    } catch (error) {
      console.error('Failed to toggle item:', error);
      setSaveError('Failed to update item. Please try again.');
    } finally {
      setIsUpdatingItem(null);
    }
  }, [offlineEntry, onOfflineItemToggle]);

  const handleSaveToShoppingList = async () => {
    if (!displayShoppingList || !onSaveToShoppingList) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSaveToShoppingList(displayShoppingList);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save shopping list';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!displayShoppingList) return;

    // Create text content for download
    let content = 'Shopping List\n\n';
    
    // Add offline status info if in offline mode
    if (enableOfflineMode && offlineEntry) {
      content += `Generated: ${offlineEntry.metadata.generatedAt.toLocaleDateString()}\n`;
      content += `Last Modified: ${offlineEntry.metadata.lastModified.toLocaleDateString()}\n`;
      content += `Status: ${isOnline ? 'Online' : 'Offline'}\n\n`;
    }
    
    Object.entries(displayShoppingList).forEach(([category, items]) => {
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
    const timestamp = enableOfflineMode && offlineEntry 
      ? offlineEntry.metadata.generatedAt.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    a.download = `shopping-list-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalItems = displayShoppingList ? ShoppingListService.getTotalItemCount(displayShoppingList) : 0;
  const totalCategories = displayShoppingList ? ShoppingListService.getCategoryCount(displayShoppingList) : 0;

  const footerContent = displayShoppingList && !isGenerating ? (
    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
      <button
        onClick={handleDownload}
        className="flex items-center justify-center space-x-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 min-h-touch touch-manipulation"
      >
        <Download className="w-4 h-4" />
        <span>Download List</span>
      </button>

      <div className="flex flex-col xs:flex-row gap-3">
        <button
          onClick={onClose}
          className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 min-h-touch touch-manipulation"
        >
          Close
        </button>
        {onSaveToShoppingList && !enableOfflineMode && (
          <button
            onClick={handleSaveToShoppingList}
            disabled={isSaving}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-touch touch-manipulation"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save to Shopping List'}</span>
          </button>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shopping List"
      size="lg"
      loading={isGenerating}
      error={error}
      onClearError={onClearError}
      footerContent={footerContent}
      headerClassName="bg-primary-50/50"
    >
      {/* Header Info */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl">
          <ShoppingCart className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Shopping List
            </h3>
            {enableOfflineMode && (
              <div className="flex items-center gap-1">
                {!isOnline && <WifiOff className="w-4 h-4 text-red-500" />}
                {pendingOperations > 0 && <Clock className="w-4 h-4 text-yellow-500" />}
              </div>
            )}
          </div>
          {displayShoppingList && (
            <p className="text-sm text-gray-600">
              {totalItems} items across {totalCategories} categories
            </p>
          )}
          {enableOfflineMode && offlineEntry && (
            <p className="text-xs text-gray-500 mt-1">
              Generated: {offlineEntry.metadata.generatedAt.toLocaleDateString()}
              {offlineEntry.metadata.lastModified > offlineEntry.metadata.generatedAt && (
                <span> • Modified: {offlineEntry.metadata.lastModified.toLocaleDateString()}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Offline Status Banner */}
      {enableOfflineMode && (
        <div className="mb-6">
          <OfflineBanner
            isOnline={isOnline}
            pendingOperations={pendingOperations}
            lastSync={lastSync}
            onManualSync={triggerManualSync}
          />
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">Shopping list saved successfully!</p>
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{saveError}</p>
          </div>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Shopping List Content */}
      {displayShoppingList && !isGenerating && (
        <div className="space-y-4">
          {Object.entries(displayShoppingList).map(([category, items]) => (
            <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 capitalize">{category}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                      {items.length} items
                    </span>
                    {enableOfflineMode && (
                      <span className="text-xs text-gray-500">
                        {items.filter(item => item.checked).length} checked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <ShoppingListItemRow 
                    key={`${category}-${index}`} 
                    item={item} 
                    category={category}
                    enableOfflineMode={enableOfflineMode}
                    onToggle={handleOfflineItemToggle}
                    isUpdating={isUpdatingItem === (item as any).id}
                    offlineEntry={offlineEntry}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  category: string;
  enableOfflineMode?: boolean;
  onToggle?: (category: string, itemId: string, currentChecked: boolean) => Promise<void>;
  isUpdating?: boolean;
  offlineEntry?: OfflineShoppingListEntry | null;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ 
  item, 
  category,
  enableOfflineMode = false,
  onToggle,
  isUpdating = false,
  offlineEntry
}) => {
  const handleToggle = useCallback(async () => {
    if (!enableOfflineMode || !onToggle) return;
    
    const itemId = (item as any).id || `${item.name}_${item.unit}_${category}`.toLowerCase();
    await onToggle(category, itemId, item.checked || false);
  }, [enableOfflineMode, onToggle, item, category]);

  // Get sync status for offline items
  const getSyncStatus = () => {
    if (!enableOfflineMode || !offlineEntry) return null;
    
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
            {enableOfflineMode ? (
              <button
                onClick={handleToggle}
                disabled={isUpdating}
                className={`
                  w-5 h-5 border-2 rounded flex-shrink-0 mt-0.5 transition-all duration-200
                  ${item.checked 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'border-gray-300 hover:border-primary-400'
                  }
                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                `}
                aria-label={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : item.checked ? (
                  <Check className="w-3 h-3" />
                ) : null}
              </button>
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0 mt-0.5"></div>
            )}
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
              {enableOfflineMode && syncStatus && syncStatus !== 'synced' && (
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