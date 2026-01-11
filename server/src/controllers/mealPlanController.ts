import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateShoppingListFromMeals } from '../services/shoppingListService';

export const getMealPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  // Verify user exists in database
  const userExists = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (!userExists) {
    throw createError('User not found. Please log in again.', 401);
  }

  const { weekStart } = req.query;

  // If weekStart is provided, get meal plan for specific week
  if (weekStart) {
    const weekStartDate = new Date(weekStart as string);
    
    // Try to find existing meal plan
    let mealPlan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: req.user.userId,
          weekStartDate
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

    // If no meal plan exists, create an empty one
    if (!mealPlan) {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId: req.user.userId,
          weekStartDate
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
    }

    return res.json({ mealPlan });
  }

  // Otherwise, get all meal plans for user
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

  // Verify all recipes exist (only for meals that have recipe IDs)
  const recipeIds = meals
    .filter((meal: any) => meal.recipeId) // Only include meals with valid recipe IDs
    .map((meal: any) => meal.recipeId);
  
  if (recipeIds.length > 0) {
    // Remove duplicates for validation - same recipe can be used multiple times
    const uniqueRecipeIds = [...new Set(recipeIds)];
    
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: uniqueRecipeIds } }
    });

    if (recipes.length !== uniqueRecipeIds.length) {
      // Find which recipe IDs are missing
      const foundRecipeIds = recipes.map(r => r.id);
      const missingRecipeIds = uniqueRecipeIds.filter(id => !foundRecipeIds.includes(id));
      throw createError(`Recipes not found: ${missingRecipeIds.join(', ')}`, 404);
    }
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

  if (!id) {
    throw createError('Meal plan ID is required', 400);
  }

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

  if (!id) {
    throw createError('Meal plan ID is required', 400);
  }

  // Verify user exists in database
  const userExists = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (!userExists) {
    throw createError('User not found. Please log in again.', 401);
  }

  // Check if meal plan exists and belongs to user
  let existingMealPlan = await prisma.mealPlan.findFirst({
    where: { 
      id,
      userId: req.user.userId 
    }
  });

  // If meal plan doesn't exist by ID, try to find by user and week start date
  if (!existingMealPlan) {
    existingMealPlan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: req.user.userId,
          weekStartDate: new Date(weekStartDate)
        }
      }
    });
  }

  // If still no meal plan exists, create a new one
  if (!existingMealPlan) {
    existingMealPlan = await prisma.mealPlan.create({
      data: {
        userId: req.user.userId,
        weekStartDate: new Date(weekStartDate)
      }
    });
  }

  // Verify all recipes exist (only for meals that have recipe IDs)
  const recipeIds = meals
    .filter((meal: any) => meal.recipeId) // Only include meals with valid recipe IDs
    .map((meal: any) => meal.recipeId);
  
  if (recipeIds.length > 0) {
    // Remove duplicates for validation - same recipe can be used multiple times
    const uniqueRecipeIds = [...new Set(recipeIds)];
    
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: uniqueRecipeIds } }
    });

    if (recipes.length !== uniqueRecipeIds.length) {
      // Find which recipe IDs are missing
      const foundRecipeIds = recipes.map(r => r.id);
      const missingRecipeIds = uniqueRecipeIds.filter(id => !foundRecipeIds.includes(id));
      throw createError(`Recipes not found: ${missingRecipeIds.join(', ')}`, 404);
    }
  }

  // Update meal plan using the existing meal plan's ID
  const updatedMealPlan = await prisma.mealPlan.update({
    where: { id: existingMealPlan.id },
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

  if (!id) {
    throw createError('Meal plan ID is required', 400);
  }

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

  if (!id) {
    throw createError('Meal plan ID is required', 400);
  }

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