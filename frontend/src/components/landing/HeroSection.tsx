import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Wind, ShieldCheck, HeartPulse } from 'lucide-react';
import { BlobScene, BlobExpression } from '../mascot/BlobScene';

export interface HeroSectionProps {
  onOpenSupportModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenSupportModal }) => {
  const navigate = useNavigate();
  const [isCtaHovered, setIsCtaHovered] = useState(false);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<BlobExpression>('idle');
  const [blobReactionText, setBlobReactionText] = useState<string>('Pleased to meet you');

  const handleBlobClick = () => {
    setCurrentExpression('welcoming');
    const reactions = [
      'Take a gentle breath',
      'You are doing your best',
      'One step at a time',
      'Glad you are here',
      'Soft and steady',
    ];
    setBlobReactionText(reactions[Math.floor(Math.random() * reactions.length)]);
    setTimeout(() => {
      setCurrentExpression('idle');
    }, 2800);
  };

  const handleScrollToExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    const elem = document.querySelector('#reality');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-20 sm:pt-10 sm:pb-28 lg:pb-36 bg-gradient-to-b from-[#F7F6FB] via-[#F7F6FB] to-white">
      {/* Decorative ambient gradients */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-gradient-to-tr from-[#E9E7FB]/40 via-[#F4DCCB]/25 to-[#DCE9DF]/30 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E9E7FB] border border-[#DCD9F5] text-xs font-semibold text-[#5554B8] tracking-wide uppercase mb-6 shadow-xs animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#5554B8]" />
          <span>A little space to breathe</span>
        </div>

        {/* Main Editorial Headline */}
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#25233B] leading-[1.12] max-w-4xl">
          You don't have to have it all figured out.
        </h1>

        {/* Supporting Headline */}
        <p className="mt-4 sm:mt-5 text-xl sm:text-2xl md:text-3xl font-medium text-[#5554B8] max-w-2xl">
          Just start with how you feel.
        </p>

        {/* Calm Subcopy */}
        <p className="mt-4 text-base sm:text-lg text-[#625F78] max-w-xl leading-relaxed">
          A quiet, private companion designed to help university students pause,
          reflect, and find balance without streaks, judgment, or pressure.
        </p>

        {/* Interactive 3D Mascot Stage */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl my-4 sm:my-6 relative flex flex-col items-center">
          {/* Reaction speech pill */}
          <div className="mb-2 transition-all duration-300">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/90 border border-[#E8E6F1] shadow-subtle text-xs font-medium text-[#5554B8]">
              {isBreathingActive ? 'Breathe with me · In for 4s, out for 4s' : blobReactionText}
            </span>
          </div>

          {/* 3D WebGL Canvas Container */}
          <div className="w-full h-[360px] sm:h-[420px] md:h-[480px]">
            <BlobScene
              expression={currentExpression}
              isCtaHovered={isCtaHovered}
              isBreathingActive={isBreathingActive}
              onBlobClick={handleBlobClick}
            />
          </div>

          {/* Interactive controls under mascot */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isBreathingActive
                  ? 'bg-[#5554B8] text-white shadow-soft ring-2 ring-[#5554B8]/30'
                  : 'bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs'
              }`}
            >
              <Wind className={`w-3.5 h-3.5 ${isBreathingActive ? 'animate-spin' : ''}`} />
              <span>{isBreathingActive ? 'Breathing mode on' : 'Breathe with me'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentExpression('curious');
                setBlobReactionText('Curious about your day');
                setTimeout(() => setCurrentExpression('idle'), 2500);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs transition-colors"
            >
              Say hi
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentExpression('resting');
                setBlobReactionText('Resting peacefully');
                setTimeout(() => setCurrentExpression('idle'), 2500);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#625F78] hover:text-[#5554B8] border border-[#E8E6F1] shadow-xs transition-colors"
            >
              Rest
            </button>
          </div>
        </div>

        {/* Primary & Secondary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            onMouseEnter={() => setIsCtaHovered(true)}
            onMouseLeave={() => setIsCtaHovered(false)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-[#5554B8] hover:bg-[#4645A7] active:scale-98 rounded-full shadow-soft hover:shadow-card transition-all duration-200 group"
          >
            <HeartPulse className="w-5 h-5 text-[#E9E7FB] transition-transform group-hover:scale-110" />
            <span>Find your calm</span>
            <ArrowRight className="w-4 h-4 text-white/80 transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="#reality"
            onClick={handleScrollToExplore}
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 text-base font-medium text-[#25233B] bg-white hover:bg-[#F2F1FD] active:scale-98 rounded-full border border-[#E8E6F1] shadow-subtle hover:border-[#DCD9F5] transition-all duration-200"
          >
            Explore Calmspace
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#625F78]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5554B8]" />
            <span>100% Anonymous · No Account Required</span>
          </div>
          <span className="text-[#DCD9F5] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5554B8]" />
            <span>No Streaks, Metrics, or Pressure</span>
          </div>
          <span className="text-[#DCD9F5] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span>24/7 Verified Support Integration</span>
          </div>
        </div>
      </div>
    </section>
  );
};
