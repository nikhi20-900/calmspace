import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  HeartPulse,
  LineChart,
  CalendarCheck,
  ShieldCheck,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export interface MobileNavigationProps {
  onOpenSupportModal: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenSupportModal }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/checkin', label: 'Daily Check-in', icon: HeartPulse },
    { to: '/insights', label: 'My Insights', icon: LineChart },
    { to: '/planner', label: 'Study Planner', icon: CalendarCheck },
    { to: '/support', label: 'Support Network', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-[#E8E6F1] px-4 py-3 flex items-center justify-between shadow-subtle">
      {/* Brand */}
      <NavLink
        to="/app"
        className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded"
        onClick={() => setIsOpen(false)}
      >
        <div className="w-8 h-8 rounded-lg bg-[#5554B8] flex items-center justify-center text-white">
          <Sparkles className="w-4 h-4 text-[#E9E7FB]" />
        </div>
        <div>
          <span className="text-base font-bold text-[#25233B] block leading-none">
            Calmspace
          </span>
          <span className="text-[10px] text-[#625F78] font-medium block">
            Student Companion
          </span>
        </div>
      </NavLink>

      {/* Action Buttons: Quick Support & Drawer Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSupportModal}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-button bg-[#E9E7FB] text-[#5554B8] hover:bg-[#DCD8F7] active:scale-95 transition-all flex items-center gap-1.5"
          aria-label="Get immediate human support"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Support</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-button text-[#25233B] hover:bg-[#F7F6FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[57px] bg-[#25233B]/40 backdrop-blur-xs z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-white h-full border-r border-[#E8E6F1] p-5 shadow-elevation animate-fade-up flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-button text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#E9E7FB] text-[#5554B8] font-semibold'
                          : 'text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#E8E6F1]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSupportModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold rounded-button bg-[#5554B8] text-white"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Need to talk to someone?</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
