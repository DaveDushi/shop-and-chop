import React, { useState } from 'react';
import { Modal } from '../common/Modal';

export interface KeyboardNavigationHelpProps {
  className?: string;
}

export const KeyboardNavigationHelp: React.FC<KeyboardNavigationHelpProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl/Cmd', 'K'], description: 'Focus search bar' },
        { keys: ['/', ''], description: 'Focus search bar (alternative)' },
        { keys: ['Arrow Left', 'Page Up'], description: 'Previous page' },
        { keys: ['Arrow Right', 'Page Down'], description: 'Next page' },
        { keys: ['Home'], description: 'Focus first recipe' },
        { keys: ['End'], description: 'Focus last recipe' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['Ctrl/Cmd', 'N'], description: 'Create new recipe' },
        { keys: ['Alt', 'V'], description: 'Toggle grid/list view' },
        { keys: ['Alt', 'C'], description: 'Clear all filters' },
        { keys: ['Ctrl/Cmd', 'R'], description: 'Refresh recipes' },
        { keys: ['Escape'], description: 'Clear focus or close modals' },
      ],
    },
    {
      category: 'Recipe Grid',
      items: [
        { keys: ['Arrow Keys'], description: 'Navigate between recipes' },
        { keys: ['Enter', 'Space'], description: 'Select/activate recipe' },
        { keys: ['Tab'], description: 'Navigate to recipe actions' },
      ],
    },
    {
      category: 'Modals',
      items: [
        { keys: ['Tab'], description: 'Navigate between form fields' },
        { keys: ['Shift', 'Tab'], description: 'Navigate backwards' },
        { keys: ['Escape'], description: 'Close modal' },
      ],
    },
  ];

  const KeyboardKey: React.FC<{ keys: string[] }> = ({ keys }) => (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-gray-400 text-xs">+</span>}
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Show keyboard shortcuts"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
        Keyboard Shortcuts
      </button>

      {/* Help Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        size="lg"
        footerContent={
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-touch touch-manipulation"
          >
            Got it!
          </button>
        }
      >
        <div className="space-y-6">
          <p className="text-gray-600 text-sm">
            Use these keyboard shortcuts to navigate and interact with the recipe browser more efficiently.
          </p>

          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-700 flex-1">
                      {item.description}
                    </span>
                    <KeyboardKey keys={item.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Additional Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Tips for Better Navigation
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use Tab to navigate through interactive elements</li>
              <li>• Press Escape to clear focus or close modals</li>
              <li>• Arrow keys work within recipe grids for quick navigation</li>
              <li>• All shortcuts work when not typing in input fields</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};