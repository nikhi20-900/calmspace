import React from 'react';
import { CheckCircle2, Compass, HeartHandshake } from 'lucide-react';
import { RiskRoute } from '../../types';

export interface BadgeProps {
  route?: RiskRoute;
  label?: string;
  variant?: 'sage' | 'amber' | 'lavender' | 'neutral' | 'urgent';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  route,
  label,
  variant,
  className = '',
}) => {
  // If route is supplied, strictly adhere to non-color-only risk tokens
  if (route === 'LOW') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-sage-soft)] text-[var(--color-sage-text)] border border-[var(--color-sage-border)] ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label || 'Doing okay'}</span>
      </span>
    );
  }

  if (route === 'MEDIUM') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] border border-[var(--color-amber-border)] ${className}`}
      >
        <Compass className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label || 'Worth some support'}</span>
      </span>
    );
  }

  if (route === 'HIGH') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-[var(--color-urgent-bg)] text-[var(--color-urgent-text)] border border-[var(--color-urgent-border)] ${className}`}
      >
        <HeartHandshake className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
        <span>{label || "Let's get you support"}</span>
      </span>
    );
  }

  const variantMap = {
    sage: 'bg-[var(--color-sage-soft)] text-[var(--color-sage-text)] border-[var(--color-sage-border)]',
    amber: 'bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] border-[var(--color-amber-border)]',
    lavender: 'bg-[var(--color-lavender-soft)] text-[var(--color-primary)] border-[var(--color-lavender-border)]',
    neutral: 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
    urgent: 'bg-[var(--color-urgent-bg)] text-[var(--color-urgent-text)] border-[var(--color-urgent-border)]',
  };

  const chosen = variantMap[variant || 'neutral'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${chosen} ${className}`}>
      <span>{label}</span>
    </span>
  );
};
