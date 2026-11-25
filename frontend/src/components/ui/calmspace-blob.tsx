import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Wind, Smile, Moon } from 'lucide-react';
import type { BlobExpression } from '../mascot/BlobScene';

const BlobScene = lazy(() =>
  import('../mascot/BlobScene').then((m) => ({ default: m.BlobScene }))
);

export interface CalmspaceBlobProps {
  expression?: BlobExpression;
  isCtaHovered?: boolean;
  isBreathingActive?: boolean;
  onBlobClick?: () => void;
  showControls?: boolean;
  showReactionBadge?: boolean;
  reactionText?: string;
  onBreathingToggle?: (active: boolean) => void;
  onExpressionChange?: (expr: BlobExpression) => void;
  className?: string;
  heightClassName?: string;
}

export const CalmspaceBlob: React.FC<CalmspaceBlobProps> = ({
  expression: propExpression,
  isCtaHovered = false,
  isBreathingActive: propBreathingActive,
  onBlobClick,
  showControls = false,
  showReactionBadge = true,
  reactionText: propReactionText,
  onBreathingToggle,
  onExpressionChange,
  className = '',
  heightClassName = 'h-[360px] sm:h-[420px] md:h-[480px]',
}) => {
  const [internalExpression, setInternalExpression] = useState<BlobExpression>('idle');
  const [internalBreathing, setInternalBreathing] = useState(false);
  const [internalReaction, setInternalReaction] = useState('Pleased to meet you');

  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRevert = () => {
    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setInternalExpression('idle'), 2600);
  };
  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
    },
    []
  );

  const activeExpression = propExpression ?? internalExpression;
  const isBreathing = propBreathingActive ?? internalBreathing;
  const reactionMessage =
    propReactionText ??
    (isBreathing ? 'Breathe with me · In for 4s, out for 4s' : internalReaction);

  const handleBlobClick = () => {
    if (onBlobClick) {
      onBlobClick();
    } else {
      setInternalExpression('welcoming');
      const messages = [
        'Take a gentle breath',
        'You are doing your best',
        'One step at a time',
        'Glad you are here',
        'Soft and steady',
      ];
      setInternalReaction(messages[Math.floor(Math.random() * messages.length)]);
      scheduleRevert();
    }
  };

  const handleToggleBreathing = () => {
    const nextVal = !isBreathing;
    if (onBreathingToggle) {
      onBreathingToggle(nextVal);
    } else {
      setInternalBreathing(nextVal);
    }
  };

  const handleSelectExpression = (expr: BlobExpression, message: string) => {
    if (onExpressionChange) {
      onExpressionChange(expr);
    } else {
      setInternalExpression(expr);
      setInternalReaction(message);
      scheduleRevert();
    }
  };

  return (
    <div className={`relative w-full flex flex-col items-center ${className}`}>
      {/* Dynamic Accessible Reaction Pill */}
      {showReactionBadge && (
        <div className="mb-3 transition-all duration-300" aria-live="polite">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)]/95 border border-[var(--color-border)] shadow-subtle text-sm font-medium text-[var(--color-primary)] backdrop-blur-none sm:backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
            <span>{reactionMessage}</span>
          </span>
        </div>
      )}

      {/* Lazy-Loaded Volumetric 3D Canvas Stage */}
      <div className={`w-full ${heightClassName}`}>
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-[var(--color-lavender-soft)] animate-pulse" />
            </div>
          }
        >
          <BlobScene
            expression={activeExpression}
            isCtaHovered={isCtaHovered}
            isBreathingActive={isBreathing}
            onBlobClick={handleBlobClick}
          />
        </Suspense>
      </div>

      {/* Tactile Drag Hint */}
      <div className="mt-2 text-center pointer-events-none">
        <span className="text-sm font-medium text-[var(--color-text-muted)] tracking-wide">
          Tap or drag gently to interact
        </span>
      </div>

      {/* Optional Embedded Interactive Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-1">
          <button
            type="button"
            onClick={handleToggleBreathing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isBreathing
                ? 'bg-[var(--color-primary-fill)] text-white shadow-soft ring-2 ring-[var(--color-primary)]/30 scale-102'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] shadow-xs hover:border-[var(--color-lavender-border)] active:scale-98'
            }`}
            aria-pressed={isBreathing}
          >
            <Wind className={`w-3.5 h-3.5 ${isBreathing ? 'animate-spin' : ''}`} />
            <span>{isBreathing ? 'Breathing mode on' : 'Breathe with me'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectExpression('curious', 'Curious about your day')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] shadow-xs hover:border-[var(--color-lavender-border)] active:scale-98 transition-all cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Say hi</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectExpression('resting', 'Resting peacefully')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] shadow-xs hover:border-[var(--color-lavender-border)] active:scale-98 transition-all cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Rest</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CalmspaceBlob;
