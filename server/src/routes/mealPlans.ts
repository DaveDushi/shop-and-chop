import express from 'express';
import { 
  getMealPlans, 
  createMealPlan, 
  getMealPlanById, 
  updateMealPlan, 
  deleteMealPlan,
  generateShoppingList,
  setManualServingOverride,
  getMealPlanItem,
  getEffectiveServings,
  batchUpdateServingOverrides
} from '../controllers/mealPlanController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';

const router = express.Router();

// All meal plan routes require authentication
router.use(authenticateToken);

router.get('/', getMealPlans);
router.post('/', validateRequest(schemas.mealPlan), createMealPlan);
router.get('/:id', getMealPlanById);
router.put('/:id', validateRequest(schemas.mealPlan), updateMealPlan);
router.delete('/:id', deleteMealPlan);
router.get('/:id/shopping-list', generateShoppingList);

// Manual serving override routes
router.patch('/:mealPlanId/items/:recipeId/servings', setManualServingOverride);
router.get('/:mealPlanId/items/:recipeId', getMealPlanItem);
router.get('/:mealPlanId/items/:recipeId/servings', getEffectiveServings);
router.patch('/:mealPlanId/items/batch-servings', batchUpdateServingOverrides);

export default router;