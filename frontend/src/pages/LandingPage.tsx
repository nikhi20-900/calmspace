import React, { useState } from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { StudentReality } from '../components/landing/StudentReality';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ProductPreview } from '../components/landing/ProductPreview';
import { WeeklyInsights } from '../components/landing/WeeklyInsights';
import { SafetySection } from '../components/landing/SafetySection';
import { PrivacySection } from '../components/landing/PrivacySection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { SupportModal } from '../components/layout/SupportModal';
import { ScrollReveal } from '../components/landing/ScrollReveal';

export const LandingPage: React.FC = () => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-main)] flex flex-col antialiased selection:bg-[var(--color-lavender-soft)] selection:text-[var(--color-primary)]">
      {/* Navigation Bar */}
      <LandingNavbar onOpenSupportModal={() => setSupportModalOpen(true)} />

      {/* Main Landing Sections */}
      <main id="main-content" className="flex-1">
        <HeroSection onOpenSupportModal={() => setSupportModalOpen(true)} />

        <ScrollReveal distance={40}>
          <StudentReality />
        </ScrollReveal>

        <ScrollReveal distance={40}>
          <HowItWorks />
        </ScrollReveal>

        <ScrollReveal distance={40}>
          <ProductPreview />
        </ScrollReveal>

        <ScrollReveal distance={40}>
          <WeeklyInsights />
        </ScrollReveal>

        <ScrollReveal distance={40}>
          <SafetySection onOpenSupportModal={() => setSupportModalOpen(true)} />
        </ScrollReveal>

        <ScrollReveal distance={40}>
          <PrivacySection />
        </ScrollReveal>

        <ScrollReveal distance={32}>
          <FinalCTA onOpenSupportModal={() => setSupportModalOpen(true)} />
        </ScrollReveal>
      </main>

      <LandingFooter />

      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
