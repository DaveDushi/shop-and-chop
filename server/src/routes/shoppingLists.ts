import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Simple test route
router.get('/test', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'Shopping list routes working' });
});

export default router;