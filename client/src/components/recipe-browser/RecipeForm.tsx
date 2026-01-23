import React, { useState } from 'react';
import { RecipeFormData, IngredientInput } from '../../types/Recipe.types';
import { IngredientInputComponent } from './IngredientInputComponent';
import { InstructionInputComponent } from './InstructionInputComponent';
import { ImageUpload } from './ImageUpload';

export interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const CUISINES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'French',
  'Mediterranean',
  'American',
  'Greek',
  'Korean',
  'Vietnamese',
  'Spanish',
  'Middle Eastern',
  'Other',
];

const DIETARY_TAGS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Low-Carb',
  'Keto',
  'Paleo',
  'Whole30',
  'Pescatarian',
];

const DIFFICULTY_LEVELS: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];

export const RecipeForm: React.FC<RecipeFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}) => {
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [cuisine, setCuisine] = useState(initialData?.cuisine || '');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(
    initialData?.difficulty || 'Easy'
  );
  const [prepTime, setPrepTime] = useState(initialData?.prepTime || 0);
  const [cookTime, setCookTime] = useState(initialData?.cookTime || 0);
  const [servings, setServings] = useState(initialData?.servings || 4);
  const [dietaryTags, setDietaryTags] = useState<string[]>(initialData?.dietaryTags || []);
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    initialData?.ingredients || [{ name: '', quantity: '', unit: '' }]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initialData?.instructions || ['']
  );
  const [image, setImage] = useState<File | undefined>(initialData?.image);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Recipe title is required';
    }

    if (!cuisine) {
      newErrors.cuisine = 'Cuisine type is required';
    }

    if (prepTime <= 0) {
      newErrors.prepTime = 'Prep time must be greater than 0';
    }

    if (cookTime <= 0) {
      newErrors.cookTime = 'Cook time must be greater than 0';
    }

    if (servings <= 0) {
      newErrors.servings = 'Servings must be greater than 0';
    }

    // Validate ingredients
    const validIngredients = ingredients.filter(
      (ing) => ing.name.trim() && ing.quantity.trim()
    );
    if (validIngredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
    }

    // Validate instructions
    const validInstructions = instructions.filter((inst) => inst.trim());
    if (validInstructions.length === 0) {
      newErrors.instructions = 'At least one instruction is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Filter out empty ingredients and instructions
    const validIngredients = ingredients.filter(
      (ing) => ing.name.trim() && ing.quantity.trim()
    );
    const validInstructions = instructions.filter((inst) => inst.trim());

    const formData: RecipeFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      cuisine,
      difficulty,
      prepTime,
      cookTime,
      servings,
      dietaryTags,
      ingredients: validIngredients,
      instructions: validInstructions,
      image,
    };

    onSubmit(formData);
  };

  // Handle dietary tag toggle
  const toggleDietaryTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-3 xs:px-4 py-3 xs:py-3.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Classic Spaghetti Carbonara"
          disabled={isLoading}
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 xs:px-4 py-3 xs:py-3.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation"
          placeholder="Brief description of your recipe..."
          disabled={isLoading}
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Image
        </label>
        <ImageUpload
          value={image}
          onChange={(file) => setImage(file || undefined)}
          disabled={isLoading}
          maxSizeMB={5}
        />
      </div>

      {/* Cuisine and Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-6">
        <div>
          <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-2">
            Cuisine <span className="text-red-500">*</span>
          </label>
          <select
            id="cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className={`w-full px-3 xs:px-4 py-3 xs:py-3.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation ${
              errors.cuisine ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          >
            <option value="">Select cuisine...</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.cuisine && <p className="text-red-500 text-sm mt-1">{errors.cuisine}</p>}
        </div>

        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
            className="w-full px-3 xs:px-4 py-3 xs:py-3.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation"
            disabled={isLoading}
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Times and Servings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xs:gap-6">
        <div>
          <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-2">
            Prep Time (min) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="prepTime"
            value={prepTime}
            onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
            min="1"
            className={`w-full px-3 xs:px-4 py-3 xs:py-3.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation ${
              errors.prepTime ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.prepTime && <p className="text-red-500 text-sm mt-1">{errors.prepTime}</p>}
        </div>

        <div>
          <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 mb-2">
            Cook Time (min) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="cookTime"
            value={cookTime}
            onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
            min="1"
            className={`w-full px-3 xs:px-4 py-3 xs:py-3.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation ${
              errors.cookTime ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.cookTime && <p className="text-red-500 text-sm mt-1">{errors.cookTime}</p>}
        </div>

        <div>
          <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">
            Servings <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="servings"
            value={servings}
            onChange={(e) => setServings(parseInt(e.target.value) || 0)}
            min="1"
            className={`w-full px-3 xs:px-4 py-3 xs:py-3.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-base touch-manipulation ${
              errors.servings ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.servings && <p className="text-red-500 text-sm mt-1">{errors.servings}</p>}
        </div>
      </div>

      {/* Dietary Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Dietary Tags</label>
        <div className="flex flex-wrap gap-2 xs:gap-3">
          {DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleDietaryTag(tag)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors touch-manipulation min-h-touch ${
                dietaryTags.includes(tag)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
              }`}
              disabled={isLoading}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ingredients <span className="text-red-500">*</span>
        </label>
        <IngredientInputComponent
          ingredients={ingredients}
          onChange={setIngredients}
          disabled={isLoading}
        />
        {errors.ingredients && <p className="text-red-500 text-sm mt-1">{errors.ingredients}</p>}
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instructions <span className="text-red-500">*</span>
        </label>
        <InstructionInputComponent
          instructions={instructions}
          onChange={setInstructions}
          disabled={isLoading}
        />
        {errors.instructions && (
          <p className="text-red-500 text-sm mt-1">{errors.instructions}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col xs:flex-row justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-touch"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-touch"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {mode === 'create' ? 'Creating...' : 'Saving...'}
            </span>
          ) : mode === 'create' ? (
            'Create Recipe'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};
