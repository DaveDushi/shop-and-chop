# Implementation Plan: Interactive Drag-and-Drop Meal Planning Calendar

## Overview

This implementation plan breaks down the drag-and-drop meal planning calendar into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring that core functionality is validated early and the system remains integrated throughout development. The plan prioritizes the essential calendar structure and drag-and-drop functionality before adding advanced features.

## Tasks

- [x] 1. Set up calendar foundation and data structures
  - Create TypeScript interfaces for MealPlan, MealSlot, Recipe, and DragState
  - Set up React Query configuration for meal plan and recipe data
  - Create basic calendar state management hooks
  - _Requirements: US-1.1, US-5.1, US-5.2_

- [ ]* 1.1 Write property test for calendar data structures
  - **Property 1: Calendar Grid Structure**
  - **Validates: Requirements US-1.1**

- [x] 2. Implement basic calendar grid layout
  - [x] 2.1 Create CalendarGrid component with 7-day × 3-meal structure
    - Build responsive grid layout using Tailwind CSS
    - Implement day column components (Monday-Sunday)
    - Create meal slot components (breakfast, lunch, dinner)
    - _Requirements: US-1.1, US-1.4_

  - [ ]* 2.2 Write property test for calendar grid structure
    - **Property 1: Calendar Grid Structure**
    - **Validates: Requirements US-1.1**

  - [x] 2.3 Implement week navigation functionality
    - Add previous/next week navigation buttons
    - Implement date calculation logic using date-fns
    - Set current week as default display
    - _Requirements: US-1.2_

  - [ ]* 2.4 Write property test for week navigation
    - **Property 2: Week Navigation Consistency**
    - **Validates: Requirements US-1.2**

- [x] 3. Create meal slot and meal card components
  - [x] 3.1 Implement MealSlot component with empty and populated states
    - Create empty slot placeholder with visual indicators
    - Handle meal assignment and removal events
    - Add basic styling and hover states
    - _Requirements: US-1.1, US-3.1_

  - [x] 3.2 Implement MealCard component for displaying assigned meals
    - Display recipe name, image, and key details (prep time, servings)
    - Add click handler for recipe detail modal
    - Implement responsive card design
    - _Requirements: US-1.3, US-4.1_

  - [ ]* 3.3 Write property test for meal card information display
    - **Property 3: Meal Card Information Completeness**
    - **Validates: Requirements US-1.3**

- [x] 4. Build recipe sidebar with search and filtering
  - [x] 4.1 Create RecipeSidebar component structure
    - Implement collapsible sidebar layout
    - Add search input with debounced queries
    - Create filter controls for dietary preferences and meal types
    - _Requirements: US-2.1_

  - [x] 4.2 Implement RecipeCard components for sidebar
    - Display recipe information in draggable cards
    - Add recipe preview functionality
    - Implement responsive card layout for sidebar
    - _Requirements: US-2.1_

  - [ ]* 4.3 Write property test for recipe sidebar functionality
    - **Property 4: Recipe Sidebar Functionality**
    - **Validates: Requirements US-2.1**

- [x] 5. Checkpoint - Ensure basic calendar structure works
  - Ensure UI is optimized for mobile and has a good UI/UX
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement drag-and-drop core functionality
  - [x] 6.1 Set up React DnD library and drag-drop context
    - Configure React DnD backend and providers
    - Create drag item types and interfaces
    - Set up drag layer for custom drag previews
    - _Requirements: US-2.2, US-2.3_

  - [x] 6.2 Implement drag sources (recipe cards)
    - Make recipe cards draggable from sidebar
    - Add drag preview with recipe information
    - Handle drag start and end events
    - _Requirements: US-2.2, US-2.3_

  - [x] 6.3 Implement drop targets (meal slots)
    - Make meal slots accept dropped recipes
    - Add visual feedback for valid drop zones
    - Handle drop events and meal assignment
    - _Requirements: US-2.2, US-2.3_

  - [ ]* 6.4 Write property test for drag-and-drop operations
    - **Property 5: Drag-and-Drop State Consistency**
    - **Validates: Requirements US-2.2, US-2.4**

  - [ ]* 6.5 Write property test for drag visual feedback
    - **Property 6: Drag Visual Feedback**
    - **Validates: Requirements US-2.3**

- [x] 7. Implement meal management operations
  - [x] 7.1 Add meal removal functionality
    - Implement delete action for individual meals
    - Add clear day functionality for bulk removal
    - Update meal plan state and trigger auto-save
    - _Requirements: US-3.1, US-3.5_

  - [x] 7.2 Implement meal copy and duplication features
    - Add copy meal to other slots functionality
    - Implement duplicate day and duplicate week operations
    - Ensure proper state management for duplicated meals
    - _Requirements: US-3.2, US-3.4_

  - [x] 7.3 Add meal swap functionality
    - Enable dragging meals between existing slots
    - Implement swap logic for exchanging meal positions
    - Update drag-and-drop handlers for meal-to-meal operations
    - _Requirements: US-2.4, US-3.3_

  - [ ]* 7.4 Write property tests for meal management operations
    - **Property 8: Meal Removal Operations**
    - **Property 9: Meal Duplication Operations**
    - **Property 10: Meal Swap Operations**
    - **Validates: Requirements US-3.1, US-3.2, US-3.3, US-3.4, US-3.5**

