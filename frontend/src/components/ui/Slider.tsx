import React from 'react';

export interface SliderProps {
  id?: string;
  value: number | null;
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
  const steps: number[] = [];
  for (let i = min; i <= max; i += step) {
    steps.push(i);
  }

  // null = nothing selected yet; 0 and out-of-range values are treated as unset
  const hasSelection = value !== null && value >= min && value <= max;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = hasSelection ? value! : min - 1;
      if (cur < max) onChange(Math.min(max, cur + step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (hasSelection && value! > min) onChange(Math.max(min, value! - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div className="w-full space-y-4" id={id}>
      {/* Rating buttons */}
      <div
        className="grid grid-cols-5 gap-1.5 sm:gap-3"
        role="radiogroup"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
      >
        {steps.map((num) => {
          const isSelected = hasSelection && value === num;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(num)}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-button border text-center transition-all duration-200 min-h-[60px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${
                isSelected
                  ? 'bg-[#5554B8] text-white border-[#5554B8] shadow-sm'
                  : 'bg-white text-[#25233B] border-[#E8E6F1] hover:border-[#5554B8] hover:bg-[#F7F6FB]'
              }`}
            >
              <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-[#25233B]'}`}>
                {num}
              </span>
              {labels[num] && (
                <span
                  className={`text-[10px] sm:text-xs mt-0.5 font-medium leading-tight break-words text-center ${
                    isSelected ? 'text-[#E9E7FB]' : 'text-[#4D4A66]'
                  }`}
                >
                  {labels[num]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection feedback — only shown once a value is chosen */}
      <div className="text-center pt-1 min-h-[2.5rem]" aria-live="polite">
        {hasSelection ? (
          <>
            <p className="text-sm font-medium text-[#25233B]">
              Selected:{' '}
              <span className="font-bold text-[#5554B8]">
                {value} — {labels[value!]}
              </span>
            </p>
            {labelDescriptions && labelDescriptions[value!] && (
              <p className="text-xs text-[#4D4A66] mt-1 max-w-md mx-auto leading-relaxed">
                {labelDescriptions[value!]}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-[#6B6886] italic">No rating selected yet</p>
        )}
      </div>
    </div>
  );
};
