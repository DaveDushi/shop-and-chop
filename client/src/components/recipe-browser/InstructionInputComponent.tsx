import React from 'react';

export interface InstructionInputComponentProps {
  instructions: string[];
  onChange: (instructions: string[]) => void;
  disabled?: boolean;
}

export const InstructionInputComponent: React.FC<InstructionInputComponentProps> = ({
  instructions,
  onChange,
  disabled = false,
}) => {
  // Add new instruction
  const handleAdd = () => {
    onChange([...instructions, '']);
  };

  // Remove instruction at index
  const handleRemove = (index: number) => {
    if (instructions.length === 1) {
      // Keep at least one instruction input
      onChange(['']);
    } else {
      onChange(instructions.filter((_, i) => i !== index));
    }
  };

  // Update instruction at index
  const handleUpdate = (index: number, value: string) => {
    const updated = instructions.map((inst, i) => (i === index ? value : inst));
    onChange(updated);
  };

  // Move instruction up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...instructions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  // Move instruction down
  const handleMoveDown = (index: number) => {
    if (index === instructions.length - 1) return;
    const updated = [...instructions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {instructions.map((instruction, index) => (
        <div key={index} className="flex gap-2 items-start">
          {/* Step Number */}
          <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-green-100 text-green-700 font-semibold rounded-md text-sm">
            {index + 1}
          </div>

          {/* Instruction Text */}
          <div className="flex-1">
            <textarea
              value={instruction}
              onChange={(e) => handleUpdate(index, e.target.value)}
              placeholder={`Step ${index + 1} instructions...`}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
              disabled={disabled}
              aria-label={`Instruction step ${index + 1}`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-1">
            {/* Move Up */}
            <button
              type="button"
              onClick={() => handleMoveUp(index)}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={disabled || index === 0}
              aria-label={`Move step ${index + 1} up`}
              title="Move up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>

            {/* Move Down */}
            <button
              type="button"
              onClick={() => handleMoveDown(index)}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={disabled || index === instructions.length - 1}
              aria-label={`Move step ${index + 1} down`}
              title="Move down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Remove */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
              aria-label={`Remove step ${index + 1}`}
              title="Remove step"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add Step Button */}
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
        Add Step
      </button>
    </div>
  );
};
