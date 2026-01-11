import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  enabled = true,
}: KeyboardShortcutsConfig) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field or textarea
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

      // Don't trigger shortcuts when typing in input fields
      if (isInputField) return;

      // Handle Ctrl+Z (Undo)
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo && onUndo) {
          onUndo();
        }
        return;
      }

      // Handle Ctrl+Y (Redo) or Ctrl+Shift+Z (Redo)
      if ((event.ctrlKey && event.key === 'y') || 
          (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
        event.preventDefault();
        if (canRedo && onRedo) {
          onRedo();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onRedo, canUndo, canRedo, enabled]);
};