import React from 'react';
import { Stepper } from '../ui/Stepper';
import { Moon } from 'lucide-react';

export interface SleepQuestionProps {
  value: number;
  onChange: (val: number) => void;
}

export const SleepQuestion: React.FC<SleepQuestionProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#DCE9DF] flex items-center justify-center text-[#245532]">
          <Moon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#25233B]">
            How much sleep did you get last night?
          </h2>
          <p className="text-xs text-[#625F78]">
            Quality rest plays a major role in student mental clarity and nervous system balance.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <Stepper
          value={value}
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
