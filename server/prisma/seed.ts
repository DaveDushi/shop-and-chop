import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const sampleRecipes = [
  {
    title: "Classic Spaghetti Carbonara",
    description: "Creamy Italian pasta dish with eggs, cheese, and pancetta",
    cuisine: "Italian",
    cookTime: 20,
    servings: 4,
    difficulty: "Medium",
    dietaryTags: [],
    instructions: [
      "Cook spaghetti according to package directions",
      "Fry pancetta until crispy",
      "Whisk eggs with parmesan cheese",
      "Toss hot pasta with egg mixture and pancetta",
      "Season with black pepper and serve immediately"
    ],
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400",
    ingredients: [
      { name: "Spaghetti", quantity: "1", unit: "lb", category: "Grains & Bread" },
      { name: "Pancetta", quantity: "6", unit: "oz", category: "Meat & Seafood" },
      { name: "Eggs", quantity: "4", unit: "large", category: "Dairy & Eggs" },
      { name: "Parmesan cheese", quantity: "1", unit: "cup", category: "Dairy & Eggs" },
      { name: "Black pepper", quantity: "1", unit: "tsp", category: "Pantry" }
    ]
  },
  {
    title: "Grilled Chicken Caesar Salad",
    description: "Fresh romaine lettuce with grilled chicken and classic Caesar dressing",
    cuisine: "American",
    cookTime: 25,
    servings: 2,
    difficulty: "Easy",
    dietaryTags: ["gluten-free"],
    instructions: [
      "Season and grill chicken breasts",
      "Wash and chop romaine lettuce",
      "Make Caesar dressing with anchovies, garlic, and lemon",
      "Toss lettuce with dressing",
      "Top with sliced chicken and parmesan"
    ],
    imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
    ingredients: [
      { name: "Chicken breast", quantity: "2", unit: "pieces", category: "Meat & Seafood" },
      { name: "Romaine lettuce", quantity: "2", unit: "heads", category: "Produce" },
      { name: "Parmesan cheese", quantity: "1/2", unit: "cup", category: "Dairy & Eggs" },
      { name: "Anchovies", quantity: "4", unit: "fillets", category: "Pantry" },
      { name: "Garlic", quantity: "2", unit: "cloves", category: "Produce" },
      { name: "Lemon", quantity: "1", unit: "whole", category: "Produce" },
      { name: "Olive oil", quantity: "1/4", unit: "cup", category: "Pantry" }
    ]
  },
  {
    title: "Vegetarian Buddha Bowl",
    description: "Nutritious bowl with quinoa, roasted vegetables, and tahini dressing",
    cuisine: "Mediterranean",
    cookTime: 35,
    servings: 2,
    difficulty: "Easy",
    dietaryTags: ["vegetarian", "vegan", "gluten-free"],
    instructions: [
      "Cook quinoa according to package directions",
      "Roast sweet potato and broccoli with olive oil",
      "Prepare tahini dressing with lemon and garlic",
      "Assemble bowls with quinoa, vegetables, and chickpeas",
      "Drizzle with dressing and sprinkle with seeds"
    ],
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    ingredients: [
      { name: "Quinoa", quantity: "1", unit: "cup", category: "Grains & Bread" },
      { name: "Sweet potato", quantity: "2", unit: "medium", category: "Produce" },
      { name: "Broccoli", quantity: "1", unit: "head", category: "Produce" },
      { name: "Chickpeas", quantity: "1", unit: "can", category: "Pantry" },
      { name: "Tahini", quantity: "3", unit: "tbsp", category: "Pantry" },
      { name: "Lemon", quantity: "1", unit: "whole", category: "Produce" },
      { name: "Pumpkin seeds", quantity: "2", unit: "tbsp", category: "Pantry" }
    ]
  },
  {
    title: "Beef Stir Fry",
    description: "Quick and flavorful stir fry with tender beef and crisp vegetables",
    cuisine: "Asian",
    cookTime: 15,
    servings: 4,
    difficulty: "Easy",
    dietaryTags: [],
    instructions: [
      "Slice beef thinly against the grain",
      "Heat wok or large skillet over high heat",
      "Stir fry beef until browned, remove from pan",
      "Stir fry vegetables until crisp-tender",
      "Return beef to pan, add sauce, and toss to combine"
    ],
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400",
    ingredients: [
      { name: "Beef sirloin", quantity: "1", unit: "lb", category: "Meat & Seafood" },
      { name: "Bell peppers", quantity: "2", unit: "whole", category: "Produce" },
      { name: "Broccoli", quantity: "1", unit: "head", category: "Produce" },
      { name: "Soy sauce", quantity: "3", unit: "tbsp", category: "Pantry" },
      { name: "Garlic", quantity: "3", unit: "cloves", category: "Produce" },
      { name: "Ginger", quantity: "1", unit: "inch", category: "Produce" },
      { name: "Vegetable oil", quantity: "2", unit: "tbsp", category: "Pantry" }
    ]
  },
  {
    title: "Salmon with Lemon Herbs",
    description: "Baked salmon fillet with fresh herbs and lemon",
    cuisine: "Mediterranean",
    cookTime: 20,
    servings: 2,
    difficulty: "Easy",
    dietaryTags: ["gluten-free", "keto"],
    instructions: [
      "Preheat oven to 400°F",
      "Season salmon with salt, pepper, and herbs",
      "Place lemon slices on top of salmon",
      "Bake for 12-15 minutes until flaky",
      "Serve with roasted asparagus"
    ],
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
    ingredients: [
      { name: "Salmon fillet", quantity: "2", unit: "pieces", category: "Meat & Seafood" },
      { name: "Lemon", quantity: "1", unit: "whole", category: "Produce" },
      { name: "Fresh dill", quantity: "2", unit: "tbsp", category: "Produce" },
      { name: "Fresh parsley", quantity: "2", unit: "tbsp", category: "Produce" },
      { name: "Asparagus", quantity: "1", unit: "lb", category: "Produce" },
      { name: "Olive oil", quantity: "2", unit: "tbsp", category: "Pantry" }
    ]
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.mealPlanItem.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create recipes with ingredients
  for (const recipeData of sampleRecipes) {
    const { ingredients, ...recipe } = recipeData;
    
    await prisma.recipe.create({
      data: {
        ...recipe,
        ingredients: {
          create: ingredients
        }
      }
    });
  }

  console.log(`✅ Created ${sampleRecipes.length} recipes with ingredients`);

  // Create a test user
  const hashedPassword = await hashPassword('TestPass123');
  const testUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@shopandchop.com',
      password: hashedPassword,
      householdSize: 2,
      dietaryRestrictions: ['vegetarian'],
      favoriteCuisines: ['Italian', 'Mediterranean']
    }
  });

  console.log('👤 Created test user (email: test@shopandchop.com, password: TestPass123)');

  // Create a sample meal plan
  const recipes = await prisma.recipe.findMany({ take: 5 });
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week

  await prisma.mealPlan.create({
    data: {
      userId: testUser.id,
      weekStartDate: weekStart,
      meals: {
        create: [
          { recipeId: recipes[0]!.id, dayOfWeek: 1, mealType: 'dinner', servings: 2 },
          { recipeId: recipes[1]!.id, dayOfWeek: 2, mealType: 'lunch', servings: 1 },
          { recipeId: recipes[2]!.id, dayOfWeek: 3, mealType: 'dinner', servings: 2 },
          { recipeId: recipes[3]!.id, dayOfWeek: 4, mealType: 'dinner', servings: 2 },
          { recipeId: recipes[4]!.id, dayOfWeek: 5, mealType: 'dinner', servings: 2 }
        ]
      }
    }
  });

  console.log('📅 Created sample meal plan for test user');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });