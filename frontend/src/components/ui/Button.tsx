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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-button transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-sm px-3.5 py-1.5 min-h-[38px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2', // meets minimum 44px touch target
    lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] shadow-sm',
    secondary: 'bg-[#E9E7FB] text-[#25233B] hover:bg-[#DCD8F7] active:bg-[#CFC9F3]',
    outline: 'border border-[#E8E6F1] bg-white text-[#25233B] hover:bg-[#F7F6FB] hover:border-[#D5D1E5] active:bg-[#EFEFF8]',
    ghost: 'text-[#625F78] hover:text-[#25233B] hover:bg-[#E9E7FB]/50 active:bg-[#E9E7FB]',
    urgent: 'bg-[#25233B] text-white hover:bg-[#1A192A] active:bg-[#12111E] shadow-sm',
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
