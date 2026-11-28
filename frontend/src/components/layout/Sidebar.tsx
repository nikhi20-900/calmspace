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
  AudioLines,
} from 'lucide-react';
import { usePrivacyModal } from '../../context/PrivacyModalContext';

export interface SidebarProps {
  onOpenSupportModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSupportModal }) => {
  const { openPrivacyModal } = usePrivacyModal();
  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/companion', label: 'Talk to Calm', icon: AudioLines },
    { to: '/checkin', label: 'Daily Check-in', icon: HeartPulse },
    { to: '/insights', label: 'My Insights', icon: LineChart },
    { to: '/planner', label: 'Study Planner', icon: CalendarCheck },
    { to: '/support', label: 'Support Network', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="hidden md:flex flex-col w-64 border-r border-[#E8E6F1] bg-white h-screen sticky top-0 shrink-0 select-none z-20"
      aria-label="Main Application Navigation"
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-[#F0EFF7]">
        <NavLink to="/app" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded-md">
          <div className="w-10 h-10 rounded-xl bg-[#5554B8] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105 duration-200">
            <Sparkles className="w-5 h-5 text-[#E9E7FB]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[#25233B] block">
              Calmspace
            </span>
            <span className="text-xs text-[#625F78] font-medium block">
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
                `flex items-center gap-3 px-3.5 py-2.5 rounded-button text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-[#E9E7FB] text-[#5554B8] font-semibold shadow-subtle'
                    : 'text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Persistent Support Action */}
      <div className="p-4 border-t border-[#F0EFF7] bg-[#F7F6FB]/60">
        <div className="p-3.5 rounded-card bg-white border border-[#E8E6F1] shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#5554B8] animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#625F78]">
              Human Support
            </span>
          </div>
          <p className="text-xs text-[#625F78] mb-3 leading-relaxed">
            Free, confidential support is always available whenever things feel heavy.
          </p>
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-button bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need to talk to someone?</span>
          </button>
          <button
            type="button"
            onClick={openPrivacyModal}
            className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium rounded-button border border-[#E8E6F1] bg-white text-[#625F78] hover:text-[#5554B8] hover:border-[#D5D1E5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#245532]" />
            <span>Privacy & Data Inventory</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
