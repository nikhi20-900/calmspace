import React from 'react';
import { Wind, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { BreathingSessionState } from '../../hooks/useVoiceCompanion';

export interface GuidedBreathingPanelProps {
  breathing: BreathingSessionState;
  onStop: () => void;
  onSwitchPattern: (pattern: 'calm_4_4' | 'box' | '4-7-8') => void;
}

export const GuidedBreathingPanel: React.FC<GuidedBreathingPanelProps> = ({
  breathing,
  onStop,
  onSwitchPattern,
}) => {
  if (!breathing.active) return null;

  return (
    <div
      role="region"
      aria-label="Guided breathing exercise"
      className="p-4 sm:p-5 rounded-card bg-gradient-to-br from-[#EEF7F5] via-white to-[#F2F1FD] border border-[#BDE0D8] shadow-soft space-y-4 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#245532]">
            <Wind className="w-4 h-4" />
            <span>{breathing.label}</span>
          </div>
          <p className="text-xs text-[#625F78] mt-0.5">
            Calm expands and softens with your breath. Stop anytime if it feels uncomfortable.
          </p>
        </div>

        <button
          type="button"
          onClick={onStop}
          aria-label="Stop guided breathing"
          className="p-1.5 rounded-button text-[#625F78] hover:text-[#25233B] hover:bg-white/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white/90 rounded-xl p-3.5 border border-[#DCEEE9]">
        <div>
          <span
            aria-live="polite"
            className="text-xl font-bold text-[#25233B] block"
          >
            {breathing.phaseLabel}
          </span>
          <span className="text-xs text-[#625F78]">
            {breathing.cyclesCompleted} cycle{breathing.cyclesCompleted === 1 ? '' : 's'} completed
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full bg-[#DCEEE9] border-2 border-[#5554B8]/40 flex items-center justify-center font-bold text-base text-[#25233B] transition-transform duration-150"
            style={{
              transform: `scale(${0.86 + breathing.phase01 * 0.28})`,
            }}
          >
            {breathing.secondsInPhase}s
          </div>
          <Button variant="outline" size="sm" onClick={onStop}>
            Finish Breathing
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'calm_4_4', label: '4-4 Gentle' },
            { id: 'box', label: 'Box (4-4-4-4)' },
            { id: '4-7-8', label: '4-7-8 Calm' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSwitchPattern(item.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              breathing.pattern === item.id
                ? 'bg-[#245532] text-white'
                : 'bg-white text-[#625F78] border border-[#E8E6F1] hover:text-[#25233B]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
