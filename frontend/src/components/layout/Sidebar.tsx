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

export interface SidebarProps {
  onOpenSupportModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSupportModal }) => {
  const { openPrivacyModal } = usePrivacyModal();
  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/checkin', label: 'Daily Check-in', icon: HeartPulse },
    { to: '/insights', label: 'My Insights', icon: LineChart },
    { to: '/planner', label: 'Study Planner', icon: CalendarCheck },
    { to: '/support', label: 'Support Network', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="hidden md:flex flex-col w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen sticky top-0 shrink-0 select-none z-20"
      aria-label="Main Application Navigation"
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-[var(--color-border-light)]">
        <NavLink
          to="/app"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-fill)] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105 duration-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[var(--color-text-main)] block">
              Calmspace
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] font-medium block">
              Student Wellbeing
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-button text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-[var(--color-lavender-soft)] text-[var(--color-primary)] font-semibold shadow-subtle'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-2 border-t border-[var(--color-border-light)] mt-2">
          <button
            type="button"
            onClick={openPrivacyModal}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-button text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--color-sage-text)]" />
            <span>Privacy Inventory</span>
          </button>
        </div>
      </nav>

      {/* Persistent Support Action */}
      <div className="p-4 border-t border-[var(--color-border-light)] bg-[var(--color-bg)]/60">
        <div className="p-3.5 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Human Support
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3 leading-relaxed">
            Free, confidential support is always available whenever things feel heavy.
          </p>
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-button bg-[var(--color-primary-fill)] text-white hover:bg-[var(--color-primary-fill-hover)] active:bg-[var(--color-primary-fill-active)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Need to talk to someone?</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
