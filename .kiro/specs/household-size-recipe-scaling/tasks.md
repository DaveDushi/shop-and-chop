# Implementation Plan: Household Size and Recipe Scaling

## Overview

This implementation plan converts the household size and recipe scaling design into discrete coding tasks. The approach focuses on building core scaling functionality first, then adding UI integration, and finally implementing advanced features like measurement conversion and error handling. Each task builds incrementally to ensure working functionality at every step.

## Tasks

- [x] 1. Set up core scaling infrastructure and data models
  - Create TypeScript interfaces for ScaledRecipe, ScaledIngredient, and extended data models
  - Set up database schema extensions for household size and manual overrides
  - Create basic scaling service with core calculation methods
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement household size management
  - [x] 2.1 Create UserPreferencesService with household size methods
    - Implement getHouseholdSize, setHouseholdSize, and validateHouseholdSize methods
    - Add database persistence for household size in user preferences
    - _Requirements: 1.2, 1.3, 1.5_
  
  - [ ]* 2.2 Write property test for household size validation and persistence
    - **Property 1: Household Size Validation and Persistence**
    - **Validates: Requirements 1.2, 1.3, 6.1**
  
  - [x] 2.3 Create household size settings UI component
    - Build React component for household size input with validation
    - Integrate with UserPreferencesService for save/load operations
    - _Requirements: 1.1, 1.4_

- [x] 3. Implement core recipe scaling calculations
  - [x] 3.1 Build ScalingService with scaling factor calculation
    - Implement calculateScalingFactor method with edge case handling
    - Add getEffectiveServingSize method for household vs manual override logic
    - _Requirements: 2.1, 2.4_
  
  - [ ]* 3.2 Write property test for scaling factor calculation
    - **Property 2: Scaling Factor Calculation Consistency**
    - **Validates: Requirements 2.1, 2.4**
  
  - [x] 3.3 Implement ingredient scaling functionality
    - Create scaleIngredientQuantity method with quantity multiplication
    - Implement scaleRecipe method to process all ingredients
    - Ensure original recipe data preservation
    - _Requirements: 2.2, 2.5_
  
  - [ ]* 3.4 Write property test for ingredient scaling preservation
    - **Property 3: Ingredient Scaling Preservation**
    - **Validates: Requirements 2.2, 2.5**

- [x] 4. Add measurement conversion and rounding system
  - [x] 4.1 Create FractionCalculator for cooking mathematics
    - Implement fraction multiplication, simplification, and mixed number conversion
    - Add practical fraction rounding (1/8, 1/6, 1/4, 1/3, 1/2, 2/3, 3/4)
    - _Requirements: 2.3, 7.1_
  
  - [x] 4.2 Build MeasurementConverter for unit handling
    - Implement convertToCommonUnit and roundToPracticalMeasurement methods
    - Add support for imperial/metric conversion with accuracy requirements
    - Handle minimum/maximum quantity limits and unit scaling
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 4.3 Write property test for measurement rounding and conversion
    - **Property 9: Measurement Rounding Practicality**
    - **Property 10: Cross-System Measurement Consistency**
    - **Validates: Requirements 2.3, 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 5. Checkpoint - Ensure core scaling functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement manual serving size overrides
  - [x] 6.1 Extend MealPlanService with manual override methods
    - Add setManualServingOverride and removeManualServingOverride methods
    - Implement getEffectiveServings to handle household vs manual precedence
    - Update database schema for meal plan entries with override field
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 6.2 Write property test for manual override precedence
    - **Property 4: Manual Override Precedence**
    - **Validates: Requirements 3.2, 6.5**
  
  - [ ]* 6.3 Write property test for manual override persistence
    - **Property 5: Manual Override Round-trip Persistence**
    - **Property 6: Override Removal Reversion**
    - **Validates: Requirements 3.4, 3.5, 6.2, 6.3**
  
  - [x] 6.4 Create manual override UI components
    - Build serving size input component for meal plan entries
    - Add override removal functionality with reversion to household scaling
    - _Requirements: 3.1, 3.4_

- [x] 7. Integrate scaling with shopping list generation
  - [x] 7.1 Update ShoppingListGenerator to use scaled quantities
    - Modify ingredient consolidation to use scaled amounts from meal plans
    - Implement unit conversion during consolidation with accuracy requirements
    - Handle manual overrides in shopping list calculations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 7.2 Write property test for shopping list scaling integration
    - **Property 7: Shopping List Scaling Integration**
    - **Property 8: Unit Conversion Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 8. Add scaling indicators and UI feedback
  - [x] 8.1 Create scaling indicator components
    - Build visual indicators for scaled recipes with scaling factor display
    - Add distinct markers for manual overrides vs household scaling
    - Implement scaling information display (original/current servings, factor)
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 8.2 Implement original/scaled quantity toggle
    - Add toggle functionality to switch between original and scaled ingredient views
    - Ensure toggle works across recipe cards, detailed views, and shopping lists
    - _Requirements: 5.4_
  
  - [ ]* 8.3 Write property test for UI scaling indicators
    - **Property 12: UI Scaling Indicators**
    - **Property 13: UI Toggle Functionality**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [-] 9. Implement real-time updates and reactivitywha
  - [x] 9.1 Add real-time scaling updates for household size changes
    - Implement automatic recalculation of all meal plan recipes when household size changes
    - Ensure updates happen without page refresh using React state management
    - Preserve manual overrides during household size updates
    - _Requirements: 1.4, 6.4, 6.5_
  
  - [ ]* 9.2 Write property test for real-time scaling updates
    - **Property 11: Real-time Scaling Updates**
    - **Validates: Requirements 1.4, 6.4**

- [x] 10. Add error handling and edge case management
  - [x] 10.1 Implement input validation and error recovery
    - Add validation for household size and manual override inputs
    - Implement error recovery for corrupted preference data
    - Handle unparseable ingredient quantities with graceful fallbacks
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 10.2 Add offline support and network error handling
    - Implement local caching for preference changes during network issues
    - Add sync functionality when connectivity is restored
    - _Requirements: 8.5_
  
  - [ ]* 10.3 Write unit tests for error handling scenarios
    - Test invalid input rejection and error messages
    - Test data corruption recovery and default value restoration
    - Test network failure caching and sync behavior
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Integration and end-to-end wiring
  - [x] 11.1 Wire scaling service into existing meal planner components
    - Integrate ScalingService with MealPlannerCalendar and RecipeCard components
    - Update recipe display components to show scaled quantities and indicators
    - Connect household size settings to user preferences UI
    - _Requirements: All requirements integration_
  
  - [x] 11.2 Update existing shopping list components
    - Modify ShoppingListView to display scaled quantities and scaling information
    - Update shopping list generation to use new scaling-aware ShoppingListGenerator
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 11.3 Write integration tests for complete workflows
    - Test complete user journey from household size setting to shopping list generation
    - Test manual override workflow from setting to shopping list reflection
    - Test household size changes affecting existing meal plans
    - _Requirements: End-to-end workflow validation_

- [x] 12. Final checkpoint - Ensure all functionality works together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples, edge cases, and integration points
- Checkpoints ensure incremental validation of working functionality
- The implementation builds incrementally: core scaling → UI integration → advanced features