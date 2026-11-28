import React, { useEffect, useRef, useState } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

type BreathingPhase = 'inhale' | 'hold' | 'exhale';
type DurationMinutes = 1 | 3 | 5;

const PHASE_DURATION_SECONDS = 4; // 4-4-4 breathing pattern
const DURATION_OPTIONS: readonly DurationMinutes[] = [1, 3, 5];

const PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
};

function getPhaseFromElapsed(elapsedSeconds: number): {
  phase: BreathingPhase;
  phaseSecondsLeft: number;
} {
  const cyclePos = elapsedSeconds % (PHASE_DURATION_SECONDS * 3);
  if (cyclePos < PHASE_DURATION_SECONDS) {
    return { phase: 'inhale', phaseSecondsLeft: PHASE_DURATION_SECONDS - cyclePos };
  }
  if (cyclePos < PHASE_DURATION_SECONDS * 2) {
    return {
      phase: 'hold',
      phaseSecondsLeft: PHASE_DURATION_SECONDS * 2 - cyclePos,
    };
  }
  return {
    phase: 'exhale',
    phaseSecondsLeft: PHASE_DURATION_SECONDS * 3 - cyclePos,
  };
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const BreathingBubbleSection: React.FC = () => {
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(1);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false); // Muted by default

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastCuePhaseRef = useRef<BreathingPhase | null>(null);

  const totalSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const { phase, phaseSecondsLeft } = getPhaseFromElapsed(elapsedSeconds);

  const playSoftCue = (currentPhase: BreathingPhase) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value =
        currentPhase === 'inhale' ? 440 : currentPhase === 'hold' ? 523.25 : 349.23;

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignore Web Audio errors safely
    }
  };

  useEffect(() => {
    if (status !== 'running') return;

    if (lastCuePhaseRef.current !== phase) {
      lastCuePhaseRef.current = phase;
      playSoftCue(phase);
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          setStatus('completed');
          return totalSeconds;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status, phase, totalSeconds, soundEnabled]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleSelectDuration = (mins: DurationMinutes) => {
    setDurationMinutes(mins);
    setStatus('idle');
    setElapsedSeconds(0);
    lastCuePhaseRef.current = null;
  };

  const handleStart = () => {
    setElapsedSeconds(0);
    lastCuePhaseRef.current = null;
    setStatus('running');
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleResume = () => {
    setStatus('running');
  };

  const handleRestart = () => {
    setElapsedSeconds(0);
    lastCuePhaseRef.current = null;
    setStatus('idle');
  };

  // Bubble scale by phase: expands on inhale, stays expanded on hold, contracts on exhale
  const bubbleScaleClass =
    status === 'idle' || status === 'completed'
      ? 'scale-95'
      : phase === 'inhale' || phase === 'hold'
        ? 'scale-110'
        : 'scale-75';

  return (
    <section aria-label="Breathing Bubble">
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
              <Wind className="w-4 h-4" />
              <span>4–4–4 Guided Breathing</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
              Breathing Bubble
            </h2>
            <p className="text-xs text-[#625F78]">
              Inhale 4s • Hold 4s • Exhale 4s. Follow the gentle rhythm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Duration Selector */}
            <div
              role="group"
              aria-label="Select breathing duration"
              className="inline-flex items-center gap-1 p-1 bg-[#F7F6FB] rounded-button border border-[#E8E6F1]"
            >
              {DURATION_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectDuration(mins)}
                  aria-pressed={durationMinutes === mins}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                    durationMinutes === mins
                      ? 'bg-[#5554B8] text-white'
                      : 'text-[#625F78] hover:text-[#25233B] hover:bg-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Optional Sound Cue Toggle (Muted by default) */}
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Mute breathing sound cues' : 'Enable breathing sound cues'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button border border-[#E8E6F1] bg-white text-xs font-medium text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#5554B8]" />
                  <span>Cues On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bubble Stage */}
        <div className="py-4 flex flex-col items-center justify-center gap-4 bg-[#F7F6FB] rounded-card border border-[#E8E6F1]/80">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div
              className={`w-36 h-36 rounded-full bg-gradient-to-br from-[#E9E7FB] via-[#DCD9F8] to-[#DCE9DF]/80 border-2 border-[#5554B8]/30 shadow-soft flex flex-col items-center justify-center text-center transition-transform duration-[4000ms] ease-in-out ${bubbleScaleClass}`}
            >
              {status === 'completed' ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-[#245532] mb-1" />
                  <span className="text-sm font-bold text-[#245532]">Complete</span>
                </>
              ) : status === 'idle' ? (
                <>
                  <span className="text-sm font-bold text-[#25233B]">Ready</span>
                  <span className="text-xs text-[#625F78] mt-0.5">
                    {formatClock(remainingSeconds)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base font-bold text-[#25233B]" aria-live="polite">
                    {PHASE_LABELS[phase]}
                  </span>
                  <span className="text-xs font-semibold text-[#5554B8] mt-0.5">
                    {phaseSecondsLeft}s
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Remaining Time & Completion Message */}
          <div className="text-center space-y-1 px-4">
            {status === 'completed' ? (
              <p className="text-xs sm:text-sm font-medium text-[#245532]">
                Well done. You completed your {durationMinutes}-minute breathing pause.
              </p>
            ) : (
              <p className="text-xs text-[#625F78]">
                Time remaining:{' '}
                <strong className="text-[#25233B] font-semibold">
                  {formatClock(remainingSeconds)}
                </strong>
                {status === 'paused' && ' • Paused'}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-4">
            {status === 'idle' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Play className="w-4 h-4" />}
                onClick={handleStart}
              >
                Start
              </Button>
            )}

            {status === 'running' && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pause className="w-4 h-4" />}
                onClick={handlePause}
              >
                Pause
              </Button>
            )}

            {status === 'paused' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Play className="w-4 h-4" />}
                onClick={handleResume}
              >
                Resume
              </Button>
            )}

            {(status === 'running' || status === 'paused' || status === 'completed') && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={handleRestart}
              >
                Restart
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
};
