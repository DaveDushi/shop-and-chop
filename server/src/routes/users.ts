import express from 'express';
import { 
  getFavoriteRecipes,
  getCurrentUser,
  updateCurrentUser,
  getUserPreferences,
  updateUserPreferences
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/favorites', getFavoriteRecipes);
router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUser);
router.get('/me/preferences', getUserPreferences);
router.patch('/me/preferences', updateUserPreferences);

export default router;