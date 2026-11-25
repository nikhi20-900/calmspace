import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[var(--color-bg)] border-t border-[var(--color-border)] py-16 text-[var(--color-text-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[var(--color-border)]">
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-fill)] flex items-center justify-center text-white shadow-soft">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading text-lg font-bold text-[var(--color-text-main)]">
                calmspace<span className="text-[var(--color-primary)]">.</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              A quieter space to check in with yourself. Designed to help university students cultivate self-compassion, balance academics, and access human help safely.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/checkin" className="hover:text-[var(--color-primary)] transition-colors">
                  Daily Check-in
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-[var(--color-primary)] transition-colors">
                  Weekly Insights
                </Link>
              </li>
              <li>
                <Link to="/planner" className="hover:text-[var(--color-primary)] transition-colors">
                  Study-Life Planner
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-[var(--color-primary)] transition-colors">
                  Support Network
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[var(--color-primary)] transition-colors">
                  Settings & Data Erasure
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-3">
              Core Principles
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="text-[var(--color-text-main)] font-medium">Rules decide safety.</li>
              <li className="text-[var(--color-text-main)] font-medium">AI writes the language.</li>
              <li className="text-[var(--color-text-main)] font-medium">Humans help.</li>
              <li className="pt-2 text-sm text-[var(--color-text-muted)]">Zero streaks · Zero clinical pressure · Local-first privacy</li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-[var(--color-danger-text)] uppercase tracking-wider mb-3">
              Immediate Help
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:14416" className="text-[var(--color-primary)] font-semibold hover:underline">
                  Tele-MANAS: 14416
                </a>
                <span className="block text-sm text-[var(--color-text-secondary)]">24/7 National Mental Health Toll-Free</span>
              </li>
              <li className="pt-1">
                <a href="tel:112" className="text-[var(--color-danger-text)] font-semibold hover:underline">
                  Emergency Dispatch: 112
                </a>
                <span className="block text-sm text-[var(--color-text-secondary)]">National Emergency Response</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 space-y-4 text-sm text-[var(--color-text-muted)]">
          <p className="leading-relaxed">
            <strong className="text-[var(--color-text-secondary)]">Medical Disclaimer:</strong> Calmspace is a student wellbeing companion designed for personal self-reflection, study-life balance, and low-friction resource connection. It does not provide medical advice, psychotherapy, clinical psychiatric assessment, or crisis intervention. If you are in immediate danger or severe mental distress, please dial 112 or 14416 immediately.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)] text-sm">
            <p>
              Typography self-hosted locally: Satoshi and Cabinet Grotesk by Indian Type Foundry (ITF Free Font License). No runtime requests to external font services.
            </p>
            <p className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <span>Crafted for student calm</span>
              <Heart className="w-3.5 h-3.5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
              <span>© {new Date().getFullYear()} Calmspace</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
