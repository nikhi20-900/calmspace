import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cat, X } from 'lucide-react';

const CAT_MESSAGES = [
  'Mochi says hi. Want to take a tiny pause together?',
  'A little stretch break, human?',
  'I saved you a cozy spot. Come chat with Calm when you’re ready.',
];

export const RoamingPet: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
  }, []);

  if (hidden) return (
    <button type="button" onClick={() => setHidden(false)} aria-label="Bring Mochi back" className="fixed bottom-[84px] right-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-[#E8E6F1] bg-white/95 px-3 py-2 text-xs font-semibold text-[#5554B8] shadow-md md:bottom-3">
      <Cat size={15} /> Mochi
    </button>
  );

  const petCat = () => {
    setMessageIndex((current) => ((current ?? -1) + 1) % CAT_MESSAGES.length);
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => setMessageIndex(null), 6500);
  };

  return (
    <div className="calmspace-roaming-pet" aria-label="Mochi, a roaming Calmspace cat">
      {messageIndex !== null && (
        <div className="calmspace-roaming-pet__bubble" role="status" aria-live="polite">
          <button type="button" className="calmspace-roaming-pet__close" onClick={() => setMessageIndex(null)} aria-label="Close cat message">
            <X size={13} />
          </button>
          <span>{CAT_MESSAGES[messageIndex]}</span>
          <Link to="/companion" onClick={() => setMessageIndex(null)}>Visit Calm <span aria-hidden="true">→</span></Link>
        </div>
      )}

      <button type="button" className="calmspace-roaming-pet__button" onClick={petCat} aria-label="Pet Mochi the roaming cat" title="Click Mochi">
        <svg className="calmspace-roaming-pet__sprite" viewBox="0 0 88 64" aria-hidden="true">
          <ellipse cx="44" cy="57" rx="31" ry="4" fill="#5B537B" opacity=".12" />
          <path className="calmspace-roaming-pet__tail" d="M17 41C7 39 9 27 17 27c5 0 7 5 4 8" fill="none" stroke="#BD9778" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="39" cy="43" rx="23" ry="14" fill="#E9D4BE" stroke="#B99374" strokeWidth="2" />
          <ellipse cx="43" cy="48" rx="12" ry="7" fill="#FFF7EC" />
          <path className="calmspace-roaming-pet__leg calmspace-roaming-pet__leg--one" d="M28 48v7" stroke="#BD9778" strokeWidth="5" strokeLinecap="round" />
          <path className="calmspace-roaming-pet__leg calmspace-roaming-pet__leg--two" d="M52 48v7" stroke="#BD9778" strokeWidth="5" strokeLinecap="round" />
          <g className="calmspace-roaming-pet__head">
            <path d="M25 26 27 8q1-4 5-1l9 9q4-1 8 0l9-9q4-3 5 1l2 18" fill="#E9D4BE" stroke="#B99374" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="m31 12 7 7-8 2Zm27 0-7 7 8 2Z" fill="#E79FA9" />
            <path d="M25 28q0-17 19-17t19 17q0 17-19 17T25 28Z" fill="#F2DFC9" stroke="#B99374" strokeWidth="2.5" />
            <path d="M31 22q3-3 7 0m12 0q3-3 7 0" fill="none" stroke="#B99374" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="36" cy="28" rx="2.4" ry="3.3" fill="#332A3B" />
            <ellipse cx="52" cy="28" rx="2.4" ry="3.3" fill="#332A3B" />
            <circle cx="36.8" cy="27" r=".8" fill="white" /><circle cx="52.8" cy="27" r=".8" fill="white" />
            <path d="m42 34 3-2 3 2-3 3Z" fill="#B87580" />
            <path d="M45 36v3m0 0q-3 3-5 0m5 0q3 3 5 0" fill="none" stroke="#80616A" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M32 34 21 32m11 6-11 1m37-5 11-2m-11 8 11 1" stroke="#B99374" strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="31" cy="34" rx="3" ry="1.6" fill="#E89EA5" opacity=".45" /><ellipse cx="59" cy="34" rx="3" ry="1.6" fill="#E89EA5" opacity=".45" />
          </g>
          <path className="calmspace-roaming-pet__sparkle" d="m72 18 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#8F88D5" />
        </svg>
      </button>
      <button type="button" className="calmspace-roaming-pet__hide" onClick={() => setHidden(true)} aria-label="Hide Mochi the roaming cat">Hide</button>
    </div>
  );
};

export default RoamingPet;
