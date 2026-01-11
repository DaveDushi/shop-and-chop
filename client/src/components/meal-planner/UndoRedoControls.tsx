import React from 'react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  previousActionDescription?: string;
  nextActionDescription?: string;
  className?: string;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  previousActionDescription,
  nextActionDescription,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          transition-colors duration-200
          ${canUndo 
            ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1' 
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
          }
        `}
        title={previousActionDescription ? `Undo: ${previousActionDescription}` : 'Undo'}
        aria-label={previousActionDescription ? `Undo: ${previousActionDescription}` : 'Undo last action'}
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
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" 
          />
        </svg>
        <span className="hidden sm:inline">Undo</span>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          transition-colors duration-200
          ${canRedo 
            ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1' 
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
          }
        `}
        title={nextActionDescription ? `Redo: ${nextActionDescription}` : 'Redo'}
        aria-label={nextActionDescription ? `Redo: ${nextActionDescription}` : 'Redo next action'}
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
            d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" 
          />
        </svg>
        <span className="hidden sm:inline">Redo</span>
      </button>

      {/* Keyboard shortcut hints for desktop */}
      <div className="hidden lg:flex items-center text-xs text-gray-500 ml-2">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
            Z
          </kbd>
        </span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
            Y
          </kbd>
        </span>
      </div>
    </div>
  );
};