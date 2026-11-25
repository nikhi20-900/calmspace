import React, { useRef } from 'react';

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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const steps: number[] = [];
  for (let i = min; i <= max; i += step) {
    steps.push(i);
  }

  // null = nothing selected yet; 0 and out-of-range values are treated as unset
  const hasSelection = value !== null && value >= min && value <= max;

  const selectAndFocus = (targetVal: number) => {
    onChange(targetVal);
    const targetIdx = steps.indexOf(targetVal);
    if (targetIdx >= 0) {
      buttonRefs.current[targetIdx]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = hasSelection ? value! : min - step;
      const nextVal = Math.min(max, cur + step);
      selectAndFocus(nextVal);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextVal = hasSelection ? Math.max(min, value! - step) : min;
      selectAndFocus(nextVal);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectAndFocus(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectAndFocus(max);
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
        {steps.map((num, idx) => {
          const isSelected = hasSelection && value === num;
          const isFocusable = hasSelection ? isSelected : idx === 0;
          return (
            <button
              key={num}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isFocusable ? 0 : -1}
              onClick={() => onChange(num)}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-button border text-center transition-all duration-200 min-h-[64px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                isSelected
                  ? 'bg-[var(--color-primary-fill)] text-white border-[var(--color-primary-fill)] shadow-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)]'
              }`}
            >
              <span
                className={`text-base font-bold ${
                  isSelected ? 'text-white' : 'text-[var(--color-text-main)]'
                }`}
              >
                {num}
              </span>
              {labels[num] && (
                <span
                  className={`text-xs sm:text-sm mt-0.5 font-medium leading-tight break-words text-center ${
                    isSelected ? 'text-white/95' : 'text-[var(--color-text-secondary)]'
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
      <div className="text-center pt-1 min-h-[2.75rem]" aria-live="polite">
        {hasSelection ? (
          <>
            <p className="text-sm font-medium text-[var(--color-text-main)]">
              Selected:{' '}
              <span className="font-bold text-[var(--color-primary)]">
                {value} — {labels[value!]}
              </span>
            </p>
            {labelDescriptions && labelDescriptions[value!] && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-md mx-auto leading-relaxed">
                {labelDescriptions[value!]}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">No rating selected yet</p>
        )}
      </div>
    </div>
  );
};
