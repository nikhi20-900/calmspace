import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { SupportModal } from './SupportModal';

export const AppLayout: React.FC = () => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col md:flex-row antialiased text-[var(--color-text-main)]">
      {/* Accessible Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[var(--color-primary-fill)] focus:text-white focus:font-semibold focus:text-sm focus:rounded-button focus:shadow-elevation focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar onOpenSupportModal={() => setSupportModalOpen(true)} />

      {/* Main Viewport & Mobile Navigation */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNavigation onOpenSupportModal={() => setSupportModalOpen(true)} />

        {/* Main Content Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 lg:py-10 pb-24 md:pb-10 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Global Support Modal accessible from anywhere */}
      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
};
