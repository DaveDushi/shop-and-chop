import express from 'express';
import { 
  getRecipes, 
  getRecipeById, 
  toggleFavoriteRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe
} from '../controllers/recipeController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes with optional authentication for user-specific features
router.get('/', optionalAuthenticateToken, getRecipes);
router.get('/:id', getRecipeById);

// Protected routes
router.post('/:id/favorite', authenticateToken, toggleFavoriteRecipe);
router.post('/', authenticateToken, upload.single('image'), handleUploadError, createRecipe);
router.put('/:id', authenticateToken, upload.single('image'), handleUploadError, updateRecipe);
router.delete('/:id', authenticateToken, deleteRecipe);

export default router;