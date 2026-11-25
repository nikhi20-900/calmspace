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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#DCE9DF] text-[#245532] border border-[#BCD4C3] ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label || 'Doing okay'}</span>
      </span>
    );
  }

  if (route === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F6E6CC] text-[#7A4D05] border border-[#E8CEA5] ${className}`}>
        <Compass className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label || 'Worth some support'}</span>
      </span>
    );
  }

  if (route === 'HIGH') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#25233B] text-white border border-[#3A3855] ${className}`}>
        <HeartHandshake className="w-3.5 h-3.5 text-[#E9E7FB]" aria-hidden="true" />
        <span>{label || "Let's get you support"}</span>
      </span>
    );
  }

  // Generic badge fallback
  const variantMap = {
    sage: 'bg-[#DCE9DF] text-[#245532] border-[#BCD4C3]',
    amber: 'bg-[#F6E6CC] text-[#7A4D05] border-[#E8CEA5]',
    lavender: 'bg-[#E9E7FB] text-[#5554B8] border-[#D9D5F4]',
    neutral: 'bg-[#F7F6FB] text-[#625F78] border-[#E8E6F1]',
    urgent: 'bg-[#25233B] text-white border-[#3A3855]',
  };

  const chosen = variantMap[variant || 'neutral'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${chosen} ${className}`}>
      <span>{label}</span>
    </span>
  );
};
