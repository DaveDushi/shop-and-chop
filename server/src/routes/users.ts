import express from 'express';
import { getFavoriteRecipes } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/favorites', getFavoriteRecipes);

export default router;