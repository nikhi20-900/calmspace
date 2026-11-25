import React from 'react';
import { MessageSquareHeart, ShieldCheck } from 'lucide-react';

export interface ReflectionInputProps {
  value: string;
  onChange: (val: string) => void;
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  maxLength?: number;
}

export const ReflectionInput: React.FC<ReflectionInputProps> = ({
  value,
  onChange,
  consent,
  onConsentChange,
  maxLength = 2000,
}) => {
  const charactersRemaining = maxLength - value.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <MessageSquareHeart className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]" id="reflection-heading">
            Anything on your mind? (Optional)
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Unpack whatever is occupying your thoughts today. Leave blank if you prefer.
          </p>
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={4}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Preparing for my architecture review tomorrow, feeling a little behind on revisions..."
          className="w-full p-4 rounded-input border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-all resize-y min-h-[110px]"
          aria-labelledby="reflection-heading"
          aria-describedby="reflection-privacy-note reflection-char-counter"
        />
        <div
          id="reflection-char-counter"
          className="text-right text-sm text-[var(--color-text-muted)] mt-1 pr-1"
          aria-live="polite"
        >
          {value.length} / {maxLength} characters {charactersRemaining < 200 && `(${charactersRemaining} remaining)`}
        </div>
      </div>

      {/* Explicit Privacy Notice & Informed Consent Disclosure */}
      <div
        id="reflection-privacy-note"
        className="p-3.5 rounded-card bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5"
      >
        <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)] shrink-0 mt-1" />
          <p className="leading-relaxed">
            <strong className="text-[var(--color-text-main)]">Privacy guarantee:</strong> Your reflection is completely optional and is never saved in your check-in history database. It is processed locally by deterministic safety rules to detect crisis indicators.
          </p>
        </div>

        <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--color-surface)]/70 transition-colors cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-dark)] text-[var(--color-primary-fill)] focus:ring-[var(--color-primary)] cursor-pointer"
          />
          <span className="text-sm text-[var(--color-text-main)] leading-relaxed">
            I consent to allowing the supportive AI assistant to read this reflection to tailor my kind guidance message. (If left unchecked, your reflection is only evaluated by local rule-based safety checks and is never shared with external AI guidance models).
          </span>
        </label>
      </div>
    </div>
  );
};
