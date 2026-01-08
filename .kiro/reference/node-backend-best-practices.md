# Node.js Backend Best Practices Reference

A comprehensive reference guide for building robust Node.js backend applications with Express.js, TypeScript, and PostgreSQL.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Express.js Setup](#2-expressjs-setup)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [Authentication & Security](#5-authentication--security)
6. [Error Handling](#6-error-handling)
7. [Validation](#7-validation)
8. [Middleware](#8-middleware)
9. [Testing](#9-testing)
10. [Performance](#10-performance)
11. [Logging](#11-logging)
12. [Environment Configuration](#12-environment-configuration)
13. [Anti-Patterns](#13-anti-patterns)

---

## 1. Project Structure

### Feature-Based Structure (Recommended)

```
server/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   │   └── authController.js
│   │   │   ├── services/
│   │   │   │   └── authService.js
│   │   │   ├── models/
│   │   │   │   └── User.js
│   │   │   ├── routes/
│   │   │   │   └── authRoutes.js
│   │   │   ├── middleware/
│   │   │   │   └── authMiddleware.js
│   │   │   └── validators/
│   │   │       └── authValidators.js
│   │   ├── recipes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── routes/
│   │   └── meal-plans/
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── cors.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── database.js
│   │   │   └── helpers.js
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── constants/
│   │       └── index.js
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── app.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
├── docs/
│   └── api.md
├── package.json
├── .env.example
└── docker-compose.yml
```
### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Controllers | camelCase + Controller | `recipeController.js` |
| Services | camelCase + Service | `emailService.js` |
| Models | PascalCase | `Recipe.js`, `User.js` |
| Routes | camelCase + Routes | `recipeRoutes.js` |
| Middleware | camelCase | `authMiddleware.js` |
| Utilities | camelCase | `dateHelpers.js` |
| Constants | SCREAMING_SNAKE_CASE | `HTTP_STATUS_CODES` |
| Config files | camelCase | `database.js` |

### Module Organization

```javascript
// Feature index file (features/recipes/index.js)
const recipeRoutes = require('./routes/recipeRoutes');
const recipeService = require('./services/recipeService');

module.exports = {
  routes: recipeRoutes,
  service: recipeService,
};

// Main app registration
const { routes: recipeRoutes } = require('./features/recipes');
app.use('/api/recipes', recipeRoutes);
```

---

## 2. Express.js Setup

### Basic App Structure

```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./shared/middleware/errorHandler');
const logger = require('./shared/utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./features/auth/routes/authRoutes'));
app.use('/api/recipes', require('./features/recipes/routes/recipeRoutes'));
app.use('/api/meal-plans', require('./features/meal-plans/routes/mealPlanRoutes'));

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

### Server Entry Point

```javascript
// src/server.js
const app = require('./app');
const logger = require('./shared/utils/logger');
const { connectDatabase } = require('./shared/utils/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

## 3. Database Design

### PostgreSQL Connection

```javascript
// src/shared/utils/database.js
const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function connectDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
}

module.exports = {
  connectDatabase,
  query,
  pool,
};
```

### Model Pattern

```javascript
// src/features/recipes/models/Recipe.js
const { query } = require('../../../shared/utils/database');

class Recipe {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.ingredients = data.ingredients;
    this.instructions = data.instructions;
    this.prepTime = data.prep_time;
    this.cookTime = data.cook_time;
    this.servings = data.servings;
    this.userId = data.user_id;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async findAll(filters = {}) {
    let queryText = `
      SELECT * FROM recipes 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.userId) {
      queryText += ` AND user_id = $${++paramCount}`;
      params.push(filters.userId);
    }

    if (filters.search) {
      queryText += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    queryText += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      queryText += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }

    const result = await query(queryText, params);
    return result.rows.map(row => new Recipe(row));
  }

  static async findById(id) {
    const result = await query('SELECT * FROM recipes WHERE id = $1', [id]);
    return result.rows[0] ? new Recipe(result.rows[0]) : null;
  }

  static async create(data) {
    const queryText = `
      INSERT INTO recipes (name, description, ingredients, instructions, prep_time, cook_time, servings, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      data.name,
      data.description,
      JSON.stringify(data.ingredients),
      JSON.stringify(data.instructions),
      data.prepTime,
      data.cookTime,
      data.servings,
      data.userId,
    ];

    const result = await query(queryText, params);
    return new Recipe(result.rows[0]);
  }

  async update(data) {
    const fields = [];
    const params = [];
    let paramCount = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.toSnakeCase(key)} = $${++paramCount}`);
        params.push(key === 'ingredients' || key === 'instructions' ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) return this;

    const queryText = `
      UPDATE recipes 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${++paramCount}
      RETURNING *
    `;
    params.push(this.id);

    const result = await query(queryText, params);
    return new Recipe(result.rows[0]);
  }

  async delete() {
    await query('DELETE FROM recipes WHERE id = $1', [this.id]);
    return true;
  }

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      ingredients: this.ingredients,
      instructions: this.instructions,
      prepTime: this.prepTime,
      cookTime: this.cookTime,
      servings: this.servings,
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Recipe;
```
### Database Migrations

```sql
-- database/migrations/001_create_users_table.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  dietary_preferences JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

```sql
-- database/migrations/002_create_recipes_table.sql
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  servings INTEGER DEFAULT 4,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_name ON recipes USING gin(to_tsvector('english', name));
```

---

## 4. API Design

### RESTful Controller Pattern

```javascript
// src/features/recipes/controllers/recipeController.js
const recipeService = require('../services/recipeService');
const { validationResult } = require('express-validator');
const { AppError } = require('../../../shared/utils/errors');

class RecipeController {
  async getAllRecipes(req, res, next) {
    try {
      const { page = 1, limit = 10, search, userId } = req.query;
      
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        userId: userId || req.user?.id,
      };

      const result = await recipeService.getAllRecipes(filters);
      
      res.json({
        success: true,
        data: result.recipes,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecipeById(req, res, next) {
    try {
      const { id } = req.params;
      const recipe = await recipeService.getRecipeById(id);

      if (!recipe) {
        throw new AppError('Recipe not found', 404);
      }

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRecipe(req, res, next) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const recipeData = {
        ...req.body,
        userId: req.user.id,
      };

      const recipe = await recipeService.createRecipe(recipeData);

      res.status(201).json({
        success: true,
        data: recipe,
        message: 'Recipe created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRecipe(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const recipe = await recipeService.updateRecipe(id, req.body, req.user.id);

      res.json({
        success: true,
        data: recipe,
        message: 'Recipe updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRecipe(req, res, next) {
    try {
      const { id } = req.params;
      await recipeService.deleteRecipe(id, req.user.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecipeController();
```

### Service Layer Pattern

```javascript
// src/features/recipes/services/recipeService.js
const Recipe = require('../models/Recipe');
const { AppError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class RecipeService {
  async getAllRecipes(filters) {
    try {
      const { page, limit, ...otherFilters } = filters;
      const offset = (page - 1) * limit;

      const recipes = await Recipe.findAll({
        ...otherFilters,
        limit,
        offset,
      });

      const total = await Recipe.count(otherFilters);

      return {
        recipes,
        total,
      };
    } catch (error) {
      logger.error('Error fetching recipes:', error);
      throw new AppError('Failed to fetch recipes', 500);
    }
  }

  async getRecipeById(id) {
    try {
      const recipe = await Recipe.findById(id);
      return recipe;
    } catch (error) {
      logger.error(`Error fetching recipe ${id}:`, error);
      throw new AppError('Failed to fetch recipe', 500);
    }
  }

  async createRecipe(data) {
    try {
      // Business logic validation
      if (data.ingredients.length === 0) {
        throw new AppError('Recipe must have at least one ingredient', 400);
      }

      if (data.instructions.length === 0) {
        throw new AppError('Recipe must have at least one instruction', 400);
      }

      const recipe = await Recipe.create(data);
      logger.info(`Recipe created: ${recipe.id}`, { userId: data.userId });
      
      return recipe;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Error creating recipe:', error);
      throw new AppError('Failed to create recipe', 500);
    }
  }

  async updateRecipe(id, data, userId) {
    try {
      const recipe = await Recipe.findById(id);
      
      if (!recipe) {
        throw new AppError('Recipe not found', 404);
      }

      if (recipe.userId !== userId) {
        throw new AppError('Not authorized to update this recipe', 403);
      }

      const updatedRecipe = await recipe.update(data);
      logger.info(`Recipe updated: ${id}`, { userId });
      
      return updatedRecipe;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error(`Error updating recipe ${id}:`, error);
      throw new AppError('Failed to update recipe', 500);
    }
  }

  async deleteRecipe(id, userId) {
    try {
      const recipe = await Recipe.findById(id);
      
      if (!recipe) {
        throw new AppError('Recipe not found', 404);
      }

      if (recipe.userId !== userId) {
        throw new AppError('Not authorized to delete this recipe', 403);
      }

      await recipe.delete();
      logger.info(`Recipe deleted: ${id}`, { userId });
      
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error(`Error deleting recipe ${id}:`, error);
      throw new AppError('Failed to delete recipe', 500);
    }
  }
}

module.exports = new RecipeService();
```

### Route Definition

```javascript
// src/features/recipes/routes/recipeRoutes.js
const express = require('express');
const recipeController = require('../controllers/recipeController');
const { authenticate } = require('../../../shared/middleware/authMiddleware');
const { validateRecipe, validateRecipeUpdate } = require('../validators/recipeValidators');

const router = express.Router();

// Public routes
router.get('/', recipeController.getAllRecipes);
router.get('/:id', recipeController.getRecipeById);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.post('/', validateRecipe, recipeController.createRecipe);
router.put('/:id', validateRecipeUpdate, recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
```

---

## 5. Authentication & Security

### JWT Authentication

```javascript
// src/features/auth/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../../../shared/utils/errors');

class AuthService {
  async register(userData) {
    const { email, password, firstName, lastName } = userData;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 409);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: user.toPublicJSON(),
      ...tokens,
    };
  }

  async login(email, password) {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: user.toPublicJSON(),
      ...tokens,
    };
  }

  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new AppError('Invalid refresh token', 401);
      }

      const tokens = this.generateTokens(user.id);
      return tokens;
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }
}

module.exports = new AuthService();
```

### Authentication Middleware

```javascript
// src/shared/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../../features/auth/models/User');
const { AppError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('Invalid token', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
```

### Security Headers & CORS

```javascript
// src/shared/middleware/security.js
const helmet = require('helmet');
const cors = require('cors');

const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
];

module.exports = securityMiddleware;
```
---

## 6. Error Handling

### Custom Error Classes

```javascript
// src/shared/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};
```

### Global Error Handler

```javascript
// src/shared/middleware/errorHandler.js
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

function notFound(req, res, next) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

function errorHandler(error, req, res, next) {
  let err = { ...error };
  err.message = error.message;

  // Log error
  logger.error(error.message, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = 'Resource not found';
    err = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    const message = 'Duplicate field value entered';
    err = new AppError(message, 400);
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map(val => val.message);
    err = new AppError(message, 400);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    err = new AppError('Token expired', 401);
  }

  // PostgreSQL errors
  if (error.code === '23505') { // Unique violation
    err = new AppError('Duplicate entry', 409);
  }

  if (error.code === '23503') { // Foreign key violation
    err = new AppError('Referenced resource not found', 400);
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || 'Server Error',
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = {
  notFound,
  errorHandler,
};
```

### Async Error Wrapper

```javascript
// src/shared/utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Usage in controllers
const asyncHandler = require('../../../shared/utils/asyncHandler');

const getAllRecipes = asyncHandler(async (req, res, next) => {
  const recipes = await recipeService.getAllRecipes(req.query);
  res.json({ success: true, data: recipes });
});
```

---

## 7. Validation

### Express Validator

```javascript
// src/features/recipes/validators/recipeValidators.js
const { body, param, query } = require('express-validator');

const validateRecipe = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('ingredients')
    .isArray({ min: 1 })
    .withMessage('At least one ingredient is required'),
  
  body('ingredients.*.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Ingredient name is required'),
  
  body('ingredients.*.amount')
    .isFloat({ min: 0 })
    .withMessage('Ingredient amount must be a positive number'),
  
  body('ingredients.*.unit')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Ingredient unit is required'),
  
  body('instructions')
    .isArray({ min: 1 })
    .withMessage('At least one instruction is required'),
  
  body('instructions.*')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Instruction cannot be empty'),
  
  body('prepTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Prep time must be a positive integer'),
  
  body('cookTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cook time must be a positive integer'),
  
  body('servings')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Servings must be between 1 and 50'),
];

const validateRecipeUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('ingredients')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one ingredient is required'),
  
  // ... other optional validations
];

const validateRecipeId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Recipe ID must be a positive integer'),
];

const validateRecipeQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
];

module.exports = {
  validateRecipe,
  validateRecipeUpdate,
  validateRecipeId,
  validateRecipeQuery,
};
```

### Joi Validation (Alternative)

```javascript
// src/features/recipes/validators/recipeSchemas.js
const Joi = require('joi');

const ingredientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  amount: Joi.number().positive().required(),
  unit: Joi.string().trim().min(1).max(20).required(),
});

const recipeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional(),
  ingredients: Joi.array().items(ingredientSchema).min(1).required(),
  instructions: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  prepTime: Joi.number().integer().min(0).optional(),
  cookTime: Joi.number().integer().min(0).optional(),
  servings: Joi.number().integer().min(1).max(50).optional(),
});

const recipeUpdateSchema = recipeSchema.fork(
  ['name', 'ingredients', 'instructions'],
  (schema) => schema.optional()
);

// Validation middleware
function validateSchema(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return next(new AppError('Validation failed', 400, details));
    }

    req.body = value;
    next();
  };
}

module.exports = {
  recipeSchema,
  recipeUpdateSchema,
  validateSchema,
};
```

---

## 8. Middleware

### Rate Limiting

```javascript
// src/shared/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../utils/redis');

// General API rate limiting
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
    },
  },
  skipSuccessfulRequests: true,
});

module.exports = {
  apiLimiter,
  authLimiter,
};
```

### Request Logging

```javascript
// src/shared/middleware/requestLogger.js
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });
  });

  next();
}

module.exports = requestLogger;
```

### File Upload

```javascript
// src/shared/middleware/upload.js
const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/errors');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/recipes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
```

---

## 9. Testing

### Test Setup

```javascript
// tests/setup.js
const { Pool } = require('pg');

// Test database connection
const testPool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'shop_and_chop_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
});

// Setup and teardown
beforeAll(async () => {
  // Run migrations
  await runMigrations(testPool);
});

afterAll(async () => {
  await testPool.end();
});

beforeEach(async () => {
  // Clean database
  await cleanDatabase(testPool);
  // Seed test data
  await seedTestData(testPool);
});

async function cleanDatabase(pool) {
  await pool.query('TRUNCATE TABLE recipes, users RESTART IDENTITY CASCADE');
}

async function seedTestData(pool) {
  // Insert test users, recipes, etc.
}

module.exports = { testPool };
```

### Unit Tests

```javascript
// tests/unit/services/recipeService.test.js
const recipeService = require('../../../src/features/recipes/services/recipeService');
const Recipe = require('../../../src/features/recipes/models/Recipe');
const { AppError } = require('../../../src/shared/utils/errors');

// Mock the Recipe model
jest.mock('../../../src/features/recipes/models/Recipe');

describe('RecipeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecipe', () => {
    it('should create a recipe successfully', async () => {
      const recipeData = {
        name: 'Test Recipe',
        ingredients: [{ name: 'Flour', amount: 2, unit: 'cups' }],
        instructions: ['Mix ingredients'],
        userId: 1,
      };

      const mockRecipe = { id: 1, ...recipeData };
      Recipe.create.mockResolvedValue(mockRecipe);

      const result = await recipeService.createRecipe(recipeData);

      expect(Recipe.create).toHaveBeenCalledWith(recipeData);
      expect(result).toEqual(mockRecipe);
    });

    it('should throw error if no ingredients provided', async () => {
      const recipeData = {
        name: 'Test Recipe',
        ingredients: [],
        instructions: ['Mix ingredients'],
        userId: 1,
      };

      await expect(recipeService.createRecipe(recipeData))
        .rejects
        .toThrow(new AppError('Recipe must have at least one ingredient', 400));
    });
  });

  describe('getRecipeById', () => {
    it('should return recipe if found', async () => {
      const mockRecipe = { id: 1, name: 'Test Recipe' };
      Recipe.findById.mockResolvedValue(mockRecipe);

      const result = await recipeService.getRecipeById(1);

      expect(Recipe.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRecipe);
    });

    it('should return null if recipe not found', async () => {
      Recipe.findById.mockResolvedValue(null);

      const result = await recipeService.getRecipeById(999);

      expect(result).toBeNull();
    });
  });
});
```
### Integration Tests

```javascript
// tests/integration/recipes.test.js
const request = require('supertest');
const app = require('../../src/app');
const { testPool } = require('../setup');
const jwt = require('jsonwebtoken');

describe('Recipe API', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Create test user
    const result = await testPool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ('test@example.com', '$2a$12$hash', 'Test', 'User')
      RETURNING *
    `);
    testUser = result.rows[0];

    // Generate auth token
    authToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET);
  });

  describe('POST /api/recipes', () => {
    it('should create a new recipe', async () => {
      const recipeData = {
        name: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [
          { name: 'Flour', amount: 2, unit: 'cups' },
          { name: 'Sugar', amount: 1, unit: 'cup' },
        ],
        instructions: [
          'Mix dry ingredients',
          'Add wet ingredients',
          'Bake for 30 minutes',
        ],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recipeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(recipeData.name);
      expect(response.body.data.userId).toBe(testUser.id);
    });

    it('should return 400 for invalid recipe data', async () => {
      const invalidData = {
        name: '', // Empty name
        ingredients: [], // Empty ingredients
        instructions: [], // Empty instructions
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const recipeData = {
        name: 'Test Recipe',
        ingredients: [{ name: 'Flour', amount: 2, unit: 'cups' }],
        instructions: ['Mix ingredients'],
      };

      await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(401);
    });
  });

  describe('GET /api/recipes', () => {
    beforeEach(async () => {
      // Insert test recipes
      await testPool.query(`
        INSERT INTO recipes (name, description, ingredients, instructions, user_id)
        VALUES 
          ('Recipe 1', 'Description 1', '[]', '[]', $1),
          ('Recipe 2', 'Description 2', '[]', '[]', $1)
      `, [testUser.id]);
    });

    it('should return paginated recipes', async () => {
      const response = await request(app)
        .get('/api/recipes?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
      });
    });

    it('should filter recipes by search term', async () => {
      const response = await request(app)
        .get('/api/recipes?search=Recipe 1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Recipe 1');
    });
  });
});
```

### Test Utilities

```javascript
// tests/utils/testHelpers.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function generateAuthToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function createTestUser(pool, userData = {}) {
  const defaultData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  const data = { ...defaultData, ...userData };
  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await pool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.email, passwordHash, data.firstName, data.lastName]);

  return result.rows[0];
}

