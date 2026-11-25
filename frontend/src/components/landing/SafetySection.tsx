import React from 'react';
import { ShieldAlert, PhoneCall, Sparkles, AlertOctagon } from 'lucide-react';

export interface SafetySectionProps {
  onOpenSupportModal: () => void;
}

export const SafetySection: React.FC<SafetySectionProps> = ({ onOpenSupportModal }) => {
  return (
    <section id="safety" className="py-20 sm:py-28 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--color-lavender-soft)] text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ethical Foundation</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] tracking-tight">
            Technology should know its place.
          </h2>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)] leading-relaxed">
            AI is great at writing warm, reflective sentences. It is NOT qualified to evaluate psychiatric danger.
            Calmspace strictly isolates safety decisions behind deterministic logic.
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#5554B8] to-[#43429E] text-white shadow-card max-w-4xl mx-auto relative overflow-hidden mb-16">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 text-center">
            <span className="text-xs uppercase tracking-widest text-[#E9E7FB] font-semibold block mb-3">
              The Calmspace Safety Principle
            </span>
            <blockquote className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-snug text-white">
              “Rules decide safety.<br />
              AI writes the language.<br />
              Humans help.”
            </blockquote>
            <p className="mt-4 text-sm sm:text-base text-[#E9E7FB]/95 max-w-xl mx-auto leading-relaxed">
              Whenever a check-in suggests high emotional distress, automated AI guidance is halted immediately.
              We connect you directly to verified human support.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-7 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mb-5 shadow-subtle">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)] mb-2">
              Deterministic Safety Engine
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Risk routing is programmed using clear, deterministic Python safety checks. Large language models never make the triage or classification call.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mb-5 shadow-subtle">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)] mb-2">
              Zero-Lag Escalation
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              If high distress keywords or severe symptom scores are present, the interface instantly shifts to crisis mode with prominent helpline numbers.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mb-5 shadow-subtle">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)] mb-2">
              Verified Helpline Directory
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Pre-loaded with official national and university services: Tele-MANAS (14416), 112 emergency dispatch, and campus counselling units.
            </p>
          </div>
        </div>

        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-lavender-soft)] hover:bg-[var(--color-lavender-border)] border border-[var(--color-lavender-border)] shadow-xs hover:shadow-subtle transition-all active:scale-98"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Open Immediate Support Directory</span>
          </button>
        </div>
      </div>
    </section>
  );
};
