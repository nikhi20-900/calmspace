import React, { useState, useEffect, useRef } from 'react';
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
  AudioLines,
} from 'lucide-react';
import { usePrivacyModal } from '../../context/PrivacyModalContext';

export interface MobileNavigationProps {
  onOpenSupportModal: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenSupportModal }) => {
  const { openPrivacyModal } = usePrivacyModal();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);

  // Accessible focus trapping, restoration, Escape key dismissal, and scroll lock
  useEffect(() => {
    if (isOpen) {
      // 1. Lock body scrolling while modal drawer is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const getFocusable = () => {
        if (!drawerRef.current) return [];
        return Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
      };

      // 2. Move focus into first focusable element in drawer
      const focusTimer = setTimeout(() => {
        const focusable = getFocusable();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);

      // 3. Trap keyboard focus (Tab / Shift+Tab) and handle Escape
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          return;
        }

        if (e.key === 'Tab' && drawerRef.current) {
          const focusable = getFocusable();
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          // If focus is currently outside the drawer, pull it back in
          if (!drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            if (e.shiftKey) {
              last.focus();
            } else {
              first.focus();
            }
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      // 4. Handle focus entering from or escaping to outside the drawer
      const handleFocusIn = (e: FocusEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
          const focusable = getFocusable();
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('focusin', handleFocusIn);

      return () => {
        clearTimeout(focusTimer);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('focusin', handleFocusIn);
        document.body.style.overflow = originalOverflow;
      };
    } else if (prevIsOpen.current) {
      // 5. Restore focus to menu trigger button when drawer closes
      triggerRef.current?.focus();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/companion', label: 'Talk to Calm', icon: AudioLines },
    { to: '/checkin', label: 'Daily Check-in', icon: HeartPulse },
    { to: '/insights', label: 'My Insights', icon: LineChart },
    { to: '/planner', label: 'Study Planner', icon: CalendarCheck },
    { to: '/support', label: 'Support Network', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Quick primary items for bottom touch bar
  const bottomNavItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/companion', label: 'Calm', icon: AudioLines },
    { to: '/checkin', label: 'Check-in', icon: HeartPulse },
    { to: '/planner', label: 'Planner', icon: CalendarCheck },
    { to: '/support', label: 'Support', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Top Mobile Bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E6F1] px-4 py-3 flex items-center justify-between shadow-subtle">
        {/* Brand */}
        <NavLink
          to="/app"
          tabIndex={isOpen ? -1 : undefined}
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded py-1"
          onClick={() => setIsOpen(false)}
        >
          <div className="w-8 h-8 rounded-lg bg-[#5554B8] flex items-center justify-center text-white shadow-soft">
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
            tabIndex={isOpen ? -1 : undefined}
            onClick={onOpenSupportModal}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-button bg-[#E9E7FB] text-[#5554B8] hover:bg-[#DCD8F7] active:scale-95 transition-all flex items-center gap-1.5 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            aria-label="Get immediate human support"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support</span>
          </button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded-button text-[#25233B] hover:bg-[#F7F6FB] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Drawer Overlay & Content */}
        {isOpen && (
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="fixed inset-0 top-[57px] bg-[#25233B]/40 backdrop-blur-xs z-40 animate-fade-in"
            onClick={() => setIsOpen(false)}
          >
            {/* Top focus sentinel to capture reverse Tab cycling */}
            <div
              tabIndex={0}
              aria-hidden="true"
              className="sr-only"
              onFocus={() => {
                const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable && focusable.length > 0) {
                  focusable[focusable.length - 1].focus();
                }
              }}
            />

            <div
              ref={drawerRef}
              className="w-4/5 max-w-xs bg-white h-full border-r border-[#E8E6F1] p-5 shadow-elevation animate-fade-up flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EFF7]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#625F78]">
                    Navigation
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu drawer"
                    className="p-1 rounded text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1.5" aria-label="Mobile Drawer Navigation">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-3 rounded-button text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
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
              </div>

              <div className="pt-4 border-t border-[#E8E6F1] space-y-3 pb-6">
                <div className="p-3 rounded-card bg-[#F7F6FB] border border-[#E8E6F1]">
                  <p className="text-xs text-[#625F78] leading-relaxed mb-2">
                    Free, confidential human support is always ready when you need it.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSupportModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-button bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Need to talk to someone?</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openPrivacyModal();
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-button border border-[#E8E6F1] bg-white text-[#625F78] hover:text-[#5554B8] hover:border-[#D5D1E5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#245532]" />
                    <span>Privacy & Data Inventory</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom focus sentinel to capture forward Tab cycling */}
            <div
              tabIndex={0}
              aria-hidden="true"
              className="sr-only"
              onFocus={() => {
                const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable && focusable.length > 0) {
                  focusable[0].focus();
                }
              }}
            />
          </div>
        )}
      </header>

      {/* Bottom Mobile Tab Bar (Thumb-friendly Navigation) */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E8E6F1] px-2 py-1.5 flex justify-around items-center shadow-subtle select-none"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors min-h-[44px] min-w-[54px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  isActive
                    ? 'text-[#5554B8] font-bold'
                    : 'text-[#625F78] hover:text-[#25233B]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-md transition-colors ${
                      isActive ? 'bg-[#E9E7FB]' : 'bg-transparent'
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
