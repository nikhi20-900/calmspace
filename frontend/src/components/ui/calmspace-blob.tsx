import React, { useState } from 'react';
import { Wind, Smile, Moon } from 'lucide-react';
import { BlobScene, BlobExpression } from '../mascot/BlobScene';

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
      setTimeout(() => {
        setInternalExpression('idle');
      }, 2600);
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
      setTimeout(() => setInternalExpression('idle'), 2600);
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
        <BlobScene
          expression={activeExpression}
          isCtaHovered={isCtaHovered}
          isBreathingActive={isBreathing}
          onBlobClick={handleBlobClick}
        />
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
