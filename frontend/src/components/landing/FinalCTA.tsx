import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, PhoneCall, ArrowRight, Sparkles } from 'lucide-react';

export interface FinalCTAProps {
  onOpenSupportModal: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenSupportModal }) => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 bg-[var(--color-surface)] relative overflow-hidden border-t border-[var(--color-border)]">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--color-lavender-soft)]/50 via-[var(--color-peach-soft)]/30 to-[var(--color-sage-soft)]/40 rounded-full blur-xl sm:blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-lavender-soft)] text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>A Gentle Beginning</span>
        </div>

        <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-text-main)] tracking-tight max-w-2xl leading-tight">
          You deserve a moment for yourself.
        </h2>

        <p className="mt-5 text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
          No pressure. No credit cards. No sign-up walls.
          Start with a single breath and see how you feel.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-[var(--color-primary-fill)] hover:bg-[var(--color-primary-fill-hover)] active:scale-98 rounded-full shadow-soft hover:shadow-card transition-all group"
          >
            <HeartPulse className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
            <span>Find your calm</span>
            <ArrowRight className="w-4 h-4 text-white/80 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={onOpenSupportModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-medium text-[var(--color-primary)] bg-[var(--color-lavender-soft)] hover:bg-[var(--color-lavender-border)] active:scale-98 rounded-full border border-[var(--color-lavender-border)] shadow-xs transition-all"
          >
            <PhoneCall className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Talk to someone</span>
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mt-6">
          Free, anonymous, and designed for students worldwide.
        </p>
      </div>
    </section>
  );
};
