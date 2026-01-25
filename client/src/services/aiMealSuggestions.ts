/**
 * AI-Powered Meal Suggestions Service
 * Provides intelligent meal recommendations based on user preferences, dietary restrictions,
 * seasonal ingredients, and past meal history using a simple but effective algorithm.
 */

import { Recipe } from '../types/Recipe.types';

export interface MealSuggestionPreferences {
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  householdSize: number;
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeConstraints: 'quick' | 'moderate' | 'flexible'; // < 30min, 30-60min, 60min+
  budgetLevel: 'budget' | 'moderate' | 'premium';
}

export interface MealSuggestion {
  recipe: Recipe;
  confidence: number; // 0-1 score
  reasoning: string[];
  nutritionalBalance: 'low' | 'medium' | 'high';
  seasonalRelevance: number; // 0-1 score
}

export interface WeeklySuggestion {
  suggestions: {
    [day: string]: {
      breakfast?: MealSuggestion;
      lunch?: MealSuggestion;
      dinner?: MealSuggestion;
    };
  };
  overallBalance: {
    cuisineVariety: number;
    nutritionalScore: number;
    difficultyProgression: number;
  };
  shoppingOptimization: {
    ingredientReuse: number;
    estimatedCost: number;
    shoppingTrips: number;
  };
}

class AIMealSuggestionsService {
  private seasonalIngredients: { [month: number]: string[] } = {
    0: ['citrus', 'root vegetables', 'winter squash', 'pomegranate'], // January
    1: ['citrus', 'root vegetables', 'winter squash', 'pomegranate'], // February
    2: ['asparagus', 'artichokes', 'spring onions', 'peas'], // March
    3: ['asparagus', 'artichokes', 'spring onions', 'peas'], // April
    4: ['strawberries', 'asparagus', 'spring greens', 'radishes'], // May
    5: ['berries', 'stone fruits', 'zucchini', 'tomatoes'], // June
    6: ['berries', 'stone fruits', 'zucchini', 'tomatoes'], // July
    7: ['corn', 'tomatoes', 'peaches', 'berries'], // August
    8: ['apples', 'pumpkin', 'sweet potatoes', 'brussels sprouts'], // September
    9: ['apples', 'pumpkin', 'sweet potatoes', 'brussels sprouts'], // October
    10: ['cranberries', 'sweet potatoes', 'winter squash', 'pomegranate'], // November
    11: ['citrus', 'root vegetables', 'winter squash', 'pomegranate'], // December
  };

  private cuisineCompatibility: { [cuisine: string]: string[] } = {
    'Italian': ['Mediterranean', 'French'],
    'Mexican': ['Tex-Mex', 'Latin American'],
    'Asian': ['Chinese', 'Thai', 'Japanese', 'Korean'],
    'Indian': ['Middle Eastern', 'Pakistani'],
    'American': ['Tex-Mex', 'BBQ', 'Southern'],
    'Mediterranean': ['Italian', 'Greek', 'Middle Eastern'],
  };

  /**
   * Generate intelligent meal suggestions for a week
   */
  async generateWeeklySuggestions(
    recipes: Recipe[],
    preferences: MealSuggestionPreferences,
    mealHistory?: Recipe[]
  ): Promise<WeeklySuggestion> {
    const currentMonth = new Date().getMonth();
    const seasonalIngredients = this.seasonalIngredients[currentMonth];
    
    // Score all recipes based on preferences
    const scoredRecipes = recipes.map(recipe => ({
      recipe,
      score: this.calculateRecipeScore(recipe, preferences, seasonalIngredients, mealHistory),
    }));

    // Sort by score and create suggestions
    const topRecipes = scoredRecipes
      .sort((a, b) => b.score - a.score)
      .slice(0, 21); // 3 meals × 7 days

    // Generate balanced weekly plan
    const weeklySuggestion = this.createBalancedWeeklyPlan(topRecipes, preferences);
    
    return weeklySuggestion;
  }

