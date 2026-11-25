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
            <strong className="text-[#25233B]">How this is used:</strong> Reflection is optional
            and is not saved in Calmspace check-in records. Calmspace's rule-based safety
            evaluator processes it whether or not you opt in. If the server is configured for
            external AI (Google Gemini), your opted-in reflection is sent to the Gemini API only
            for a LOW or MEDIUM result. The default mock provider does not send it externally.
            Google's data-use and retention terms apply to text it processes; Calmspace cannot
            control or delete provider-side data. HIGH-risk reflections are never sent to AI.
          </p>
        </div>

        <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/70 transition-colors cursor-pointer select-none min-h-[44px]">
          <input
            id="reflection-ai-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[#D5D1E5] text-[#5554B8] focus:ring-[#5554B8] cursor-pointer"
          />
          <span className="text-xs text-[#25233B] leading-relaxed">
            <strong>Optional:</strong> I agree to send this reflection to the configured AI provider for supportive guidance when my result is LOW or MEDIUM. Without this consent, my reflection is not sent to an AI provider. A HIGH-risk result always bypasses AI.
          </span>
        </label>
      </div>
    </div>
  );
};
