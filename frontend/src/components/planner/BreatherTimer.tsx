import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Play, Pause, RotateCcw, Coffee, Sparkles, CheckCircle2 } from 'lucide-react';

export interface BreatherTimerProps {
  initialMinutes?: number;
  onComplete?: () => void;
  className?: string;
}

export const BreatherTimer: React.FC<BreatherTimerProps> = ({
  initialMinutes = 5,
  onComplete,
  className = '',
}) => {
  const totalSeconds = initialMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const targetEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRunning && targetEndTimeRef.current) {
      intervalId = setInterval(() => {
        if (!targetEndTimeRef.current) return;
        const now = Date.now();
        const diffMs = targetEndTimeRef.current - now;
        const remaining = Math.max(0, Math.ceil(diffMs / 1000));

        setSecondsLeft(remaining);

        if (remaining <= 0) {
          setIsRunning(false);
          setIsCompleted(true);
          targetEndTimeRef.current = null;
          onComplete?.();
        }
      }, 250);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, onComplete]);

  const handleStart = useCallback(() => {
    targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
    setIsCompleted(false);
  }, [secondsLeft]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsCompleted(false);
    targetEndTimeRef.current = null;
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  const handleRestart = useCallback(() => {
    setIsCompleted(false);
    setSecondsLeft(totalSeconds);
    targetEndTimeRef.current = Date.now() + totalSeconds * 1000;
    setIsRunning(true);
  }, [totalSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progressRatio = (totalSeconds - secondsLeft) / totalSeconds;
  const strokeDashoffset = 283 - 283 * progressRatio;

  return (
    <Card
      padding="lg"
      className={`border border-[var(--color-lavender-border)] bg-gradient-to-br from-[var(--color-lavender-light)] via-[var(--color-surface)] to-[var(--color-peach-light)] transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            <Coffee className="w-4 h-4" />
            <span>Mindful Breather</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">
              Five-Minute Screen Pause
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-1">
              Step away from your keyboard, soften your gaze, or take a gentle sip of water. Small pauses restore mental clarity.
            </p>
          </div>

          {isCompleted ? (
            <div
              role="status"
              className="p-3 rounded-card bg-[var(--color-sage-soft)] border border-[var(--color-sage-border)] flex items-center gap-2.5 text-sm text-[var(--color-sage-text)]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>Breather complete.</strong> Notice how your body feels. Ready to return gently, or take another moment?
              </span>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Ambient visual timer • Breathe at your own natural, comfortable rhythm.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 shrink-0">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div
              aria-hidden="true"
              className={`absolute inset-2 rounded-full bg-[var(--color-lavender-soft)]/70 transition-transform duration-1000 ${
                isRunning ? 'animate-pulse scale-105' : 'scale-100'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="45" stroke="var(--color-border)" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="var(--color-primary)"
                strokeWidth="6"
                fill="none"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-linear"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center select-none text-center">
              <span
                role="timer"
                aria-live="polite"
                aria-label={`Breather countdown: ${formattedTime} remaining`}
                className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]"
              >
                {formattedTime}
              </span>
              <span className="text-xs uppercase font-semibold tracking-wider text-[var(--color-text-secondary)]">
                {isRunning ? 'Relaxing' : isCompleted ? 'Completed' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning && !isCompleted && (
              <Button variant="primary" size="sm" onClick={handleStart} leftIcon={<Play className="w-3.5 h-3.5" />}>
                {secondsLeft < totalSeconds ? 'Resume' : 'Start 5 Mins'}
              </Button>
            )}

            {isRunning && (
              <Button variant="secondary" size="sm" onClick={handlePause} leftIcon={<Pause className="w-3.5 h-3.5" />}>
                Pause
              </Button>
            )}

            {isCompleted && (
              <Button variant="primary" size="sm" onClick={handleRestart} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                Take Another 5 Mins
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={secondsLeft === totalSeconds && !isCompleted}
              aria-label="Reset breather timer"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
