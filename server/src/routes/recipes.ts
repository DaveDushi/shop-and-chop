import express from 'express';
import { 
  getRecipes, 
  getRecipeById, 
  toggleFavoriteRecipe 
} from '../controllers/recipeController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes with optional authentication for user-specific features
router.get('/', optionalAuthenticateToken, getRecipes);
router.get('/:id', getRecipeById);

// Protected routes
router.post('/:id/favorite', authenticateToken, toggleFavoriteRecipe);

export default router;