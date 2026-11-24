import React from 'react';

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
}) => {
  const steps = [];
  for (let i = min; i <= max; i += step) {
    steps.push(i);
  }

  return (
    <div className="w-full space-y-4">
      {/* Slider buttons row for clear, accessible touch targets (min 44px) */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3" role="radiogroup" aria-label="Rating scale">
        {steps.map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(num)}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-button border text-center transition-all duration-200 min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                isSelected
                  ? 'bg-[#5554B8] text-white border-[#5554B8] shadow-sm'
                  : 'bg-white text-[#25233B] border-[#E8E6F1] hover:border-[#D5D1E5] hover:bg-[#F7F6FB]'
              }`}
            >
              <span className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-[#25233B]'}`}>
                {num}
              </span>
              <span className={`text-xs mt-0.5 font-medium truncate max-w-full ${
                isSelected ? 'text-[#E9E7FB]' : 'text-[#625F78]'
              }`}>
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
          <p className="text-xs text-[#625F78] mt-1 max-w-md mx-auto">
            {labelDescriptions[value]}
          </p>
        )}
      </div>
    </div>
  );
};
