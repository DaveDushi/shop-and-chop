import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'touch-manipulation',
      'active:scale-95 transition-transform duration-75',
    ];

    const variantClasses = {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-primary-700 active:bg-primary-800',
        'focus-visible:ring-primary-500',
      ],
      secondary: [
        'bg-gray-100 text-gray-900',
        'hover:bg-gray-200 active:bg-gray-300',
        'focus-visible:ring-gray-500',
      ],
      outline: [
        'border border-gray-300 bg-white text-gray-700',
        'hover:bg-gray-50 active:bg-gray-100',
        'focus-visible:ring-gray-500',
      ],
      ghost: [
        'text-gray-700',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus-visible:ring-gray-500',
      ],
      danger: [
        'bg-red-600 text-white',
        'hover:bg-red-700 active:bg-red-800',
        'focus-visible:ring-red-500',
      ],
    };

    const sizeClasses = {
      sm: 'h-9 px-3 text-sm min-w-[2.25rem]',
      md: 'h-11 px-4 text-sm min-w-[2.75rem]',
      lg: 'h-12 px-6 text-base min-w-[3rem]',
      icon: 'h-11 w-11 p-0',
    };

    // Ensure minimum touch target size on mobile
    const mobileClasses = [
      'min-h-touch min-w-touch',
      size === 'sm' ? 'xs:min-h-[2.75rem]' : '',
      size === 'md' ? 'xs:min-h-[3rem]' : '',
      size === 'lg' ? 'xs:min-h-[3.25rem]' : '',
    ];

    const widthClasses = fullWidth ? 'w-full' : '';

    const LoadingSpinner = () => (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          mobileClasses,
          widthClasses,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

// Floating Action Button for mobile
interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'md' | 'lg';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  position = 'bottom-right',
  size = 'md',
  className,
  ...props
}) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 transform -translate-x-1/2',
  };

  const sizeClasses = {
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full',
        'bg-primary-600 text-white shadow-lg',
        'hover:bg-primary-700 active:bg-primary-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'transition-all duration-200',
        'touch-manipulation',
        'z-50',
        positionClasses[position],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
};

// Icon button optimized for mobile
interface MobileIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

export const MobileIconButton: React.FC<MobileIconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  rounded = true,
  className,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    'touch-manipulation',
    'min-h-touch min-w-touch',
  ];

  const variantClasses = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700 active:bg-primary-800',
      'focus-visible:ring-primary-500',
    ],
    secondary: [
      'bg-gray-100 text-gray-900',
      'hover:bg-gray-200 active:bg-gray-300',
      'focus-visible:ring-gray-500',
    ],
    outline: [
      'border border-gray-300 bg-white text-gray-700',
      'hover:bg-gray-50 active:bg-gray-100',
      'focus-visible:ring-gray-500',
    ],
    ghost: [
      'text-gray-700',
      'hover:bg-gray-100 active:bg-gray-200',
      'focus-visible:ring-gray-500',
    ],
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 active:bg-red-800',
      'focus-visible:ring-red-500',
    ],
  };

  const sizeClasses = {
    sm: 'h-9 w-9 p-2',
    md: 'h-11 w-11 p-2.5',
    lg: 'h-12 w-12 p-3',
  };

  const shapeClasses = rounded ? 'rounded-full' : 'rounded-md';

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        shapeClasses,
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
};