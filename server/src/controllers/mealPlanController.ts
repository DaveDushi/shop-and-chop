import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateShoppingListFromMeals } from '../services/shoppingListService';

export const getMealPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where: { userId: req.user.userId },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          }
        }
      }
    },
    orderBy: { weekStartDate: 'desc' }
  });

  res.json({ mealPlans });
});

export const createMealPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { weekStartDate, meals } = req.body;
  const userId = req.user.userId;

  // Check if meal plan already exists for this week
  const existingMealPlan = await prisma.mealPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate: new Date(weekStartDate)
      }
    }
  });

  if (existingMealPlan) {
    throw createError('Meal plan already exists for this week', 409);
  }

  // Verify all recipes exist
  const recipeIds = meals.map((meal: any) => meal.recipeId);
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } }
  });

  if (recipes.length !== recipeIds.length) {
    throw createError('One or more recipes not found', 404);
  }

  // Create meal plan with meals
  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId,
      weekStartDate: new Date(weekStartDate),
      meals: {
        create: meals.map((meal: any) => ({
          recipeId: meal.recipeId,
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
          servings: meal.servings || 1
        }))
      }
    },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          }
        }
      }
    }
  });

  res.status(201).json({
    message: 'Meal plan created successfully',
    mealPlan
  });
});

export const getMealPlanById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  const mealPlan = await prisma.mealPlan.findFirst({
    where: { 
      id,
      userId: req.user.userId 
    },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          }
        }
      }
    }
  });

  if (!mealPlan) {
    throw createError('Meal plan not found', 404);
  }

  res.json({ mealPlan });
});

export const updateMealPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { weekStartDate, meals } = req.body;

  // Check if meal plan exists and belongs to user
  const existingMealPlan = await prisma.mealPlan.findFirst({
    where: { 
      id,
      userId: req.user.userId 
    }
  });

  if (!existingMealPlan) {
    throw createError('Meal plan not found', 404);
  }

  // Verify all recipes exist
  const recipeIds = meals.map((meal: any) => meal.recipeId);
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } }
  });

  if (recipes.length !== recipeIds.length) {
    throw createError('One or more recipes not found', 404);
  }

  // Update meal plan
  const updatedMealPlan = await prisma.mealPlan.update({
    where: { id },
    data: {
      weekStartDate: new Date(weekStartDate),
      meals: {
        deleteMany: {}, // Remove all existing meals
        create: meals.map((meal: any) => ({
          recipeId: meal.recipeId,
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
          servings: meal.servings || 1
        }))
      }
    },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          }
        }
      }
    }
  });

  res.json({
    message: 'Meal plan updated successfully',
    mealPlan: updatedMealPlan
  });
});

export const deleteMealPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  // Check if meal plan exists and belongs to user
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { 
      id,
      userId: req.user.userId 
    }
  });

  if (!mealPlan) {
    throw createError('Meal plan not found', 404);
  }

  await prisma.mealPlan.delete({
    where: { id }
  });

  res.json({ message: 'Meal plan deleted successfully' });
});

export const generateShoppingList = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  // Get meal plan with all meals and ingredients
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { 
      id,
      userId: req.user.userId 
    },
    include: {
      user: true,
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          }
        }
      }
    }
  });

  if (!mealPlan) {
    throw createError('Meal plan not found', 404);
  }

  // Generate shopping list
  const shoppingList = generateShoppingListFromMeals(mealPlan.meals, mealPlan.user.householdSize);

  res.json({ 
    shoppingList,
    mealPlanId: id,
    weekStartDate: mealPlan.weekStartDate
  });
});