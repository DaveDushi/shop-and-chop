# Feature: Recipe Browser with Advanced Search and Filtering

## Feature Description

A comprehensive recipe browsing interface that allows users to discover, search, and filter through both curated and user-created recipes. This feature transforms the placeholder "Recipes" page into a fully functional recipe discovery and management system with advanced filtering capabilities, detailed recipe views, favorites management, and user recipe creation. Users can efficiently find recipes that match their dietary preferences, create and upload their own family recipes, and manage their personal recipe collection before adding them to their meal plans.

## User Story

As a meal planning user
I want to browse and search through available recipes with advanced filtering options AND create my own custom recipes
So that I can discover new meals that match my dietary preferences, preserve my family recipes, and have a complete personal recipe collection for meal planning

## Problem Statement

Currently, users can only discover recipes through the meal planner's sidebar, which provides limited browsing capabilities and no advanced filtering. Users also have no way to add their own family recipes or personal creations to the system. Users need a dedicated space to explore the full recipe database, save favorites, create and manage their own recipes, and find recipes based on specific criteria like dietary restrictions, cooking time, cuisine type, and difficulty level. Without this functionality, users cannot fully leverage the recipe system or personalize it with their own cooking preferences.

## Solution Statement

Implement a comprehensive recipe browser page with grid/list view options, advanced search functionality, multi-criteria filtering (cuisine, dietary tags, cook time, difficulty), recipe detail modals, favorites management, and user recipe creation/editing capabilities. The interface will be mobile-responsive and integrate seamlessly with the existing meal planning workflow, allowing users to add both curated and personal recipes directly to their meal plans from the browser.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Frontend Recipe Components, Recipe API, User Preferences
**Dependencies**: Existing Recipe API, User Authentication, Favorites System, File Upload System

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `client/src/pages/Recipes.tsx` - Current placeholder page that needs complete implementation
- `client/src/services/recipeService.ts` - Existing recipe API service with search functionality
- `client/src/hooks/useRecipes.ts` - Recipe data fetching hook with filtering capabilities
- `client/src/components/meal-planner/RecipeCard.tsx` - Existing recipe card component pattern to follow
- `client/src/components/meal-planner/RecipeDetailModal.tsx` - Recipe detail modal component to reuse
- `client/src/components/meal-planner/RecipeSelectionModal.tsx` - Contains search and filter patterns to mirror
- `client/src/types/Recipe.types.ts` - Recipe type definitions and interfaces
- `server/src/controllers/recipeController.ts` - Backend recipe controller with search/filter logic and CRUD operations
- `server/src/routes/recipes.ts` - Recipe API endpoints including favorites and CRUD operations
- `server/prisma/schema.prisma` (lines 25-45) - Recipe and User favorite relationship models

### New Files to Create

- `client/src/components/recipes/RecipeBrowser.tsx` - Main recipe browser component
- `client/src/components/recipes/RecipeGrid.tsx` - Grid layout for recipe cards
- `client/src/components/recipes/RecipeFilters.tsx` - Advanced filtering sidebar
- `client/src/components/recipes/RecipeSearchBar.tsx` - Search input with suggestions
- `client/src/components/recipes/ViewToggle.tsx` - Grid/list view toggle component
- `client/src/components/recipes/CreateRecipeModal.tsx` - Recipe creation modal form
- `client/src/components/recipes/EditRecipeModal.tsx` - Recipe editing modal form
- `client/src/components/recipes/RecipeForm.tsx` - Shared recipe form component
- `client/src/components/recipes/IngredientInput.tsx` - Dynamic ingredient input component
- `client/src/components/recipes/InstructionInput.tsx` - Dynamic instruction input component
- `client/src/components/recipes/ImageUpload.tsx` - Recipe image upload component
- `client/src/hooks/useRecipeBrowser.ts` - Recipe browser state management hook
- `client/src/hooks/useFavorites.ts` - Favorites management hook
- `client/src/hooks/useCreateRecipe.ts` - Recipe creation hook
- `client/src/hooks/useUpdateRecipe.ts` - Recipe editing hook

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Query Documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
  - Specific section: Optimistic Updates for favorites
  - Why: Required for implementing smooth favorites toggling