async function createTestRecipe(pool, userId, recipeData = {}) {
  const defaultData = {
    name: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [{ name: 'Flour', amount: 2, unit: 'cups' }],
    instructions: ['Mix ingredients', 'Cook'],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
  };

  const data = { ...defaultData, ...recipeData };

  const result = await pool.query(`
    INSERT INTO recipes (name, description, ingredients, instructions, prep_time, cook_time, servings, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    data.name,
    data.description,
    JSON.stringify(data.ingredients),
    JSON.stringify(data.instructions),
    data.prepTime,
    data.cookTime,
    data.servings,
    userId,
  ]);

  return result.rows[0];
}

module.exports = {
  generateAuthToken,
  createTestUser,
  createTestRecipe,
};
```

---

## 10. Performance

### Database Optimization

```javascript
// src/shared/utils/database.js - Connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maximum number of clients in the pool
  min: 5,  // minimum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
});

// Query optimization with prepared statements
async function queryWithCache(text, params, cacheKey, ttl = 300) {
  if (cacheKey) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const result = await pool.query(text, params);
  
  if (cacheKey) {
    await redis.setex(cacheKey, ttl, JSON.stringify(result.rows));
  }

  return result;
}
```

### Caching with Redis

```javascript
// src/shared/utils/redis.js
const redis = require('redis');
const logger = require('./logger');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

client.on('error', (err) => {
  logger.error('Redis error:', err);
});

client.on('connect', () => {
  logger.info('Connected to Redis');
});

// Cache middleware
function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    const key = `cache:${req.method}:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        client.setex(key, ttl, JSON.stringify(data));
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

module.exports = client;
module.exports.cacheMiddleware = cacheMiddleware;
```

### Response Compression

```javascript
// src/shared/middleware/compression.js
const compression = require('compression');

const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
});

