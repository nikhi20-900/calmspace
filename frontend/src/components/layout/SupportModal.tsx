import React from 'react';
import { Phone, Shield, ExternalLink, Clock, HeartHandshake } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { FALLBACK_SUPPORT_RESOURCES } from '../../services/api';

export interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="You don't have to carry this alone."
      description="Connect directly with certified human counsellors, campus advisors, or emergency care. All services are confidential."
      maxWidth="lg"
    >
      <div className="space-y-3.5 mt-3">
        {FALLBACK_SUPPORT_RESOURCES.map((contact) => (
          <div
            key={contact.id}
            className={`p-4 rounded-card border transition-all ${
              contact.is_urgent
                ? 'bg-[#F9F8FD] border-[#5554B8]/30 shadow-subtle'
                : 'bg-white border-[#E8E6F1]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#25233B]">
                    {contact.name}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    contact.is_urgent
                      ? 'bg-[#25233B] text-white'
                      : 'bg-[#E9E7FB] text-[#5554B8]'
                  }`}>
                    {contact.badge_label}
                  </span>
                </div>
                <p className="text-xs text-[#625F78] leading-relaxed">
                  {contact.description}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-[#625F78] pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                    {contact.hours}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#245532]" />
                    Verified: {contact.last_verified_date}
                  </span>
                </div>
              </div>

              {/* Call Action Button */}
              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-button bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {contact.contact_number}</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[#E8E6F1] flex items-center justify-between text-xs text-[#625F78]">
        <span className="flex items-center gap-1.5">
          <HeartHandshake className="w-4 h-4 text-[#5554B8]" />
          <span>Rules decide safety. AI writes language. Humans help.</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-[#25233B] hover:underline"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
};
