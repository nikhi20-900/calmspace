import React, { useRef } from 'react';

export interface SliderProps {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  labels?: Record<number, string>;
  labelDescriptions?: Record<number, string>;
  name?: string;
  ariaLabel?: string;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  value,
  min = 1,
  max = 5,
  step = 1,
  onChange,
  labels = {
    1: 'Very low',
    2: 'Low',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  },
  labelDescriptions,
  ariaLabel = 'Rating scale from 1 to 5',
}) => {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const steps: number[] = [];
  for (let i = min; i <= max; i += step) {
    steps.push(i);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let nextValue = value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextValue = Math.min(max, value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextValue = Math.max(min, value - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextValue = min;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextValue = max;
    } else {
      return;
    }

    onChange(nextValue);
    const optionIndex = steps.indexOf(nextValue);
    optionRefs.current[optionIndex]?.focus();
  };

  return (
    <div className="w-full space-y-4" id={id}>
      {/* Slider buttons row for clear, accessible touch targets (min 44px) with roving tabindex */}
      <div
        className="grid grid-cols-5 gap-1.5 sm:gap-3"
        role="radiogroup"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
      >
        {steps.map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              ref={(element) => { optionRefs.current[steps.indexOf(num)] = element; }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(num)}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-button border text-center transition-all duration-200 min-h-[56px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${
                isSelected
                  ? 'bg-[#5554B8] text-white border-[#5554B8] shadow-sm font-semibold'
                  : 'bg-white text-[#25233B] border-[#E8E6F1] hover:border-[#D5D1E5] hover:bg-[#F7F6FB]'
              }`}
            >
              <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-[#25233B]'}`}>
                {num}
              </span>
              <span
                className={`text-[10px] sm:text-xs mt-0.5 font-medium leading-tight max-w-full text-center break-words ${
                  isSelected ? 'text-[#E9E7FB]' : 'text-[#625F78]'
                }`}
              >
                {labels[num] || ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected label and description highlight */}
      <div className="text-center pt-1" aria-live="polite">
        <p className="text-sm font-medium text-[#25233B]">
          Selected: <span className="font-semibold text-[#5554B8]">{value} — {labels[value]}</span>
        </p>
        {labelDescriptions && labelDescriptions[value] && (
          <p className="text-xs text-[#625F78] mt-1 max-w-md mx-auto leading-relaxed">
            {labelDescriptions[value]}
          </p>
        )}
      </div>
    </div>
  );
};
