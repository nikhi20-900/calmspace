import React from 'react';
import { Slider } from '../ui/Slider';
import { Activity } from 'lucide-react';

export interface StressQuestionProps {
  value: number;
  onChange: (val: number) => void;
}

export const StressQuestion: React.FC<StressQuestionProps> = ({ value, onChange }) => {
  const labels: Record<number, string> = {
    1: 'Very low',
    2: 'Low',
    3: 'Moderate',
    4: 'High',
    5: 'Very high',
  };

  const descriptions: Record<number, string> = {
    1: 'Calm and unbothered. Minimal mental or academic pressure.',
    2: 'Manageable. You have tasks ahead, but you feel in control.',
    3: 'Noticeable pressure from assignments, exams, or routine demands.',
    4: 'Tense, hurried, or feeling close to being stretched thin.',
    5: 'Overwhelmed. Feeling like too much is demanding your attention at once.',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#F6E6CC] flex items-center justify-center text-[#7A4D05]">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#25233B]">
            What is your current stress level?
          </h2>
          <p className="text-xs text-[#625F78]">
            Be honest with where you are. There are no right or wrong answers.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <Slider
          value={value}
          onChange={onChange}
          labels={labels}
          labelDescriptions={descriptions}
        />
      </div>
    </div>
  );
};
