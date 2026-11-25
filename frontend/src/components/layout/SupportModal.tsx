import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, ExternalLink, Clock, HeartHandshake, AlertTriangle, Info } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { CANONICAL_SUPPORT_RESOURCES } from '../../services/supportResources';

export interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [demoNoticeOpen, setDemoNoticeOpen] = useState(false);

  const activeResources = CANONICAL_SUPPORT_RESOURCES.filter(
    (c) => c.is_active !== false
  );

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="You don't have to carry this alone."
        description="Connect directly with official national helplines and emergency dispatch services. Campus counseling entries represent template placeholders requiring institutional setup."
        maxWidth="lg"
      >
        <div className="space-y-3.5 mt-3">
          {activeResources.map((contact) => {
            const isDemo = Boolean(contact.is_demo_placeholder);

            return (
              <div
                key={contact.id}
                className={`p-4 rounded-card border transition-all ${
                  contact.is_urgent
                    ? 'bg-[#F9F8FD] border-[#5554B8]/30 shadow-subtle'
                    : isDemo
                      ? 'bg-[#FFFDF9] border-[#F4DCCB]'
                      : 'bg-white border-[#E8E6F1]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#25233B]">
                        {contact.name}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          contact.is_urgent
                            ? 'bg-[#25233B] text-white'
                            : isDemo
                              ? 'bg-[#FBF0EA] text-[#7A4D05] border border-[#F4DCCB]'
                              : 'bg-[#E9E7FB] text-[#5554B8]'
                        }`}
                      >
                        {contact.badge_label}
                      </span>
                      {isDemo && (
                        <span className="text-[10px] font-semibold text-[#B24823] bg-[#FDEEE9] px-2 py-0.5 rounded-full">
                          Demo Template
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#625F78] leading-relaxed">
                      {contact.description}
                    </p>

                    <div className="pt-1 flex items-center gap-4 text-[11px] text-[#625F78] flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                        {contact.hours}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-[#245532]" />
                        Verified: {contact.last_verified_date}
                      </span>
                      {contact.official_source_url && (
                        <a
                          href={contact.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#5554B8] hover:underline"
                        >
                          <span>{contact.verification_source}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isDemo ? (
                      <button
                        type="button"
                        onClick={() => setDemoNoticeOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-button bg-white border border-[#D5D1E5] text-[#25233B] hover:bg-[#F7F6FB]"
                      >
                        <Info className="w-3.5 h-3.5 text-[#5554B8]" />
                        <span>Demo Details</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-button bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {contact.contact_number}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] text-[11px] text-[#625F78] leading-relaxed">
          <p>
            <strong>Availability Note:</strong> Calmspace provides verified directory access and triage routing. Helplines and dispatch services are managed by external agencies; availability and outcomes are not guaranteed.
          </p>
        </div>

        <div className="mt-5 pt-3.5 border-t border-[#E8E6F1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#625F78]">
          <span className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-[#5554B8]" />
            <span>Rules decide safety. AI writes language. Humans help.</span>
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/support');
              }}
              className="font-semibold text-[#5554B8] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Support Directory</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-[#25233B] hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* Demo Integration Explanation Dialog */}
      <Dialog
        isOpen={demoNoticeOpen}
        onClose={() => setDemoNoticeOpen(false)}
        title="Campus Integration Notice (Demo Placeholder)"
        description="Important information regarding institutional campus support connections."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-[#25233B] leading-relaxed">
          <div className="p-3.5 rounded-card bg-[#FBF0EA] border border-[#F4DCCB] text-[#7A4D05] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B24823]" />
            <div>
              <p className="font-semibold text-sm mb-0.5 text-[#B24823]">
                Template Placeholder
              </p>
              <p>
                This campus entry is a template placeholder. Calmspace does not dispatch student distress data without configured institutional webhooks.
              </p>
            </div>
          </div>

          <p className="text-[#625F78]">
            For live emergency or crisis assistance right now, please use the verified national helplines:
          </p>

          <div className="p-4 rounded-card bg-[#E9E7FB] border border-[#D5D1E5]">
            <p className="font-semibold text-sm text-[#25233B] mb-1">
              Tele-MANAS (Govt. of India)
            </p>
            <p className="text-[#625F78] mb-3">
              Toll-free, 24/7, multi-lingual support available in 20+ languages.
            </p>
            <a
              href="tel:14416"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call 14416 Now</span>
            </a>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#E8E6F1] flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDemoNoticeOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
};
