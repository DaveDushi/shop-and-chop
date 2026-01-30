import React from 'react';
import { Scale, Users, Info } from 'lucide-react';
import { useHouseholdSize } from '../../contexts/HouseholdSizeContext';

interface ScalingInfoProps {
  /** Whether to show the scaling information */
  show?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact display mode */
  compact?: boolean;
}

/**
 * Component to display scaling information in shopping lists
 * Shows household size and indicates that quantities are scaled
 */
export const ScalingInfo: React.FC<ScalingInfoProps> = ({
  show = true,
  className = '',
  compact = false,
}) => {
  const { householdSize } = useHouseholdSize();

  if (!show) {
    return null;
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 text-xs text-blue-600 ${className}`}>
        <Scale className="h-3 w-3" />
        <span>Scaled for {householdSize}</span>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900">Scaled Quantities</h4>
          <p className="text-sm text-blue-700 mt-1">
            All ingredient quantities have been automatically scaled for your household size of{' '}
            <span className="font-medium inline-flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {householdSize} {householdSize === 1 ? 'person' : 'people'}
            </span>
            . Manual serving overrides for specific recipes are preserved.
          </p>
        </div>
      </div>
    </div>
  );
};