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
                    ? 'bg-[var(--color-surface-subtle)] border-[var(--color-lavender-border)] shadow-subtle'
                    : isDemo
                      ? 'bg-[var(--color-amber-light)] border-[var(--color-amber-border)]'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-text-main)]">
                        {contact.name}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          contact.is_urgent
                            ? 'bg-[var(--color-urgent-bg)] text-[var(--color-urgent-text)]'
                            : isDemo
                              ? 'bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] border border-[var(--color-amber-border)]'
                              : 'bg-[var(--color-lavender-soft)] text-[var(--color-primary)]'
                        }`}
                      >
                        {contact.badge_label}
                      </span>
                      {isDemo && (
                        <span className="text-xs font-semibold text-[var(--color-amber-text)] bg-[var(--color-amber-soft)] px-2 py-0.5 rounded-full">
                          Demo Template
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {contact.description}
                    </p>

                    <div className="pt-1 flex items-center gap-4 text-sm text-[var(--color-text-secondary)] flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        {contact.hours}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-[var(--color-sage-text)]" />
                        Verified: {contact.last_verified_date}
                      </span>
                      {contact.official_source_url && (
                        <a
                          href={contact.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                        >
                          <span>{contact.verification_source}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
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
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-button bg-[var(--color-surface)] border border-[var(--color-border-dark)] text-[var(--color-text-main)] hover:bg-[var(--color-bg)]"
                      >
                        <Info className="w-4 h-4 text-[var(--color-primary)]" />
                        <span>Demo Details</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-button bg-[var(--color-primary-fill)] text-white hover:bg-[var(--color-primary-fill-hover)] active:bg-[var(--color-primary-fill-active)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call {contact.contact_number}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3.5 rounded-card bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            <strong>Availability Note:</strong> Calmspace provides verified directory access and triage routing. Helplines and dispatch services are managed by external agencies; availability and outcomes are not guaranteed.
          </p>
        </div>

        <div className="mt-5 pt-3.5 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Rules decide safety. AI writes language. Humans help.</span>
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/support');
              }}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Support Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-[var(--color-text-main)] hover:underline"
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
        <div className="space-y-4 text-sm text-[var(--color-text-main)] leading-relaxed">
          <div className="p-3.5 rounded-card bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber-text)] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Template Placeholder</p>
              <p>
                This campus entry is a template placeholder. Calmspace does not dispatch student distress data without configured institutional webhooks.
              </p>
            </div>
          </div>

          <p className="text-[var(--color-text-secondary)]">
            For live emergency or crisis assistance right now, please use the verified national helplines:
          </p>

          <div className="p-4 rounded-card bg-[var(--color-lavender-soft)] border border-[var(--color-lavender-border)]">
            <p className="font-semibold text-[var(--color-text-main)] mb-1">
              Tele-MANAS (Govt. of India)
            </p>
            <p className="text-[var(--color-text-secondary)] mb-3">
              Toll-free, 24/7, multi-lingual support available in 20+ languages.
            </p>
            <a
              href="tel:14416"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button bg-[var(--color-primary-fill)] text-white text-sm font-semibold hover:bg-[var(--color-primary-fill-hover)]"
            >
              <Phone className="w-4 h-4" />
              <span>Call 14416 Now</span>
            </a>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDemoNoticeOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
};
