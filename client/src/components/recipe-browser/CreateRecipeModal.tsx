import React from 'react';
import { RecipeFormData } from '../../types/Recipe.types';
import { RecipeForm } from './RecipeForm';
import { Modal } from '../common/Modal';

export interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  // Handle form submission
  const handleSubmit = (data: RecipeFormData) => {
    onSubmit(data);
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Recipe"
      size="xl"
      loading={isLoading}
      error={error}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      contentClassName="p-0"
    >
      <div className="p-6">
        <RecipeForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </Modal>
  );
};
