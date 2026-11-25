import React from 'react';
import { Slider } from '../ui/Slider';
import { Smile } from 'lucide-react';

export interface MoodQuestionProps {
  value: number | null;
  onChange: (val: number) => void;
}

export const MoodQuestion: React.FC<MoodQuestionProps> = ({ value, onChange }) => {
  const labels: Record<number, string> = {
    1: 'Very low',
    2: 'Low',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  };

  const descriptions: Record<number, string> = {
    1: 'Feeling heavy, depleted, or struggling to find emotional comfort today.',
    2: 'A bit flat, weary, or carrying some lingering discouragement.',
    3: 'Steady and balanced. Neither especially energized nor down.',
    4: 'Pleasantly content, steady focus, feeling capable with daily tasks.',
    5: 'Uplifted, joyful, or deeply revitalized in mind and body.',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <Smile className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            How has your mood felt today?
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select the rating that feels closest to your present state.
          </p>
        </div>
      </div>

      {value === null && (
        <p className="text-sm font-medium text-[var(--color-amber-text)]" role="status">
          Tap a rating below to continue.
        </p>
      )}

      <div className="pt-2">
        <Slider
          value={value}
          onChange={onChange}
          labels={labels}
          labelDescriptions={descriptions}
          ariaLabel="Mood rating scale from 1 (Very low) to 5 (Great)"
        />
      </div>
    </div>
  );
};
