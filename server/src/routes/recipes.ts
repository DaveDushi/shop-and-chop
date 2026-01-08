import express from 'express';
import { 
  getRecipes, 
  getRecipeById, 
  toggleFavoriteRecipe 
} from '../controllers/recipeController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getRecipes);
router.get('/:id', getRecipeById);

// Protected routes
router.post('/:id/favorite', authenticateToken, toggleFavoriteRecipe);

export default router;