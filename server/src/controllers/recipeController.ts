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

  if (showUserRecipesOnly === 'true') {
    if (!userId) {
      // User must be authenticated to filter their own recipes
      throw createError('Authentication required to view your recipes', 401);
    }
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
    owner: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
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

export const createRecipe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const userId = req.user.userId;
  const {
    title,
    description,
    cuisine,
    cookTime,
    servings,
    difficulty,
    dietaryTags,
    ingredients,
    instructions
  } = req.body;

  // Validate required fields
  if (!title || !cuisine || !cookTime || !servings || !difficulty) {
    throw createError('Missing required fields: title, cuisine, cookTime, servings, difficulty', 400);
  }

  // Validate difficulty
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!validDifficulties.includes(difficulty)) {
    throw createError('Invalid difficulty. Must be Easy, Medium, or Hard', 400);
  }

  // Parse ingredients and instructions if they're strings
  let parsedIngredients;
  let parsedInstructions;
  let parsedDietaryTags;

  try {
    parsedIngredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
    parsedInstructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
    parsedDietaryTags = typeof dietaryTags === 'string' ? JSON.parse(dietaryTags) : (dietaryTags || []);
  } catch (error) {
    throw createError('Invalid JSON format for ingredients, instructions, or dietaryTags', 400);
  }

  // Validate ingredients
  if (!Array.isArray(parsedIngredients) || parsedIngredients.length === 0) {
    throw createError('At least one ingredient is required', 400);
  }

  // Validate instructions
  if (!Array.isArray(parsedInstructions) || parsedInstructions.length === 0) {
    throw createError('At least one instruction is required', 400);
  }

  // Handle image upload
  let imageUrl: string | undefined;
  if (req.file) {
    // Store relative path for the image
    imageUrl = `/uploads/recipes/${req.file.filename}`;
  }

  // Create recipe with ingredients
  const recipe = await prisma.recipe.create({
    data: {
      title,
      description: description || null,
      cuisine,
      cookTime: parseInt(cookTime, 10),
      servings: parseInt(servings, 10),
      difficulty,
      dietaryTags: parsedDietaryTags,
      instructions: parsedInstructions,
      imageUrl,
      userId,
      ingredients: {
        create: parsedIngredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit || '',
          category: ing.category || 'Other'
        }))
      }
    },
    include: {
      ingredients: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Recipe created successfully',
    recipe
  });
});

export const updateRecipe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id: recipeId } = req.params;
  const userId = req.user.userId;

  // Check if recipe exists and user owns it
  const existingRecipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: true }
  });

  if (!existingRecipe) {
    throw createError('Recipe not found', 404);
  }

  if (existingRecipe.userId !== userId) {
    throw createError('You do not have permission to edit this recipe', 403);
  }

  const {
    title,
    description,
    cuisine,
    cookTime,
    servings,
    difficulty,
    dietaryTags,
    ingredients,
    instructions
  } = req.body;

  // Validate difficulty if provided
  if (difficulty) {
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!validDifficulties.includes(difficulty)) {
      throw createError('Invalid difficulty. Must be Easy, Medium, or Hard', 400);
    }
  }

  // Parse ingredients and instructions if they're strings
  let parsedIngredients;
  let parsedInstructions;
  let parsedDietaryTags;

  try {
    parsedIngredients = ingredients ? (typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients) : undefined;
    parsedInstructions = instructions ? (typeof instructions === 'string' ? JSON.parse(instructions) : instructions) : undefined;
    parsedDietaryTags = dietaryTags ? (typeof dietaryTags === 'string' ? JSON.parse(dietaryTags) : dietaryTags) : undefined;
  } catch (error) {
    throw createError('Invalid JSON format for ingredients, instructions, or dietaryTags', 400);
  }

  // Handle image upload
  let imageUrl: string | undefined = existingRecipe.imageUrl || undefined;
  if (req.file) {
    // Store relative path for the new image
    imageUrl = `/uploads/recipes/${req.file.filename}`;
    
    // TODO: Delete old image file if it exists
    // This would require file system operations to clean up old images
  }

  // Build update data object
  const updateData: any = {
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(cuisine && { cuisine }),
    ...(cookTime && { cookTime: parseInt(cookTime, 10) }),
    ...(servings && { servings: parseInt(servings, 10) }),
    ...(difficulty && { difficulty }),
    ...(parsedDietaryTags && { dietaryTags: parsedDietaryTags }),
    ...(parsedInstructions && { instructions: parsedInstructions }),
    ...(imageUrl && { imageUrl })
  };

  // Handle ingredients update if provided
  if (parsedIngredients) {
    // Delete existing ingredients and create new ones
    updateData.ingredients = {
      deleteMany: {},
      create: parsedIngredients.map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit || '',
        category: ing.category || 'Other'
      }))
    };
  }

  // Update recipe
  const updatedRecipe = await prisma.recipe.update({
    where: { id: recipeId },
    data: updateData,
    include: {
      ingredients: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.json({
    message: 'Recipe updated successfully',
    recipe: updatedRecipe
  });
});

export const deleteRecipe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id: recipeId } = req.params;
  const userId = req.user.userId;

  // Check if recipe exists and user owns it
  const existingRecipe = await prisma.recipe.findUnique({
    where: { id: recipeId }
  });

  if (!existingRecipe) {
    throw createError('Recipe not found', 404);
  }

  if (existingRecipe.userId !== userId) {
    throw createError('You do not have permission to delete this recipe', 403);
  }

  // Delete recipe (ingredients will be cascade deleted)
  await prisma.recipe.delete({
    where: { id: recipeId }
  });

  // TODO: Delete image file if it exists
  // This would require file system operations to clean up the image

  res.json({
    message: 'Recipe deleted successfully'
  });
});