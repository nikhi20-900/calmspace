import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles, HeartPulse, ShieldAlert } from 'lucide-react';

export interface LandingNavbarProps {
  onOpenSupportModal: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenSupportModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { href: '#reality', label: 'Student Life' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#experience', label: 'Experience' },
    { href: '#insights', label: 'Rhythms' },
    { href: '#safety', label: 'Safety First' },
    { href: '#privacy', label: 'Privacy' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg)]/95 sm:bg-[var(--color-bg)]/85 backdrop-blur-none sm:backdrop-blur-md border-b border-[var(--color-border)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg"
          aria-label="Calmspace Home"
        >
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-fill)] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105 duration-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl font-bold tracking-tight text-[var(--color-text-main)]">
              calmspace<span className="text-[var(--color-primary)]">.</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] -mt-1 tracking-wide">
              student companion
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-lavender-soft)] hover:bg-[var(--color-lavender-border)] active:scale-98 rounded-full border border-[var(--color-lavender-border)] transition-all"
            aria-label="Access immediate 24/7 human crisis support"
          >
            <ShieldAlert className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Need Help? (14416)</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary-fill)] hover:bg-[var(--color-primary-fill-hover)] active:scale-98 rounded-full shadow-soft hover:shadow-card transition-all"
          >
            <HeartPulse className="w-4 h-4 text-white" />
            <span>Find your calm</span>
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-lavender-soft)] rounded-full border border-[var(--color-lavender-border)] min-h-[38px]"
            aria-label="Immediate Help"
          >
            Help 14416
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--color-text-main)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] sm:bg-[var(--color-surface)]/95 backdrop-blur-none sm:backdrop-blur-md px-6 py-6 shadow-xl animate-fade-in">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="text-base font-medium text-[var(--color-text-main)] hover:text-[var(--color-primary)] py-1 border-b border-[var(--color-border-light)]"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSupportModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-lavender-soft)] rounded-xl border border-[var(--color-lavender-border)]"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Immediate Support (Tele-MANAS 14416)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/checkin');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[var(--color-primary-fill)] hover:bg-[var(--color-primary-fill-hover)] rounded-xl shadow-soft"
              >
                <HeartPulse className="w-4 h-4 text-white" />
                <span>Find your calm</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
