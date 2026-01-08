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