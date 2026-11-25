import React from 'react';
import { Stepper } from '../ui/Stepper';
import { Moon } from 'lucide-react';

export interface SleepQuestionProps {
  value: number | null;
  onChange: (val: number) => void;
}

/** Quick-pick sleep presets for thumb-friendly interaction */
const SLEEP_PRESETS = [
  { label: '< 4 h', hours: 3.5 },
  { label: '5 h', hours: 5 },
  { label: '6 h', hours: 6 },
  { label: '7 h', hours: 7 },
  { label: '8 h', hours: 8 },
  { label: '9+ h', hours: 9 },
];

export const SleepQuestion: React.FC<SleepQuestionProps> = ({ value, onChange }) => {
  const displayValue = value ?? 7.0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#DCE9DF] flex items-center justify-center text-[#245532]">
          <Moon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#25233B]">
            How much sleep did you get last night?
          </h2>
          <p className="text-sm text-[#4D4A66]">
            Quality rest plays a major role in mental clarity and nervous system balance.
          </p>
        </div>
      </div>

      {/* Quick-pick chips */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#4D4A66] mb-2">
          Quick select
        </span>
        <div className="flex flex-wrap gap-2">
          {SLEEP_PRESETS.map((preset) => {
            const isSelected = value !== null && Math.abs(value - preset.hours) < 0.01;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.hours)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  isSelected
                    ? 'bg-[#5554B8] text-white border-[#5554B8]'
                    : 'bg-white text-[#25233B] border-[#E8E6F1] hover:border-[#5554B8] hover:text-[#5554B8]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-tune stepper */}
      <div className="pt-1">
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#4D4A66] mb-2">
          Fine-tune
        </span>
        <Stepper
          value={displayValue}
          onChange={onChange}
          min={0.0}
          max={24.0}
          step={0.5}
          unit="hours"
          label="Total sleep logged"
        />
      </div>
    </div>
  );
};
