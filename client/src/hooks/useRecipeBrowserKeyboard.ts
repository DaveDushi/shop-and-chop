import { useEffect, useCallback, useRef } from 'react';

interface RecipeBrowserKeyboardConfig {
  onSearch?: () => void;
  onCreateRecipe?: () => void;
  onToggleView?: () => void;
  onClearFilters?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onFocusFirstRecipe?: () => void;
  onFocusLastRecipe?: () => void;
  onRefresh?: () => void;
  enabled?: boolean;
}

export const useRecipeBrowserKeyboard = ({
  onSearch,
  onCreateRecipe,
  onToggleView,
  onClearFilters,
  onNextPage,
  onPrevPage,
  onFocusFirstRecipe,
  onFocusLastRecipe,
  onRefresh,
  enabled = true,
}: RecipeBrowserKeyboardConfig) => {
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Store the last focused element for restoration
  const storeFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  // Restore focus to the last focused element
  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, []);

  // Focus management utilities
  const focusUtils = {
    storeFocus,
    restoreFocus,
    
    // Focus the first focusable element in a container
    focusFirst: (container: HTMLElement) => {
      const focusable = container.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    },

    // Focus the last focusable element in a container
    focusLast: (container: HTMLElement) => {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const lastElement = focusable[focusable.length - 1];
      lastElement?.focus();
    },

    // Get all focusable elements in a container
    getFocusableElements: (container: HTMLElement) => {
      return container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    },

    // Focus next/previous element in a list
    focusNext: (currentElement: HTMLElement, container: HTMLElement) => {
      const focusable = Array.from(focusUtils.getFocusableElements(container));
      const currentIndex = focusable.indexOf(currentElement);
      const nextIndex = (currentIndex + 1) % focusable.length;
      focusable[nextIndex]?.focus();
    },

    focusPrevious: (currentElement: HTMLElement, container: HTMLElement) => {
      const focusable = Array.from(focusUtils.getFocusableElements(container));
      const currentIndex = focusable.indexOf(currentElement);
      const prevIndex = currentIndex === 0 ? focusable.length - 1 : currentIndex - 1;
      focusable[prevIndex]?.focus();
    },
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field or textarea
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            // Ctrl/Cmd + K: Focus search
            event.preventDefault();
            onSearch?.();
            break;
          case 'n':
            // Ctrl/Cmd + N: Create new recipe
            event.preventDefault();
            onCreateRecipe?.();
            break;
          case 'r':
            // Ctrl/Cmd + R: Refresh (prevent default browser refresh)
            if (!event.shiftKey) {
              event.preventDefault();
              onRefresh?.();
            }
            break;
        }
        return;
      }

      // Handle Alt key shortcuts
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'v':
            // Alt + V: Toggle view mode
            event.preventDefault();
            onToggleView?.();
            break;
          case 'c':
            // Alt + C: Clear filters
            event.preventDefault();
            onClearFilters?.();
            break;
        }
        return;
      }

      // Don't handle other keys when in input fields
      if (isInputField) return;

      // Handle navigation keys (only when not in input fields)
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          // Next page
          event.preventDefault();
          onNextPage?.();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          // Previous page
          event.preventDefault();
          onPrevPage?.();
          break;
        case 'Home':
          // Focus first recipe
          event.preventDefault();
          onFocusFirstRecipe?.();
          break;
        case 'End':
          // Focus last recipe
          event.preventDefault();
          onFocusLastRecipe?.();
          break;
        case '/':
          // Focus search (like GitHub)
          event.preventDefault();
          onSearch?.();
          break;
        case 'Escape':
          // Clear focus or close modals
          if (document.activeElement && document.activeElement !== document.body) {
            (document.activeElement as HTMLElement).blur();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onSearch,
    onCreateRecipe,
    onToggleView,
    onClearFilters,
    onNextPage,
    onPrevPage,
    onFocusFirstRecipe,
    onFocusLastRecipe,
    onRefresh,
  ]);

  return {
    focusUtils,
    storeFocus,
    restoreFocus,
  };
};

// Hook for managing focus within recipe grids
export const useRecipeGridKeyboard = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Only handle if we're focused on a recipe card
      if (!target.closest('[data-recipe-card]')) return;

      const recipeGrid = target.closest('[data-recipe-grid]') as HTMLElement;
      if (!recipeGrid) return;

      const recipeCards = Array.from(
        recipeGrid.querySelectorAll<HTMLElement>('[data-recipe-card]')
      );

      const currentCard = target.closest('[data-recipe-card]') as HTMLElement;
      const currentIndex = recipeCards.indexOf(currentCard);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          // Move to next row (approximate by moving 4 cards forward for grid view)
          const nextRowIndex = Math.min(currentIndex + 4, recipeCards.length - 1);
          recipeCards[nextRowIndex]?.focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Move to previous row (approximate by moving 4 cards backward for grid view)
          const prevRowIndex = Math.max(currentIndex - 4, 0);
          recipeCards[prevRowIndex]?.focus();
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Move to next card
          const nextIndex = Math.min(currentIndex + 1, recipeCards.length - 1);
          recipeCards[nextIndex]?.focus();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          // Move to previous card
          const prevIndex = Math.max(currentIndex - 1, 0);
          recipeCards[prevIndex]?.focus();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          // Activate the recipe card (click it)
          currentCard.click();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
};

// Hook for modal focus trapping
export const useModalFocusTrap = (isOpen: boolean, modalRef: React.RefObject<HTMLElement>) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    modalRef.current.focus();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, modalRef]);

  return {
    previousActiveElement: previousActiveElement.current,
  };
};