import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Get all shopping lists for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // For now, return empty array since we don't have shopping list schema yet
    // This will be implemented when we add shopping list table to database
    res.json([]);
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

// Create a new shopping list
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { title, items, metadata } = req.body;

    // For now, just return success response
    // This will be implemented when we add shopping list table to database
    const shoppingList = {
      id: `sl_${Date.now()}`,
      title: title || 'Shopping List',
      items: items || {},
      metadata: metadata || {},
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json(shoppingList);
  } catch (error) {
    console.error('Error creating shopping list:', error);
    res.status(500).json({ error: 'Failed to create shopping list' });
  }
});

// Update a shopping list
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { title, items, metadata } = req.body;

    // For now, just return success response
    // This will be implemented when we add shopping list table to database
    const shoppingList = {
      id,
      title: title || 'Shopping List',
      items: items || {},
      metadata: metadata || {},
      userId,
      updatedAt: new Date()
    };

    res.json(shoppingList);
  } catch (error) {
    console.error('Error updating shopping list:', error);
    res.status(500).json({ error: 'Failed to update shopping list' });
  }
});

// Delete a shopping list
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    // For now, just return success response
    // This will be implemented when we add shopping list table to database
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

// Generate shopping list from meal plan
router.post('/generate/:mealPlanId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { mealPlanId } = req.params;
    const { householdSize = 2 } = req.body;

    // For now, return a mock response
    // This will be implemented to actually generate from meal plan data
    const shoppingList = {
      'Produce': [
        { name: 'Tomatoes', quantity: '2', unit: 'lbs', category: 'Produce', recipes: ['Sample Recipe'], checked: false },
        { name: 'Onions', quantity: '1', unit: 'lb', category: 'Produce', recipes: ['Sample Recipe'], checked: false }
      ],
      'Pantry': [
        { name: 'Olive Oil', quantity: '1', unit: 'bottle', category: 'Pantry', recipes: ['Sample Recipe'], checked: false }
      ]
    };

    res.json({ 
      shoppingList,
      metadata: {
        mealPlanId,
        householdSize,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error generating shopping list:', error);
    res.status(500).json({ error: 'Failed to generate shopping list' });
  }
});

// Simple test route
router.get('/test', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'Shopping list routes working' });
});

export default router;