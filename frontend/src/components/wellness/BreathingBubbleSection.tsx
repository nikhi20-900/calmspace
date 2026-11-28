import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { loadBreathingStats, recordBreathingCompletion } from '../../utils/wellnessStorage';

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';
type DurationMinutes = 1 | 3 | 5;
type PatternId = '4-4-4' | '4-7-8' | '4-4-4-4' | '3-2-4';

interface BreathingPattern {
  id: PatternId;
  name: string;
  label: string;
  steps: Array<{ phase: BreathingPhase; seconds: number }>;
}

const BREATHING_PATTERNS: readonly BreathingPattern[] = [
  {
    id: '4-4-4',
    name: 'Calm Focus',
    label: '4–4–4',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 4 },
      { phase: 'exhale', seconds: 4 },
    ],
  },
  {
    id: '4-7-8',
    name: 'Deep Relax',
    label: '4–7–8',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 7 },
      { phase: 'exhale', seconds: 8 },
    ],
  },
  {
    id: '4-4-4-4',
    name: 'Box Grounding',
    label: '4–4–4–4',
    steps: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 4 },
      { phase: 'exhale', seconds: 4 },
      { phase: 'rest', seconds: 4 },
    ],
  },
  {
    id: '3-2-4',
    name: 'Quick Reset',
    label: '3–2–4',
    steps: [
      { phase: 'inhale', seconds: 3 },
      { phase: 'hold', seconds: 2 },
      { phase: 'exhale', seconds: 4 },
    ],
  },
];

const PHASE_COLORS: Record<
  BreathingPhase,
  {
    ring: string;
    aura: string;
    bubble: string;
    pill: string;
    dot: string;
  }
> = {
  inhale: {
    ring: '#5554B8',
    aura: 'bg-gradient-to-br from-[#9C9AF2]/55 via-[#C7C5FA]/45 to-[#E9E7FB]/40',
    bubble: 'bg-gradient-to-br from-[#D9D6FE] via-[#EAE8FC] to-[#FFFFFF] border-[#5554B8]/50',
    pill: 'bg-[#5554B8] text-white border-[#5554B8]',
    dot: 'bg-[#5554B8]',
  },
  hold: {
    ring: '#2E8540',
    aura: 'bg-gradient-to-br from-[#88D498]/55 via-[#BEE8C6]/45 to-[#DCE9DF]/40',
    bubble: 'bg-gradient-to-br from-[#C4EBD0] via-[#E3F5E8] to-[#FFFFFF] border-[#2E8540]/45',
    pill: 'bg-[#2E8540] text-white border-[#2E8540]',
    dot: 'bg-[#2E8540]',
  },
  exhale: {
    ring: '#D97745',
    aura: 'bg-gradient-to-br from-[#F3B08E]/55 via-[#F7D7C4]/45 to-[#F4DCCB]/40',
    bubble: 'bg-gradient-to-br from-[#FAD7C4] via-[#FDECE2] to-[#FFFFFF] border-[#D97745]/45',
    pill: 'bg-[#D97745] text-white border-[#D97745]',
    dot: 'bg-[#D97745]',
  },
  rest: {
    ring: '#5B7CE2',
    aura: 'bg-gradient-to-br from-[#A6BDF7]/55 via-[#D5E1FC]/45 to-[#E9E7FB]/40',
    bubble: 'bg-gradient-to-br from-[#D0DFFC] via-[#EAF0FE] to-[#FFFFFF] border-[#5B7CE2]/45',
    pill: 'bg-[#5B7CE2] text-white border-[#5B7CE2]',
    dot: 'bg-[#5B7CE2]',
  },
};

const PATTERN_ACCENTS: Record<PatternId, string> = {
  '4-4-4': 'bg-[#5554B8]',
  '4-7-8': 'bg-[#2E8540]',
  '4-4-4-4': 'bg-[#D97745]',
  '3-2-4': 'bg-[#5B7CE2]',
};

const DURATION_OPTIONS: readonly DurationMinutes[] = [1, 3, 5];

const PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
  rest: 'Rest',
};

const PHASE_GUIDANCE: Record<BreathingPhase, string> = {
  inhale: 'Draw air in slowly through your nose',
  hold: 'Rest gently with full lungs',
  exhale: 'Release tension softly through your mouth',
  rest: 'Pause softly before the next breath',
};

