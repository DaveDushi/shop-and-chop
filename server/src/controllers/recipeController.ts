import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const getRecipes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { 
    search, 
    cuisine, 
    difficulty, 
    dietaryTags, 
    maxCookTime,
    showFavoritesOnly,
    showUserRecipesOnly,
    page = '1',
    limit = '20'
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  if (cuisine) {
    where.cuisine = { equals: cuisine as string, mode: 'insensitive' };
  }

  if (difficulty) {
    where.difficulty = difficulty as string;
  }

  if (dietaryTags) {
    const tags = Array.isArray(dietaryTags) ? dietaryTags : [dietaryTags];
    where.dietaryTags = { hasSome: tags as string[] };
  }

  if (maxCookTime) {
    where.cookTime = { lte: parseInt(maxCookTime as string, 10) };
  }

  // Handle user-specific filters (requires authentication)
  const userId = req.user?.userId;

  if (showUserRecipesOnly === 'true' && userId) {
    where.userId = userId;
  }

  // If showing favorites only, modify the where clause
  if (showFavoritesOnly === 'true' && userId) {
    where.favoritedBy = {
      some: { id: userId }
    };
  }

  // Build include clause
  const includeClause: any = {
    ingredients: true,
    _count: {
      select: { favoritedBy: true }
    }
  };

  // If user is authenticated, include their favorite status for each recipe
  if (userId) {
    includeClause.favoritedBy = {
      where: { id: userId },
      select: { id: true }
    };
  }

  // Get recipes with pagination
  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.recipe.count({ where })
  ]);

  // Transform recipes to include favorite status
  const recipesWithFavoriteStatus = recipes.map((recipe: any) => {
    // Check if the current user has favorited this recipe
    // The favoritedBy array will contain the user if they favorited it, empty array if not
    const isFavorited = userId && recipe.favoritedBy && recipe.favoritedBy.length > 0;
    
    return {
      ...recipe,
      isFavorited: Boolean(isFavorited),
      favoriteCount: recipe['_count']?.favoritedBy || 0
    };
  });

  res.json({
    recipes: recipesWithFavoriteStatus,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

export const getRecipeById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw createError('Recipe ID is required', 400);
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: true,
      _count: {
        select: { favoritedBy: true }
      }
    }
  });

  if (!recipe) {
    throw createError('Recipe not found', 404);
  }

  res.json({ recipe });
});

export const toggleFavoriteRecipe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id: recipeId } = req.params;
  const userId = req.user.userId;

  if (!recipeId) {
    throw createError('Recipe ID is required', 400);
  }

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  // Check if recipe exists
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId }
  });

  if (!recipe) {
    throw createError('Recipe not found', 404);
  }

  // Check if already favorited
  const existingFavorite = await prisma.user.findFirst({
    where: {
      id: userId,
      favoriteRecipes: {
        some: { id: recipeId }
      }
    }
  });

  let isFavorited: boolean;

  if (existingFavorite) {
    // Remove from favorites
    await prisma.user.update({
      where: { id: userId },
      data: {
        favoriteRecipes: {
          disconnect: { id: recipeId }
        }
      }
    });
    isFavorited = false;
  } else {
    // Add to favorites
    await prisma.user.update({
      where: { id: userId },
      data: {
        favoriteRecipes: {
          connect: { id: recipeId }
        }
      }
    });
    isFavorited = true;
  }

  res.json({
    message: isFavorited ? 'Recipe added to favorites' : 'Recipe removed from favorites',
    isFavorited
  });
});