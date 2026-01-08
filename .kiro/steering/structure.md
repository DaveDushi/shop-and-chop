# Project Structure

## Directory Layout
```
shop-and-chop/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── services/      # API calls and external services
│   │   ├── utils/         # Helper functions and utilities
│   │   ├── types/         # TypeScript type definitions
│   │   └── styles/        # CSS modules and global styles
│   ├── public/            # Static assets and PWA manifest
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend application
│   ├── src/
│   │   ├── controllers/   # Route handlers and business logic
│   │   ├── models/        # Database models and schemas
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware functions
│   │   ├── routes/        # API route definitions
│   │   ├── utils/         # Server-side utilities
│   │   └── config/        # Database and app configuration
│   ├── tests/             # Backend test files
│   └── package.json       # Backend dependencies
├── database/              # Database-related files
│   ├── migrations/        # Database schema migrations
│   ├── seeds/            # Sample data for development
│   └── schema.sql        # Database schema definition
├── docs/                 # Project documentation
└── .kiro/                # Kiro CLI configuration
    ├── steering/         # Project guidelines and standards
    └── prompts/          # Custom development commands
```

## File Naming Conventions
- **Components**: PascalCase (e.g., `MealPlannerCard.tsx`)
- **Pages**: PascalCase (e.g., `WeeklyPlanner.tsx`)
- **Services**: camelCase (e.g., `recipeService.ts`)
- **Utilities**: camelCase (e.g., `dateHelpers.ts`)
- **Types**: PascalCase with `.types.ts` suffix (e.g., `Recipe.types.ts`)
- **Tests**: Same as source file with `.test.ts` suffix
- **Database**: snake_case for tables and columns

## Module Organization
- **Frontend Modules**:
  - `components/`: Atomic, reusable UI components
  - `pages/`: Route-level components that compose smaller components
  - `services/`: API communication and external service integrations
  - `utils/`: Pure functions for data manipulation and formatting
  - `types/`: Shared TypeScript interfaces and type definitions

- **Backend Modules**:
  - `controllers/`: Handle HTTP requests and responses
  - `services/`: Business logic and data processing
  - `models/`: Database interaction and data validation
  - `middleware/`: Request processing and authentication
  - `routes/`: API endpoint definitions and routing

## Configuration Files
- **Root Level**: `package.json`, `tsconfig.json`, `docker-compose.yml`
- **Client Config**: `client/package.json`, `client/tsconfig.json`
- **Server Config**: `server/package.json`, `server/tsconfig.json`
- **Environment**: `.env.example`, `.env.local`, `.env.production`
- **Database**: `database/config.js`, `knexfile.js` (if using Knex)
- **Kiro CLI**: `.kiro/settings/mcp.json` for any MCP integrations

## Documentation Structure
- **README.md**: Project overview, setup instructions, and usage
- **docs/API.md**: API endpoint documentation
- **docs/DATABASE.md**: Database schema and relationship documentation
- **docs/DEPLOYMENT.md**: Deployment and environment setup guide
- **DEVLOG.md**: Development timeline and decision log
- **CONTRIBUTING.md**: Development workflow and contribution guidelines

## Asset Organization
- **Images**: `client/public/images/` for static images
- **Icons**: `client/src/assets/icons/` for SVG icons
- **Styles**: `client/src/styles/` for global CSS and theme files
- **Fonts**: `client/public/fonts/` for custom font files
- **Recipe Images**: `server/uploads/recipes/` for user-uploaded images

## Build Artifacts
- **Client Build**: `client/build/` or `client/dist/`
- **Server Build**: `server/dist/` for compiled TypeScript
- **Docker Images**: Built from Dockerfiles in respective directories
- **Database Exports**: `database/backups/` for database dumps
- **Logs**: `server/logs/` for application logs

## Environment-Specific Files
- **Development**: `.env.local` with local database connections
- **Testing**: `.env.test` with test database configuration
- **Staging**: `.env.staging` with staging environment variables
- **Production**: `.env.production` with production secrets
- **Docker**: `docker-compose.yml` for local development
- **CI/CD**: `.github/workflows/` for GitHub Actions
