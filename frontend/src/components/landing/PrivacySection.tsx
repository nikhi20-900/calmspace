import React from 'react';
import { Lock, KeyRound, EyeOff, Trash2, Sparkles, ShieldCheck } from 'lucide-react';
import { ScrollStagger, ScrollStaggerItem } from './ScrollReveal';
import { usePrivacyModal } from '../../context/PrivacyModalContext';

export const PrivacySection: React.FC = () => {
  const { openPrivacyModal } = usePrivacyModal();
  const privacyPillars = [
    {
      icon: KeyRound,
      title: 'Anonymous Session ID',
      description:
        'No student ID, university email, phone number, or real name required. Your browser creates a local anonymous session ID to keep your records separate.',
    },
    {
      icon: EyeOff,
      title: 'Ephemeral AI Processing',
      description:
        'Optional check-in notes are evaluated in-flight to generate supportive language. They are never retained to train foundation models or build personal marketing profiles.',
    },
    {
      icon: Lock,
      title: 'Local-First Storage',
      description:
        'Check-ins and study plans remain securely stored on your device. We do not sell data to ad brokers, insurance companies, or universities.',
    },
    {
      icon: Trash2,
      title: 'One-Tap Erasure',
      description:
        'You own your data completely. With a single tap in Settings, your local records and server sessions are permanently erased with zero retention.',
    },
  ];

  return (
    <section id="privacy" className="py-20 sm:py-28 bg-[#F7F6FB] border-t border-[#E8E6F1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9E7FB] text-xs font-semibold text-[#5554B8] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Privacy Architecture</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[#25233B] tracking-tight">
            Your feelings deserve privacy.
          </h2>
          <p className="mt-4 text-lg text-[#625F78] leading-relaxed">
            Students hesitate to seek help when they fear disciplinary notes or surveillance.
            Calmspace was engineered from line one with zero tracking and full anonymity.
          </p>
        </div>

        {/* 4 Privacy Pillars */}
        <ScrollStagger className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {privacyPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <ScrollStaggerItem
                key={idx}
                className="bg-white rounded-3xl p-8 border border-[#E8E6F1] shadow-subtle hover:border-[#DCD9F5] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#F2F1FD] text-[#5554B8] flex items-center justify-center mb-5 border border-[#E9E7FB]">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#25233B] mb-2.5">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#625F78] leading-relaxed">
                  {pillar.description}
                </p>
              </ScrollStaggerItem>
            );
          })}
        </ScrollStagger>

        {/* Zero Tracker Guarantee Badge & Modal Trigger */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-[#E8E6F1] shadow-xs text-xs font-medium text-[#25233B]">
            <ShieldCheck className="w-5 h-5 text-[#34A853]" />
            <span>No third-party trackers, no cookies, and no runtime font CDN requests.</span>
          </div>
          <button
            type="button"
            onClick={openPrivacyModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E9E7FB] hover:bg-[#DCD8F7] text-[#5554B8] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            <ShieldCheck className="w-4 h-4 text-[#245532]" />
            <span>Inspect Complete Data Inventory</span>
          </button>
        </div>
      </div>
    </section>
  );
};