module.exports = compressionMiddleware;
```

---

## 11. Logging

### Winston Logger Setup

```javascript
// src/shared/utils/logger.js
const winston = require('winston');
const path = require('path');

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'shop-and-chop-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

module.exports = logger;
```

### Structured Logging

```javascript
// Usage examples throughout the application
const logger = require('../shared/utils/logger');

// In controllers
logger.info('Recipe created', {
  userId: req.user.id,
  recipeId: recipe.id,
  recipeName: recipe.name,
});

// In services
logger.error('Database query failed', {
  query: 'SELECT * FROM recipes',
  error: error.message,
  stack: error.stack,
});

// In middleware
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  endpoint: req.path,
  userAgent: req.get('User-Agent'),
});

// Performance logging
const start = Date.now();
// ... operation
const duration = Date.now() - start;
logger.info('Operation completed', {
  operation: 'generateShoppingList',
  duration,
  userId: req.user.id,
});
```

---

## 12. Environment Configuration

### Environment Variables

```bash
# .env.example
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shop_and_chop
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# External APIs
SPOONACULAR_API_KEY=your-api-key

# Logging
LOG_LEVEL=info
```

### Configuration Management

```javascript
// src/config/index.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads/',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config;
```
---

## 13. Anti-Patterns

### Common Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Callback hell | Hard to read/maintain | Use async/await or Promises |
| Synchronous operations | Blocks event loop | Use asynchronous alternatives |
| No error handling | Crashes and poor UX | Implement proper error handling |
| Direct database queries in controllers | Tight coupling | Use service layer |
| Hardcoded values | Inflexible configuration | Use environment variables |
| No input validation | Security vulnerabilities | Validate all inputs |
| Exposing sensitive data | Security risk | Filter response data |

### Code Examples

```javascript
// BAD: Callback hell
function getRecipeWithIngredients(id, callback) {
  Recipe.findById(id, (err, recipe) => {
    if (err) return callback(err);
    
    Ingredient.findByRecipeId(id, (err, ingredients) => {
      if (err) return callback(err);
      
      User.findById(recipe.userId, (err, user) => {
        if (err) return callback(err);
        
        callback(null, { recipe, ingredients, user });
      });
    });
  });
}

