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

  // Accurate countdown based on Date.now() elapsed time
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
  const strokeDashoffset = 283 - 283 * progressRatio; // Circle radius 45 -> circumference ~282.7

  return (
    <Card
      padding="lg"
      className={`border border-[#D9D5F4] bg-gradient-to-br from-[#F5F4FD] via-white to-[#F4DCCB]/20 transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Info & Breathing Guidance */}
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
            <Coffee className="w-4 h-4" />
            <span>Mindful Breather</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#25233B]">
              Five-Minute Screen Pause
            </h2>
            <p className="text-xs sm:text-sm text-[#625F78] leading-relaxed mt-1">
              Step away from your keyboard, soften your gaze, or take a gentle sip of water. Small pauses restore mental clarity.
            </p>
          </div>

          {/* Completion banner or subtle ambient guide */}
          {isCompleted ? (
            <div
              role="status"
              className="p-3 rounded-card bg-[#DCE9DF] border border-[#BCD4C3] flex items-center gap-2.5 text-xs text-[#245532]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#245532]" />
              <span>
                <strong>Breather complete.</strong> Notice how your body feels. Ready to return gently, or take another moment?
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-[#8E8AA7]">
              Ambient visual timer • Breathe at your own natural, comfortable rhythm.
            </p>
          )}
        </div>

        {/* Right: Circular Visual Pacing Timer & Controls */}
        <div className="flex flex-col items-center justify-center gap-4 shrink-0">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Ambient decorative soft breathing glow */}
            <div
              aria-hidden="true"
              className={`absolute inset-2 rounded-full bg-[#E9E7FB]/60 transition-transform duration-1000 ${
                isRunning ? 'animate-pulse scale-105' : 'scale-100'
              }`}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />

            {/* SVG Progress Ring */}
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#E8E6F1"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#5554B8"
                strokeWidth="6"
                fill="none"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-linear"
              />
            </svg>

            {/* Centered Digital Countdown */}
            <div className="absolute flex flex-col items-center justify-center select-none text-center">
              <span
                role="timer"
                aria-live="polite"
                aria-label={`Breather countdown: ${formattedTime} remaining`}
                className="text-2xl font-bold tracking-tight text-[#25233B]"
              >
                {formattedTime}
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#625F78]">
                {isRunning ? 'Relaxing' : isCompleted ? 'Completed' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning && !isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStart}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                {secondsLeft < totalSeconds ? 'Resume' : 'Start 5 Mins'}
              </Button>
            )}

            {isRunning && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                leftIcon={<Pause className="w-3.5 h-3.5" />}
              >
                Pause
              </Button>
            )}

            {isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRestart}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
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