  /**
   * Get smart suggestions for a specific meal slot
   */
  async getSuggestionForMealSlot(
    recipes: Recipe[],
    preferences: MealSuggestionPreferences,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    dayOfWeek: number,
    existingMeals: Recipe[] = []
  ): Promise<MealSuggestion[]> {
    const currentMonth = new Date().getMonth();
    const seasonalIngredients = this.seasonalIngredients[currentMonth];

    // Filter recipes appropriate for meal type
    const mealAppropriateRecipes = this.filterByMealType(recipes, mealType);

    // Score recipes with context of existing meals
    const suggestions = mealAppropriateRecipes
      .map(recipe => {
        const baseScore = this.calculateRecipeScore(recipe, preferences, seasonalIngredients);
        const contextScore = this.calculateContextualScore(recipe, existingMeals, dayOfWeek);
        const confidence = (baseScore + contextScore) / 2;

        return {
          recipe,
          confidence,
          reasoning: this.generateReasoning(recipe, preferences, seasonalIngredients, confidence),
          nutritionalBalance: this.assessNutritionalBalance(recipe),
          seasonalRelevance: this.calculateSeasonalRelevance(recipe, seasonalIngredients),
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 suggestions

    return suggestions;
  }

  /**
   * Calculate recipe score based on user preferences
   */
  private calculateRecipeScore(
    recipe: Recipe,
    preferences: MealSuggestionPreferences,
    seasonalIngredients: string[],
    mealHistory?: Recipe[]
  ): number {
    let score = 0.5; // Base score

    // Dietary restrictions (critical factor)
    if (preferences.dietaryRestrictions.length > 0) {
      const hasRestrictedIngredients = preferences.dietaryRestrictions.some(restriction =>
        !recipe.dietaryTags.includes(restriction)
      );
      if (hasRestrictedIngredients) {
        score -= 0.4; // Heavy penalty for dietary violations
      } else {
        score += 0.2; // Bonus for compliance
      }
    }

    // Cuisine preferences
    if (recipe.cuisine && preferences.favoriteCuisines.includes(recipe.cuisine)) {
      score += 0.15;
    } else if (recipe.cuisine && this.isCompatibleCuisine(recipe.cuisine, preferences.favoriteCuisines)) {
      score += 0.1;
    }

    // Cooking skill level
    const difficultyScore = this.getDifficultyScore(recipe.difficulty, preferences.cookingSkillLevel);
    score += difficultyScore;

    // Time constraints
    const timeScore = this.getTimeScore(recipe.cookTime + (recipe.prepTime || 0), preferences.timeConstraints);
    score += timeScore;

    // Seasonal relevance
    const seasonalScore = this.calculateSeasonalRelevance(recipe, seasonalIngredients);
    score += seasonalScore * 0.1;

    // Avoid recent repeats
    if (mealHistory && mealHistory.some(meal => meal.id === recipe.id)) {
      const daysSinceLastMade = this.getDaysSinceLastMade(recipe, mealHistory);
      if (daysSinceLastMade < 7) {
        score -= 0.2; // Penalty for recent repeats
      }
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  /**
   * Calculate contextual score based on existing meals
   */
  private calculateContextualScore(recipe: Recipe, existingMeals: Recipe[], dayOfWeek: number): number {
    let score = 0.5;

    // Avoid cuisine repetition in the same day
    const sameDayCuisines = existingMeals.map(meal => meal.cuisine);
    if (sameDayCuisines.includes(recipe.cuisine)) {
      score -= 0.2;
    }

    // Encourage variety in cooking methods and main ingredients
    const existingIngredients = existingMeals.flatMap(meal => 
      meal.ingredients.map(ing => ing.name.toLowerCase())
    );
    const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
    const overlap = recipeIngredients.filter(ing => existingIngredients.includes(ing)).length;
    
    if (overlap > 0) {
      score += 0.1; // Small bonus for ingredient reuse (shopping efficiency)
    }
    if (overlap > 3) {
      score -= 0.15; // Penalty for too much overlap (boring meals)
    }

    // Weekend vs weekday preferences
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && recipe.difficulty === 'Hard') {
      score += 0.1; // More complex meals on weekends
    } else if (!isWeekend && recipe.difficulty === 'Easy') {
      score += 0.1; // Simpler meals on weekdays
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate human-readable reasoning for suggestions
   */
  private generateReasoning(
    recipe: Recipe,
    preferences: MealSuggestionPreferences,
    seasonalIngredients: string[],
    confidence: number
  ): string[] {
    const reasons: string[] = [];

    if (recipe.cuisine && preferences.favoriteCuisines.includes(recipe.cuisine)) {
      reasons.push(`Matches your favorite ${recipe.cuisine} cuisine`);
    }

    if (recipe.dietaryTags.some(tag => preferences.dietaryRestrictions.includes(tag))) {
      reasons.push(`Fits your ${preferences.dietaryRestrictions.join(', ')} dietary needs`);
    }

    const totalTime = recipe.cookTime + (recipe.prepTime || 0);
    if (preferences.timeConstraints === 'quick' && totalTime <= 30) {
      reasons.push('Quick to prepare for busy schedules');
    }

    if (this.calculateSeasonalRelevance(recipe, seasonalIngredients) > 0.7) {
      reasons.push('Uses seasonal ingredients for best flavor and value');
    }

    if (recipe.difficulty === 'Easy' && preferences.cookingSkillLevel === 'beginner') {
      reasons.push(`Perfect match for your ${preferences.cookingSkillLevel} cooking level`);
    } else if (recipe.difficulty === 'Medium' && preferences.cookingSkillLevel === 'intermediate') {
      reasons.push(`Perfect match for your ${preferences.cookingSkillLevel} cooking level`);
    } else if (recipe.difficulty === 'Hard' && preferences.cookingSkillLevel === 'advanced') {
      reasons.push(`Perfect match for your ${preferences.cookingSkillLevel} cooking level`);
    }

    if (confidence > 0.8) {
      reasons.push('Highly recommended based on your preferences');
    }

    return reasons.length > 0 ? reasons : ['Good overall match for your preferences'];
  }

  /**
   * Create a balanced weekly meal plan
   */
  private createBalancedWeeklyPlan(
    scoredRecipes: { recipe: Recipe; score: number }[],
    preferences: MealSuggestionPreferences
  ): WeeklySuggestion {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const suggestions: WeeklySuggestion['suggestions'] = {};
    const usedRecipes = new Set<string>();

    days.forEach((day) => {
      suggestions[day] = {};
      
      // Assign meals for each day, avoiding repeats
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const availableRecipes = scoredRecipes.filter(sr => 
          !usedRecipes.has(sr.recipe.id) &&
          this.isMealTypeAppropriate(sr.recipe, mealType as any)
        );

        if (availableRecipes.length > 0) {
          const selectedRecipe = availableRecipes[0];
          usedRecipes.add(selectedRecipe.recipe.id);
          
          suggestions[day][mealType as keyof typeof suggestions[typeof day]] = {
            recipe: selectedRecipe.recipe,
            confidence: selectedRecipe.score,
            reasoning: this.generateReasoning(
              selectedRecipe.recipe,
              preferences,
              this.seasonalIngredients[new Date().getMonth()],
              selectedRecipe.score
            ),
            nutritionalBalance: this.assessNutritionalBalance(selectedRecipe.recipe),
            seasonalRelevance: this.calculateSeasonalRelevance(
              selectedRecipe.recipe,
              this.seasonalIngredients[new Date().getMonth()]
            ),
          };
        }
      });
    });

    return {
      suggestions,
      overallBalance: this.calculateOverallBalance(suggestions),
      shoppingOptimization: this.calculateShoppingOptimization(suggestions),
    };
  }

  // Helper methods
  private filterByMealType(recipes: Recipe[], mealType: string): Recipe[] {
    // Simple heuristic based on recipe name and cooking time
    return recipes.filter(recipe => this.isMealTypeAppropriate(recipe, mealType));
  }

  private isMealTypeAppropriate(recipe: Recipe, mealType: string): boolean {
    const name = recipe.name.toLowerCase();
    const cookTime = recipe.cookTime;

    switch (mealType) {
      case 'breakfast':
        return name.includes('breakfast') || name.includes('pancake') || 
               name.includes('oatmeal') || name.includes('smoothie') || cookTime <= 20;
      case 'lunch':
        return !name.includes('breakfast') && !name.includes('dessert') && cookTime <= 45;
      case 'dinner':
        return !name.includes('breakfast') && !name.includes('smoothie');
      default:
        return true;
    }
  }

  private isCompatibleCuisine(cuisine: string | undefined, favoriteCuisines: string[]): boolean {
    if (!cuisine) return false;
    return favoriteCuisines.some(fav => 
      this.cuisineCompatibility[fav]?.includes(cuisine) || false
    );
  }

  private getDifficultyScore(difficulty: string, skillLevel: string): number {
    const difficultyMap: { [key: string]: number } = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
    const skillMap: { [key: string]: number } = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
    
    const recipeDiff = difficultyMap[difficulty] || 2;
    const userSkill = skillMap[skillLevel] || 2;
    
    if (recipeDiff === userSkill) return 0.15;
    if (Math.abs(recipeDiff - userSkill) === 1) return 0.05;
    return -0.1;
  }

  private getTimeScore(totalTime: number, timeConstraints: string): number {
    switch (timeConstraints) {
      case 'quick':
        return totalTime <= 30 ? 0.15 : totalTime <= 45 ? 0.05 : -0.1;
      case 'moderate':
        return totalTime <= 60 ? 0.1 : -0.05;
      case 'flexible':
        return 0.05; // Neutral
      default:
        return 0;
    }
  }

  private calculateSeasonalRelevance(recipe: Recipe, seasonalIngredients: string[]): number {
    const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
    const matches = seasonalIngredients.filter(seasonal => 
      recipeIngredients.some(ing => ing.includes(seasonal.toLowerCase()))
    ).length;
    
    return Math.min(1, matches / Math.max(1, seasonalIngredients.length));
  }

  private assessNutritionalBalance(recipe: Recipe): 'low' | 'medium' | 'high' {
    // Simple heuristic based on ingredient variety and types
    const ingredients = recipe.ingredients;
    const hasProtein = ingredients.some(ing => 
      ['chicken', 'beef', 'fish', 'tofu', 'beans', 'eggs'].some(protein => 
        ing.name.toLowerCase().includes(protein)
      )
    );
    const hasVegetables = ingredients.some(ing => 
      ing.category.toLowerCase().includes('produce') || 
      ['vegetable', 'greens', 'tomato', 'onion'].some(veg => 
        ing.name.toLowerCase().includes(veg)
      )
    );
    const hasGrains = ingredients.some(ing => 
      ['rice', 'pasta', 'bread', 'quinoa', 'oats'].some(grain => 
        ing.name.toLowerCase().includes(grain)
      )
    );

    const score = [hasProtein, hasVegetables, hasGrains].filter(Boolean).length;
    return score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low';
  }

  private getDaysSinceLastMade(recipe: Recipe, mealHistory: Recipe[]): number {
    // Simplified - in real implementation, would use actual dates
    const index = mealHistory.findIndex(meal => meal.id === recipe.id);
    return index === -1 ? 30 : index; // Assume history is ordered by recency
  }

  private calculateOverallBalance(suggestions: WeeklySuggestion['suggestions']): WeeklySuggestion['overallBalance'] {
    const allMeals = Object.values(suggestions).flatMap(day => 
      Object.values(day).filter(Boolean)
    );
    
    const cuisines = new Set(allMeals.map(meal => meal!.recipe.cuisine));
    const difficulties = allMeals.map(meal => meal!.recipe.difficulty);
    
    return {
      cuisineVariety: cuisines.size / 7, // Normalized variety score
      nutritionalScore: allMeals.filter(meal => 
        meal!.nutritionalBalance === 'high'
      ).length / allMeals.length,
      difficultyProgression: this.calculateDifficultyProgression(difficulties),
    };
  }

  private calculateShoppingOptimization(suggestions: WeeklySuggestion['suggestions']): WeeklySuggestion['shoppingOptimization'] {
    const allMeals = Object.values(suggestions).flatMap(day => 
      Object.values(day).filter(Boolean)
    );
    
    const allIngredients = allMeals.flatMap(meal => meal!.recipe.ingredients);
    const uniqueIngredients = new Set(allIngredients.map(ing => ing.name));
    
    return {
      ingredientReuse: 1 - (uniqueIngredients.size / allIngredients.length),
      estimatedCost: this.estimateCost(Array.from(uniqueIngredients)),
      shoppingTrips: 1, // Simplified - assume one trip
    };
  }

  private calculateDifficultyProgression(difficulties: string[]): number {
    // Simple heuristic for balanced difficulty throughout the week
    const diffMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
    const scores = difficulties.map(d => diffMap[d as keyof typeof diffMap] || 2);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.max(0, 1 - Math.abs(avg - 2) / 2); // Closer to 2 (Medium) is better
  }

  private estimateCost(ingredients: string[]): number {
    // Simplified cost estimation - in real app would use actual pricing data
    return ingredients.length * 3.5; // Rough estimate of $3.50 per unique ingredient
  }
}

export const aiMealSuggestions = new AIMealSuggestionsService();