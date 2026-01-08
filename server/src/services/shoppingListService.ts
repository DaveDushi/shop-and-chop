interface MealPlanItem {
  servings: number;
  recipe: {
    servings: number;
    ingredients: {
      name: string;
      quantity: string;
      unit: string;
      category: string;
    }[];
  };
}

interface ShoppingListItem {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  recipes: string[];
}

interface ShoppingList {
  [category: string]: ShoppingListItem[];
}

export const generateShoppingListFromMeals = (
  meals: MealPlanItem[], 
  householdSize: number = 2
): ShoppingList => {
  const consolidatedIngredients = new Map<string, ShoppingListItem>();

  // Process each meal
  meals.forEach(meal => {
    const { recipe, servings } = meal;
    const scalingFactor = (servings * householdSize) / recipe.servings;

    recipe.ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
      
      if (consolidatedIngredients.has(key)) {
        // Consolidate existing ingredient
        const existing = consolidatedIngredients.get(key)!;
        const existingQuantity = parseQuantity(existing.quantity);
        const newQuantity = parseQuantity(ingredient.quantity) * scalingFactor;
        
        existing.quantity = formatQuantity(existingQuantity + newQuantity);
        if (!existing.recipes.includes(recipe.title)) {
          existing.recipes.push(recipe.title);
        }
      } else {
        // Add new ingredient
        const scaledQuantity = parseQuantity(ingredient.quantity) * scalingFactor;
        consolidatedIngredients.set(key, {
          name: ingredient.name,
          quantity: formatQuantity(scaledQuantity),
          unit: ingredient.unit,
          category: ingredient.category,
          recipes: [recipe.title]
        });
      }
    });
  });

  // Group by category
  const shoppingList: ShoppingList = {};
  
  consolidatedIngredients.forEach(item => {
    if (!shoppingList[item.category]) {
      shoppingList[item.category] = [];
    }
    shoppingList[item.category].push(item);
  });

  // Sort categories and items
  const sortedShoppingList: ShoppingList = {};
  const categoryOrder = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Pantry',
    'Grains & Bread',
    'Frozen',
    'Beverages',
    'Other'
  ];

  categoryOrder.forEach(category => {
    if (shoppingList[category]) {
      sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    }
  });

  // Add any remaining categories
  Object.keys(shoppingList).forEach(category => {
    if (!categoryOrder.includes(category)) {
      sortedShoppingList[category] = shoppingList[category].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    }
  });

  return sortedShoppingList;
};

const parseQuantity = (quantity: string): number => {
  // Handle fractions and mixed numbers
  const fractionMatch = quantity.match(/(\d+)?\s*(\d+)\/(\d+)/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1] || '0', 10);
    const numerator = parseInt(fractionMatch[2], 10);
    const denominator = parseInt(fractionMatch[3], 10);
    return whole + (numerator / denominator);
  }

  // Handle decimal numbers
  const decimalMatch = quantity.match(/(\d+\.?\d*)/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1]);
  }

  // Default to 1 if no number found
  return 1;
};

const formatQuantity = (quantity: number): string => {
  // Round to reasonable precision
  if (quantity < 1) {
    // Convert to fraction for small amounts
    const fractions = [
      [0.125, '1/8'],
      [0.25, '1/4'],
      [0.33, '1/3'],
      [0.5, '1/2'],
      [0.67, '2/3'],
      [0.75, '3/4']
    ];

    for (const [decimal, fraction] of fractions) {
      if (Math.abs(quantity - decimal) < 0.05) {
        return fraction;
      }
    }
  }

  // Round to 2 decimal places and remove trailing zeros
  return parseFloat(quantity.toFixed(2)).toString();
};