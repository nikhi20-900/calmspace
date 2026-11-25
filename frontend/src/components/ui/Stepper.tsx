import React from 'react';
import { Minus, Plus, Moon } from 'lucide-react';

export interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0.0,
  max = 24.0,
  step = 0.5,
  unit = 'hours',
  label = 'Sleep Duration',
}) => {
  const safeValue = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 7.0;

  const handleDecrement = () => {
    if (safeValue - step >= min) {
      onChange(Math.max(min, Number((safeValue - step).toFixed(1))));
    }
  };

  const handleIncrement = () => {
    if (safeValue + step <= max) {
      onChange(Math.min(max, Number((safeValue + step).toFixed(1))));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-4 bg-[var(--color-surface)] rounded-card border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]"
      role="group"
      aria-label={label}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-3">
        <Moon className="w-4 h-4 text-[var(--color-primary)]" />
        <span>{label} (0.0 to 24.0 hours)</span>
      </div>

      <div
        className="flex items-center justify-center gap-4 sm:gap-6"
        tabIndex={0}
        role="spinbutton"
        aria-valuenow={safeValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`${label} in hours`}
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={safeValue <= min}
          aria-label="Decrease sleep hours by 0.5"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-lavender-soft)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[120px]">
          <span className="text-3xl font-bold text-[var(--color-text-main)] tracking-tight">
            {safeValue.toFixed(1)}
          </span>
          <span className="block text-sm font-medium text-[var(--color-text-secondary)] mt-0.5">
            {unit} of sleep
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={safeValue >= max}
          aria-label="Increase sleep hours by 0.5"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-lavender-soft)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 text-sm text-[var(--color-text-secondary)] text-center" aria-live="polite">
        {safeValue < 4.0 && (
          <span className="text-[var(--color-amber-text)] font-medium bg-[var(--color-amber-soft)] px-3 py-1 rounded-full inline-block">
            Very short rest — prioritize pacing today
          </span>
        )}
        {safeValue >= 4.0 && safeValue < 6.0 && (
          <span className="text-[var(--color-amber-text)] font-medium bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] px-3 py-1 rounded-full inline-block">
            Lighter rest — take gentle study breaks
          </span>
        )}
        {safeValue >= 6.0 && safeValue <= 9.0 && (
          <span className="text-[var(--color-sage-text)] font-medium bg-[var(--color-sage-soft)] px-3 py-1 rounded-full inline-block">
            Healthy restorative range
          </span>
        )}
        {safeValue > 9.0 && (
          <span className="text-[var(--color-primary)] font-medium bg-[var(--color-lavender-soft)] px-3 py-1 rounded-full inline-block">
            Extended recovery rest
          </span>
        )}
      </div>
    </div>
  );
};
