import React, { useEffect, useRef, useState } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

type BreathingPhase = 'inhale' | 'hold' | 'exhale';
type DurationMinutes = 1 | 3 | 5;

const PHASE_DURATION_MS = 4000; // 4-4-4 breathing pattern
const CYCLE_DURATION_MS = PHASE_DURATION_MS * 3;
const DURATION_OPTIONS: readonly DurationMinutes[] = [1, 3, 5];

const PHASE_ORDER: readonly BreathingPhase[] = ['inhale', 'hold', 'exhale'];

const PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
};

const PHASE_GUIDANCE: Record<BreathingPhase, string> = {
  inhale: 'Draw air in slowly through your nose',
  hold: 'Rest gently with full lungs',
  exhale: 'Release tension softly through your mouth',
};

function getPhaseStateFromMs(elapsedMs: number): {
  phase: BreathingPhase;
  phaseProgress: number;
  phaseSecondsLeft: number;
  cyclesCompleted: number;
} {
  const cyclePosMs = elapsedMs % CYCLE_DURATION_MS;
  const cyclesCompleted = Math.floor(elapsedMs / CYCLE_DURATION_MS);

  if (cyclePosMs < PHASE_DURATION_MS) {
    return {
      phase: 'inhale',
      phaseProgress: cyclePosMs / PHASE_DURATION_MS,
      phaseSecondsLeft: Math.ceil((PHASE_DURATION_MS - cyclePosMs) / 1000),
      cyclesCompleted,
    };
  }
  if (cyclePosMs < PHASE_DURATION_MS * 2) {
    const pos = cyclePosMs - PHASE_DURATION_MS;
    return {
      phase: 'hold',
      phaseProgress: pos / PHASE_DURATION_MS,
      phaseSecondsLeft: Math.ceil((PHASE_DURATION_MS - pos) / 1000),
      cyclesCompleted,
    };
  }
  const pos = cyclePosMs - PHASE_DURATION_MS * 2;
  return {
    phase: 'exhale',
    phaseProgress: pos / PHASE_DURATION_MS,
    phaseSecondsLeft: Math.ceil((PHASE_DURATION_MS - pos) / 1000),
    cyclesCompleted,
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
  const [elapsedMs, setElapsedMs] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false); // Muted by default

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastCuePhaseRef = useRef<BreathingPhase | null>(null);

  const totalMs = durationMinutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  const sessionProgress = Math.min(100, (elapsedMs / totalMs) * 100);

  const { phase, phaseProgress, phaseSecondsLeft, cyclesCompleted } =
    getPhaseStateFromMs(elapsedMs);

  const playSoftCue = (currentPhase: BreathingPhase) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        currentPhase === 'inhale' ? 432 : currentPhase === 'hold' ? 518 : 346;

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

    const interval = window.setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + 100;
        if (next >= totalMs) {
          setStatus('completed');
          return totalMs;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [status, phase, totalMs, soundEnabled]);

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
    setElapsedMs(0);
    lastCuePhaseRef.current = null;
  };

  const handleStart = () => {
    setElapsedMs(0);
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
    setElapsedMs(0);
    lastCuePhaseRef.current = null;
    setStatus('idle');
  };

  const handleBubbleClick = () => {
    if (status === 'idle' || status === 'completed') {
      handleStart();
    } else if (status === 'running') {
      handlePause();
    } else if (status === 'paused') {
      handleResume();
    }
  };

  // Continuous smooth bubble scale based on exact ms progress
  const bubbleScale =
    status === 'idle' || status === 'completed'
      ? 0.92
      : phase === 'inhale'
        ? 0.78 + 0.34 * phaseProgress
        : phase === 'hold'
          ? 1.12
          : 1.12 - 0.34 * phaseProgress;

  const haloScale =
    status === 'running'
      ? bubbleScale + 0.14
      : 1.0;

  // SVG Ring Math
  const ringRadius = 92;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    status === 'idle'
      ? ringCircumference
      : status === 'completed'
        ? 0
        : ringCircumference * (1 - phaseProgress);

  const ringStrokeColor =
    phase === 'inhale'
      ? '#5554B8'
      : phase === 'hold'
        ? '#245532'
        : '#7C7AD6';

  return (
    <section aria-label="Breathing Bubble">
      <Card padding="lg" className="space-y-5">
        {/* Header & Duration / Sound Controls */}
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
              Inhale 4s • Hold 4s • Exhale 4s. Tap the bubble or press Start.
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

        {/* Interactive Breathing Stage */}
        <div className="p-5 sm:p-6 flex flex-col items-center justify-center gap-5 bg-[#F7F6FB] rounded-card border border-[#E8E6F1]/80">
          {/* Live 3-Phase Indicator Pills */}
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Breathing cycle phases"
          >
            {PHASE_ORDER.map((pKey, idx) => {
              const isCurrent = (status === 'running' || status === 'paused') && phase === pKey;
              return (
                <div
                  key={pKey}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isCurrent
                      ? pKey === 'hold'
                        ? 'bg-[#DCE9DF] text-[#245532] border-[#BCD4C3] shadow-subtle'
                        : 'bg-[#5554B8] text-white border-[#5554B8] shadow-subtle'
                      : 'bg-white text-[#625F78] border-[#E8E6F1]'
                  }`}
                >
                  <span>{idx + 1}. {PHASE_LABELS[pKey]}</span>
                  <span className="opacity-75">4s</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Concentric Bubble + SVG Phase Progress Ring */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Outer ambient halo */}
            <div
              aria-hidden="true"
              className="absolute w-44 h-44 rounded-full bg-[#E9E7FB]/60 transition-transform duration-150 ease-out pointer-events-none"
              style={{ transform: `scale(${haloScale})` }}
            />

            {/* Floating calm particles */}
            {[
              { top: '14%', left: '20%', delay: '0s', size: 'w-2.5 h-2.5' },
              { top: '20%', right: '16%', delay: '0.4s', size: 'w-2 h-2' },
              { bottom: '18%', left: '16%', delay: '0.8s', size: 'w-2 h-2' },
              { bottom: '14%', right: '20%', delay: '1.2s', size: 'w-2.5 h-2.5' },
            ].map((orb, idx) => (
              <span
                key={idx}
                aria-hidden="true"
                className={`absolute rounded-full ${orb.size} bg-[#5554B8]/25 transition-all duration-500 pointer-events-none`}
                style={{
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  transform:
                    status === 'running'
                      ? phase === 'inhale'
                        ? 'scale(1.3)'
                        : phase === 'hold'
                          ? 'scale(1.15)'
                          : 'scale(0.8)'
                      : 'scale(1)',
                }}
              />
            ))}

            {/* SVG Circular Phase Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 220 220"
              aria-hidden="true"
            >
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                fill="none"
                stroke="#E8E6F1"
                strokeWidth="5"
              />
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                fill="none"
                stroke={ringStrokeColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-[stroke-dashoffset,stroke] duration-100 ease-linear"
              />
            </svg>

            {/* Tactile Interactive Bubble Button */}
            <button
              type="button"
              onClick={handleBubbleClick}
              aria-label={
                status === 'running'
                  ? 'Pause breathing exercise'
                  : status === 'paused'
                    ? 'Resume breathing exercise'
                    : 'Start breathing exercise'
              }
              style={{ transform: `scale(${bubbleScale})` }}
              className={`relative z-10 w-36 h-36 rounded-full border-2 shadow-soft flex flex-col items-center justify-center text-center cursor-pointer transition-transform duration-150 ease-out hover:brightness-[0.98] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${
                status === 'completed'
                  ? 'bg-gradient-to-br from-[#DCE9DF] to-[#E9E7FB] border-[#245532]/30'
                  : phase === 'hold' && status === 'running'
                    ? 'bg-gradient-to-br from-[#DCE9DF] via-[#E9E7FB] to-[#FFFFFF] border-[#245532]/30'
                    : 'bg-gradient-to-br from-[#E9E7FB] via-[#DCD9F8] to-[#DCE9DF]/80 border-[#5554B8]/35'
              }`}
            >
              {status === 'completed' ? (
                <>
                  <CheckCircle2 className="w-7 h-7 text-[#245532] mb-1" />
                  <span className="text-sm font-bold text-[#245532]">Complete</span>
                </>
              ) : status === 'idle' ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#5554B8] mb-1" />
                  <span className="text-sm font-bold text-[#25233B]">Tap to Start</span>
                  <span className="text-xs text-[#625F78] mt-0.5">
                    {formatClock(remainingSeconds)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base font-bold text-[#25233B]" aria-live="polite">
                    {PHASE_LABELS[phase]}
                  </span>
                  <span className="text-sm font-bold text-[#5554B8] mt-0.5">
                    {phaseSecondsLeft}s
                  </span>
                  <span className="text-[10px] text-[#625F78] mt-0.5">
                    {status === 'paused' ? 'Paused' : 'Tap to pause'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Phase Guidance & Stats */}
          <div className="w-full max-w-md space-y-2.5 text-center">
            {status === 'completed' ? (
              <p className="text-xs sm:text-sm font-semibold text-[#245532]">
                Well done! You completed {cyclesCompleted} calm breathing{' '}
                {cyclesCompleted === 1 ? 'cycle' : 'cycles'} ({durationMinutes} min).
              </p>
            ) : (
              <p className="text-xs font-medium text-[#25233B]">
                {status === 'idle'
                  ? 'Settle your shoulders and tap the bubble whenever you are ready.'
                  : PHASE_GUIDANCE[phase]}
              </p>
            )}

            {/* Overall Session Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#625F78]">
                <span>
                  Time remaining:{' '}
                  <strong className="text-[#25233B] font-semibold">
                    {formatClock(remainingSeconds)}
                  </strong>
                  {status === 'paused' && ' • Paused'}
                </span>
                <span>
                  Cycles:{' '}
                  <strong className="text-[#25233B] font-semibold">{cyclesCompleted}</strong>
                </span>
              </div>
              <div
                className="h-1.5 w-full rounded-full bg-[#E8E6F1] overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(sessionProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Breathing session progress"
              >
                <div
                  className="h-full bg-[#5554B8] rounded-full transition-all duration-150"
                  style={{ width: `${sessionProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
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
