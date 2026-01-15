import React from 'react';
import { IngredientInput } from '../../types/Recipe.types';

export interface IngredientInputComponentProps {
  ingredients: IngredientInput[];
  onChange: (ingredients: IngredientInput[]) => void;
  disabled?: boolean;
}

const COMMON_UNITS = [
  'cup',
  'cups',
  'tbsp',
  'tsp',
  'oz',
  'lb',
  'g',
  'kg',
  'ml',
  'l',
  'piece',
  'pieces',
  'clove',
  'cloves',
  'pinch',
  'dash',
  'to taste',
];

export const IngredientInputComponent: React.FC<IngredientInputComponentProps> = ({
  ingredients,
  onChange,
  disabled = false,
}) => {
  // Add new ingredient
  const handleAdd = () => {
    onChange([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  // Remove ingredient at index
  const handleRemove = (index: number) => {
    if (ingredients.length === 1) {
      // Keep at least one ingredient input
      onChange([{ name: '', quantity: '', unit: '' }]);
    } else {
      onChange(ingredients.filter((_, i) => i !== index));
    }
  };

  // Update ingredient at index
  const handleUpdate = (index: number, field: keyof IngredientInput, value: string) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient, index) => (
        <div key={index} className="flex gap-2 items-start">
          {/* Quantity */}
          <div className="w-24">
            <input
              type="text"
              value={ingredient.quantity}
              onChange={(e) => handleUpdate(index, 'quantity', e.target.value)}
              placeholder="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              disabled={disabled}
              aria-label={`Ingredient ${index + 1} quantity`}
            />
          </div>

          {/* Unit */}
          <div className="w-28">
            <input
              type="text"
              value={ingredient.unit}
              onChange={(e) => handleUpdate(index, 'unit', e.target.value)}
              placeholder="cups"
              list={`units-${index}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              disabled={disabled}
              aria-label={`Ingredient ${index + 1} unit`}
            />
            <datalist id={`units-${index}`}>
              {COMMON_UNITS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
          </div>

          {/* Name */}
          <div className="flex-1">
            <input
              type="text"
              value={ingredient.name}
              onChange={(e) => handleUpdate(index, 'name', e.target.value)}
              placeholder="flour"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              disabled={disabled}
              aria-label={`Ingredient ${index + 1} name`}
            />
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label={`Remove ingredient ${index + 1}`}
            title="Remove ingredient"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}

      {/* Add Ingredient Button */}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Ingredient
      </button>
    </div>
  );
};
