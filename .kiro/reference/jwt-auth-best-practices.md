# JWT Authentication Best Practices Reference

A comprehensive guide for implementing secure JWT authentication in the Shop & Chop application with Node.js and React.

---

## Table of Contents

1. [JWT Fundamentals](#1-jwt-fundamentals)
2. [Token Structure & Claims](#2-token-structure--claims)
3. [Secure Token Generation](#3-secure-token-generation)
4. [Token Storage & Management](#4-token-storage--management)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Integration](#6-frontend-integration)
7. [Refresh Token Strategy](#7-refresh-token-strategy)
8. [Security Best Practices](#8-security-best-practices)
9. [Error Handling](#9-error-handling)
10. [Testing](#10-testing)
11. [Monitoring & Logging](#11-monitoring--logging)
12. [Anti-Patterns](#12-anti-patterns)

---

## 1. JWT Fundamentals

### What is JWT?

JSON Web Token (JWT) is a compact, URL-safe means of representing claims between two parties. It consists of three parts separated by dots:

```
header.payload.signature
```

### JWT Structure

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516242622
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### When to Use JWT

**Good for:**
- Stateless authentication
- API authentication
- Single Sign-On (SSO)
- Information exchange
- Microservices communication

**Not ideal for:**
- Session management (use Redis sessions instead)
- Storing sensitive data
- Large amounts of data
- Frequently changing data

---

## 2. Token Structure & Claims

### Standard Claims

```javascript
const standardClaims = {
  // Registered claims
  iss: 'shop-and-chop',           // Issuer
  sub: '12345',                   // Subject (user ID)
  aud: 'shop-and-chop-app',       // Audience
  exp: 1234567890,                // Expiration time
  nbf: 1234567890,                // Not before
  iat: 1234567890,                // Issued at
  jti: 'unique-token-id',         // JWT ID
};
```

### Custom Claims for Shop & Chop

```javascript
const customClaims = {
  // User information
  userId: 12345,
  email: 'user@example.com',
  role: 'user', // 'admin', 'user', 'moderator'
  
  // Application-specific
  permissions: ['read:recipes', 'write:recipes', 'delete:own_recipes'],
  subscription: 'premium',
  preferences: {
    theme: 'dark',
    notifications: true
  },
  
  // Security
  tokenType: 'access', // 'access' or 'refresh'
  sessionId: 'session-uuid',
  
  // Metadata
  loginMethod: 'email', // 'email', 'google', 'facebook'
  deviceId: 'device-fingerprint',
  ipAddress: '192.168.1.1'
};
```

### Token Payload Design

```javascript
// Access Token Payload (minimal, short-lived)
const accessTokenPayload = {
  // Standard claims
  iss: 'shop-and-chop',
  sub: user.id.toString(),
  aud: 'shop-and-chop-app',
  exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  iat: Math.floor(Date.now() / 1000),
  jti: generateUniqueId(),
  
  // Minimal custom claims
  userId: user.id,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  tokenType: 'access',
  sessionId: sessionId
};

// Refresh Token Payload (minimal, long-lived)
const refreshTokenPayload = {
  iss: 'shop-and-chop',
  sub: user.id.toString(),
  aud: 'shop-and-chop-app',
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  iat: Math.floor(Date.now() / 1000),
  jti: generateUniqueId(),
  
  userId: user.id,
  tokenType: 'refresh',
  sessionId: sessionId
};
```

---

## 3. Secure Token Generation

### JWT Service Implementation

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    
    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets must be provided');
    }
  }

  generateTokenPair(user, sessionId = null) {
    const currentTime = Math.floor(Date.now() / 1000);
    const jwtId = this.generateJTI();
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
    }

    // Access token payload
    const accessPayload = {
      iss: 'shop-and-chop',
      sub: user.id.toString(),
      aud: 'shop-and-chop-app',
      iat: currentTime,
      jti: jwtId,
      
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      tokenType: 'access',
      sessionId: sessionId
    };

    // Refresh token payload
    const refreshPayload = {
      iss: 'shop-and-chop',
      sub: user.id.toString(),
      aud: 'shop-and-chop-app',
      iat: currentTime,
      jti: this.generateJTI(),
      
      userId: user.id,
      tokenType: 'refresh',
      sessionId: sessionId
    };

    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
      tokenType: 'Bearer'
    };
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        audience: 'shop-and-chop-app',
        issuer: 'shop-and-chop'
      });

      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        audience: 'shop-and-chop-app',
        issuer: 'shop-and-chop'
      });

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  generateJTI() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateSessionId() {
    return crypto.randomUUID();
  }

  parseExpiry(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }
}

module.exports = new JWTService();
```

### Environment Configuration

```bash
# .env
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-different-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Generate secure secrets
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Token Storage & Management

### Backend Token Storage

```javascript
class TokenManager {
  constructor(redis, jwtService) {
    this.redis = redis;
    this.jwtService = jwtService;
  }

  async storeRefreshToken(userId, refreshToken, sessionId) {
    const key = `refresh_token:${userId}:${sessionId}`;
    const decoded = this.jwtService.verifyRefreshToken(refreshToken);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    
    await this.redis.setex(key, ttl, refreshToken);
    
    // Store session metadata
    await this.redis.setex(`session:${sessionId}`, ttl, JSON.stringify({
      userId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      userAgent: null, // Set from request
      ipAddress: null  // Set from request
    }));
  }

  async getRefreshToken(userId, sessionId) {
    const key = `refresh_token:${userId}:${sessionId}`;
    return await this.redis.get(key);
  }

  async revokeRefreshToken(userId, sessionId) {
    const keys = [
      `refresh_token:${userId}:${sessionId}`,
      `session:${sessionId}`
    ];
    await this.redis.del(...keys);
  }

  async revokeAllUserTokens(userId) {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Also revoke sessions
    const sessionPattern = `session:*`;
    const sessionKeys = await this.redis.keys(sessionPattern);
    
    for (const key of sessionKeys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }

  async isTokenRevoked(jti) {
    return await this.redis.exists(`revoked_token:${jti}`);
  }

  async revokeToken(jti, exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`revoked_token:${jti}`, ttl, '1');
    }
  }

  async updateSessionActivity(sessionId, metadata = {}) {
    const key = `session:${sessionId}`;
    const sessionData = await this.redis.get(key);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastUsed = Date.now();
      
      if (metadata.userAgent) session.userAgent = metadata.userAgent;
      if (metadata.ipAddress) session.ipAddress = metadata.ipAddress;
      
      const ttl = await this.redis.ttl(key);
      await this.redis.setex(key, ttl, JSON.stringify(session));
    }
  }
}
```

### Frontend Token Storage

```javascript
// Token storage utility
class TokenStorage {
  constructor() {
    this.ACCESS_TOKEN_KEY = 'shop_chop_access_token';
    this.REFRESH_TOKEN_KEY = 'shop_chop_refresh_token';
    this.TOKEN_EXPIRY_KEY = 'shop_chop_token_expiry';
  }

  // Store tokens securely
  storeTokens(tokens) {
    try {
      // Store access token in memory (most secure)
      this.accessToken = tokens.accessToken;
      
      // Store refresh token in httpOnly cookie (if available) or localStorage
      if (this.canUseHttpOnlyCookies()) {
        // This would be set by the server in an httpOnly cookie
        // We don't store it client-side
      } else {
        // Fallback to localStorage (less secure)
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
      
      // Store expiry time
      const expiryTime = Date.now() + (tokens.expiresIn * 1000);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  getAccessToken() {
    return this.accessToken || null;
  }

  getRefreshToken() {
    if (this.canUseHttpOnlyCookies()) {
      // Refresh token is in httpOnly cookie, handled by browser
      return null;
    }
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isTokenExpired() {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    
    return Date.now() >= parseInt(expiryTime);
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    
    // Clear httpOnly cookie (if used) by calling logout endpoint
    if (this.canUseHttpOnlyCookies()) {
      // Server will clear the cookie
    }
  }

  canUseHttpOnlyCookies() {
    // Check if we're in a secure context and can use httpOnly cookies
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost';
  }
}

// React hook for token management
import { useState, useEffect, useCallback } from 'react';

const tokenStorage = new TokenStorage();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const token = tokenStorage.getAccessToken();
      
      if (token && !tokenStorage.isTokenExpired()) {
        setAccessToken(token);
        const userData = await fetchUserData(token);
        setUser(userData);
      } else if (!tokenStorage.isTokenExpired()) {
        // Try to refresh token
        await refreshToken();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Include cookies
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      tokenStorage.storeTokens(data.tokens);
      setAccessToken(data.tokens.accessToken);
      setUser(data.user);
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenStorage.clearTokens();
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      tokenStorage.storeTokens(data.tokens);
      setAccessToken(data.tokens.accessToken);
      
      return data.tokens.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  }, [logout]);

  return {
    user,
    accessToken,
    loading,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user
  };
}
```
---

## 5. Backend Implementation

### Authentication Routes

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const jwtService = require('../services/JWTService');
const tokenManager = require('../services/TokenManager');
const userService = require('../services/UserService');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

// Register validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 })
];

// Register endpoint
router.post('/register', authLimiter, registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await userService.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'user',
      permissions: ['read:recipes', 'write:own_recipes', 'delete:own_recipes']
    });

    // Generate tokens
    const tokens = jwtService.generateTokenPair(user);
    
    // Store refresh token
    await tokenManager.storeRefreshToken(user.id, tokens.refreshToken, tokens.sessionId);

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        tokens: {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', authLimiter, loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Generate tokens
    const tokens = jwtService.generateTokenPair(user);
    
    // Store refresh token
    await tokenManager.storeRefreshToken(user.id, tokens.refreshToken, tokens.sessionId);
    
    // Update session metadata
    await tokenManager.updateSessionActivity(tokens.sessionId, {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    await userService.updateLastLogin(user.id);

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        tokens: {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Check if token is stored (not revoked)
    const storedToken = await tokenManager.getRefreshToken(decoded.userId, decoded.sessionId);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Get user
    const user = await userService.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Generate new tokens
    const tokens = jwtService.generateTokenPair(user, decoded.sessionId);
    
    // Update stored refresh token
    await tokenManager.storeRefreshToken(user.id, tokens.refreshToken, tokens.sessionId);
    
    // Update session activity
    await tokenManager.updateSessionActivity(tokens.sessionId, {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    // Set new httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = jwtService.verifyRefreshToken(refreshToken);
        await tokenManager.revokeRefreshToken(decoded.userId, decoded.sessionId);
      } catch (error) {
        // Token might be invalid, but we still want to clear the cookie
        console.warn('Error revoking refresh token:', error.message);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Logout from all devices
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await tokenManager.revokeAllUserTokens(req.user.userId);
    
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Authentication Middleware

```javascript
const jwtService = require('../services/JWTService');
const tokenManager = require('../services/TokenManager');
const userService = require('../services/UserService');
const { AppError } = require('../utils/errors');

// Main authentication middleware
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Check if token is revoked
    const isRevoked = await tokenManager.isTokenRevoked(decoded.jti);
    if (isRevoked) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }

    // Get user (optional - for fresh user data)
    const user = await userService.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Attach user info to request
    req.user = {
      ...decoded,
      userData: user.toPublicJSON()
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else {
      next(error);
    }
  }
}

// Optional authentication (doesn't fail if no token)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(token);
    
    // Check if token is revoked
    const isRevoked = await tokenManager.isTokenRevoked(decoded.jti);
    if (!isRevoked) {
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Ignore token errors in optional auth
    next();
  }
}

// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Permission-based authorization
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Resource ownership check
function requireOwnership(getResourceUserId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceUserId = await getResourceUserId(req);
      
      if (req.user.userId !== resourceUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requirePermission,
  requireOwnership
};
```

---

## 6. Frontend Integration

### API Client with Token Management

```javascript
class APIClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    this.tokenStorage = new TokenStorage();
    this.refreshPromise = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include', // Include cookies
      ...options
    };

    // Add authorization header if token exists
    const token = this.tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, config);

      // Handle token expiration
      if (response.status === 401 && token) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry request with new token
          config.headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, config);
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new APIError(error.error || 'Request failed', response.status, error);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0, error);
    }
  }

  async handleTokenRefresh() {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshToken();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.tokenStorage.storeTokens(data.data.tokens);
      
      return data.data.tokens.accessToken;
    } catch (error) {
      // Refresh failed, redirect to login
      this.tokenStorage.clearTokens();
      window.location.href = '/login';
      return null;
    }
  }

  // HTTP methods
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

export const apiClient = new APIClient();
```

### Protected Route Component

```jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return <div className="error-message">Access denied: Insufficient role</div>;
  }

  // Check permission requirement
  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return <div className="error-message">Access denied: Insufficient permissions</div>;
  }

  return children;
}

// Usage examples
export function AdminRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}

export function RecipeEditRoute({ children }) {
  return (
    <ProtectedRoute requiredPermission="write:recipes">
      {children}
    </ProtectedRoute>
  );
}
```

### Automatic Token Refresh

```jsx
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useTokenRefresh() {
  const { accessToken, refreshToken, logout } = useAuth();
  const refreshTimeoutRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    // Decode token to get expiry
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiryTime = tokenPayload.exp * 1000;
    const currentTime = Date.now();
    
    // Refresh 5 minutes before expiry
    const refreshTime = expiryTime - currentTime - (5 * 60 * 1000);

    if (refreshTime > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Auto refresh failed:', error);
          logout();
        }
      }, refreshTime);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [accessToken, refreshToken, logout]);
}

// Use in App component
function App() {
  useTokenRefresh();
  
  return (
    <Router>
      {/* Your app routes */}
    </Router>
  );
}
```

---

## 7. Refresh Token Strategy

### Refresh Token Rotation

```javascript
class RefreshTokenRotation {
  constructor(jwtService, tokenManager) {
    this.jwtService = jwtService;
    this.tokenManager = tokenManager;
  }

  async refreshTokens(refreshToken) {
    try {
      // Verify current refresh token
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);
      
      // Check if token exists in storage
      const storedToken = await this.tokenManager.getRefreshToken(
        decoded.userId, 
        decoded.sessionId
      );
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await userService.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      // Generate new token pair
      const newTokens = this.jwtService.generateTokenPair(user, decoded.sessionId);
      
      // Store new refresh token and revoke old one
      await this.tokenManager.storeRefreshToken(
        user.id, 
        newTokens.refreshToken, 
        newTokens.sessionId
      );
      
      // Revoke old refresh token
      await this.tokenManager.revokeToken(decoded.jti, decoded.exp);

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      // If refresh fails, revoke the token to prevent reuse
      try {
        const decoded = this.jwtService.verifyRefreshToken(refreshToken);
        await this.tokenManager.revokeRefreshToken(decoded.userId, decoded.sessionId);
      } catch (revokeError) {
        console.error('Failed to revoke invalid refresh token:', revokeError);
      }
      
      throw error;
    }
  }
}
```

### Sliding Session

```javascript
class SlidingSession {
  constructor(jwtService, tokenManager) {
    this.jwtService = jwtService;
    this.tokenManager = tokenManager;
    this.slidingWindow = 30 * 60; // 30 minutes
  }

  async handleRequest(req, res, next) {
    const token = this.extractToken(req);
    
    if (!token) {
      return next();
    }

    try {
      const decoded = this.jwtService.verifyAccessToken(token);
      const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      
      // If token expires within sliding window, issue new one
      if (timeUntilExpiry < this.slidingWindow) {
        const user = await userService.findById(decoded.userId);
        if (user && user.status === 'active') {
          const newTokens = this.jwtService.generateTokenPair(user, decoded.sessionId);
          
          // Send new token in response header
          res.set('X-New-Token', newTokens.accessToken);
          
          // Update stored refresh token
          await this.tokenManager.storeRefreshToken(
            user.id,
            newTokens.refreshToken,
            newTokens.sessionId
          );
        }
      }

      req.user = decoded;
      next();
    } catch (error) {
      next();
    }
  }

  extractToken(req) {
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
  }
}
```

---

## 8. Security Best Practices

### Token Security Measures

```javascript
class TokenSecurity {
  constructor() {
    this.suspiciousActivityThreshold = 5;
    this.maxConcurrentSessions = 10;
  }

  // Detect suspicious token usage
  async detectSuspiciousActivity(userId, sessionId, metadata) {
    const key = `suspicious_activity:${userId}`;
    const activities = await redis.lrange(key, 0, -1);
    
    const recentActivities = activities
      .map(activity => JSON.parse(activity))
      .filter(activity => Date.now() - activity.timestamp < 60000); // Last minute
    
    // Check for multiple IPs
    const uniqueIPs = new Set(recentActivities.map(a => a.ipAddress));
    if (uniqueIPs.size > 3) {
      await this.flagSuspiciousActivity(userId, 'multiple_ips', metadata);
    }
    
    // Check for rapid requests from different locations
    const rapidRequests = recentActivities.filter(
      activity => activity.sessionId !== sessionId
    );
    
    if (rapidRequests.length > this.suspiciousActivityThreshold) {
      await this.flagSuspiciousActivity(userId, 'rapid_requests', metadata);
    }
    
    // Store current activity
    await redis.lpush(key, JSON.stringify({
      sessionId,
      timestamp: Date.now(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    }));
    
    await redis.ltrim(key, 0, 99); // Keep last 100 activities
    await redis.expire(key, 3600); // Expire after 1 hour
  }

  async flagSuspiciousActivity(userId, type, metadata) {
    console.warn(`Suspicious activity detected for user ${userId}: ${type}`, metadata);
    
    // Store alert
    await redis.setex(`security_alert:${userId}:${Date.now()}`, 86400, JSON.stringify({
      type,
      metadata,
      timestamp: Date.now()
    }));
    
    // Optionally revoke all sessions
    if (type === 'multiple_ips') {
      await tokenManager.revokeAllUserTokens(userId);
    }
  }

  // Limit concurrent sessions
  async checkConcurrentSessions(userId) {
    const pattern = `session:*`;
    const sessionKeys = await redis.keys(pattern);
    
    let userSessions = 0;
    for (const key of sessionKeys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          userSessions++;
        }
      }
    }
    
    if (userSessions >= this.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions exceeded');
    }
  }

  // Validate token binding
  validateTokenBinding(token, request) {
    const decoded = jwt.decode(token);
    
    // Check IP binding (if enabled)
    if (decoded.ipAddress && decoded.ipAddress !== request.ip) {
      throw new Error('Token IP binding validation failed');
    }
    
    // Check user agent binding (if enabled)
    if (decoded.userAgent && decoded.userAgent !== request.get('User-Agent')) {
      throw new Error('Token user agent binding validation failed');
    }
  }

  // Generate secure random secrets
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Validate secret strength
  validateSecretStrength(secret) {
    if (secret.length < 32) {
      throw new Error('Secret must be at least 32 characters long');
    }
    
    if (!/[a-z]/.test(secret) || !/[A-Z]/.test(secret) || !/[0-9]/.test(secret)) {
      throw new Error('Secret must contain uppercase, lowercase, and numeric characters');
    }
  }
}
```

### CSRF Protection

```javascript
// CSRF token generation and validation
class CSRFProtection {
  constructor() {
    this.secret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  }

  generateCSRFToken(sessionId) {
    const timestamp = Date.now().toString();
    const data = `${sessionId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return `${timestamp}.${signature}`;
  }

  validateCSRFToken(token, sessionId) {
    if (!token || !sessionId) {
      return false;
    }

    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) {
      return false;
    }

    // Check token age (valid for 1 hour)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) {
      return false;
    }

    // Verify signature
    const data = `${sessionId}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  middleware() {
    return (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const token = req.headers['x-csrf-token'] || req.body._csrf;
      const sessionId = req.user?.sessionId;

      if (!this.validateCSRFToken(token, sessionId)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid CSRF token'
        });
      }

      next();
    };
  }
}

// Usage
const csrfProtection = new CSRFProtection();

// Add CSRF token to authenticated responses
app.use('/api', authenticate, (req, res, next) => {
  if (req.user) {
    const csrfToken = csrfProtection.generateCSRFToken(req.user.sessionId);
    res.set('X-CSRF-Token', csrfToken);
  }
  next();
});

// Protect state-changing operations
app.use('/api', csrfProtection.middleware());
```
---

## 9. Error Handling

### Authentication Error Types

```javascript
class AuthenticationError extends Error {
  constructor(message, code, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class AuthorizationError extends Error {
  constructor(message, code, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Specific error types
const AuthErrors = {
  TOKEN_MISSING: new AuthenticationError('Access token required', 'TOKEN_MISSING'),
  TOKEN_INVALID: new AuthenticationError('Invalid token', 'TOKEN_INVALID'),
  TOKEN_EXPIRED: new AuthenticationError('Token expired', 'TOKEN_EXPIRED'),
  TOKEN_REVOKED: new AuthenticationError('Token has been revoked', 'TOKEN_REVOKED'),
  REFRESH_TOKEN_INVALID: new AuthenticationError('Invalid refresh token', 'REFRESH_TOKEN_INVALID'),
  USER_NOT_FOUND: new AuthenticationError('User not found', 'USER_NOT_FOUND'),
  USER_INACTIVE: new AuthenticationError('User account is inactive', 'USER_INACTIVE'),
  INSUFFICIENT_PERMISSIONS: new AuthorizationError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS'),
  ROLE_REQUIRED: new AuthorizationError('Required role not found', 'ROLE_REQUIRED'),
  RESOURCE_ACCESS_DENIED: new AuthorizationError('Access to resource denied', 'RESOURCE_ACCESS_DENIED')
};
```

### Error Handler Middleware

```javascript
function authErrorHandler(error, req, res, next) {
  // JWT library errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      expiredAt: error.expiredAt
    });
  }

  if (error.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      error: 'Token not active',
      code: 'TOKEN_NOT_ACTIVE',
      date: error.date
    });
  }

  // Custom authentication errors
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }

  // Pass other errors to general error handler
  next(error);
}
```

### Frontend Error Handling

```javascript
class AuthErrorHandler {
  constructor(authService) {
    this.authService = authService;
  }

  handleAuthError(error) {
    switch (error.code) {
      case 'TOKEN_EXPIRED':
        return this.handleTokenExpired();
      
      case 'TOKEN_INVALID':
      case 'TOKEN_REVOKED':
        return this.handleInvalidToken();
      
      case 'REFRESH_TOKEN_INVALID':
        return this.handleRefreshTokenInvalid();
      
      case 'USER_INACTIVE':
        return this.handleUserInactive();
      
      case 'INSUFFICIENT_PERMISSIONS':
        return this.handleInsufficientPermissions();
      
      default:
        return this.handleGenericAuthError(error);
    }
  }

  async handleTokenExpired() {
    try {
      await this.authService.refreshToken();
      return { retry: true };
    } catch (refreshError) {
      return this.handleRefreshTokenInvalid();
    }
  }

  handleInvalidToken() {
    this.authService.logout();
    return {
      redirect: '/login',
      message: 'Your session has expired. Please log in again.'
    };
  }

  handleRefreshTokenInvalid() {
    this.authService.logout();
    return {
      redirect: '/login',
      message: 'Your session has expired. Please log in again.'
    };
  }

  handleUserInactive() {
    this.authService.logout();
    return {
      redirect: '/account-suspended',
      message: 'Your account has been suspended. Please contact support.'
    };
  }

  handleInsufficientPermissions() {
    return {
      redirect: '/unauthorized',
      message: 'You do not have permission to access this resource.'
    };
  }

  handleGenericAuthError(error) {
    console.error('Authentication error:', error);
    return {
      message: 'An authentication error occurred. Please try again.'
    };
  }
}

// React error boundary for auth errors
class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.authErrorHandler = new AuthErrorHandler(props.authService);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.isAuthError(error)) {
      const result = this.authErrorHandler.handleAuthError(error);
      
      if (result.redirect) {
        window.location.href = result.redirect;
      }
      
      if (result.retry) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  isAuthError(error) {
    return error instanceof AuthenticationError || 
           error instanceof AuthorizationError ||
           ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'REFRESH_TOKEN_INVALID'].includes(error.code);
  }

  render() {
    if (this.state.hasError && !this.isAuthError(this.state.error)) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 10. Testing

### JWT Service Tests

```javascript
const JWTService = require('../services/JWTService');
const jwt = require('jsonwebtoken');

describe('JWTService', () => {
  let jwtService;
  let mockUser;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
    
    jwtService = new JWTService();
    
    mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      permissions: ['read:recipes', 'write:own_recipes']
    };
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', () => {
      const tokens = jwtService.generateTokenPair(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('sessionId');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.tokenType).toBe('Bearer');

      // Verify access token
      const accessDecoded = jwt.verify(tokens.accessToken, process.env.JWT_ACCESS_SECRET);
      expect(accessDecoded.userId).toBe(mockUser.id);
      expect(accessDecoded.email).toBe(mockUser.email);
      expect(accessDecoded.tokenType).toBe('access');

      // Verify refresh token
      const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);
      expect(refreshDecoded.userId).toBe(mockUser.id);
      expect(refreshDecoded.tokenType).toBe('refresh');
    });

    it('should use provided session ID', () => {
      const sessionId = 'test-session-id';
      const tokens = jwtService.generateTokenPair(mockUser, sessionId);

      const accessDecoded = jwt.verify(tokens.accessToken, process.env.JWT_ACCESS_SECRET);
      const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);

      expect(accessDecoded.sessionId).toBe(sessionId);
      expect(refreshDecoded.sessionId).toBe(sessionId);
      expect(tokens.sessionId).toBe(sessionId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = jwtService.generateTokenPair(mockUser);
      const decoded = jwtService.verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.tokenType).toBe('access');
    });

    it('should reject invalid access token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid access token');
    });

    it('should reject refresh token as access token', () => {
      const tokens = jwtService.generateTokenPair(mockUser);
      
      expect(() => {
        jwtService.verifyAccessToken(tokens.refreshToken);
      }).toThrow('Invalid token type');
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, tokenType: 'access', exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_ACCESS_SECRET
      );

      expect(() => {
        jwtService.verifyAccessToken(expiredToken);
      }).toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = jwtService.generateTokenPair(mockUser);
      const decoded = jwtService.verifyRefreshToken(tokens.refreshToken);

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.tokenType).toBe('refresh');
    });

    it('should reject access token as refresh token', () => {
      const tokens = jwtService.generateTokenPair(mockUser);
      
      expect(() => {
        jwtService.verifyRefreshToken(tokens.accessToken);
      }).toThrow('Invalid token type');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const tokens = jwtService.generateTokenPair(mockUser);
      expect(jwtService.isTokenExpired(tokens.accessToken)).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_ACCESS_SECRET
      );
      expect(jwtService.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(jwtService.isTokenExpired('invalid-token')).toBe(true);
    });
  });
});
```

### Authentication Integration Tests

```javascript
const request = require('supertest');
const app = require('../app');
const { setupTestDB, cleanupTestDB } = require('./helpers/database');
const { createTestUser } = require('./helpers/users');

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
    });

    it('should validate password strength', async () => {
      const userData = {
        email: 'weak@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'Password'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'login@example.com',
        password: 'LoginPass123'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'LoginPass123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword'
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123'
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await createTestUser();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPass123'
        });

      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      refreshToken = cookies.find(cookie => cookie.startsWith('refreshToken='))
        .split('=')[1].split(';')[0];
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject request without refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await createTestUser();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPass123'
        });

      const cookies = loginResponse.headers['set-cookie'];
      refreshToken = cookies.find(cookie => cookie.startsWith('refreshToken='))
        .split('=')[1].split(';')[0];
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify refresh token is revoked
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await createTestUser();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPass123'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should access protected route with valid token', async () => {
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject access without token', async () => {
      await request(app)
        .get('/api/user/profile')
        .expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
```

---

## 11. Monitoring & Logging

### Authentication Logging

```javascript
const winston = require('winston');

class AuthLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'auth' },
      transports: [
        new winston.transports.File({ filename: 'logs/auth-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/auth.log' })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  logLogin(userId, success, metadata = {}) {
    this.logger.info('Login attempt', {
      event: 'login',
      userId,
      success,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  logLogout(userId, metadata = {}) {
    this.logger.info('User logout', {
      event: 'logout',
      userId,
      ipAddress: metadata.ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  logTokenRefresh(userId, success, metadata = {}) {
    this.logger.info('Token refresh', {
      event: 'token_refresh',
      userId,
      success,
      ipAddress: metadata.ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  logSecurityEvent(event, userId, details = {}) {
    this.logger.warn('Security event', {
      event,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logAuthError(error, metadata = {}) {
    this.logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}

const authLogger = new AuthLogger();

// Usage in authentication middleware
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    const decoded = jwtService.verifyAccessToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    authLogger.logAuthError(error, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

### Metrics Collection

```javascript
class AuthMetrics {
  constructor(redis) {
    this.redis = redis;
  }

  async recordLogin(userId, success) {
    const date = new Date().toISOString().split('T')[0];
    const key = `metrics:login:${date}`;
    
    await this.redis.hincrby(key, 'total', 1);
    await this.redis.hincrby(key, success ? 'successful' : 'failed', 1);
    await this.redis.expire(key, 30 * 24 * 60 * 60); // Keep for 30 days
    
    if (success) {
      await this.redis.sadd(`metrics:active_users:${date}`, userId);
      await this.redis.expire(`metrics:active_users:${date}`, 30 * 24 * 60 * 60);
    }
  }

  async recordTokenRefresh(userId, success) {
    const date = new Date().toISOString().split('T')[0];
    const key = `metrics:token_refresh:${date}`;
    
    await this.redis.hincrby(key, 'total', 1);
    await this.redis.hincrby(key, success ? 'successful' : 'failed', 1);
    await this.redis.expire(key, 30 * 24 * 60 * 60);
  }

  async recordSecurityEvent(event, userId) {
    const date = new Date().toISOString().split('T')[0];
    const key = `metrics:security:${date}`;
    
    await this.redis.hincrby(key, event, 1);
    await this.redis.expire(key, 30 * 24 * 60 * 60);
    
    // Track per user
    const userKey = `metrics:security:user:${userId}:${date}`;
    await this.redis.hincrby(userKey, event, 1);
    await this.redis.expire(userKey, 30 * 24 * 60 * 60);
  }

  async getLoginMetrics(days = 7) {
    const metrics = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const key = `metrics:login:${dateStr}`;
      const data = await this.redis.hgetall(key);
      
      metrics[dateStr] = {
        total: parseInt(data.total || 0),
        successful: parseInt(data.successful || 0),
        failed: parseInt(data.failed || 0),
        activeUsers: await this.redis.scard(`metrics:active_users:${dateStr}`)
      };
    }
    
    return metrics;
  }

  async getSecurityMetrics(days = 7) {
    const metrics = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const key = `metrics:security:${dateStr}`;
      const data = await this.redis.hgetall(key);
      
      metrics[dateStr] = data;
    }
    
    return metrics;
  }
}

// Metrics endpoint
app.get('/admin/metrics/auth', authenticate, authorize('admin'), async (req, res) => {
  try {
    const authMetrics = new AuthMetrics(redis);
    const days = parseInt(req.query.days) || 7;
    
    const loginMetrics = await authMetrics.getLoginMetrics(days);
    const securityMetrics = await authMetrics.getSecurityMetrics(days);
    
    res.json({
      success: true,
      data: {
        login: loginMetrics,
        security: securityMetrics
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 12. Anti-Patterns

### Common Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Storing sensitive data in JWT | Data exposure | Use minimal claims |
| Long-lived access tokens | Security risk | Short expiry (15 minutes) |
| No token rotation | Replay attacks | Implement refresh token rotation |
| Client-side secret storage | Security vulnerability | Use httpOnly cookies |
| No token revocation | Cannot invalidate sessions | Implement token blacklist |
| Weak secrets | Easy to crack | Use strong, random secrets |
| No rate limiting | Brute force attacks | Implement rate limiting |
| Ignoring token binding | Session hijacking | Bind tokens to IP/device |

### Code Examples

```javascript
// BAD: Storing sensitive data in JWT
const badPayload = {
  userId: 1,
  email: 'user@example.com',
  password: 'hashed-password', // Never store passwords!
  creditCard: '1234-5678-9012-3456', // Never store sensitive data!
  socialSecurityNumber: '123-45-6789' // Never!
};

// GOOD: Minimal payload
const goodPayload = {
  userId: 1,
  email: 'user@example.com',
  role: 'user',
  permissions: ['read:recipes']
};

// BAD: Long-lived access token
const badToken = jwt.sign(payload, secret, { expiresIn: '30d' }); // Too long!

// GOOD: Short-lived access token
const goodToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// BAD: Storing refresh token in localStorage
localStorage.setItem('refreshToken', refreshToken); // Vulnerable to XSS

// GOOD: httpOnly cookie (set by server)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// BAD: No token validation
app.get('/api/protected', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.decode(token); // No verification!
  res.json({ user: decoded });
});

// GOOD: Proper token validation
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// BAD: Weak secret
const weakSecret = 'secret'; // Too weak!

// GOOD: Strong secret
const strongSecret = crypto.randomBytes(64).toString('hex');

// BAD: No error handling
function verifyToken(token) {
  return jwt.verify(token, secret); // Will throw on invalid token
}

// GOOD: Proper error handling
function verifyToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token', 'TOKEN_INVALID');
    }
    throw error;
  }
}

// BAD: No rate limiting on auth endpoints
app.post('/api/auth/login', loginHandler);

// GOOD: Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

---

## Quick Reference

### JWT Claims

```javascript
// Standard claims
{
  iss: 'issuer',           // Who issued the token
  sub: 'subject',          // Subject (usually user ID)
  aud: 'audience',         // Intended audience
  exp: 1234567890,         // Expiration time
  nbf: 1234567890,         // Not before
  iat: 1234567890,         // Issued at
  jti: 'jwt-id'            // JWT ID (unique identifier)
}

// Custom claims
{
  userId: 123,
  email: 'user@example.com',
  role: 'user',
  permissions: ['read', 'write'],
  sessionId: 'session-uuid'
}
```

### Token Expiry Guidelines

| Token Type | Recommended Expiry | Use Case |
|------------|-------------------|----------|
| Access Token | 15 minutes | API requests |
| Refresh Token | 7 days | Token renewal |
| Password Reset | 1 hour | Password reset |
| Email Verification | 24 hours | Email verification |
| Remember Me | 30 days | Long-term sessions |

### Security Checklist

- [ ] Use strong, random secrets (64+ characters)
- [ ] Short-lived access tokens (15 minutes)
- [ ] Implement refresh token rotation
- [ ] Store refresh tokens securely (httpOnly cookies)
- [ ] Implement token revocation
- [ ] Add rate limiting to auth endpoints
- [ ] Log authentication events
- [ ] Validate all tokens properly
- [ ] Use HTTPS in production
- [ ] Implement CSRF protection
- [ ] Monitor for suspicious activity
- [ ] Regular security audits

---

## Resources

- [JWT.io](https://jwt.io/) - JWT debugger and library list
- [RFC 7519](https://tools.ietf.org/html/rfc7519) - JSON Web Token specification
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Node.js jsonwebtoken library](https://github.com/auth0/node-jsonwebtoken)

---

This reference provides comprehensive JWT authentication patterns and security best practices for building secure, scalable authentication systems in modern web applications.