import React, { useState } from 'react';
import { Keyboard, HelpCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

export const KeyboardNavigationHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Arrow Keys'], description: 'Navigate between meal slots' },
        { keys: ['Tab'], description: 'Move to next interactive element' },
        { keys: ['Shift', 'Tab'], description: 'Move to previous interactive element' },
      ]
    },
    {
      category: 'Meal Management',
      items: [
        { keys: ['Enter'], description: 'Add meal to empty slot or view recipe details' },
        { keys: ['Delete'], description: 'Remove meal from slot' },
        { keys: ['Space'], description: 'Select meal for moving, then navigate and press Space again to place' },
        { keys: ['Escape'], description: 'Cancel current selection or close modal' },
      ]
    },
    {
      category: 'Undo/Redo',
      items: [
        { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
        { keys: ['Ctrl', 'Y'], description: 'Redo last undone action' },
        { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo last undone action (alternative)' },
      ]
    },
    {
      category: 'General',
      items: [
        { keys: ['?'], description: 'Show this help dialog' },
        { keys: ['Escape'], description: 'Close dialogs and cancel operations' },
      ]
    }
  ];

  // Listen for ? key to open help
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !isOpen) {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-200 z-40"
        title="Keyboard shortcuts help (Press ? key)"
        aria-label="Show keyboard shortcuts help"
      >
        <Keyboard className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-200 z-40 min-h-touch min-w-touch flex items-center justify-center touch-manipulation"
        title="Keyboard shortcuts help (Press ? key)"
        aria-label="Show keyboard shortcuts help"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      {/* Help Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        size="lg"
        headerClassName="flex items-center space-x-3"
        footerContent={
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> anytime to show this help
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 min-h-touch touch-manipulation"
            >
              Got it
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Use these keyboard shortcuts to navigate and manage your meal plan efficiently.
          </p>

          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-2">
                      {item.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-gray-400 text-sm">+</span>
                          )}
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm ml-4 flex-1 text-right">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Additional Tips */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Tips for Screen Reader Users</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use arrow keys to navigate between meal slots in the calendar</li>
                  <li>• Each meal slot announces its day, meal type, and current contents</li>
                  <li>• Drag and drop operations are fully accessible via keyboard</li>
                  <li>• All actions provide audio feedback through screen reader announcements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};