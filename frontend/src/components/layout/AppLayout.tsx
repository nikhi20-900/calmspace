import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { SupportModal } from './SupportModal';

export const AppLayout: React.FC = () => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col md:flex-row antialiased text-[#25233B]">
      {/* Desktop Sidebar */}
      <Sidebar onOpenSupportModal={() => setSupportModalOpen(true)} />

      {/* Mobile Header Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNavigation onOpenSupportModal={() => setSupportModalOpen(true)} />

        {/* Main Content Viewport */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 lg:py-10"
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
