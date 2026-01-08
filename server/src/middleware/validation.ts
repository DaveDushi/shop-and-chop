import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    ).required().messages({
      'string.pattern.base': 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number'
    }),
    householdSize: Joi.number().integer().min(1).max(20).optional(),
    dietaryRestrictions: Joi.array().items(Joi.string()).optional(),
    favoriteCuisines: Joi.array().items(Joi.string()).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    householdSize: Joi.number().integer().min(1).max(20).optional(),
    dietaryRestrictions: Joi.array().items(Joi.string()).optional(),
    favoriteCuisines: Joi.array().items(Joi.string()).optional()
  }),

  mealPlan: Joi.object({
    weekStartDate: Joi.date().iso().required(),
    meals: Joi.array().items(
      Joi.object({
        recipeId: Joi.string().required(),
        dayOfWeek: Joi.number().integer().min(0).max(6).required(),
        mealType: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
        servings: Joi.number().integer().min(1).max(20).optional()
      })
    ).required()
  })
};