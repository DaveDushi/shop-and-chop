# Shop & Chop 🛒🔪

**Shop smart, chop smarter** - A smart meal planner and shopping list generator that saves you 2+ hours weekly on meal planning and grocery preparation.

## 🎯 Project Overview

Shop & Chop is a full-stack web application that eliminates the tedious task of meal planning by providing:

- **Weekly Meal Planning**: Drag-and-drop interface for planning meals on a calendar
- **Recipe Database**: 100+ curated recipes with search and dietary filtering
- **Smart Shopping Lists**: Auto-generated lists organized by grocery store sections
- **Mobile PWA**: Offline-capable shopping lists for in-store use
- **User Preferences**: Household size, dietary restrictions, and favorite cuisines

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- npm or yarn

### 1. Clone and Install

```bash
git clone <repository-url>
cd shop-and-chop
npm run setup
```

### 2. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker-compose up -d postgres

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npm run db:setup
```

### 3. Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start individually
npm run dev:client  # Frontend on http://localhost:3000
npm run dev:server  # Backend on http://localhost:3001
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## 🧪 Demo Account

Use these credentials to test the application:

- **Email**: test@shopandchop.com
- **Password**: TestPass123

## 📁 Project Structure

```
shop-and-chop/
├── client/                 # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── services/      # API calls and external services
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets and PWA manifest
├── server/                # Node.js backend (Express + TypeScript)
│   ├── src/
│   │   ├── controllers/   # Route handlers and business logic
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware functions
│   │   ├── routes/        # API route definitions
│   │   └── utils/         # Server-side utilities
│   └── prisma/            # Database schema and migrations
└── docs/                  # Project documentation
```

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe UI development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **React Router 6** for client-side routing
- **React Hook Form** for form handling
- **React DnD** for drag-and-drop functionality
- **PWA** capabilities for mobile offline access

### Backend
- **Node.js 18+** with Express.js for API development
- **TypeScript** for type safety across the stack
- **Prisma ORM** with PostgreSQL for database management
- **JWT** authentication with bcrypt password hashing
- **Joi** for request validation
- **Rate limiting** and security middleware

### Database
- **PostgreSQL 14+** for structured data storage
- **Prisma** for type-safe database operations
- **Database seeding** with 100+ sample recipes

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Recipes
- `GET /api/recipes` - Get recipes with search/filters
- `GET /api/recipes/:id` - Get recipe details
- `POST /api/recipes/:id/favorite` - Toggle recipe favorite

### Meal Plans
- `GET /api/meal-plans` - Get user's meal plans
- `POST /api/meal-plans` - Create new meal plan
- `GET /api/meal-plans/:id` - Get meal plan details
- `PUT /api/meal-plans/:id` - Update meal plan
- `DELETE /api/meal-plans/:id` - Delete meal plan
- `GET /api/meal-plans/:id/shopping-list` - Generate shopping list

### Users
- `GET /api/users/favorites` - Get user's favorite recipes

## 🧪 Testing

```bash
# Run all tests
npm test

# Run client tests
npm run test:client

# Run server tests
npm run test:server

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables

Required environment variables for production:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secret (use a strong, random key)
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
PORT=3001
NODE_ENV=production

# Client Configuration
VITE_API_URL=https://your-api-domain.com/api
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🎨 Features

### ✅ Implemented
- [x] User authentication (register/login/logout)
- [x] JWT-based security with password hashing
- [x] Database schema with Prisma ORM
- [x] Recipe database with 100+ seeded recipes
- [x] API endpoints for all core functionality
- [x] Responsive React frontend with Tailwind CSS
- [x] Shopping list generation algorithm
- [x] PWA configuration for mobile use
- [x] Form validation and error handling
- [x] Loading states and user feedback

### 🚧 In Development
- [ ] Drag-and-drop meal planning calendar
- [ ] Recipe browsing with search and filters
- [ ] Shopping list UI with checkable items
- [ ] User profile management
- [ ] Recipe favorites functionality
- [ ] Mobile-optimized shopping experience

### 🔮 Future Enhancements
- [ ] Recipe image uploads
- [ ] Nutritional information
- [ ] Grocery store integration
- [ ] Social sharing features
- [ ] Recipe recommendations
- [ ] Meal prep scheduling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Scripts

```bash
# Root level scripts
npm run dev          # Start both client and server
npm run build        # Build both client and server
npm run test         # Run all tests
npm run setup        # Install all dependencies

# Database scripts
npm run db:setup     # Generate Prisma client, push schema, and seed
npm run db:reset     # Reset database and re-seed

# Individual service scripts
npm run dev:client   # Start client development server
npm run dev:server   # Start server development server
npm run build:client # Build client for production
npm run build:server # Build server for production
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Run `npm run db:setup` to initialize

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on ports 3000/3001

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run build`

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue with detailed error information
- Include your environment details (Node.js version, OS, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Recipe data curated from various open-source collections
- Icons provided by [Lucide React](https://lucide.dev/)
- UI components inspired by modern design systems
- Built with love for efficient meal planning 💚

---

**Shop & Chop** - Making meal planning effortless, one week at a time! 🍽️