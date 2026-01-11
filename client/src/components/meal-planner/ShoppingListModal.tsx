import React, { useState } from 'react';
import { X, ShoppingCart, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ShoppingList, ShoppingListItem } from '../../types/ShoppingList.types';
import { ShoppingListService } from '../../services/shoppingListService';

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Shopping List Preview
                </h3>
                {shoppingList && (
                  <p className="text-sm text-gray-600">
                    {totalItems} items across {totalCategories} categories
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isGenerating && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating your shopping list...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <button
                  onClick={onClearError}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {saveError && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{saveError}</p>
                </div>
                <button
                  onClick={() => setSaveError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">Shopping list saved successfully!</p>
              </div>
            )}

            {shoppingList && !isGenerating && (
              <div className="space-y-6">
                {Object.entries(shoppingList).map(([category, items]) => (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">{category}</h4>
                      <p className="text-sm text-gray-600">{items.length} items</p>
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
          </div>

          {/* Footer */}
          {shoppingList && !isGenerating && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                {onSaveToShoppingList && (
                  <button
                    onClick={handleSaveToShoppingList}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
          )}
        </div>
      </div>
    </div>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ item }) => {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">
              {item.quantity} {item.unit} {item.name}
            </span>
          </div>
          {item.recipes.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-gray-600">
                For: {item.recipes.join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};