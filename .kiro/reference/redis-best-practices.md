# Redis Best Practices Reference

A comprehensive guide for Redis caching, session management, and data storage in the Shop & Chop application.

---

## Table of Contents

1. [Redis Setup & Configuration](#1-redis-setup--configuration)
2. [Data Types & Usage](#2-data-types--usage)
3. [Caching Strategies](#3-caching-strategies)
4. [Session Management](#4-session-management)
5. [Pub/Sub Messaging](#5-pubsub-messaging)
6. [Performance Optimization](#6-performance-optimization)
7. [Security](#7-security)
8. [Monitoring & Debugging](#8-monitoring--debugging)
9. [Backup & Recovery](#9-backup--recovery)
10. [Node.js Integration](#10-nodejs-integration)
11. [Testing](#11-testing)
12. [Anti-Patterns](#12-anti-patterns)

---

## 1. Redis Setup & Configuration

### Basic Configuration

```bash
# redis.conf - Key settings for production
bind 127.0.0.1 ::1                    # Bind to specific interfaces
port 6379                             # Default port
protected-mode yes                    # Enable protected mode
requirepass your_secure_password      # Set password

# Memory management
maxmemory 2gb                         # Set memory limit
maxmemory-policy allkeys-lru          # Eviction policy

# Persistence
save 900 1                            # Save if 1 key changed in 900 seconds
save 300 10                           # Save if 10 keys changed in 300 seconds
save 60 10000                         # Save if 10000 keys changed in 60 seconds

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
tcp-backlog 511
```

### Docker Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: shop-chop-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    environment:
      - REDIS_PASSWORD=your_secure_password
    networks:
      - shop-chop-network

volumes:
  redis_data:

networks:
  shop-chop-network:
    driver: bridge
```

### Environment Configuration

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=5000
```

---

## 2. Data Types & Usage

### Strings (Most Common)

```javascript
// Basic string operations
await redis.set('user:1:name', 'John Doe');
await redis.get('user:1:name'); // "John Doe"

// With expiration
await redis.setex('session:abc123', 3600, JSON.stringify(sessionData)); // 1 hour
await redis.set('cache:recipes:popular', JSON.stringify(recipes), 'EX', 1800); // 30 minutes

// Atomic operations
await redis.incr('recipe:1:views'); // Increment view count
await redis.incrby('user:1:points', 10); // Add 10 points
await redis.decr('inventory:flour:stock'); // Decrement stock

// Multiple operations
await redis.mset('user:1:email', 'john@example.com', 'user:1:status', 'active');
const [email, status] = await redis.mget('user:1:email', 'user:1:status');
```

### Hashes (Object-like Data)

```javascript
// Store user data as hash
await redis.hset('user:1', {
  name: 'John Doe',
  email: 'john@example.com',
  lastLogin: Date.now(),
  preferences: JSON.stringify(['vegetarian', 'gluten-free'])
});

// Get specific fields
const name = await redis.hget('user:1', 'name');
const userData = await redis.hmget('user:1', 'name', 'email', 'lastLogin');

// Get all fields
const allUserData = await redis.hgetall('user:1');

// Increment numeric fields
await redis.hincrby('user:1', 'loginCount', 1);

// Recipe data as hash
await redis.hset('recipe:1', {
  name: 'Pasta Carbonara',
  servings: 4,
  prepTime: 15,
  cookTime: 20,
  rating: 4.5,
  viewCount: 0
});

// Increment view count
await redis.hincrby('recipe:1', 'viewCount', 1);
```

### Lists (Ordered Collections)

```javascript
// Recent recipes viewed by user
await redis.lpush('user:1:recent_recipes', 'recipe:5');
await redis.ltrim('user:1:recent_recipes', 0, 9); // Keep only 10 most recent

// Get recent recipes
const recentRecipes = await redis.lrange('user:1:recent_recipes', 0, 4); // Get 5 most recent

// Activity feed
await redis.lpush('user:1:activity', JSON.stringify({
  type: 'recipe_created',
  recipeId: 5,
  timestamp: Date.now()
}));

// Process queue (FIFO)
await redis.rpush('email_queue', JSON.stringify({
  to: 'user@example.com',
  subject: 'Recipe shared',
  template: 'recipe_share',
  data: { recipeId: 1 }
}));

// Process from queue
const emailJob = await redis.lpop('email_queue');
```

### Sets (Unique Collections)

```javascript
// User's favorite recipes
await redis.sadd('user:1:favorites', 'recipe:1', 'recipe:3', 'recipe:7');

// Check if recipe is favorited
const isFavorite = await redis.sismember('user:1:favorites', 'recipe:1');

// Get all favorites
const favorites = await redis.smembers('user:1:favorites');

// Recipe tags
await redis.sadd('recipe:1:tags', 'italian', 'pasta', 'quick', 'dinner');

// Find recipes with specific tags (intersection)
await redis.sinter('tag:italian', 'tag:quick'); // Recipes that are both italian and quick

// Users who favorited a recipe
await redis.sadd('recipe:1:favorited_by', 'user:1', 'user:3', 'user:7');
const favoriteCount = await redis.scard('recipe:1:favorited_by');
```

### Sorted Sets (Ranked Collections)

```javascript
// Recipe popularity ranking
await redis.zadd('recipes:popular', 150, 'recipe:1', 89, 'recipe:2', 234, 'recipe:3');

// Get top 10 popular recipes
const topRecipes = await redis.zrevrange('recipes:popular', 0, 9, 'WITHSCORES');

// Update recipe score
await redis.zincrby('recipes:popular', 1, 'recipe:1'); // Increment by 1

// User leaderboard
await redis.zadd('users:points', 1250, 'user:1', 890, 'user:2', 2100, 'user:3');

// Get user rank
const userRank = await redis.zrevrank('users:points', 'user:1'); // 0-based rank

// Get users in score range
const midTierUsers = await redis.zrangebyscore('users:points', 500, 1500);

// Recipe ratings
await redis.zadd('recipe:1:ratings', 5, 'user:1', 4, 'user:2', 5, 'user:3');
const avgRating = await redis.zcard('recipe:1:ratings'); // Count of ratings
```

---

## 3. Caching Strategies

### Cache-Aside Pattern

```javascript
// Cache-aside implementation
class RecipeCache {
  constructor(redis, recipeService) {
    this.redis = redis;
    this.recipeService = recipeService;
    this.TTL = 3600; // 1 hour
  }

  async getRecipe(id) {
    const cacheKey = `recipe:${id}`;
    
    // Try to get from cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - get from database
    const recipe = await this.recipeService.getById(id);
    if (recipe) {
      // Store in cache
      await this.redis.setex(cacheKey, this.TTL, JSON.stringify(recipe));
    }

    return recipe;
  }

  async updateRecipe(id, data) {
    // Update in database
    const recipe = await this.recipeService.update(id, data);
    
    // Update cache
    const cacheKey = `recipe:${id}`;
    await this.redis.setex(cacheKey, this.TTL, JSON.stringify(recipe));
    
    // Invalidate related caches
    await this.invalidateRelatedCaches(id);
    
    return recipe;
  }

  async deleteRecipe(id) {
    // Delete from database
    await this.recipeService.delete(id);
    
    // Remove from cache
    await this.redis.del(`recipe:${id}`);
    
    // Invalidate related caches
    await this.invalidateRelatedCaches(id);
  }

  async invalidateRelatedCaches(recipeId) {
    // Invalidate user's recipe list cache
    const recipe = await this.recipeService.getById(recipeId);
    if (recipe) {
      await this.redis.del(`user:${recipe.userId}:recipes`);
    }
    
    // Invalidate popular recipes cache
    await this.redis.del('recipes:popular');
  }
}
```

### Write-Through Caching

```javascript
class WriteThoughCache {
  async createRecipe(data) {
    // Write to database
    const recipe = await this.recipeService.create(data);
    
    // Write to cache
    const cacheKey = `recipe:${recipe.id}`;
    await this.redis.setex(cacheKey, this.TTL, JSON.stringify(recipe));
    
    return recipe;
  }
}
```

### Multi-Level Caching

```javascript
class MultiLevelCache {
  constructor(redis, memoryCache) {
    this.redis = redis;
    this.memoryCache = memoryCache; // In-memory cache (e.g., node-cache)
    this.L1_TTL = 300; // 5 minutes in memory
    this.L2_TTL = 3600; // 1 hour in Redis
  }

  async get(key) {
    // L1: Check memory cache
    let value = this.memoryCache.get(key);
    if (value) {
      return value;
    }

    // L2: Check Redis cache
    const cached = await this.redis.get(key);
    if (cached) {
      value = JSON.parse(cached);
      // Store in L1 cache
      this.memoryCache.set(key, value, this.L1_TTL);
      return value;
    }

    return null;
  }

  async set(key, value) {
    // Store in both levels
    this.memoryCache.set(key, value, this.L1_TTL);
    await this.redis.setex(key, this.L2_TTL, JSON.stringify(value));
  }

  async del(key) {
    // Remove from both levels
    this.memoryCache.del(key);
    await this.redis.del(key);
  }
}
```

### Cache Warming

```javascript
class CacheWarmer {
  constructor(redis, recipeService) {
    this.redis = redis;
    this.recipeService = recipeService;
  }

  async warmPopularRecipes() {
    console.log('Warming popular recipes cache...');
    
    const popularRecipes = await this.recipeService.getPopular(50);
    
    // Cache each recipe individually
    const promises = popularRecipes.map(recipe => 
      this.redis.setex(`recipe:${recipe.id}`, 3600, JSON.stringify(recipe))
    );
    
    // Cache the popular list
    promises.push(
      this.redis.setex('recipes:popular', 1800, JSON.stringify(popularRecipes))
    );
    
    await Promise.all(promises);
    console.log(`Warmed ${popularRecipes.length} popular recipes`);
  }

  async warmUserData(userId) {
    const user = await this.userService.getById(userId);
    const favorites = await this.recipeService.getUserFavorites(userId);
    const recentlyViewed = await this.recipeService.getRecentlyViewed(userId);
    
    await Promise.all([
      this.redis.setex(`user:${userId}`, 3600, JSON.stringify(user)),
      this.redis.setex(`user:${userId}:favorites`, 1800, JSON.stringify(favorites)),
      this.redis.setex(`user:${userId}:recent`, 900, JSON.stringify(recentlyViewed))
    ]);
  }

  // Schedule cache warming
  startCacheWarming() {
    // Warm popular recipes every 30 minutes
    setInterval(() => {
      this.warmPopularRecipes().catch(console.error);
    }, 30 * 60 * 1000);

    // Initial warming
    this.warmPopularRecipes().catch(console.error);
  }
}
```

---

## 4. Session Management

### Session Storage

```javascript
class RedisSessionStore {
  constructor(redis) {
    this.redis = redis;
    this.prefix = 'session:';
    this.defaultTTL = 24 * 60 * 60; // 24 hours
  }

  async create(sessionData) {
    const sessionId = this.generateSessionId();
    const key = this.prefix + sessionId;
    
    const session = {
      id: sessionId,
      ...sessionData,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    await this.redis.setex(key, this.defaultTTL, JSON.stringify(session));
    return sessionId;
  }

  async get(sessionId) {
    const key = this.prefix + sessionId;
    const sessionData = await this.redis.get(key);
    
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    
    // Update last accessed time
    session.lastAccessed = Date.now();
    await this.redis.setex(key, this.defaultTTL, JSON.stringify(session));
    
    return session;
  }

  async update(sessionId, data) {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...session,
      ...data,
      lastAccessed: Date.now()
    };

    const key = this.prefix + sessionId;
    await this.redis.setex(key, this.defaultTTL, JSON.stringify(updatedSession));
    
    return updatedSession;
  }

  async destroy(sessionId) {
    const key = this.prefix + sessionId;
    await this.redis.del(key);
  }

  async extend(sessionId, ttl = this.defaultTTL) {
    const key = this.prefix + sessionId;
    await this.redis.expire(key, ttl);
  }

  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Cleanup expired sessions (if not using TTL)
  async cleanup() {
    const pattern = this.prefix + '*';
    const keys = await this.redis.keys(pattern);
    const now = Date.now();
    const expiredKeys = [];

    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const age = now - session.lastAccessed;
        
        if (age > this.defaultTTL * 1000) {
          expiredKeys.push(key);
        }
      }
    }

    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
      console.log(`Cleaned up ${expiredKeys.length} expired sessions`);
    }
  }
}
```

### Express Session Integration

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

// Configure Redis session store
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'shop-chop-session',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  rolling: true // Reset expiration on activity
}));

// Session middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    
    // Store user info in session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.loginTime = Date.now();
    
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('shop-chop-session');
    res.json({ success: true });
  });
});
```
---

## 5. Pub/Sub Messaging

### Real-time Notifications

```javascript
class NotificationService {
  constructor(redis) {
    this.redis = redis;
    this.publisher = redis.duplicate(); // Separate connection for publishing
    this.subscriber = redis.duplicate(); // Separate connection for subscribing
  }

  // Publish recipe update notification
  async notifyRecipeUpdate(recipeId, userId, action) {
    const notification = {
      type: 'recipe_update',
      recipeId,
      userId,
      action, // 'created', 'updated', 'deleted'
      timestamp: Date.now()
    };

    await this.publisher.publish('recipe_updates', JSON.stringify(notification));
  }

  // Publish user activity
  async notifyUserActivity(userId, activity) {
    const notification = {
      type: 'user_activity',
      userId,
      activity,
      timestamp: Date.now()
    };

    await this.publisher.publish(`user:${userId}:activity`, JSON.stringify(notification));
  }

  // Subscribe to recipe updates
  subscribeToRecipeUpdates(callback) {
    this.subscriber.subscribe('recipe_updates');
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'recipe_updates') {
        const notification = JSON.parse(message);
        callback(notification);
      }
    });
  }

  // Subscribe to user-specific notifications
  subscribeToUserNotifications(userId, callback) {
    const channel = `user:${userId}:notifications`;
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (channel, message) => {
      if (channel === `user:${userId}:notifications`) {
        const notification = JSON.parse(message);
        callback(notification);
      }
    });
  }

  // Pattern-based subscription
  subscribeToPattern(pattern, callback) {
    this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const notification = JSON.parse(message);
      callback(channel, notification);
    });
  }
}

