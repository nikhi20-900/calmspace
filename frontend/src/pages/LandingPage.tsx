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
    <div className="min-h-screen bg-[#F7F6FB] text-[#25233B] flex flex-col antialiased selection:bg-[#E9E7FB] selection:text-[#5554B8]">
      {/* Navigation Bar */}
      <LandingNavbar onOpenSupportModal={() => setSupportModalOpen(true)} />

      {/* Main Landing Sections */}
      <main id="main-content" className="flex-1">
        {/* Section 1: Hero with 3D Volumetric Mascot */}
        <HeroSection onOpenSupportModal={() => setSupportModalOpen(true)} />

        {/* Section 2: Student Reality */}
        <ScrollReveal distance={40}>
          <StudentReality />
        </ScrollReveal>

        {/* Section 3: How Calmspace Works */}
        <ScrollReveal distance={40}>
          <HowItWorks />
        </ScrollReveal>

        {/* Section 4: Product Experience Preview */}
        <ScrollReveal distance={40}>
          <ProductPreview />
        </ScrollReveal>

        {/* Section 5: Weekly Insights & Rhythms */}
        <ScrollReveal distance={40}>
          <WeeklyInsights />
        </ScrollReveal>

        {/* Section 6: Safety Engine & Human Escalation */}
        <ScrollReveal distance={40}>
          <SafetySection onOpenSupportModal={() => setSupportModalOpen(true)} />
        </ScrollReveal>

        {/* Section 7: Privacy First Architecture */}
        <ScrollReveal distance={40}>
          <PrivacySection />
        </ScrollReveal>

        {/* Section 8: Final CTA */}
        <ScrollReveal distance={32}>
          <FinalCTA onOpenSupportModal={() => setSupportModalOpen(true)} />
        </ScrollReveal>
      </main>

      {/* Editorial Footer */}
      <LandingFooter />

      {/* Immediate Human Support Modal */}
      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
