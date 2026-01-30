import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const getFavoriteRecipes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      favoriteRecipes: {
        include: {
          ingredients: true,
          _count: {
            select: { favoritedBy: true }
          }
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ 
    favoriteRecipes: user.favoriteRecipes 
  });
});

// User profile and preferences management
export const getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  res.json(user);
});

export const updateCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { name, householdSize, dietaryRestrictions, favoriteCuisines } = req.body;

  // Validate household size if provided
  if (householdSize !== undefined) {
    if (typeof householdSize !== 'number' || !Number.isInteger(householdSize)) {
      throw createError('Household size must be a whole number', 400);
    }
    if (householdSize < 1 || householdSize > 20) {
      throw createError('Household size must be between 1 and 20', 400);
    }
  }

  // Validate dietary restrictions if provided
  if (dietaryRestrictions !== undefined && !Array.isArray(dietaryRestrictions)) {
    throw createError('Dietary restrictions must be an array', 400);
  }

  // Validate favorite cuisines if provided
  if (favoriteCuisines !== undefined && !Array.isArray(favoriteCuisines)) {
    throw createError('Favorite cuisines must be an array', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      ...(name && { name }),
      ...(householdSize !== undefined && { householdSize }),
      ...(dietaryRestrictions !== undefined && { dietaryRestrictions }),
      ...(favoriteCuisines !== undefined && { favoriteCuisines })
    },
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

  res.json({
    message: 'User profile updated successfully',
    user: updatedUser
  });
});

export const getUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      householdSize: true,
      dietaryRestrictions: true,
      favoriteCuisines: true
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json(user);
});

export const updateUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { householdSize, dietaryRestrictions, favoriteCuisines } = req.body;

  // Validate household size if provided
  if (householdSize !== undefined) {
    if (typeof householdSize !== 'number' || !Number.isInteger(householdSize)) {
      throw createError('Household size must be a whole number', 400);
    }
    if (householdSize < 1 || householdSize > 20) {
      throw createError('Household size must be between 1 and 20', 400);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      ...(householdSize !== undefined && { householdSize }),
      ...(dietaryRestrictions !== undefined && { dietaryRestrictions }),
      ...(favoriteCuisines !== undefined && { favoriteCuisines })
    },
    select: {
      householdSize: true,
      dietaryRestrictions: true,
      favoriteCuisines: true
    }
  });

  res.json({
    message: 'User preferences updated successfully',
    preferences: updatedUser
  });
});