- [x] 8. Implement undo/redo functionality
  - [x] 8.1 Create undo/redo state management system
    - Implement history stack for meal plan changes
    - Add undo and redo action handlers
    - Integrate with existing meal management operations
    - _Requirements: US-2.5_

  - [ ]* 8.2 Write property test for undo/redo operations
    - **Property 7: Undo/Redo State Management**
    - **Validates: Requirements US-2.5**

- [ ] 9. Add recipe detail modal and serving adjustments
  - [ ] 9.1 Create recipe detail modal component
    - Implement modal with complete recipe information display
    - Show ingredients, instructions, prep time, servings, ratings, and dietary info
    - Add modal open/close functionality triggered by meal card clicks
    - _Requirements: US-4.1, US-4.2, US-4.3_

  - [ ] 9.2 Implement serving size adjustment functionality
    - Add serving adjustment controls in calendar view
    - Update meal slot serving counts and recalculate dependent values
    - Integrate serving changes with auto-save functionality
    - _Requirements: US-4.4_

  - [ ]* 9.3 Write property tests for recipe integration
    - **Property 11: Recipe Detail Modal Activation**
    - **Property 12: Recipe Information Display**
    - **Property 13: Serving Adjustment Consistency**
    - **Validates: Requirements US-4.1, US-4.2, US-4.3, US-4.4**

- [ ] 10. Checkpoint - Ensure core functionality works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement data persistence and auto-save
  - [ ] 11.1 Set up meal plan API integration
    - Connect to existing meal plan endpoints for CRUD operations
    - Implement optimistic updates with rollback on failure
    - Add error handling and retry logic for network failures
    - _Requirements: US-5.1, US-5.2_

  - [ ] 11.2 Implement auto-save functionality
    - Add debounced auto-save for meal plan changes
    - Show save status indicators to users
    - Handle offline scenarios with local state persistence
    - _Requirements: US-5.1, US-5.3_

  - [ ]* 11.3 Write property tests for data persistence
    - **Property 14: Auto-save and Load Consistency**
    - **Property 15: Offline Graceful Degradation**
    - **Validates: Requirements US-5.1, US-5.2, US-5.3**

- [ ] 12. Implement shopping list integration
  - [ ] 12.1 Add shopping list generation functionality
    - Create shopping list generation from current meal plan
    - Implement ingredient consolidation and organization logic
    - Add one-click generation button to calendar header
    - _Requirements: US-6.1_

  - [ ] 12.2 Create shopping list preview and finalization
    - Implement shopping list preview modal with ingredient details
    - Add integration with existing shopping list service
    - Show visual indicators for meals contributing to shopping list
    - _Requirements: US-6.2, US-6.3, US-6.4_

  - [ ]* 12.3 Write property tests for shopping list integration
    - **Property 16: Shopping List Generation**
    - **Property 17: Shopping List Preview Accuracy**
    - **Property 18: Shopping List Service Integration**
    - **Property 19: Meal Contribution Visual Indicators**
    - **Validates: Requirements US-6.1, US-6.2, US-6.3, US-6.4**

- [ ] 13. Add responsive design and mobile optimizations
  - [ ] 13.1 Implement responsive breakpoints and mobile layout
    - Optimize calendar grid for tablet and mobile viewports
    - Implement collapsible sidebar for smaller screens
    - Add touch-friendly drag-and-drop interactions
    - _Requirements: US-1.4_

  - [ ]* 13.2 Write unit tests for responsive behavior
    - Test component rendering at different viewport sizes
    - Verify touch interaction functionality
    - _Requirements: US-1.4_

- [ ] 14. Final integration and polish
  - [ ] 14.1 Integrate calendar with existing application routing
    - Add calendar route to existing React Router configuration
    - Ensure proper authentication and user context integration
    - Connect with existing navigation and layout components
    - _Requirements: US-5.2_

  - [ ] 14.2 Add accessibility improvements
    - Implement keyboard navigation for drag-and-drop operations
    - Add ARIA labels and screen reader announcements
    - Ensure WCAG 2.1 AA compliance for color contrast and focus indicators
    - _Requirements: Technical Requirements - Accessibility_

  - [ ]* 14.3 Write integration tests for complete user workflows
    - Test end-to-end meal planning workflow
    - Test shopping list generation from meal plan
    - Test responsive behavior across device types
    - _Requirements: All user stories_

- [ ] 15. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation prioritizes core calendar functionality before advanced features
- All drag-and-drop operations maintain state consistency and provide appropriate user feedback