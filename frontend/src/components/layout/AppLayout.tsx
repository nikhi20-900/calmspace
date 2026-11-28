import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { SupportModal } from './SupportModal';
import { useReminderScheduler } from '../../hooks/useReminderScheduler';

export const AppLayout: React.FC = () => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const { dueReminders, dismissReminder, snoozeReminder } = useReminderScheduler();

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col md:flex-row antialiased text-[#25233B]">
      {/* Accessible Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#5554B8] focus:text-white focus:font-semibold focus:text-sm focus:rounded-button focus:shadow-elevation focus:outline-none focus:ring-2 focus:ring-[#5554B8] focus:ring-offset-2"
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
          className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 lg:py-10 pb-20 md:pb-10 focus:outline-none"
        >
          {dueReminders.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 space-y-2"
            >
              {dueReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3.5 rounded-card bg-[#F6F5FE] border-2 border-[#5554B8]/40 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#E9E7FB] text-[#5554B8] flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#25233B]">
                        Gentle Reminder: {rem.title}
                      </p>
                      <p className="text-[11px] text-[#625F78]">
                        Scheduled {rem.category} nudge • Take a gentle pause whenever you&apos;re ready.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => snoozeReminder(rem.id, 10)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button border border-[#D5D1E5] bg-white text-xs font-semibold text-[#625F78] hover:text-[#25233B]"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Snooze 10m</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissReminder(rem.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