// Usage example
const notificationService = new NotificationService(redis);

// Subscribe to all user activities
notificationService.subscribeToPattern('user:*:activity', (channel, notification) => {
  console.log(`User activity on ${channel}:`, notification);
  
  // Update user activity feed
  updateActivityFeed(notification.userId, notification.activity);
});

// Publish notification when recipe is created
app.post('/api/recipes', async (req, res) => {
  try {
    const recipe = await recipeService.create(req.body, req.user.id);
    
    // Notify subscribers
    await notificationService.notifyRecipeUpdate(recipe.id, req.user.id, 'created');
    
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### WebSocket Integration

```javascript
const WebSocket = require('ws');

class WebSocketNotificationService {
  constructor(redis, wss) {
    this.redis = redis;
    this.wss = wss;
    this.subscriber = redis.duplicate();
    this.userConnections = new Map(); // userId -> Set of WebSocket connections
    
    this.setupSubscriptions();
    this.setupWebSocketHandlers();
  }

  setupSubscriptions() {
    // Subscribe to user-specific notifications
    this.subscriber.psubscribe('user:*:notifications');
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const userId = channel.split(':')[1];
      const notification = JSON.parse(message);
      this.sendToUser(userId, notification);
    });

    // Subscribe to global notifications
    this.subscriber.subscribe('global_notifications');
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'global_notifications') {
        const notification = JSON.parse(message);
        this.broadcast(notification);
      }
    });
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'auth' && message.userId) {
            this.registerUserConnection(message.userId, ws);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.removeConnection(ws);
      });
    });
  }

  registerUserConnection(userId, ws) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(ws);
    
    ws.userId = userId;
    console.log(`User ${userId} connected via WebSocket`);
  }

  removeConnection(ws) {
    if (ws.userId) {
      const connections = this.userConnections.get(ws.userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.userConnections.delete(ws.userId);
        }
      }
    }
  }

  sendToUser(userId, notification) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      const message = JSON.stringify(notification);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  broadcast(notification) {
    const message = JSON.stringify(notification);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Publish notification to specific user
  async notifyUser(userId, notification) {
    await this.redis.publish(`user:${userId}:notifications`, JSON.stringify(notification));
  }

  // Publish global notification
  async notifyAll(notification) {
    await this.redis.publish('global_notifications', JSON.stringify(notification));
  }
}
```

---

## 6. Performance Optimization

### Connection Pooling

```javascript
const Redis = require('ioredis');

class RedisConnectionManager {
  constructor() {
    this.pools = new Map();
  }

  createPool(name, config) {
    const pool = new Redis.Cluster([
      { host: config.host, port: config.port }
    ], {
      redisOptions: {
        password: config.password,
        db: config.db || 0,
      },
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
      // Connection pool settings
      family: 4,
      keepAlive: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.pools.set(name, pool);
    return pool;
  }

  getPool(name) {
    return this.pools.get(name);
  }

  async closeAll() {
    for (const [name, pool] of this.pools) {
      await pool.quit();
      console.log(`Closed Redis pool: ${name}`);
    }
    this.pools.clear();
  }
}

// Usage
const connectionManager = new RedisConnectionManager();

const mainPool = connectionManager.createPool('main', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

const sessionPool = connectionManager.createPool('sessions', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 1
});
```

### Pipeline Operations

```javascript
class RedisPipelineService {
  constructor(redis) {
    this.redis = redis;
  }

  // Batch operations for better performance
  async batchGetRecipes(recipeIds) {
    const pipeline = this.redis.pipeline();
    
    recipeIds.forEach(id => {
      pipeline.get(`recipe:${id}`);
    });

    const results = await pipeline.exec();
    
    return results.map(([error, result], index) => {
      if (error) {
        console.error(`Error getting recipe ${recipeIds[index]}:`, error);
        return null;
      }
      return result ? JSON.parse(result) : null;
    }).filter(Boolean);
  }

  // Batch cache multiple recipes
  async batchCacheRecipes(recipes) {
    const pipeline = this.redis.pipeline();
    
    recipes.forEach(recipe => {
      pipeline.setex(`recipe:${recipe.id}`, 3600, JSON.stringify(recipe));
    });

    await pipeline.exec();
    console.log(`Cached ${recipes.length} recipes`);
  }

  // Update multiple counters atomically
  async updateRecipeStats(recipeId, stats) {
    const pipeline = this.redis.pipeline();
    
    if (stats.views) {
      pipeline.hincrby(`recipe:${recipeId}:stats`, 'views', stats.views);
    }
    
    if (stats.likes) {
      pipeline.hincrby(`recipe:${recipeId}:stats`, 'likes', stats.likes);
    }
    
    if (stats.shares) {
      pipeline.hincrby(`recipe:${recipeId}:stats`, 'shares', stats.shares);
    }

    // Update popularity score
    pipeline.zincrby('recipes:popular', stats.views + stats.likes * 2, `recipe:${recipeId}`);

    await pipeline.exec();
  }

  // Batch user activity updates
  async batchUpdateUserActivity(activities) {
    const pipeline = this.redis.pipeline();
    
    activities.forEach(activity => {
      const { userId, type, data } = activity;
      
      // Add to user's activity list
      pipeline.lpush(`user:${userId}:activity`, JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
      
      // Keep only last 100 activities
      pipeline.ltrim(`user:${userId}:activity`, 0, 99);
      
      // Update user stats
      pipeline.hincrby(`user:${userId}:stats`, type, 1);
    });

    await pipeline.exec();
  }
}
```

### Memory Optimization

```javascript
class RedisMemoryOptimizer {
  constructor(redis) {
    this.redis = redis;
  }

  // Use hash tags for related keys to ensure they're on the same slot
  generateHashTag(userId) {
    return `{user:${userId}}`;
  }

  // Optimized user data storage
  async storeUserData(userId, userData) {
    const hashTag = this.generateHashTag(userId);
    
    // Store related data with same hash tag
    const pipeline = this.redis.pipeline();
    
    pipeline.hset(`${hashTag}:profile`, userData.profile);
    pipeline.hset(`${hashTag}:preferences`, userData.preferences);
    pipeline.hset(`${hashTag}:stats`, userData.stats);
    
    await pipeline.exec();
  }

  // Compress large JSON data
  async storeCompressedData(key, data, ttl = 3600) {
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(JSON.stringify(data));
    
    await this.redis.setex(`${key}:compressed`, ttl, compressed);
  }

  async getCompressedData(key) {
    const zlib = require('zlib');
    const compressed = await this.redis.get(`${key}:compressed`);
    
    if (!compressed) return null;
    
    const decompressed = zlib.gunzipSync(compressed);
    return JSON.parse(decompressed.toString());
  }

  // Use appropriate data structures
  async optimizeRecipeStorage(recipe) {
    const recipeId = recipe.id;
    
    // Store basic info as hash (more memory efficient than JSON string)
    await this.redis.hset(`recipe:${recipeId}`, {
      name: recipe.name,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      userId: recipe.userId
    });

    // Store tags as set
    if (recipe.tags && recipe.tags.length > 0) {
      await this.redis.sadd(`recipe:${recipeId}:tags`, ...recipe.tags);
    }

    // Store ingredients as list (if order matters) or set (if unique)
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const ingredients = recipe.ingredients.map(ing => JSON.stringify(ing));
      await this.redis.rpush(`recipe:${recipeId}:ingredients`, ...ingredients);
    }
  }

  // Monitor memory usage
  async getMemoryStats() {
    const info = await this.redis.info('memory');
    const stats = {};
    
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      usedMemory: stats.used_memory_human,
      usedMemoryPeak: stats.used_memory_peak_human,
      memoryFragmentationRatio: parseFloat(stats.mem_fragmentation_ratio),
      keyspaceHits: parseInt(stats.keyspace_hits),
      keyspaceMisses: parseInt(stats.keyspace_misses),
      hitRate: stats.keyspace_hits / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))
    };
  }

  // Clean up expired keys manually if needed
  async cleanupExpiredKeys(pattern) {
    const keys = await this.redis.keys(pattern);
    const expiredKeys = [];

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) { // No expiration set
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
      console.log(`Cleaned up ${expiredKeys.length} keys without expiration`);
    }
  }
}
```

---

## 7. Security

### Authentication & Authorization

```javascript
class RedisSecurityManager {
  constructor(redis) {
    this.redis = redis;
  }

  // Rate limiting
  async checkRateLimit(identifier, limit = 100, window = 3600) {
    const key = `rate_limit:${identifier}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime: await this.redis.ttl(key)
    };
  }

  // Sliding window rate limiting
  async slidingWindowRateLimit(identifier, limit = 100, window = 3600) {
    const key = `sliding_rate_limit:${identifier}`;
    const now = Date.now();
    const cutoff = now - (window * 1000);

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, cutoff);
    
    // Count current requests
    const current = await this.redis.zcard(key);
    
    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, window);

    return {
      allowed: true,
      remaining: limit - current - 1
    };
  }

  // Brute force protection
  async checkBruteForce(identifier, maxAttempts = 5, lockoutTime = 900) {
    const key = `brute_force:${identifier}`;
    const attempts = await this.redis.get(key);
    
    if (attempts && parseInt(attempts) >= maxAttempts) {
      const ttl = await this.redis.ttl(key);
      return {
        blocked: true,
        remainingTime: ttl
      };
    }

    return { blocked: false };
  }

  async recordFailedAttempt(identifier, maxAttempts = 5, lockoutTime = 900) {
    const key = `brute_force:${identifier}`;
    const attempts = await this.redis.incr(key);
    
    if (attempts === 1) {
      await this.redis.expire(key, lockoutTime);
    }

    return {
      attempts,
      blocked: attempts >= maxAttempts
    };
  }

  async clearFailedAttempts(identifier) {
    await this.redis.del(`brute_force:${identifier}`);
  }

  // IP whitelist/blacklist
  async isIPBlacklisted(ip) {
    return await this.redis.sismember('blacklisted_ips', ip);
  }

  async blacklistIP(ip, duration = 3600) {
    await this.redis.sadd('blacklisted_ips', ip);
    await this.redis.expire('blacklisted_ips', duration);
  }

  async isIPWhitelisted(ip) {
    return await this.redis.sismember('whitelisted_ips', ip);
  }

  // Secure session tokens
  async storeSecureToken(userId, tokenData, ttl = 3600) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const key = `secure_token:${token}`;
    
    await this.redis.setex(key, ttl, JSON.stringify({
      userId,
      ...tokenData,
      createdAt: Date.now()
    }));

    return token;
  }

  async validateSecureToken(token) {
    const key = `secure_token:${token}`;
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async revokeSecureToken(token) {
    const key = `secure_token:${token}`;
    await this.redis.del(key);
  }
}

