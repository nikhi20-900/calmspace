import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, PhoneCall, ArrowRight, Sparkles } from 'lucide-react';

export interface FinalCTAProps {
  onOpenSupportModal: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenSupportModal }) => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 bg-white relative overflow-hidden border-t border-[#E8E6F1]">
      {/* Ambient gradient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#E9E7FB]/50 via-[#F4DCCB]/30 to-[#DCE9DF]/40 rounded-full blur-xl sm:blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9E7FB] text-xs font-semibold text-[#5554B8] uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>A Gentle Beginning</span>
        </div>

        <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-[#25233B] tracking-tight max-w-2xl leading-tight">
          You deserve a moment for yourself.
        </h2>

        <p className="mt-5 text-lg sm:text-xl text-[#625F78] max-w-xl leading-relaxed">
          No pressure. No credit cards. No sign-up walls.
          Start with a single breath and see how you feel.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-[#5554B8] hover:bg-[#4645A7] active:scale-98 rounded-full shadow-soft hover:shadow-card transition-all group"
          >
            <HeartPulse className="w-5 h-5 text-[#E9E7FB] transition-transform group-hover:scale-110" />
            <span>Find your calm</span>
            <ArrowRight className="w-4 h-4 text-white/80 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={onOpenSupportModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-medium text-[#5554B8] bg-[#E9E7FB] hover:bg-[#DED9F8] active:scale-98 rounded-full border border-[#DCD9F5] shadow-xs transition-all"
          >
            <PhoneCall className="w-4 h-4 text-[#5554B8]" />
            <span>Talk to someone</span>
          </button>
        </div>

        <p className="text-xs text-[#625F78] mt-6">
          Free, anonymous, and designed for students worldwide.
        </p>
      </div>
    </section>
  );
};
