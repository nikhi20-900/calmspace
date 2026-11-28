import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Wind, Smile, Moon } from 'lucide-react';
import type { BlobExpression } from '../mascot/BlobScene';

const LazyBlobScene = React.lazy(() => import('../mascot/BlobScene'));

const BlobStageFallback: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center rounded-[2rem]">
    <div className="w-56 h-56 rounded-[50%_50%_46%_46%] bg-gradient-to-b from-[#C4BDF8] to-[#AFA6EC] shadow-2xl flex flex-col items-center justify-center border-2 border-white/40 motion-safe:animate-pulse">
      <div className="flex gap-10 mb-4">
        <div className="w-4 h-5 rounded-full bg-[#25233B]" />
        <div className="w-4 h-5 rounded-full bg-[#25233B]" />
      </div>
      <div className="w-6 h-2 border-b-2 border-[#6E689C] rounded-full" />
    </div>
    <span className="text-xs text-[#625F78] mt-4 font-medium">Calmspace Blob</span>
  </div>
);

export interface CalmspaceBlobProps {
  expression?: BlobExpression;
  isCtaHovered?: boolean;
  isBreathingActive?: boolean;
  audioLevel?: number;
  breathingPhase?: number | null;
  bodyColor?: number;
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
  audioLevel = 0,
  breathingPhase = null,
  bodyColor = 0xa79de3,
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

  // One revert timer, cleared on re-trigger and on unmount (no stacked timeouts, no
  // state updates after unmount).
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
        <div
          className="mb-3 transition-all duration-300"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-[#E8E6F1] shadow-subtle text-xs font-medium text-[#5554B8] backdrop-blur-none sm:backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5554B8] animate-pulse" />
            <span>{reactionMessage}</span>
          </span>
        </div>
      )}

      {/* Volumetric 3D Canvas Stage */}
      <div className={`w-full ${heightClassName}`}>
        <Suspense fallback={<BlobStageFallback />}>
          <LazyBlobScene
            expression={activeExpression}
            isCtaHovered={isCtaHovered}
            isBreathingActive={isBreathing}
            audioLevel={audioLevel}
            breathingPhase={breathingPhase}
            bodyColor={bodyColor}
            onBlobClick={handleBlobClick}
          />
        </Suspense>
      </div>

      {/* Tactile Drag Hint */}
      <div className="mt-2 text-center pointer-events-none">
        <span className="text-[11px] font-medium text-[#8480A2] tracking-wide">
          Tap or drag gently to interact
        </span>
      </div>

      {/* Optional Embedded Interactive Controls with Proper Spacing */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-1">
          <button
            type="button"
            onClick={handleToggleBreathing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isBreathing
                ? 'bg-[#5554B8] text-white shadow-soft ring-2 ring-[#5554B8]/30 scale-102'
                : 'bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs hover:border-[#DCD9F5] active:scale-98'
            }`}
            aria-pressed={isBreathing}
          >
            <Wind className={`w-3.5 h-3.5 ${isBreathing ? 'animate-spin' : ''}`} />
            <span>{isBreathing ? 'Breathing mode on' : 'Breathe with me'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectExpression('curious', 'Curious about your day')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs hover:border-[#DCD9F5] active:scale-98 transition-all cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5 text-[#5554B8]" />
            <span>Say hi</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectExpression('resting', 'Resting peacefully')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs hover:border-[#DCD9F5] active:scale-98 transition-all cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-[#5554B8]" />
            <span>Rest</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CalmspaceBlob;
