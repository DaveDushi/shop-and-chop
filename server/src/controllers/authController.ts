import { Response } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { 
    name, 
    email, 
    password, 
    householdSize = 2, 
    dietaryRestrictions = [], 
    favoriteCuisines = [] 
  } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      householdSize,
      dietaryRestrictions,
      favoriteCuisines
    },
    select: {
      id: true,
      name: true,
      email: true,
      householdSize: true,
      dietaryRestrictions: true,
      favoriteCuisines: true,
      createdAt: true
    }
  });

  // Generate JWT token
  const token = generateToken({ userId: user.id, email: user.email });

  res.status(201).json({
    message: 'User registered successfully',
    user,
    token
  });
});

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw createError('Invalid email or password', 401);
  }

  // Generate JWT token
  const token = generateToken({ userId: user.id, email: user.email });

  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      householdSize: true,
      dietaryRestrictions: true,
      favoriteCuisines: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { name, householdSize, dietaryRestrictions, favoriteCuisines } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      ...(name && { name }),
      ...(householdSize && { householdSize }),
      ...(dietaryRestrictions && { dietaryRestrictions }),
      ...(favoriteCuisines && { favoriteCuisines })
    },
    select: {
      id: true,
      name: true,
      email: true,
      householdSize: true,
      dietaryRestrictions: true,
      favoriteCuisines: true,
      updatedAt: true
    }
  });

  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  });
});