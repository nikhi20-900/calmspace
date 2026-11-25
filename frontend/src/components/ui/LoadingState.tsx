import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading calm space...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full bg-[var(--color-lavender-soft)] flex items-center justify-center mb-3 animate-gentle-pulse">
        <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
};
