import { prisma } from '../config/database';
import { ScalingService } from '../../../client/src/services/scalingService';

describe('Scaling Infrastructure Tests', () => {
  let userId: string;
  let recipeId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'scaling-infra-test@example.com',
        password: 'hashedpassword',
        name: 'Scaling Infrastructure Test User',
        householdSize: 4
      }
    });
    userId = user.id;

    // Create a test recipe
    const recipe = await prisma.recipe.create({
      data: {
        title: 'Test Recipe',
        description: 'A test recipe for scaling',
        cuisine: 'Test',
        cookTime: 30,
        servings: 4,
        difficulty: 'Easy',
        dietaryTags: [],
        instructions: ['Mix ingredients', 'Cook'],
        ingredients: {
          create: [
            {
              name: 'Flour',
              quantity: '2',
              unit: 'cups',
              category: 'Baking'
            },
            {
              name: 'Sugar',
              quantity: '1',
              unit: 'cup',
              category: 'Baking'
            }
          ]
        }
      }
    });
    recipeId = recipe.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.ingredient.deleteMany({
      where: { recipeId }
    });
    await prisma.recipe.deleteMany({
      where: { id: recipeId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  describe('Database Schema', () => {
    it('should have household size field in user table', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      expect(user).toBeDefined();
      expect(user?.householdSize).toBe(4);
    });

    it('should support manual serving override in meal plan items', async () => {
      // Create a meal plan with manual override
      const mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          weekStartDate: new Date('2024-01-01'),
          meals: {
            create: [
              {
                recipeId,
                dayOfWeek: 1,
                mealType: 'dinner',
                servings: 8,
                manualServingOverride: true
              }
            ]
          }
        }
      });

      const mealPlanItem = await prisma.mealPlanItem.findFirst({
        where: { mealPlanId: mealPlan.id }
      });

      expect(mealPlanItem).toBeDefined();
      expect(mealPlanItem?.servings).toBe(8);
      expect(mealPlanItem?.manualServingOverride).toBe(true);

      // Clean up
      await prisma.mealPlanItem.deleteMany({
        where: { mealPlanId: mealPlan.id }
      });
      await prisma.mealPlan.delete({
        where: { id: mealPlan.id }
      });
    });
  });

  describe('Scaling Service Integration', () => {
    it('should integrate with recipe data from database', async () => {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: true }
      });

      expect(recipe).toBeDefined();
      
      if (recipe) {
        const scalingService = new ScalingService();
        
        // Convert database recipe to frontend format
        const frontendRecipe = {
          id: recipe.id,
          name: recipe.title,
          description: recipe.description,
          prepTime: 15,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty as 'Easy' | 'Medium' | 'Hard',
          dietaryTags: recipe.dietaryTags,
          ingredients: recipe.ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category
          })),
          instructions: recipe.instructions,
          createdBy: userId
        };

        const scaledRecipe = scalingService.scaleRecipe(frontendRecipe, 2);
        
        expect(scaledRecipe.scalingFactor).toBe(2);
        expect(scaledRecipe.effectiveServings).toBe(8); // 4 * 2
        expect(scaledRecipe.scaledIngredients).toHaveLength(2);
        
        // Check that flour is scaled correctly
        const flourIngredient = scaledRecipe.scaledIngredients.find(ing => ing.name === 'Flour');
        expect(flourIngredient?.originalQuantity).toBe(2);
        expect(flourIngredient?.scaledQuantity).toBe(4);
      }
    });
  });
});