// Middleware integration
const securityManager = new RedisSecurityManager(redis);

// Rate limiting middleware
const rateLimitMiddleware = (limit = 100, window = 3600) => {
  return async (req, res, next) => {
    const identifier = req.ip;
    const result = await securityManager.checkRateLimit(identifier, limit, window);
    
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(Date.now() + result.resetTime * 1000).toISOString()
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: result.resetTime
      });
    }

    next();
  };
};

// Brute force protection middleware
const bruteForceMiddleware = async (req, res, next) => {
  const identifier = req.ip;
  const result = await securityManager.checkBruteForce(identifier);
  
  if (result.blocked) {
    return res.status(429).json({
      error: 'Too many failed attempts',
      retryAfter: result.remainingTime
    });
  }

  next();
};
```

---

## 8. Monitoring & Debugging

### Performance Monitoring

```javascript
class RedisMonitor {
  constructor(redis) {
    this.redis = redis;
    this.metrics = {
      commands: new Map(),
      errors: new Map(),
      latency: []
    };
  }

  // Monitor Redis commands
  startCommandMonitoring() {
    const originalSendCommand = this.redis.sendCommand;
    
    this.redis.sendCommand = (command) => {
      const start = Date.now();
      const commandName = command.name;
      
      // Track command count
      this.metrics.commands.set(
        commandName,
        (this.metrics.commands.get(commandName) || 0) + 1
      );

      return originalSendCommand.call(this.redis, command)
        .then(result => {
          // Track latency
          const latency = Date.now() - start;
          this.metrics.latency.push({ command: commandName, latency, timestamp: Date.now() });
          
          // Keep only last 1000 latency measurements
          if (this.metrics.latency.length > 1000) {
            this.metrics.latency.shift();
          }

          return result;
        })
        .catch(error => {
          // Track errors
          this.metrics.errors.set(
            commandName,
            (this.metrics.errors.get(commandName) || 0) + 1
          );
          throw error;
        });
    };
  }