function getPatternPhaseState(
  pattern: BreathingPattern,
  elapsedMs: number
): {
  phase: BreathingPhase;
  stepIndex: number;
  phaseProgress: number;
  phaseSecondsLeft: number;
  cyclesCompleted: number;
} {
  const cycleMs = pattern.steps.reduce((acc, s) => acc + s.seconds * 1000, 0);
  const cyclesCompleted = Math.floor(elapsedMs / cycleMs);
  let remainingInCycle = elapsedMs % cycleMs;

  for (let i = 0; i < pattern.steps.length; i += 1) {
    const step = pattern.steps[i];
    const stepMs = step.seconds * 1000;
    if (remainingInCycle < stepMs) {
      return {
        phase: step.phase,
        stepIndex: i,
        phaseProgress: remainingInCycle / stepMs,
        phaseSecondsLeft: Math.ceil((stepMs - remainingInCycle) / 1000),
        cyclesCompleted,
      };
    }
    remainingInCycle -= stepMs;
  }

  const first = pattern.steps[0];
  return {
    phase: first.phase,
    stepIndex: 0,
    phaseProgress: 0,
    phaseSecondsLeft: first.seconds,
    cyclesCompleted,
  };
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const BreathingBubbleSection: React.FC = () => {
  const [patternId, setPatternId] = useState<PatternId>('4-4-4');
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(1);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false); // Muted by default

  // Rhythm Sync Game Mode + Persistent Stats + Post-session check
  const [syncStreak, setSyncStreak] = useState(0);
  const [lastSyncedStepKey, setLastSyncedStepKey] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState(() => loadBreathingStats());
  const [postMood, setPostMood] = useState<'calmer' | 'grounded' | 'tense' | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastCuePhaseRef = useRef<string | null>(null);
  const completionRecordedRef = useRef(false);

  const pattern =
    BREATHING_PATTERNS.find((p) => p.id === patternId) || BREATHING_PATTERNS[0];

  const totalMs = durationMinutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  const sessionProgress = Math.min(100, (elapsedMs / totalMs) * 100);

  const { phase, stepIndex, phaseProgress, phaseSecondsLeft, cyclesCompleted } =
    getPatternPhaseState(pattern, elapsedMs);

  const currentStepKey = `${cyclesCompleted}-${stepIndex}`;

  const ensureAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const playTone = (freq: number, durationSec: number, peakGain = 0.14, delaySec = 0) => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const startAt = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, startAt);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.18, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

      osc.connect(gain);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startAt);
      harmonic.start(startAt);
      osc.stop(startAt + durationSec + 0.02);
      harmonic.stop(startAt + durationSec + 0.02);
    } catch {
      // Ignore Web Audio errors safely
    }
  };

  const playSoftCue = (currentPhase: BreathingPhase, force = false) => {
    if (!force && !soundEnabled) return;
    const freq =
      currentPhase === 'inhale'
        ? 440
        : currentPhase === 'hold'
          ? 523.25
          : currentPhase === 'exhale'
            ? 349.23
            : 293.66;
    playTone(freq, 0.55, 0.14);
  };

  const playCompletionChime = () => {
    if (!soundEnabled) return;
    // Clear, pleasant 3-pulse completion alarm ring + final bell
    const pulseStarts = [0.0, 0.52, 1.04];
    for (const offset of pulseStarts) {
      playTone(880.0, 0.18, 0.18, offset);
      playTone(1046.5, 0.22, 0.18, offset + 0.16);
    }
    playTone(1318.5, 0.9, 0.2, 1.56);
  };

  useEffect(() => {
    if (status !== 'running') return;

    if (lastCuePhaseRef.current !== currentStepKey) {
      lastCuePhaseRef.current = currentStepKey;
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
  }, [status, phase, currentStepKey, totalMs, soundEnabled]);

  useEffect(() => {
    if (status === 'completed' && !completionRecordedRef.current) {
      completionRecordedRef.current = true;
      const updated = recordBreathingCompletion(durationMinutes, syncStreak);
      setStats(updated);
      playCompletionChime();
    }
  }, [status, durationMinutes, syncStreak, soundEnabled]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const resetSession = () => {
    setStatus('idle');
    setElapsedMs(0);
    setSyncStreak(0);
    setLastSyncedStepKey(null);
    setSyncFeedback(null);
    setPostMood(null);
    lastCuePhaseRef.current = null;
    completionRecordedRef.current = false;
  };

  const handleSelectPattern = (id: PatternId) => {
    setPatternId(id);
    resetSession();
  };

  const handleSelectDuration = (mins: DurationMinutes) => {
    setDurationMinutes(mins);
    resetSession();
  };

  const handleStart = () => {
    ensureAudioContext();
    resetSession();
    setStatus('running');
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleResume = () => {
    ensureAudioContext();
    setStatus('running');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      ensureAudioContext();
      playTone(523.25, 0.4, 0.12);
    }
  };

  const handleRestart = () => {
    resetSession();
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

  const handleSyncTap = () => {
    if (status !== 'running') return;
    if (lastSyncedStepKey === currentStepKey) {
      setSyncFeedback('Already synced for this phase');
      return;
    }
    setLastSyncedStepKey(currentStepKey);
    const nextStreak = syncStreak + 1;
    setSyncStreak(nextStreak);
    setSyncFeedback(`In rhythm! (${nextStreak} streak)`);
  };

  // Continuous smooth bubble scale based on exact ms progress
  const bubbleScale =
    status === 'idle' || status === 'completed'
      ? 0.92
      : phase === 'inhale'
        ? 0.78 + 0.34 * phaseProgress
        : phase === 'hold'
          ? 1.12
          : phase === 'exhale'
            ? 1.12 - 0.34 * phaseProgress
            : 0.78;

  const haloScale = status === 'running' ? bubbleScale + 0.14 : 1.0;

  // SVG Ring Math
  const ringRadius = 92;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    status === 'idle'
      ? ringCircumference
      : status === 'completed'
        ? 0
        : ringCircumference * (1 - phaseProgress);

  const activeTheme = PHASE_COLORS[phase];
  const ringStrokeColor =
    status === 'completed' ? '#2E8540' : activeTheme.ring;

  const stageBgClass =
    status === 'completed'
      ? 'bg-gradient-to-br from-[#E6F4EA] via-[#F7F6FB] to-[#ECEAFD]'
      : status === 'running' && phase === 'hold'
        ? 'bg-gradient-to-br from-[#E8F5EC] via-[#F7F6FB] to-[#EEF2FF]'
        : status === 'running' && phase === 'exhale'
          ? 'bg-gradient-to-br from-[#FDF1EA] via-[#F7F6FB] to-[#EFEFFD]'
          : 'bg-gradient-to-br from-[#EFEDFC] via-[#F7F6FB] to-[#E9F3EC]';

  return (
    <section aria-label="Breathing Bubble">
      <Card padding="lg" className="space-y-5">
        {/* Header & Duration / Sound / Stats Controls */}
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
              <Wind className="w-4 h-4" />
              <span>{pattern.label} Guided Breathing</span>
              {stats.sessionsCompleted > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E9E7FB] text-[#5554B8] normal-case tracking-normal text-[11px]">
                  <Award className="w-3 h-3" />
                  <span>
                    {stats.sessionsCompleted} {stats.sessionsCompleted === 1 ? 'session' : 'sessions'} • {stats.totalMinutes}m
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
              Breathing Bubble
            </h2>
            <p className="text-xs text-[#625F78]">
              Choose a rhythm, tap the bubble to start, and sync each breath phase.
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
              onClick={handleToggleSound}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Turn breathing sound off' : 'Turn breathing sound on'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                soundEnabled
                  ? 'bg-[#E9E7FB] border-[#5554B8]/40 text-[#5554B8]'
                  : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#5554B8]" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Sound Off</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Breathing Pattern Selector */}
        <div
          role="group"
          aria-label="Select breathing pattern"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {BREATHING_PATTERNS.map((p) => {
            const active = patternId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPattern(p.id)}
                aria-pressed={active}
                className={`p-2.5 rounded-input border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  active
                    ? 'bg-[#E9E7FB]/70 border-[#5554B8] shadow-subtle'
                    : 'bg-[#F7F6FB] border-[#E8E6F1] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${PATTERN_ACCENTS[p.id]}`} aria-hidden="true" />
                  <span className="text-xs font-bold text-[#25233B]">{p.name}</span>
                </div>
                <span className="text-[11px] font-medium text-[#5554B8] pl-3.5 block">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Breathing Stage */}
        <div
          className={`p-5 sm:p-6 flex flex-col items-center justify-center gap-5 rounded-card border border-[#E8E6F1] transition-colors duration-700 ${stageBgClass}`}
        >
          {/* Live Phase Indicator Pills */}
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Breathing cycle phases"
          >
            {pattern.steps.map((step, idx) => {
              const isCurrent =
                (status === 'running' || status === 'paused') && stepIndex === idx;
              const pColor = PHASE_COLORS[step.phase];
              return (
                <div
                  key={`${step.phase}-${idx}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isCurrent
                      ? `${pColor.pill} shadow-subtle`
                      : 'bg-white/90 text-[#625F78] border-[#E8E6F1]'
                  }`}
                >
                  {!isCurrent && (
                    <span className={`w-2 h-2 rounded-full ${pColor.dot}`} aria-hidden="true" />
                  )}
                  <span>
                    {idx + 1}. {PHASE_LABELS[step.phase]}
                  </span>
                  <span className="opacity-80">{step.seconds}s</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Concentric Bubble + SVG Phase Progress Ring */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Soft glowing color aura */}
            <div
              aria-hidden="true"
              className={`absolute w-44 h-44 rounded-full blur-md transition-all duration-300 ease-out pointer-events-none ${
                status === 'completed'
                  ? PHASE_COLORS.hold.aura
                  : activeTheme.aura
              }`}
              style={{ transform: `scale(${haloScale})` }}
            />

            {/* Floating colorful calm particles */}
            {[
              { top: '14%', left: '20%', size: 'w-3 h-3', color: 'bg-[#5554B8]/45' },
              { top: '20%', right: '16%', size: 'w-2.5 h-2.5', color: 'bg-[#2E8540]/45' },
              { bottom: '18%', left: '16%', size: 'w-2.5 h-2.5', color: 'bg-[#D97745]/45' },
              { bottom: '14%', right: '20%', size: 'w-3 h-3', color: 'bg-[#7C7AD6]/50' },
            ].map((orb, idx) => (
              <span
                key={idx}
                aria-hidden="true"
                className={`absolute rounded-full ${orb.size} ${orb.color} transition-all duration-500 pointer-events-none`}
                style={{
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  transform:
                    status === 'running'
                      ? phase === 'inhale'
                        ? 'scale(1.35)'
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
                strokeWidth="6"
              />
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                fill="none"
                stroke={ringStrokeColor}
                strokeWidth="6"
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
              className={`relative z-10 w-36 h-36 rounded-full border-2 ring-4 ring-white/70 shadow-elevation flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ease-out hover:brightness-[0.98] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${
                status === 'completed'
                  ? PHASE_COLORS.hold.bubble
                  : status === 'idle'
                    ? 'bg-gradient-to-br from-[#DCD9FC] via-[#EFEFFD] to-[#E3F2E7] border-[#5554B8]/40'
                    : activeTheme.bubble
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

          {/* Interactive Rhythm Sync Mini-Game Bar (while running) */}
          {status === 'running' && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Zap className="w-3.5 h-3.5 text-[#5554B8]" />}
                onClick={handleSyncTap}
              >
                Sync Breath ({syncStreak})
              </Button>
              {syncFeedback && (
                <span className="text-xs font-semibold text-[#245532] bg-[#DCE9DF] px-2.5 py-1 rounded-full">
                  {syncFeedback}
                </span>
              )}
            </div>
          )}

          {/* Phase Guidance & Post-Session Check */}
          <div className="w-full max-w-md space-y-3 text-center">
            {status === 'completed' ? (
              <div className="space-y-3 bg-white p-4 rounded-card border border-[#E8E6F1]">
                <p className="text-xs sm:text-sm font-semibold text-[#245532]">
                  Well done! You completed {cyclesCompleted} {pattern.name} breathing{' '}
                  {cyclesCompleted === 1 ? 'cycle' : 'cycles'} ({durationMinutes} min)
                  {syncStreak > 0 ? ` • Sync streak: ${syncStreak}` : ''}.
                </p>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#625F78]">
                    How do you feel right now?
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {[
                      { id: 'calmer', label: 'Calmer' },
                      { id: 'grounded', label: 'Grounded' },
                      { id: 'tense', label: 'Still tense' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setPostMood(opt.id as 'calmer' | 'grounded' | 'tense')
                        }
                        aria-pressed={postMood === opt.id}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                          postMood === opt.id
                            ? 'bg-[#5554B8] text-white border-[#5554B8]'
                            : 'bg-[#F7F6FB] text-[#25233B] border-[#E8E6F1] hover:bg-[#E9E7FB]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {postMood === 'tense' && (
                    <p className="text-xs text-[#625F78] pt-1">
                      It&apos;s okay if tension lingers. You can try another slow round or visit the{' '}
                      <Link to="/support" className="text-[#5554B8] font-semibold underline">
                        Support Network
                      </Link>
                      .
                    </p>
                  )}
                  {(postMood === 'calmer' || postMood === 'grounded') && (
                    <p className="text-xs text-[#245532] font-medium pt-1">
                      Glad that helped create a little breathing room.
                    </p>
                  )}
                </div>
              </div>
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
                  {stats.bestSyncStreak > 0 && (
                    <>
                      {' '}
                      • Best sync:{' '}
                      <strong className="text-[#25233B] font-semibold">
                        {stats.bestSyncStreak}
                      </strong>
                    </>
                  )}
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
                  className="h-full bg-gradient-to-r from-[#5554B8] via-[#7C7AD6] to-[#2E8540] rounded-full transition-all duration-150"
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