// GOOD: Async/await
async function getRecipeWithIngredients(id) {
  const recipe = await Recipe.findById(id);
  const ingredients = await Ingredient.findByRecipeId(id);
  const user = await User.findById(recipe.userId);
  
  return { recipe, ingredients, user };
}

// BAD: Synchronous file operations
const fs = require('fs');
const data = fs.readFileSync('large-file.json', 'utf8'); // Blocks event loop

// GOOD: Asynchronous file operations
const fs = require('fs').promises;
const data = await fs.readFile('large-file.json', 'utf8');

// BAD: No error handling
app.get('/api/recipes/:id', (req, res) => {
  const recipe = Recipe.findById(req.params.id); // What if this throws?
  res.json(recipe);
});

// GOOD: Proper error handling
app.get('/api/recipes/:id', async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return next(new AppError('Recipe not found', 404));
    }
    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// BAD: Database queries in controller
app.get('/api/recipes', async (req, res) => {
  const recipes = await pool.query('SELECT * FROM recipes'); // Tight coupling
  res.json(recipes.rows);
});

// GOOD: Service layer
app.get('/api/recipes', async (req, res, next) => {
  try {
    const recipes = await recipeService.getAllRecipes(req.query);
    res.json({ success: true, data: recipes });
  } catch (error) {
    next(error);
  }
});