  // Get performance metrics
  getMetrics() {
    const now = Date.now();
    const recentLatency = this.metrics.latency.filter(
      entry => now - entry.timestamp < 60000 // Last minute
    );

    const avgLatency = recentLatency.length > 0
      ? recentLatency.reduce((sum, entry) => sum + entry.latency, 0) / recentLatency.length
      : 0;

    return {
      commands: Object.fromEntries(this.metrics.commands),
      errors: Object.fromEntries(this.metrics.errors),
      averageLatency: Math.round(avgLatency * 100) / 100,
      recentCommands: recentLatency.length
    };
  }

  // Monitor Redis info
  async getRedisInfo() {
    const info = await this.redis.info();
    const sections = {};
    let currentSection = null;

    info.split('\r\n').forEach(line => {
      if (line.startsWith('# ')) {
        currentSection = line.substring(2);
        sections[currentSection] = {};
      } else if (line.includes(':') && currentSection) {
        const [key, value] = line.split(':');
        sections[currentSection][key] = value;
      }
    });

    return sections;
  }

  // Health check
  async healthCheck() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      const info = await this.getRedisInfo();
      const memory = info.Memory || {};
      const stats = info.Stats || {};

      return {
        status: 'healthy',
        latency,
        memory: {
          used: memory.used_memory_human,
          peak: memory.used_memory_peak_human,
          fragmentation: parseFloat(memory.mem_fragmentation_ratio || 0)
        },
        stats: {
          connections: parseInt(stats.connected_clients || 0),
          commands: parseInt(stats.total_commands_processed || 0),
          keyspaceHits: parseInt(stats.keyspace_hits || 0),
          keyspaceMisses: parseInt(stats.keyspace_misses || 0)
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Start periodic monitoring
  startPeriodicMonitoring(interval = 60000) {
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        const metrics = this.getMetrics();
        
        console.log('Redis Health:', health);
        console.log('Redis Metrics:', metrics);
        
        // Alert if unhealthy
        if (health.status === 'unhealthy') {
          console.error('Redis is unhealthy:', health.error);
          // Send alert to monitoring system
        }
        
        // Alert if high latency
        if (health.latency > 100) {
          console.warn(`High Redis latency: ${health.latency}ms`);
        }
        
        // Alert if high memory usage
        if (health.memory.fragmentation > 1.5) {
          console.warn(`High memory fragmentation: ${health.memory.fragmentation}`);
        }
        
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, interval);
  }
}

// Usage
const monitor = new RedisMonitor(redis);
monitor.startCommandMonitoring();
monitor.startPeriodicMonitoring();

// Health check endpoint
app.get('/health/redis', async (req, res) => {
  const health = await monitor.healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Metrics endpoint
app.get('/metrics/redis', (req, res) => {
  const metrics = monitor.getMetrics();
  res.json(metrics);
});
```
---

## 9. Backup & Recovery

### Backup Strategies

```javascript
class RedisBackupManager {
  constructor(redis) {
    this.redis = redis;
    this.backupPath = process.env.REDIS_BACKUP_PATH || './backups';
  }

  // Create RDB snapshot
  async createSnapshot() {
    try {
      await this.redis.bgsave();
      console.log('Background save started');
      
      // Wait for save to complete
      let saving = true;
      while (saving) {
        const info = await this.redis.info('persistence');
        saving = info.includes('rdb_bgsave_in_progress:1');
        if (saving) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Background save completed');
      return true;
    } catch (error) {
      console.error('Snapshot creation failed:', error);
      return false;
    }
  }

  // Export specific keys
  async exportKeys(pattern, filename) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const keys = await this.redis.keys(pattern);
      const exportData = {};
      
      // Get all key-value pairs
      for (const key of keys) {
        const type = await this.redis.type(key);
        const ttl = await this.redis.ttl(key);
        
        let value;
        switch (type) {
          case 'string':
            value = await this.redis.get(key);
            break;
          case 'hash':
            value = await this.redis.hgetall(key);
            break;
          case 'list':
            value = await this.redis.lrange(key, 0, -1);
            break;
          case 'set':
            value = await this.redis.smembers(key);
            break;
          case 'zset':
            value = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
            break;
          default:
            continue;
        }
        
        exportData[key] = {
          type,
          value,
          ttl: ttl > 0 ? ttl : null
        };
      }
      
      const filePath = path.join(this.backupPath, filename);
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
      
      console.log(`Exported ${keys.length} keys to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // Import keys from backup
  async importKeys(filename) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const filePath = path.join(this.backupPath, filename);
      const data = await fs.readFile(filePath, 'utf8');
      const exportData = JSON.parse(data);
      
      const pipeline = this.redis.pipeline();
      let importCount = 0;
      
      for (const [key, keyData] of Object.entries(exportData)) {
        const { type, value, ttl } = keyData;
        
        switch (type) {
          case 'string':
            pipeline.set(key, value);
            break;
          case 'hash':
            pipeline.hset(key, value);
            break;
          case 'list':
            pipeline.del(key);
            if (value.length > 0) {
              pipeline.rpush(key, ...value);
            }
            break;
          case 'set':
            pipeline.del(key);
            if (value.length > 0) {
              pipeline.sadd(key, ...value);
            }
            break;
          case 'zset':
            pipeline.del(key);
            if (value.length > 0) {
              pipeline.zadd(key, ...value);
            }
            break;
        }
        
        if (ttl) {
          pipeline.expire(key, ttl);
        }
        
        importCount++;
      }
      
      await pipeline.exec();
      console.log(`Imported ${importCount} keys from ${filePath}`);
      return importCount;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  // Scheduled backups
  startScheduledBackups(interval = 24 * 60 * 60 * 1000) { // Daily
    setInterval(async () => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Create snapshot
        await this.createSnapshot();
        
        // Export critical data
        await this.exportKeys('user:*', `users-backup-${timestamp}.json`);
        await this.exportKeys('recipe:*', `recipes-backup-${timestamp}.json`);
        await this.exportKeys('session:*', `sessions-backup-${timestamp}.json`);
        
        console.log(`Scheduled backup completed: ${timestamp}`);
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, interval);
  }

  // Cleanup old backups
  async cleanupOldBackups(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const files = await fs.readdir(this.backupPath);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.backupPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`Deleted old backup: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }
}

// Usage
const backupManager = new RedisBackupManager(redis);

// Start scheduled backups
backupManager.startScheduledBackups();

// Manual backup endpoint
app.post('/admin/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const files = [];
    
    files.push(await backupManager.exportKeys('user:*', `users-${timestamp}.json`));
    files.push(await backupManager.exportKeys('recipe:*', `recipes-${timestamp}.json`));
    
    res.json({
      success: true,
      message: 'Backup completed',
      files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 10. Node.js Integration

### Redis Client Setup

```javascript
const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        
        // Connection options
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        
        // Reconnection
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        
        // Connection events
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        }
      });

      // Event handlers
      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis ready');
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      // Test connection
      await this.client.ping();
      console.log('Redis client initialized successfully');
      
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.client) return false;
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = {
  redisClient,
  connect: () => redisClient.connect(),
  getClient: () => redisClient.getClient(),
  disconnect: () => redisClient.disconnect(),
  healthCheck: () => redisClient.healthCheck()
};
```

### Service Integration

```javascript
// Recipe service with Redis caching
class RecipeService {
  constructor(recipeRepository, redis) {
    this.recipeRepository = recipeRepository;
    this.redis = redis;
    this.cacheTTL = 3600; // 1 hour
  }

  async getRecipe(id) {
    const cacheKey = `recipe:${id}`;
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error:', error);
      // Continue to database if cache fails
    }

    // Get from database
    const recipe = await this.recipeRepository.findById(id);
    
    if (recipe) {
      // Cache the result
      try {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(recipe));
      } catch (error) {
        console.warn('Cache write error:', error);
        // Don't fail the request if cache write fails
      }
    }

    return recipe;
  }

  async createRecipe(data, userId) {
    const recipe = await this.recipeRepository.create({ ...data, userId });
    
    // Cache the new recipe
    try {
      const cacheKey = `recipe:${recipe.id}`;
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(recipe));
      
      // Invalidate user's recipe list cache
      await this.redis.del(`user:${userId}:recipes`);
      
      // Update popular recipes if needed
      await this.redis.zadd('recipes:popular', 0, `recipe:${recipe.id}`);
    } catch (error) {
      console.warn('Cache update error:', error);
    }

    return recipe;
  }

  async updateRecipe(id, data, userId) {
    const recipe = await this.recipeRepository.update(id, data);
    
    if (recipe) {
      try {
        // Update cache
        const cacheKey = `recipe:${id}`;
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(recipe));
        
        // Invalidate related caches
        await this.invalidateRelatedCaches(id, userId);
      } catch (error) {
        console.warn('Cache update error:', error);
      }
    }

    return recipe;
  }

  async deleteRecipe(id, userId) {
    await this.recipeRepository.delete(id);
    
    try {
      // Remove from cache
      await this.redis.del(`recipe:${id}`);
      
      // Remove from popular recipes
      await this.redis.zrem('recipes:popular', `recipe:${id}`);
      
      // Invalidate related caches
      await this.invalidateRelatedCaches(id, userId);
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  async getPopularRecipes(limit = 10) {
    const cacheKey = 'recipes:popular:list';
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    // Get popular recipe IDs
    const popularIds = await this.redis.zrevrange('recipes:popular', 0, limit - 1);
    
    // Get recipe details
    const recipes = await Promise.all(
      popularIds.map(id => this.getRecipe(id.replace('recipe:', '')))
    );

    const validRecipes = recipes.filter(Boolean);

    // Cache the result
    try {
      await this.redis.setex(cacheKey, 1800, JSON.stringify(validRecipes)); // 30 minutes
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    return validRecipes;
  }

  async invalidateRelatedCaches(recipeId, userId) {
    const keysToDelete = [
      `user:${userId}:recipes`,
      'recipes:popular:list',
      `recipe:${recipeId}:stats`
    ];

    await this.redis.del(...keysToDelete);
  }

  // Graceful degradation when Redis is unavailable
  async safeRedisOperation(operation, fallback = null) {
    try {
      return await operation();
    } catch (error) {
      console.warn('Redis operation failed:', error);
      return fallback;
    }
  }
}
```

---

## 11. Testing

### Test Setup

```javascript
// test/setup/redis.js
const Redis = require('ioredis-mock');

class TestRedisClient {
  constructor() {
    this.client = new Redis({
      data: {
        // Pre-populate test data
        'test:user:1': JSON.stringify({ id: 1, name: 'Test User' }),
        'test:recipe:1': JSON.stringify({ id: 1, name: 'Test Recipe' })
      }
    });
  }

  getClient() {
    return this.client;
  }

  async flushAll() {
    await this.client.flushall();
  }

  async disconnect() {
    await this.client.disconnect();
  }
}

module.exports = new TestRedisClient();
```

### Unit Tests

```javascript
// test/services/recipeCache.test.js
const RecipeCache = require('../../src/services/RecipeCache');
const testRedis = require('../setup/redis');

describe('RecipeCache', () => {
  let recipeCache;
  let mockRecipeService;
  let redis;

  beforeEach(async () => {
    redis = testRedis.getClient();
    await redis.flushall();

    mockRecipeService = {
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    recipeCache = new RecipeCache(redis, mockRecipeService);
  });

  afterAll(async () => {
    await testRedis.disconnect();
  });

  describe('getRecipe', () => {
    it('should return cached recipe if available', async () => {
      const recipe = { id: 1, name: 'Cached Recipe' };
      await redis.setex('recipe:1', 3600, JSON.stringify(recipe));

      const result = await recipeCache.getRecipe(1);

      expect(result).toEqual(recipe);
      expect(mockRecipeService.getById).not.toHaveBeenCalled();
    });

    it('should fetch from service and cache if not in cache', async () => {
      const recipe = { id: 1, name: 'Fresh Recipe' };
      mockRecipeService.getById.mockResolvedValue(recipe);

      const result = await recipeCache.getRecipe(1);

      expect(result).toEqual(recipe);
      expect(mockRecipeService.getById).toHaveBeenCalledWith(1);

      // Verify it was cached
      const cached = await redis.get('recipe:1');
      expect(JSON.parse(cached)).toEqual(recipe);
    });

    it('should return null if recipe not found', async () => {
      mockRecipeService.getById.mockResolvedValue(null);

      const result = await recipeCache.getRecipe(999);

      expect(result).toBeNull();
      expect(mockRecipeService.getById).toHaveBeenCalledWith(999);
    });
  });

  describe('updateRecipe', () => {
    it('should update cache after updating recipe', async () => {
      const updatedRecipe = { id: 1, name: 'Updated Recipe' };
      mockRecipeService.update.mockResolvedValue(updatedRecipe);

      const result = await recipeCache.updateRecipe(1, { name: 'Updated Recipe' });

      expect(result).toEqual(updatedRecipe);
      expect(mockRecipeService.update).toHaveBeenCalledWith(1, { name: 'Updated Recipe' });

      // Verify cache was updated
      const cached = await redis.get('recipe:1');
      expect(JSON.parse(cached)).toEqual(updatedRecipe);
    });
  });

  describe('deleteRecipe', () => {
    it('should remove recipe from cache after deletion', async () => {
      // Pre-populate cache
      await redis.set('recipe:1', JSON.stringify({ id: 1, name: 'To Delete' }));

      await recipeCache.deleteRecipe(1);

      expect(mockRecipeService.delete).toHaveBeenCalledWith(1);

      // Verify cache was cleared
      const cached = await redis.get('recipe:1');
      expect(cached).toBeNull();
    });
  });
});
```

### Integration Tests

```javascript
// test/integration/redis.test.js
const request = require('supertest');
const app = require('../../src/app');
const { connect, disconnect, getClient } = require('../../src/utils/redis');

describe('Redis Integration', () => {
  let redis;

  beforeAll(async () => {
    await connect();
    redis = getClient();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  describe('Recipe Caching', () => {
    it('should cache recipe after first request', async () => {
      // First request - should hit database
      const response1 = await request(app)
        .get('/api/recipes/1')
        .expect(200);

      expect(response1.body.data.name).toBeDefined();

      // Check if cached
      const cached = await redis.get('recipe:1');
      expect(cached).toBeTruthy();
      expect(JSON.parse(cached)).toEqual(response1.body.data);

      // Second request - should hit cache
      const response2 = await request(app)
        .get('/api/recipes/1')
        .expect(200);

      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should invalidate cache after recipe update', async () => {
      // Create and cache recipe
      const createResponse = await request(app)
        .post('/api/recipes')
        .send({
          name: 'Original Recipe',
          ingredients: [],
          instructions: [],
          servings: 4
        })
        .expect(201);

      const recipeId = createResponse.body.data.id;

      // Verify cached
      let cached = await redis.get(`recipe:${recipeId}`);
      expect(cached).toBeTruthy();

      // Update recipe
      await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send({ name: 'Updated Recipe' })
        .expect(200);

      // Verify cache was updated
      cached = await redis.get(`recipe:${recipeId}`);
      const cachedRecipe = JSON.parse(cached);
      expect(cachedRecipe.name).toBe('Updated Recipe');
    });
  });

  describe('Session Management', () => {
    it('should store and retrieve session data', async () => {
      const sessionData = {
        userId: 1,
        email: 'test@example.com',
        loginTime: Date.now()
      };

      // Store session
      await redis.setex('session:test123', 3600, JSON.stringify(sessionData));

      // Retrieve session
      const retrieved = await redis.get('session:test123');
      expect(JSON.parse(retrieved)).toEqual(sessionData);

      // Check TTL
      const ttl = await redis.ttl('session:test123');
      expect(ttl).toBeGreaterThan(3500);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const ip = '127.0.0.1';
      const limit = 5;

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        await request(app)
          .get('/api/recipes')
          .set('X-Forwarded-For', ip)
          .expect(200);
      }

      // Next request should be rate limited
      await request(app)
        .get('/api/recipes')
        .set('X-Forwarded-For', ip)
        .expect(429);

      // Check rate limit counter
      const counter = await redis.get(`rate_limit:${ip}`);
      expect(parseInt(counter)).toBeGreaterThan(limit);
    });
  });
});
```

---

## 12. Anti-Patterns

### Common Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Using Redis as primary database | Data loss risk | Use as cache/session store only |
| Storing large objects | Memory waste | Compress or use references |
| No expiration on keys | Memory leaks | Always set TTL |
| Blocking operations in production | Performance issues | Use non-blocking alternatives |
| Not handling connection failures | Application crashes | Implement graceful degradation |
| Using KEYS in production | Performance killer | Use SCAN instead |
| No connection pooling | Resource exhaustion | Implement connection pooling |

### Code Examples

```javascript
// BAD: Using Redis as primary database
async function createUser(userData) {
  const userId = await redis.incr('user:id');
  await redis.hset(`user:${userId}`, userData);
  return userId; // What if Redis fails? Data is lost!
}

// GOOD: Use Redis as cache with database as source of truth
async function createUser(userData) {
  const user = await userRepository.create(userData); // Database first
  await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user)); // Cache
  return user;
}

// BAD: Storing large objects without compression
await redis.set('large:data', JSON.stringify(hugeObject)); // Wastes memory

// GOOD: Compress large data
const zlib = require('zlib');
const compressed = zlib.gzipSync(JSON.stringify(hugeObject));
await redis.set('large:data:compressed', compressed);

// BAD: No expiration
await redis.set('temp:data', value); // Never expires, causes memory leaks

// GOOD: Always set expiration
await redis.setex('temp:data', 3600, value); // Expires in 1 hour

// BAD: Using blocking operations
const result = await redis.brpop('queue', 0); // Blocks indefinitely

// GOOD: Use non-blocking with timeout
const result = await redis.brpop('queue', 5); // 5 second timeout

// BAD: Not handling Redis failures
async function getUser(id) {
  const user = await redis.get(`user:${id}`); // Crashes if Redis is down
  return JSON.parse(user);
}

// GOOD: Graceful degradation
async function getUser(id) {
  try {
    const cached = await redis.get(`user:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Redis error, falling back to database:', error);
  }
  
  // Fallback to database
  return await userRepository.findById(id);
}

// BAD: Using KEYS in production
const userKeys = await redis.keys('user:*'); // Blocks Redis!

// GOOD: Use SCAN for large datasets
async function getAllUserKeys() {
  const keys = [];
  let cursor = '0';
  
  do {
    const result = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  
  return keys;
}

// BAD: No connection error handling
const redis = new Redis(config); // No error handling

// GOOD: Proper error handling
const redis = new Redis({
  ...config,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => err.message.includes('READONLY')
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Implement fallback logic
});
```

---

## Quick Reference

### Common Commands

```javascript
// Strings
await redis.set(key, value);
await redis.get(key);
await redis.setex(key, seconds, value);
await redis.incr(key);
await redis.decr(key);

// Hashes
await redis.hset(key, field, value);
await redis.hget(key, field);
await redis.hgetall(key);
await redis.hincrby(key, field, increment);

// Lists
await redis.lpush(key, value);
await redis.rpush(key, value);
await redis.lpop(key);
await redis.rpop(key);
await redis.lrange(key, start, stop);

// Sets
await redis.sadd(key, member);
await redis.srem(key, member);
await redis.smembers(key);
await redis.sismember(key, member);

// Sorted Sets
await redis.zadd(key, score, member);
await redis.zrange(key, start, stop);
await redis.zrevrange(key, start, stop);
await redis.zincrby(key, increment, member);

// General
await redis.del(key);
await redis.exists(key);
await redis.expire(key, seconds);
await redis.ttl(key);
```

### Data Type Selection Guide

| Use Case | Data Type | Example |
|----------|-----------|---------|
| Simple cache | String | User profile, API responses |
| Object data | Hash | User settings, recipe metadata |
| Recent items | List | Activity feed, recent views |
| Unique items | Set | Tags, user favorites |
| Rankings | Sorted Set | Leaderboards, popular items |
| Counters | String (INCR) | Page views, like counts |
| Sessions | Hash or String | User sessions |
| Queues | List | Job queues, notifications |

---

## Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Redis Memory Optimization](https://redis.io/docs/manual/memory-optimization/)
- [Redis Security](https://redis.io/docs/manual/security/)
- [Redis Monitoring](https://redis.io/docs/manual/admin/)

---

This reference provides comprehensive Redis patterns and best practices for building scalable, performant applications with proper caching, session management, and real-time features.