# Shop&Chop Project Initialization

You are tasked with setting up the complete Shop&Chop project - a smart meal planner and shopping list generator. This prompt will guide you through creating the entire project structure, implementing core functionality, and establishing the development environment.

## Project Overview

**Product**: Shop&Chop - "Shop smart, chop smarter"  
**Goal**: Eliminate tedious meal planning by providing drag-and-drop weekly meal planning with automated shopping list generation  
**Target**: Save users 2+ hours weekly on meal planning and grocery preparation  
**Launch**: January 23, 2026 (Hackathon Submission)

## Technology Stack

**Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, React Router 6  
**Backend**: Node.js 18+ with Express.js, PostgreSQL 14+, Prisma ORM  
**Authentication**: JWT tokens with bcrypt password hashing  
**Mobile**: Progressive Web App (PWA) with offline capabilities  
**Development**: ESLint, Prettier, Jest, Supertest, Nodemon

## Core Features to Implement

1. **Weekly Meal Planning Calendar**: 7-day grid with drag-and-drop meal assignment
2. **Recipe Database**: 100+ curated recipes with search and filtering
3. **Smart Shopping List Generator**: Auto-consolidate ingredients by store sections
4. **User Authentication**: Secure JWT-based login system
5. **User Preferences**: Household size, dietary restrictions, favorite cuisines
6. **Mobile-Responsive Design**: Optimized for in-store grocery shopping
7. **Progressive Web App**: Offline shopping list access

## Project Structure to Create

```
shop-and-chop/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Generic components (Button, Modal, etc.)
│   │   │   ├── meal-planning/ # Calendar, MealCard, DragDrop
│   │   │   ├── recipes/    # RecipeCard, RecipeSearch, RecipeDetail
│   │   │   └── shopping/   # ShoppingList, ShoppingItem
│   │   ├── pages/         # Page-level components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── MealPlanner.tsx
│   │   │   ├── Recipes.tsx
│   │   │   └── ShoppingList.tsx
│   │   ├── services/      # API calls and external services
│   │   │   ├── api.ts     # Axios configuration
│   │   │   ├── authService.ts
│   │   │   ├── recipeService.ts
│   │   │   └── mealPlanService.ts
│   │   ├── utils/         # Helper functions and utilities
│   │   │   ├── dateHelpers.ts
│   │   │   ├── ingredientHelpers.ts
│   │   │   └── constants.ts
│   │   ├── types/         # TypeScript type definitions
│   │   │   ├── User.types.ts
│   │   │   ├── Recipe.types.ts
│   │   │   ├── MealPlan.types.ts
│   │   │   └── ShoppingList.types.ts
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useRecipes.ts
│   │   │   └── useMealPlan.ts
│   │   ├── styles/        # CSS modules and global styles
│   │   │   ├── globals.css
│   │   │   └── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/            # Static assets and PWA manifest
│   │   ├── manifest.json
│   │   ├── sw.js         # Service worker
│   │   └── icons/        # PWA icons
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── server/                # Node.js backend application
│   ├── src/
│   │   ├── controllers/   # Route handlers and business logic
│   │   │   ├── authController.ts
│   │   │   ├── recipeController.ts
│   │   │   ├── mealPlanController.ts
│   │   │   └── userController.ts
│   │   ├── models/        # Database models and schemas
│   │   │   └── index.ts   # Prisma client export
│   │   ├── services/      # Business logic services
│   │   │   ├── authService.ts
│   │   │   ├── recipeService.ts
│   │   │   ├── mealPlanService.ts
│   │   │   └── shoppingListService.ts
│   │   ├── middleware/    # Express middleware functions
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/        # API route definitions
│   │   │   ├── auth.ts
│   │   │   ├── recipes.ts
│   │   │   ├── mealPlans.ts
│   │   │   └── users.ts
│   │   ├── utils/         # Server-side utilities
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── validation.ts
│   │   ├── config/        # Database and app configuration
│   │   │   ├── database.ts
│   │   │   └── app.ts
│   │   └── server.ts      # Main server file
│   ├── prisma/            # Prisma configuration
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts        # Database seed data
│   ├── tests/             # Backend test files
│   │   ├── auth.test.ts
│   │   ├── recipes.test.ts
│   │   └── mealPlans.test.ts
│   ├── package.json
│   └── tsconfig.json
├── database/              # Database-related files
│   ├── seeds/            # Sample data for development
│   │   ├── recipes.json  # 100+ curated recipes
│   │   └── users.json    # Test user data
│   └── schema.sql        # Database schema reference
├── docs/                 # Project documentation
│   ├── API.md           # API endpoint documentation
│   ├── DATABASE.md      # Database schema documentation
│   └── DEPLOYMENT.md    # Deployment guide
├── .env.example         # Environment variables template
├── .gitignore
├── docker-compose.yml   # Local development setup
├── README.md           # Project setup and usage
└── package.json        # Root package.json for scripts
```

