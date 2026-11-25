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
      className="w-full flex flex-col items-center justify-center p-4 bg-white rounded-card border border-[#E8E6F1] focus-within:ring-2 focus-within:ring-[#5554B8]"
      role="group"
      aria-label={label}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-[#625F78] mb-3">
        <Moon className="w-4 h-4 text-[#5554B8]" />
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
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-[#F7F6FB] border border-[#E8E6F1] text-[#25233B] hover:bg-[#E9E7FB] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[120px]">
          <span className="text-3xl font-bold text-[#25233B] tracking-tight">
            {safeValue.toFixed(1)}
          </span>
          <span className="block text-xs font-medium text-[#625F78] mt-0.5">
            {unit} of sleep
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={safeValue >= max}
          aria-label="Increase sleep hours by 0.5"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-[#F7F6FB] border border-[#E8E6F1] text-[#25233B] hover:bg-[#E9E7FB] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 text-xs text-[#625F78] text-center" aria-live="polite">
        {safeValue < 4.0 && (
          <span className="text-[#8E4A00] font-medium bg-[#F6E6CC] px-2.5 py-0.5 rounded-full inline-block">
            Very short rest — prioritize pacing today
          </span>
        )}
        {safeValue >= 4.0 && safeValue < 6.0 && (
          <span className="text-[#7A4D05] font-medium bg-[#FBF0EA] px-2.5 py-0.5 rounded-full inline-block">
            Lighter rest — take gentle study breaks
          </span>
        )}
        {safeValue >= 6.0 && safeValue <= 9.0 && (
          <span className="text-[#245532] font-medium bg-[#DCE9DF] px-2.5 py-0.5 rounded-full inline-block">
            Healthy restorative range
          </span>
        )}
        {safeValue > 9.0 && (
          <span className="text-[#5554B8] font-medium bg-[#E9E7FB] px-2.5 py-0.5 rounded-full inline-block">
            Extended recovery rest
          </span>
        )}
      </div>
    </div>
  );
};