- [React Hook Form Documentation](https://react-hook-form.com/docs)
  - Specific section: Controller component for filter forms and recipe creation
  - Why: Needed for advanced filter form management and recipe form validation
- [Tailwind CSS Grid Documentation](https://tailwindcss.com/docs/grid-template-columns)
  - Specific section: Responsive grid layouts
  - Why: Required for responsive recipe grid implementation
- [MDN File API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/File)
  - Specific section: FileReader and image preview
  - Why: Required for recipe image upload functionality

### Patterns to Follow

**Component Structure Pattern:**
```typescript
// From existing meal-planner components
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Custom hooks first
  const { data, isLoading } = useCustomHook();
  
  // Event handlers
  const handleAction = useCallback(() => {}, [dependencies]);
  
  // Render with early returns for loading states
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="responsive-container">
      {/* Component content */}
    </div>
  );
};
```

**API Service Pattern:**
```typescript
// From recipeService.ts
export const apiFunction = async (params: ParamsType): Promise<ReturnType> => {
  const response = await api.get('/endpoint', { params });
  return response.data;
};
```

**Hook Pattern:**
```typescript
// From useRecipes.ts
export const useCustomHook = (params: ParamsType) => {
  return useQuery({
    queryKey: ['key', params],
    queryFn: () => apiFunction(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the core recipe browser infrastructure and data management hooks.

**Tasks:**
- Create recipe browser state management hook
- Set up favorites management system
- Create base recipe browser component structure
- Implement responsive grid layout system

### Phase 2: Core Implementation

Build the main recipe browsing interface with search, filtering, and recipe creation.

**Tasks:**
- Implement recipe search functionality
- Create advanced filtering system
- Build recipe grid with card components
- Add view toggle (grid/list) functionality
- Integrate recipe detail modal
- Implement recipe creation form and modal
- Add recipe editing capabilities

### Phase 3: Backend Integration

Extend backend API to support user recipe creation and management.

**Tasks:**
- Add recipe CRUD API endpoints
- Implement image upload handling
- Add recipe ownership and permissions
- Integrate recipe creation with existing meal planning

### Phase 4: Integration

Connect the recipe browser with existing meal planning workflow and user preferences.

**Tasks:**
- Add "Add to Meal Plan" functionality from recipe browser
- Integrate with user favorites system
- Connect with existing authentication and user preferences
- Add navigation and routing integration
- Implement user recipe management (edit/delete own recipes)

### Phase 5: Testing & Validation

Comprehensive testing of all recipe browser functionality.

**Tasks:**
- Implement unit tests for all components and hooks
- Create integration tests for search and filtering
- Add favorites functionality tests
- Validate mobile responsiveness and accessibility

---

## STEP-BY-STEP TASKS

### CREATE client/src/hooks/useFavorites.ts

- **IMPLEMENT**: Favorites management hook with optimistic updates
- **PATTERN**: Mirror `client/src/hooks/useRecipes.ts` query structure
- **IMPORTS**: `@tanstack/react-query`, `../services/recipeService`
- **GOTCHA**: Use optimistic updates for immediate UI feedback on favorite toggle
- **VALIDATE**: `npm run test:client -- useFavorites`

### CREATE client/src/hooks/useRecipeBrowser.ts

- **IMPLEMENT**: Recipe browser state management with search, filters, and pagination
- **PATTERN**: Combine patterns from `useRecipes.ts` and `useCalendarState.ts`
- **IMPORTS**: `react`, `@tanstack/react-query`, `../services/recipeService`
- **GOTCHA**: Debounce search input to avoid excessive API calls
- **VALIDATE**: `npm run test:client -- useRecipeBrowser`

### CREATE client/src/components/recipes/RecipeSearchBar.tsx

- **IMPLEMENT**: Search input with debounced queries and clear functionality
- **PATTERN**: Mirror search pattern from `RecipeSelectionModal.tsx` (lines 45-85)
- **IMPORTS**: `react`, `lucide-react`, `../hooks/useDebounce`
- **GOTCHA**: Use existing `useDebounce` hook for search input
- **VALIDATE**: Visual test - search should debounce and show clear button

### CREATE client/src/components/recipes/RecipeFilters.tsx

- **IMPLEMENT**: Advanced filtering sidebar with cuisine, dietary, time, and difficulty filters
- **PATTERN**: Mirror filter structure from `RecipeSelectionModal.tsx` (lines 150-220)
- **IMPORTS**: `react`, `react-hook-form`, `lucide-react`
- **GOTCHA**: Use controlled components for filter state management
- **VALIDATE**: Visual test - filters should update recipe grid immediately

### CREATE client/src/components/recipes/ViewToggle.tsx

- **IMPLEMENT**: Grid/list view toggle button component
- **PATTERN**: Follow button patterns from `UndoRedoControls.tsx`
- **IMPORTS**: `react`, `lucide-react`, `clsx`
- **GOTCHA**: Persist view preference in localStorage
- **VALIDATE**: Visual test - toggle should switch between grid and list layouts

### CREATE client/src/components/recipes/RecipeGrid.tsx

- **IMPLEMENT**: Responsive grid layout for recipe cards with loading states
- **PATTERN**: Mirror grid structure from `CalendarGrid.tsx` responsive patterns
- **IMPORTS**: `react`, `../meal-planner/RecipeCard`, `../common/LoadingSpinner`
- **GOTCHA**: Use CSS Grid with responsive breakpoints (1-2-3-4 columns)
- **VALIDATE**: Visual test - grid should be responsive across all screen sizes

### CREATE client/src/components/recipes/IngredientInput.tsx

- **IMPLEMENT**: Dynamic ingredient input component with add/remove functionality
- **PATTERN**: Follow form input patterns from existing form components
- **IMPORTS**: `react`, `react-hook-form`, `lucide-react`
- **GOTCHA**: Use useFieldArray for dynamic ingredient list management
- **VALIDATE**: Visual test - should allow adding/removing ingredients dynamically

### CREATE client/src/components/recipes/InstructionInput.tsx

- **IMPLEMENT**: Dynamic instruction input component with step numbering
- **PATTERN**: Mirror IngredientInput.tsx structure for consistency
- **IMPORTS**: `react`, `react-hook-form`, `lucide-react`
- **GOTCHA**: Auto-number instructions and handle reordering
- **VALIDATE**: Visual test - should allow adding/removing/reordering instructions

### CREATE client/src/components/recipes/ImageUpload.tsx

- **IMPLEMENT**: Image upload component with preview and validation
- **PATTERN**: Follow file upload patterns from web standards
- **IMPORTS**: `react`, `react-hook-form`, `lucide-react`
- **GOTCHA**: Validate file type (jpg, png, webp) and size (max 5MB)
- **VALIDATE**: Visual test - should show preview and handle upload errors

### CREATE client/src/components/recipes/RecipeForm.tsx

- **IMPLEMENT**: Shared recipe form component for create/edit operations
- **PATTERN**: Follow form patterns from Register.tsx and Login.tsx
- **IMPORTS**: `react`, `react-hook-form`, all recipe input components
- **GOTCHA**: Use controlled components with validation schema
- **VALIDATE**: Visual test - form should validate all fields properly

### CREATE client/src/components/recipes/CreateRecipeModal.tsx

- **IMPLEMENT**: Modal wrapper for recipe creation form
- **PATTERN**: Mirror `RecipeSelectionModal.tsx` modal structure and styling
- **IMPORTS**: `react`, `RecipeForm`, modal utilities
- **GOTCHA**: Handle form submission and success/error states
- **VALIDATE**: Visual test - modal should open/close and submit properly

### CREATE client/src/components/recipes/EditRecipeModal.tsx

- **IMPLEMENT**: Modal wrapper for recipe editing with pre-populated data
- **PATTERN**: Mirror `RecipeSelectionModal.tsx` modal structure with data loading
- **IMPORTS**: `react`, `RecipeForm`, `useUpdateRecipe`
- **GOTCHA**: Pre-populate form with existing recipe data
- **VALIDATE**: Visual test - should load existing data and save changes

### CREATE client/src/hooks/useCreateRecipe.ts

- **IMPLEMENT**: Recipe creation hook with form submission and image upload
- **PATTERN**: Mirror useAuth.tsx mutation patterns
- **IMPORTS**: `@tanstack/react-query`, `../services/recipeService`
- **GOTCHA**: Handle multipart form data for image upload
- **VALIDATE**: `npm run test:client -- useCreateRecipe`

### CREATE client/src/hooks/useUpdateRecipe.ts

- **IMPLEMENT**: Recipe update hook with optimistic updates
- **PATTERN**: Mirror useCreateRecipe.ts with update logic
- **IMPORTS**: `@tanstack/react-query`, `../services/recipeService`
- **GOTCHA**: Handle partial updates and image replacement
- **VALIDATE**: `npm run test:client -- useUpdateRecipe`

- **IMPLEMENT**: Main recipe browser component orchestrating all sub-components
- **PATTERN**: Follow page component structure from `MealPlannerCalendar.tsx`
- **IMPORTS**: All recipe browser components, hooks, and types
- **GOTCHA**: Handle empty states and error states gracefully
- **VALIDATE**: Visual test - full recipe browser functionality should work

### UPDATE client/src/pages/Recipes.tsx

- **IMPLEMENT**: Replace placeholder content with RecipeBrowser component
- **PATTERN**: Mirror page structure from `MealPlanner.tsx`
- **IMPORTS**: `../components/recipes/RecipeBrowser`
- **GOTCHA**: Remove all placeholder content and styling
- **VALIDATE**: `npm run dev:client` - recipes page should show full browser

### UPDATE client/src/components/meal-planner/RecipeCard.tsx

- **IMPLEMENT**: Add "Add to Favorites" button and meal plan integration
- **PATTERN**: Follow button patterns from existing meal planner components
- **IMPORTS**: `../hooks/useFavorites`, `lucide-react`
- **GOTCHA**: Show different states for favorited vs non-favorited recipes
- **VALIDATE**: Visual test - favorite button should toggle with optimistic updates

### UPDATE client/src/services/recipeService.ts

- **IMPLEMENT**: Add favorites toggle API call if not already present
- **PATTERN**: Mirror existing API call patterns in the file
- **IMPORTS**: `./api`
- **GOTCHA**: Handle 401 errors gracefully for unauthenticated users
- **VALIDATE**: `npm run test:server -- recipeService`

### CREATE client/src/components/recipes/index.ts

- **IMPLEMENT**: Export barrel for all recipe browser components
- **PATTERN**: Mirror `client/src/components/meal-planner/index.ts`
- **IMPORTS**: All recipe browser components
- **GOTCHA**: Maintain consistent export naming
- **VALIDATE**: `npm run build:client` - should compile without errors

### ADD server/src/controllers/recipeController.ts

- **IMPLEMENT**: Add createRecipe, updateRecipe, deleteRecipe controller functions
- **PATTERN**: Mirror existing controller patterns in the file
- **IMPORTS**: `multer` for file upload, existing imports
- **GOTCHA**: Add user ownership validation for edit/delete operations
- **VALIDATE**: `npm run test:server -- recipeController`

### ADD server/src/routes/recipes.ts

- **IMPLEMENT**: Add POST, PUT, DELETE routes for recipe CRUD operations
- **PATTERN**: Follow existing route patterns with authentication middleware
- **IMPORTS**: New controller functions, `multer` middleware
- **GOTCHA**: Protect create/update/delete routes with authentication
- **VALIDATE**: `curl -X POST http://localhost:3001/api/recipes` with auth header

### UPDATE server/prisma/schema.prisma

- **IMPLEMENT**: Add userId field to Recipe model for ownership tracking
- **PATTERN**: Follow existing user relationship patterns
- **IMPORTS**: None (schema file)
- **GOTCHA**: Add migration for existing recipes (set to null or admin user)
- **VALIDATE**: `npm run db:push` - schema should update successfully

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing Vitest patterns in the codebase:

- **Hook Tests**: Test `useFavorites` and `useRecipeBrowser` with mock data
- **Component Tests**: Test each component in isolation with React Testing Library
- **Service Tests**: Test recipe service API calls with mock responses
- **Integration Tests**: Test complete recipe browser workflow

### Integration Tests

- **Search Functionality**: Test search with various queries and filters
- **Favorites System**: Test favorite toggle with optimistic updates
- **Responsive Behavior**: Test grid layout at different screen sizes
- **Navigation Integration**: Test routing and navigation between pages

### Edge Cases

- Empty search results handling
- Network error recovery for favorites
- Large dataset performance (100+ recipes)
- Mobile touch interactions for favorites
- Keyboard navigation accessibility

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run lint:client
npm run build:client
```

### Level 2: Unit Tests

```bash
npm run test:client -- recipes
npm run test:client -- useFavorites
npm run test:client -- useRecipeBrowser
```

### Level 3: Integration Tests

```bash
npm run test:client -- RecipeBrowser
npm run dev:client
```

### Level 4: Manual Validation

- Navigate to `/recipes` - should show full recipe browser
- Test search functionality with various queries
- Test all filter combinations (cuisine, dietary, time, difficulty)
- Test favorites toggle on multiple recipes
- Test view toggle between grid and list
- Test "Create Recipe" button opens modal
- Test recipe creation form with all fields
- Test image upload with preview
- Test recipe editing for user's own recipes
- Test recipe deletion with confirmation
- Test that users cannot edit/delete others' recipes
- Test responsive behavior on mobile/tablet/desktop
- Test "Add to Meal Plan" integration from recipe cards

### Level 5: Additional Validation

```bash
npm run test:server -- recipes
curl http://localhost:3001/api/recipes?search=chicken&cuisine=italian
curl -X POST http://localhost:3001/api/recipes -H "Authorization: Bearer <token>" -F "title=Test Recipe" -F "image=@test.jpg"
```

---

## ACCEPTANCE CRITERIA

- [ ] Recipe browser displays all recipes in responsive grid layout
- [ ] Search functionality works with debounced input and real-time results
- [ ] Advanced filtering works for cuisine, dietary tags, cook time, and difficulty
- [ ] Favorites system works with optimistic updates and persistence
- [ ] View toggle switches between grid and list layouts smoothly
- [ ] Recipe detail modal opens from recipe cards with full information
- [ ] "Add to Meal Plan" functionality integrates with existing meal planner
- [ ] Users can create new recipes with all required fields
- [ ] Recipe creation form validates input and handles image uploads
- [ ] Users can edit their own recipes but not others' recipes
- [ ] Users can delete their own recipes with confirmation
- [ ] Recipe ownership is properly tracked and enforced
- [ ] Image upload works with preview and file validation
- [ ] Mobile-responsive design works across all screen sizes
- [ ] Loading states and empty states are handled gracefully
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage meets 80%+ requirement
- [ ] Integration tests verify end-to-end recipe browsing and creation workflow
- [ ] Accessibility standards met (keyboard navigation, screen readers)
- [ ] Performance is acceptable with 100+ recipes loaded

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in dependency order
- [ ] Each component tested individually
- [ ] Integration with existing meal planner verified
- [ ] Favorites system working with backend API
- [ ] Search and filtering performance optimized
- [ ] Mobile responsiveness validated across devices
- [ ] Accessibility compliance verified
- [ ] All validation commands executed successfully
- [ ] Code reviewed for patterns and maintainability
- [ ] Documentation updated for new components

---

## NOTES

**Design Decisions:**
- Reuse existing RecipeCard and RecipeDetailModal components for consistency
- Implement optimistic updates for favorites to improve perceived performance
- Use CSS Grid for responsive layout to match existing calendar grid patterns
- Debounce search input to reduce API calls and improve performance
- Add recipe ownership tracking to enable user recipe management
- Use multipart form data for image uploads with client-side preview
- Implement proper authorization to prevent users from editing others' recipes

**Performance Considerations:**
- Implement pagination or virtual scrolling if recipe count grows significantly
- Cache search results and filter combinations for better UX
- Use React Query's stale-while-revalidate pattern for recipe data
- Optimize image uploads with compression and validation
- Consider lazy loading for recipe images in grid view

**Future Enhancements:**
- Recipe recommendations based on user preferences
- Advanced sorting options (popularity, rating, recent)
- Recipe collections and custom tags
- Social features (recipe sharing, reviews)
- Recipe import from URLs or other formats
- Nutritional information calculation
- Recipe scaling and unit conversion