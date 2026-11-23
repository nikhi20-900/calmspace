import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#F7F6FB] border-t border-[#E8E6F1] py-16 text-[#625F78]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#E8E6F1]">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#5554B8] flex items-center justify-center text-white shadow-soft">
                <Sparkles className="w-4 h-4 text-[#E9E7FB]" />
              </div>
              <span className="font-heading text-lg font-bold text-[#25233B]">
                calmspace<span className="text-[#5554B8]">.</span>
              </span>
            </Link>
            <p className="text-xs text-[#625F78] leading-relaxed">
              A quieter space to check in with yourself. Designed to help university students cultivate self-compassion, balance academics, and access human help safely.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-xs font-bold text-[#25233B] uppercase tracking-wider mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/checkin" className="hover:text-[#5554B8] transition-colors">
                  Daily Check-in
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-[#5554B8] transition-colors">
                  Weekly Insights
                </Link>
              </li>
              <li>
                <Link to="/planner" className="hover:text-[#5554B8] transition-colors">
                  Study-Life Planner
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-[#5554B8] transition-colors">
                  Support Network
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[#5554B8] transition-colors">
                  Settings & Data Erasure
                </Link>
              </li>
            </ul>
          </div>

          {/* Principles */}
          <div>
            <h4 className="font-heading text-xs font-bold text-[#25233B] uppercase tracking-wider mb-3">
              Core Principles
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="text-[#25233B] font-medium">Rules decide safety.</li>
              <li className="text-[#25233B] font-medium">AI writes the language.</li>
              <li className="text-[#25233B] font-medium">Humans help.</li>
              <li className="pt-2 text-[11px] text-[#625F78]">Zero streaks · Zero clinical pressure · Local-first privacy</li>
            </ul>
          </div>

          {/* Emergency Helplines */}
          <div>
            <h4 className="font-heading text-xs font-bold text-red-600 uppercase tracking-wider mb-3">
              Immediate Help
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="tel:14416" className="text-[#5554B8] font-semibold hover:underline">
                  Tele-MANAS: 14416
                </a>
                <span className="block text-[11px] text-[#625F78]">24/7 National Mental Health Toll-Free</span>
              </li>
              <li className="pt-1">
                <a href="tel:112" className="text-red-600 font-semibold hover:underline">
                  Emergency Dispatch: 112
                </a>
                <span className="block text-[11px] text-[#625F78]">National Emergency Response</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Medical & Self-Hosted Typography Disclaimer */}
        <div className="pt-8 space-y-4 text-xs text-[#9C99B3]">
          <p className="leading-relaxed">
            <strong className="text-[#625F78]">Medical Disclaimer:</strong> Calmspace is a student wellbeing companion designed for personal self-reflection, study-life balance, and low-friction resource connection. It does not provide medical advice, psychotherapy, clinical psychiatric assessment, or crisis intervention. If you are in immediate danger or severe mental distress, please dial 112 or 14416 immediately.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-[#E8E6F1]/60 text-[11px]">
            <p>
              Typography self-hosted locally: Satoshi and Cabinet Grotesk by Indian Type Foundry (ITF Free Font License). No runtime requests to external font services.
            </p>
            <p className="flex items-center gap-1 text-[#625F78]">
              <span>Crafted for student calm</span>
              <Heart className="w-3 h-3 text-[#5554B8] fill-[#5554B8]" />
              <span>© {new Date().getFullYear()} Calmspace</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
