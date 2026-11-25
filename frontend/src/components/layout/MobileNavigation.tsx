import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  HeartPulse,
  LineChart,
  CalendarCheck,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { usePrivacyModal } from '../../context/PrivacyModalContext';

export interface MobileNavigationProps {
  onOpenSupportModal: () => void;
}

/** Primary routes shown in the bottom tab bar (5 max for thumb reach) */
const PRIMARY_NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard },
  { to: '/checkin', label: 'Check-in', icon: HeartPulse },
  { to: '/insights', label: 'Insights', icon: LineChart },
  { to: '/planner', label: 'Planner', icon: CalendarCheck },
  { to: '/support', label: 'Support', icon: ShieldCheck },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenSupportModal }) => {
  const { openPrivacyModal } = usePrivacyModal();
  return (
    <>
      {/* Slim top bar: brand + quick-support button + privacy modal button */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between shadow-[var(--shadow-subtle)]">
        {/* Brand */}
        <NavLink
          to="/app"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded py-0.5"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white shadow-[var(--shadow-subtle)]">
            <Sparkles className="w-4 h-4 text-[var(--color-lavender-soft)]" />
          </div>
          <span className="text-sm font-bold text-[var(--color-text-main)] leading-none">
            Calmspace
          </span>
        </NavLink>

        {/* Action Pills: Privacy & Quick Support */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPrivacyModal}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] active:scale-95 transition-all flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="View Privacy & Data Inventory"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#245532]" />
            <span className="text-[11px]">Privacy</span>
          </button>

          <button
            type="button"
            onClick={onOpenSupportModal}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)] hover:bg-[var(--color-lavender-border)] active:scale-95 transition-all flex items-center gap-1.5 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Get immediate human support"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need help?</span>
          </button>
        </div>
      </header>

      {/* Bottom tab bar — the only navigation surface on mobile */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)]/97 backdrop-blur-md border-t border-[var(--color-border)] px-1 pb-safe flex justify-around items-stretch shadow-[var(--shadow-subtle)] select-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center pt-2 pb-1 px-2 rounded-xl text-[10px] font-semibold tracking-tight transition-colors min-h-[52px] min-w-[52px] flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl mb-0.5 transition-colors ${
                      isActive ? 'bg-[var(--color-lavender-soft)]' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
