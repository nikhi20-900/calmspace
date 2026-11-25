import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'urgent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-button transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-sm px-3.5 py-1.5 min-h-[38px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[var(--color-primary-fill)] text-white hover:bg-[var(--color-primary-fill-hover)] active:bg-[var(--color-primary-fill-active)] shadow-sm',
    secondary:
      'bg-[var(--color-lavender-soft)] text-[var(--color-text-main)] hover:bg-[var(--color-lavender-border)] active:opacity-90',
    outline:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-bg)] hover:border-[var(--color-border-dark)]',
    ghost:
      'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-lavender-soft)]/50 active:bg-[var(--color-lavender-soft)]',
    urgent:
      'bg-[var(--color-urgent-bg)] text-[var(--color-urgent-text)] hover:bg-[var(--color-urgent-hover)] shadow-sm',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
