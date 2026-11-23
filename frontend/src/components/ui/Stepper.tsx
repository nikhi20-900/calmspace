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
  min = 0,
  max = 16,
  step = 0.5,
  unit = 'hours',
  label = 'Sleep Duration',
}) => {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(Math.max(min, Number((value - step).toFixed(1))));
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(Math.min(max, Number((value + step).toFixed(1))));
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-white rounded-card border border-[#E8E6F1]">
      <div className="flex items-center gap-2 text-xs font-medium text-[#625F78] mb-3">
        <Moon className="w-4 h-4 text-[#5554B8]" />
        <span>{label}</span>
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="Decrease sleep hours"
          className="w-11 h-11 flex items-center justify-center rounded-button bg-[#F7F6FB] border border-[#E8E6F1] text-[#25233B] hover:bg-[#E9E7FB] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[120px]">
          <span className="text-3xl font-bold text-[#25233B] tracking-tight">
            {value.toFixed(1)}
          </span>
          <span className="block text-xs font-medium text-[#625F78] mt-0.5">
            {unit} of sleep
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="Increase sleep hours"
          className="w-11 h-11 flex items-center justify-center rounded-button bg-[#F7F6FB] border border-[#E8E6F1] text-[#25233B] hover:bg-[#E9E7FB] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 text-xs text-[#625F78] text-center">
        {value < 6 && (
          <span className="text-[#8E4A00] font-medium bg-[#F6E6CC] px-2.5 py-0.5 rounded-full inline-block">
            Lighter rest — take gentle breaks today
          </span>
        )}
        {value >= 6 && value <= 9 && (
          <span className="text-[#245532] font-medium bg-[#DCE9DF] px-2.5 py-0.5 rounded-full inline-block">
            Healthy restorative range
          </span>
        )}
        {value > 9 && (
          <span className="text-[#5554B8] font-medium bg-[#E9E7FB] px-2.5 py-0.5 rounded-full inline-block">
            Extended recovery rest
          </span>
        )}
      </div>
    </div>
  );
};
