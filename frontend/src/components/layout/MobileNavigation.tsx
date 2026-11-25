import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  HeartPulse,
  LineChart,
  CalendarCheck,
  ShieldCheck,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { usePrivacyModal } from '../../context/PrivacyModalContext';

export interface MobileNavigationProps {
  onOpenSupportModal: () => void;
}

const BOTTOM_NAV_ITEMS = [
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
      {/* Slim top bar: brand + privacy disclosure + settings + quick support */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-3 py-2 flex items-center justify-between gap-2 shadow-subtle">
        <NavLink
          to="/app"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded py-1 shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-fill)] flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-[var(--color-text-main)] leading-none">
            Calmspace
          </span>
        </NavLink>

        {/* Action Pills: Privacy, Settings, Quick Support */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPrivacyModal}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] active:scale-95 transition-all flex items-center gap-1 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="View Privacy & Data Inventory"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-sage-text)]" aria-hidden="true" />
            <span>Privacy</span>
          </button>

          <NavLink
            to="/settings"
            aria-label="Settings and theme preferences"
            className={({ isActive }) =>
              `p-2 rounded-full border transition-all flex items-center justify-center min-w-[40px] min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                isActive
                  ? 'bg-[var(--color-lavender-soft)] border-[var(--color-lavender-border)] text-[var(--color-primary)]'
                  : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
              }`
            }
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </NavLink>

          <button
            type="button"
            onClick={onOpenSupportModal}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)] hover:bg-[var(--color-lavender-border)] active:scale-95 transition-all flex items-center gap-1 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Get immediate human support"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Help</span>
          </button>
        </div>
      </header>

      {/* Bottom Mobile Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-1.5 py-1.5 flex justify-around items-center shadow-subtle select-none"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] min-w-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isActive
                    ? 'text-[var(--color-primary)] font-bold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-md transition-colors ${
                      isActive ? 'bg-[var(--color-lavender-soft)]' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="mt-0.5 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
