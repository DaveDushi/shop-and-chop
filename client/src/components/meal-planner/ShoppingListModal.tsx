import React, { useState } from 'react';
import { ShoppingCart, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ShoppingList, ShoppingListItem } from '../../types/ShoppingList.types';
import { ShoppingListService } from '../../services/shoppingListService';
import { Modal } from '../common/Modal';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: ShoppingList | null;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveToShoppingList?: (shoppingList: ShoppingList) => Promise<void>;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  shoppingList,
  isGenerating,
  error,
  onClearError,
  onSaveToShoppingList
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveToShoppingList = async () => {
    if (!shoppingList || !onSaveToShoppingList) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSaveToShoppingList(shoppingList);
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
    if (!shoppingList) return;

    // Create text content for download
    let content = 'Shopping List\n\n';
    
    Object.entries(shoppingList).forEach(([category, items]) => {
      content += `${category.toUpperCase()}\n`;
      content += '─'.repeat(category.length) + '\n';
      
      items.forEach(item => {
        content += `□ ${item.quantity} ${item.unit} ${item.name}\n`;
        if (item.recipes.length > 0) {
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
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalItems = shoppingList ? ShoppingListService.getTotalItemCount(shoppingList) : 0;
  const totalCategories = shoppingList ? ShoppingListService.getCategoryCount(shoppingList) : 0;

  const footerContent = shoppingList && !isGenerating ? (
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
        {onSaveToShoppingList && (
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
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Your Shopping List
          </h3>
          {shoppingList && (
            <p className="text-sm text-gray-600">
              {totalItems} items across {totalCategories} categories
            </p>
          )}
        </div>
      </div>

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
      {shoppingList && !isGenerating && (
        <div className="space-y-4">
          {Object.entries(shoppingList).map(([category, items]) => (
            <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 capitalize">{category}</h4>
                  <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                    {items.length} items
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <ShoppingListItemRow key={`${category}-${index}`} item={item} />
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
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ item }) => {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0 mt-0.5"></div>
            <div>
              <span className="font-medium text-gray-900 text-base">
                {item.quantity} {item.unit} {item.name}
              </span>
              {item.recipes.length > 0 && (
                <div className="mt-1">
                  <p className="text-sm text-gray-600">
                    For: {item.recipes.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};