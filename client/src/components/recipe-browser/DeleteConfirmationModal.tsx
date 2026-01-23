import React from 'react';
import { ConfirmationModal } from '../common/Modal';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipeName: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipeName,
  isDeleting = false,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Recipe?"
      message={`Are you sure you want to delete "${recipeName}"? This action cannot be undone.`}
      confirmText="Delete Recipe"
      cancelText="Cancel"
      variant="danger"
      loading={isDeleting}
    />
  );
};
