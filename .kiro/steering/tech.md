# Technical Architecture

## Technology Stack
- **Frontend**: React with TypeScript for type safety and modern UI components
- **Backend**: Node.js with Express.js for API development
- **Database**: PostgreSQL for structured recipe and user data storage
- **Caching**: Redis for session management and frequently accessed recipes
- **Authentication**: JWT tokens with bcrypt for password hashing
- **File Storage**: Local storage for recipe images (cloud storage for production)
- **API Integration**: Spoonacular API for additional recipe data (optional)
- **Mobile**: Progressive Web App (PWA) for mobile shopping list access

## Architecture Overview
- **Client-Server Architecture**: React SPA communicating with REST API
- **Database Layer**: PostgreSQL with normalized schema for recipes, ingredients, and meal plans
- **API Layer**: Express.js REST endpoints for CRUD operations
- **Authentication Layer**: JWT-based auth with protected routes
- **Business Logic**: Service layer for meal planning algorithms and list generation
- **Data Processing**: Ingredient consolidation and categorization algorithms

## Development Environment
- **Node.js**: Version 18+ (LTS)
- **Package Manager**: npm or yarn
- **Database**: PostgreSQL 14+
- **Development Tools**: 
  - Nodemon for auto-restart during development
  - ESLint and Prettier for code formatting
  - Jest for unit testing
  - Postman for API testing

## Code Standards
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Airbnb configuration with React extensions
- **File Structure**: Feature-based organization (components, services, utils)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **API Design**: RESTful endpoints with consistent response formats
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Documentation**: JSDoc comments for complex functions

## Testing Strategy
- **Unit Tests**: Jest for business logic and utility functions
- **Integration Tests**: Supertest for API endpoint testing
- **Frontend Tests**: React Testing Library for component testing
- **Database Tests**: Test database with seed data for consistent testing
- **Coverage Target**: 80%+ code coverage for critical business logic
- **Manual Testing**: User acceptance testing for complete user workflows

## Deployment Process
- **Development**: Local development with hot reload
- **Staging**: Docker containers for consistent environment
- **Production**: Cloud deployment (Heroku, Vercel, or similar)
- **Database**: Managed PostgreSQL service (AWS RDS, Heroku Postgres)
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Environment Variables**: Separate configs for dev/staging/production

## Performance Requirements
- **Page Load**: Initial load under 3 seconds
- **API Response**: Database queries under 500ms
- **Shopping List Generation**: Under 2 seconds for 7-day meal plan
- **Concurrent Users**: Support 100+ simultaneous users
- **Database**: Optimized queries with proper indexing
- **Caching**: Redis for frequently accessed recipe data

## Security Considerations
- **Authentication**: Secure JWT implementation with refresh tokens
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Sanitize all user inputs to prevent injection attacks
- **CORS**: Properly configured cross-origin resource sharing
- **Rate Limiting**: API rate limiting to prevent abuse
- **Data Privacy**: Secure handling of user dietary preferences and meal history
- **HTTPS**: SSL/TLS encryption for all data transmission

## Best Practice Reference Guides

When working on specific technologies or components, always reference the corresponding best practice guide in `.kiro/reference/`:

### Frontend Development
- **React Components & Hooks**: Reference `.kiro/reference/react-frontend-best-practices.md`
- **TypeScript Types & Interfaces**: Reference `.kiro/reference/typescript-best-practices.md`

### Backend Development
- **Node.js & Express APIs**: Reference `.kiro/reference/node-backend-best-practices.md`
- **TypeScript Services & Models**: Reference `.kiro/reference/typescript-best-practices.md`
- **JWT Authentication**: Reference `.kiro/reference/jwt-auth-best-practices.md`

### Database & Caching
- **PostgreSQL Schema & Queries**: Reference `.kiro/reference/postgresql-best-practices.md`
- **Redis Caching & Sessions**: Reference `.kiro/reference/redis-best-practices.md`

### Cross-Technology Work
- **Full-Stack TypeScript**: Reference `.kiro/reference/typescript-best-practices.md`
- **Authentication Flow**: Reference both `.kiro/reference/jwt-auth-best-practices.md` and `.kiro/reference/redis-best-practices.md`

These guides contain comprehensive examples, security considerations, performance optimizations, and anti-patterns specific to our tech stack. Always consult the relevant guide before implementing new features or refactoring existing code.