// BAD: Hardcoded values
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId }, 'hardcoded-secret', { expiresIn: '1h' });

// GOOD: Environment variables
const token = jwt.sign({ userId }, process.env.JWT_SECRET, { 
  expiresIn: process.env.JWT_EXPIRES_IN 
});

// BAD: No input validation
app.post('/api/recipes', (req, res) => {
  const recipe = Recipe.create(req.body); // Dangerous!
  res.json(recipe);
});

// GOOD: Input validation
app.post('/api/recipes', validateRecipe, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }
    
    const recipe = await recipeService.createRecipe(req.body);
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// BAD: Exposing sensitive data
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user); // Includes password hash!
});

// GOOD: Filter sensitive data
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user.toPublicJSON()); // Only safe fields
});
```

---

## Quick Reference

### Common Imports

```javascript
// Core modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Database
const { Pool } = require('pg');

// Authentication
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Validation
const { body, validationResult } = require('express-validator');
const Joi = require('joi');

// Utilities
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const winston = require('winston');
```

### HTTP Status Codes

```javascript
// Success
200 // OK
201 // Created
204 // No Content

// Client Errors
400 // Bad Request
401 // Unauthorized
403 // Forbidden
404 // Not Found
409 // Conflict
422 // Unprocessable Entity
429 // Too Many Requests

// Server Errors
500 // Internal Server Error
502 // Bad Gateway
503 // Service Unavailable
```

### Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "migrate": "node database/migrate.js",
    "seed": "node database/seed.js"
  }
}
```

---

## Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Express Validator](https://express-validator.github.io/)
- [Joi Validation](https://joi.dev/)
- [Jest Testing](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Helmet.js Security](https://helmetjs.github.io/)

---

This reference guide provides a solid foundation for building scalable, secure, and maintainable Node.js backend applications. Follow these patterns and practices to create robust APIs that can grow with your application's needs.