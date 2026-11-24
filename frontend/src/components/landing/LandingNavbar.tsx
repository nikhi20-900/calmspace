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
    <header className="sticky top-0 z-40 bg-[#F7F6FB]/95 sm:bg-[#F7F6FB]/85 backdrop-blur-none sm:backdrop-blur-md border-b border-[#E8E6F1]/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded-lg"
          aria-label="Calmspace Home"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#5554B8] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105 duration-200">
            <Sparkles className="w-5 h-5 text-[#E9E7FB]" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl font-bold tracking-tight text-[#25233B]">
              calmspace<span className="text-[#5554B8]">.</span>
            </span>
            <span className="text-[11px] font-medium text-[#625F78] -mt-1 tracking-wide">
              student companion
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="text-sm font-medium text-[#625F78] hover:text-[#5554B8] transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5554B8] bg-[#E9E7FB] hover:bg-[#DED9F8] active:scale-98 rounded-full border border-[#DCD9F5] transition-all"
            aria-label="Access immediate 24/7 human crisis support"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#5554B8]" />
            <span>Need Help? (14416)</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#5554B8] hover:bg-[#4645A7] active:scale-98 rounded-full shadow-soft hover:shadow-card transition-all"
          >
            <HeartPulse className="w-4 h-4 text-[#E9E7FB]" />
            <span>Find your calm</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenSupportModal}
            className="sm:hidden px-2.5 py-1.5 text-xs font-semibold text-[#5554B8] bg-[#E9E7FB] rounded-full border border-[#DCD9F5]"
            aria-label="Immediate Help"
          >
            Help 14416
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#25233B] hover:text-[#5554B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded-lg"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E8E6F1] bg-white sm:bg-white/95 backdrop-blur-none sm:backdrop-blur-md px-6 py-6 shadow-xl animate-fade-in">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="text-base font-medium text-[#25233B] hover:text-[#5554B8] py-1 border-b border-gray-100"
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
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#5554B8] bg-[#E9E7FB] rounded-xl border border-[#DCD9F5]"
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
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#5554B8] hover:bg-[#4645A7] rounded-xl shadow-soft"
              >
                <HeartPulse className="w-4 h-4 text-[#E9E7FB]" />
                <span>Find your calm</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
