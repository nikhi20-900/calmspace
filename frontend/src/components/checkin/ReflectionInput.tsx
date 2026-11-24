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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#E9E7FB] flex items-center justify-center text-[#5554B8]">
          <MessageSquareHeart className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#25233B]" id="reflection-heading">
            Anything on your mind? (Optional)
          </h2>
          <p className="text-xs text-[#625F78]">
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
          className="w-full p-4 rounded-input border border-[#E8E6F1] bg-white text-sm text-[#25233B] placeholder-[#8E8AA7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] transition-all resize-y min-h-[110px]"
          aria-labelledby="reflection-heading"
          aria-describedby="reflection-privacy-note reflection-char-counter"
        />
        <div
          id="reflection-char-counter"
          className="text-right text-[11px] text-[#8E8AA7] mt-1 pr-1"
          aria-live="polite"
        >
          {value.length} / {maxLength} characters {charactersRemaining < 200 && `(${charactersRemaining} remaining)`}
        </div>
      </div>

      {/* Explicit Privacy Notice & Informed Consent Disclosure */}
      <div
        id="reflection-privacy-note"
        className="p-3.5 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] space-y-2.5"
      >
        <div className="flex items-start gap-2 text-xs text-[#625F78]">
          <ShieldCheck className="w-4 h-4 text-[#245532] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#25233B]">Privacy guarantee:</strong> Your reflection is completely optional and is never saved in your check-in history database. It is processed locally by deterministic safety rules to detect crisis indicators.
          </p>
        </div>

        <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/70 transition-colors cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[#D5D1E5] text-[#5554B8] focus:ring-[#5554B8] cursor-pointer"
          />
          <span className="text-xs text-[#25233B] leading-relaxed">
            I consent to allowing the supportive AI assistant to read this reflection to tailor my kind guidance message. (If left unchecked, your reflection is only evaluated by local rule-based safety checks and is never shared with external AI guidance models).
          </span>
        </label>
      </div>
    </div>
  );
};
