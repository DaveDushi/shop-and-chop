import express from 'express';
import { 
  getMealPlans, 
  createMealPlan, 
  getMealPlanById, 
  updateMealPlan, 
  deleteMealPlan,
  generateShoppingList 
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

export default router;