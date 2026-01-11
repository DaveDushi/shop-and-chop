// Test script to verify duplicate meal functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testDuplicateMeals() {
  try {
    console.log('🧪 Testing Duplicate Meal Functionality...');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@shopandchop.com',
      password: 'TestPass123'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get recipes
    const recipesResponse = await axios.get(`${API_BASE_URL}/recipes`, { headers });
    const recipes = recipesResponse.data.recipes;
    console.log(`✅ Found ${recipes.length} recipes`);
    
    // Get meal plan
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartString = weekStart.toISOString().split('T')[0];
    
    const mealPlanResponse = await axios.get(`${API_BASE_URL}/meal-plans`, {
      headers,
      params: { weekStart: weekStartString }
    });
    
    const mealPlan = mealPlanResponse.data.mealPlan;
    console.log(`✅ Got meal plan: ${mealPlan.id}`);
    
    // Test 1: Same recipe multiple times
    console.log('\n1. Testing same recipe in multiple slots...');
    const recipe1 = recipes[0];
    const recipe2 = recipes[1];
    
    const testMeals1 = [
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'breakfast', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'dinner', servings: 2 },
      { recipeId: recipe1.id, dayOfWeek: 3, mealType: 'lunch', servings: 1 },
      { recipeId: recipe2.id, dayOfWeek: 2, mealType: 'dinner', servings: 2 },
    ];
    
    const updateResponse1 = await axios.put(
      `${API_BASE_URL}/meal-plans/${mealPlan.id}`, 
      { weekStartDate: mealPlan.weekStartDate, meals: testMeals1 }, 
      { headers }
    );
    
    console.log(`✅ Successfully added ${updateResponse1.data.mealPlan.meals.length} meals`);
    console.log(`   - ${recipe1.title} appears 3 times`);
    console.log(`   - ${recipe2.title} appears 1 time`);
    
    // Test 2: All same recipe
    console.log('\n2. Testing all slots with same recipe...');
    const testMeals2 = [
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'breakfast', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'lunch', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'dinner', servings: 2 },
      { recipeId: recipe1.id, dayOfWeek: 2, mealType: 'breakfast', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 2, mealType: 'lunch', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 2, mealType: 'dinner', servings: 2 },
    ];
    
    const updateResponse2 = await axios.put(
      `${API_BASE_URL}/meal-plans/${mealPlan.id}`, 
      { weekStartDate: mealPlan.weekStartDate, meals: testMeals2 }, 
      { headers }
    );
    
    console.log(`✅ Successfully added ${updateResponse2.data.mealPlan.meals.length} meals`);
    console.log(`   - All meals are ${recipe1.title}`);
    
    // Test 3: Mixed recipes with duplicates
    console.log('\n3. Testing mixed recipes with duplicates...');
    const testMeals3 = [
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'breakfast', servings: 1 },
      { recipeId: recipe2.id, dayOfWeek: 1, mealType: 'lunch', servings: 1 },
      { recipeId: recipe1.id, dayOfWeek: 1, mealType: 'dinner', servings: 2 },
      { recipeId: recipes[2].id, dayOfWeek: 2, mealType: 'breakfast', servings: 1 },
      { recipeId: recipe2.id, dayOfWeek: 2, mealType: 'lunch', servings: 1 },
      { recipeId: recipes[2].id, dayOfWeek: 2, mealType: 'dinner', servings: 2 },
      { recipeId: recipe1.id, dayOfWeek: 3, mealType: 'breakfast', servings: 1 },
    ];
    
    const updateResponse3 = await axios.put(
      `${API_BASE_URL}/meal-plans/${mealPlan.id}`, 
      { weekStartDate: mealPlan.weekStartDate, meals: testMeals3 }, 
      { headers }
    );
    
    console.log(`✅ Successfully added ${updateResponse3.data.mealPlan.meals.length} meals`);
    console.log(`   - ${recipe1.title} appears 3 times`);
    console.log(`   - ${recipe2.title} appears 2 times`);
    console.log(`   - ${recipes[2].title} appears 2 times`);
    
    console.log('\n🎉 All duplicate meal tests passed!');
    console.log('✅ Users can now use the same recipe multiple times in their meal plan');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testDuplicateMeals();