## Implementation Steps

### Phase 1: Project Foundation

1. **Initialize Project Structure**
   - Create the complete directory structure above
   - Set up package.json files for client, server, and root
   - Configure TypeScript, ESLint, and Prettier
   - Create environment configuration files

2. **Database Setup**
   - Design Prisma schema for Users, Recipes, MealPlans, Ingredients
   - Create database migrations
   - Set up seed data with 100+ curated recipes
   - Configure PostgreSQL connection

3. **Authentication System**
   - Implement JWT-based authentication
   - Create user registration and login endpoints
   - Set up password hashing with bcrypt
   - Add authentication middleware

### Phase 2: Core Backend API

4. **Recipe Management API**
   - CRUD operations for recipes
   - Search and filtering endpoints
   - Recipe categorization and tagging
   - Ingredient management

5. **Meal Planning API**
   - Weekly meal plan creation and management
   - Meal assignment to calendar slots
   - User preference handling
   - Meal plan persistence

6. **Shopping List Generation**
   - Algorithm to consolidate ingredients across recipes
   - Store section categorization
   - Quantity scaling based on household size
   - Shopping list optimization

### Phase 3: Frontend Implementation

7. **React Application Setup**
   - Configure Vite with TypeScript and Tailwind
   - Set up React Router for navigation
   - Create base components and layouts
   - Implement responsive design system

8. **Authentication UI**
   - Login and registration forms
   - Protected route handling
   - User profile management
   - Session persistence

9. **Recipe Management UI**
   - Recipe browsing and search interface
   - Recipe detail views with ingredients
   - Filtering by dietary restrictions and cuisine
   - Recipe favoriting system

10. **Meal Planning Interface**
    - Drag-and-drop weekly calendar
    - Recipe selection and assignment
    - Visual meal cards with images
    - Quick actions (copy week, clear day)

11. **Shopping List UI**
    - Mobile-optimized shopping list display
    - Ingredient grouping by store sections
    - Checkable items with persistence
    - Export and sharing capabilities

### Phase 4: Progressive Web App

12. **PWA Implementation**
    - Service worker for offline functionality
    - Web app manifest configuration
    - Offline shopping list access
    - Push notification setup (optional)

13. **Mobile Optimization**
    - Touch-friendly interface design
    - Responsive breakpoints for all screen sizes
    - Mobile-specific navigation patterns
    - Performance optimization for mobile devices

### Phase 5: Testing & Deployment

14. **Testing Implementation**
    - Unit tests for business logic
    - API endpoint integration tests
    - Frontend component testing
    - End-to-end user workflow tests

15. **Deployment Setup**
    - Docker configuration for development
    - Production deployment scripts
    - Environment variable management
    - Database migration scripts

## Key Implementation Requirements

### Database Schema (Prisma)
```prisma
model User {
  id              String     @id @default(cuid())
  email           String     @unique
  password        String
  name            String
  householdSize   Int        @default(2)
  dietaryRestrictions String[]
  favoriteCuisines String[]
  mealPlans       MealPlan[]
  favoriteRecipes Recipe[]   @relation("UserFavorites")
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model Recipe {
  id              String       @id @default(cuid())
  title           String
  description     String?
  cuisine         String
  cookTime        Int          // minutes
  servings        Int
  difficulty      String       // Easy, Medium, Hard
  dietaryTags     String[]     // vegetarian, gluten-free, etc.
  ingredients     Ingredient[]
  instructions    String[]
  imageUrl        String?
  favoritedBy     User[]       @relation("UserFavorites")
  mealPlanItems   MealPlanItem[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Ingredient {
  id          String @id @default(cuid())
  name        String
  quantity    String
  unit        String
  category    String // Produce, Dairy, Meat, etc.
  recipeId    String
  recipe      Recipe @relation(fields: [recipeId], references: [id])
}

model MealPlan {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  weekStartDate DateTime
  meals         MealPlanItem[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model MealPlanItem {
  id         String   @id @default(cuid())
  mealPlanId String
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id])
  recipeId   String
  recipe     Recipe   @relation(fields: [recipeId], references: [id])
  dayOfWeek  Int      // 0-6 (Sunday-Saturday)
  mealType   String   // breakfast, lunch, dinner
  servings   Int      @default(1)
}
```

### API Endpoints
```typescript
// Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
PUT  /api/auth/profile

// Recipes
GET    /api/recipes              // with search, filters
GET    /api/recipes/:id
POST   /api/recipes/:id/favorite
DELETE /api/recipes/:id/favorite

// Meal Plans
GET    /api/meal-plans
POST   /api/meal-plans
GET    /api/meal-plans/:id
PUT    /api/meal-plans/:id
DELETE /api/meal-plans/:id
GET    /api/meal-plans/:id/shopping-list

// Users
GET /api/users/preferences
PUT /api/users/preferences
```

### Core React Components
```typescript
// Meal Planning
<MealPlanningCalendar />
<MealCard recipe={recipe} />
<DragDropProvider />
<WeekNavigator />

// Recipes
<RecipeGrid recipes={recipes} />
<RecipeCard recipe={recipe} />
<RecipeDetail recipe={recipe} />
<RecipeSearch onSearch={handleSearch} />
<RecipeFilters onFilter={handleFilter} />

// Shopping
<ShoppingList items={items} />
<ShoppingItem item={item} />
<StoreSection title="Produce" items={items} />

// Common
<Button variant="primary" />
<Modal isOpen={isOpen} />
<LoadingSpinner />
<ErrorBoundary />
```

## Success Criteria

Your implementation should achieve:

1. **Functional Requirements**:
   - User registration and authentication works securely
   - Users can browse 100+ recipes with search and filters
   - Drag-and-drop meal planning calendar functions smoothly
   - Shopping list generation consolidates ingredients correctly
   - Mobile interface is responsive and touch-friendly
   - PWA works offline for shopping lists

2. **Performance Requirements**:
   - Page load time under 3 seconds
   - API responses under 500ms
   - Shopping list generation under 2 seconds
   - Mobile interface is smooth and responsive

3. **User Experience**:
   - Intuitive interface requiring minimal learning
   - Complete meal planning workflow in under 10 minutes
   - Mobile shopping list is easy to use in-store
   - Visual feedback for all user actions

## Development Guidelines

- **Follow TypeScript strict mode** for type safety
- **Use functional React components** with hooks
- **Implement proper error handling** throughout
- **Write unit tests** for business logic
- **Follow REST API conventions** for endpoints
- **Use semantic HTML** for accessibility
- **Implement responsive design** mobile-first
- **Add loading states** for all async operations
- **Include proper form validation** on client and server
- **Use environment variables** for configuration

## Getting Started

1. **Set up the project structure** as outlined above
2. **Initialize package.json files** with required dependencies
3. **Configure development environment** (TypeScript, ESLint, Prettier)
4. **Set up database** with Prisma and PostgreSQL
5. **Implement authentication system** first
6. **Build core API endpoints** for recipes and meal plans
7. **Create React components** for meal planning interface
8. **Add shopping list generation** algorithm
9. **Implement PWA features** for mobile experience
10. **Test thoroughly** and deploy for demo

Remember: This is an MVP focused on core functionality. Prioritize the essential features that demonstrate clear value proposition - meal planning calendar, recipe database, and smart shopping list generation. Keep the implementation clean, well-typed, and thoroughly tested.

Start with the project structure and work through each phase systematically. The goal is a working application that saves users 2+ hours weekly on meal planning by January 23, 2026.