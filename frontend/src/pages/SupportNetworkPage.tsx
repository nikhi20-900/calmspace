import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import {
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { api, FALLBACK_SUPPORT_RESOURCES } from '../services/api';
import { SupportContact } from '../types';

export const SupportNetworkPage: React.FC = () => {
  const [resources, setResources] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [demoNoticeOpen, setDemoNoticeOpen] = useState(false);

  const loadResources = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await api.getSupportResources();
      const activeData = data.filter((r) => r.is_active !== false);
      setResources(activeData.length ? activeData : FALLBACK_SUPPORT_RESOURCES.filter((r) => r.is_active !== false));
    } catch (e) {
      console.warn('Support directory API failed, using fallback verified resources:', e);
      setHasError(true);
      setResources(FALLBACK_SUPPORT_RESOURCES.filter((r) => r.is_active !== false));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  if (loading) {
    return <LoadingState message="Loading verified support resources..." />;
  }

  const activeResources = resources.filter((r) => r.is_active !== false);
  const campusResources = activeResources.filter((r) => r.category === 'campus');
  const helplineResources = activeResources.filter((r) => r.category === 'helpline');
  const emergencyResources = activeResources.filter((r) => r.category === 'emergency');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      <PageHeader
        tag="Human Support Network"
        title="Verified care, whenever you need it"
        description="National helplines and emergency numbers are verified against Government of India registries. Campus counselling entries are demonstration placeholders requiring institutional configuration."
      />

      {/* Care notice */}
      <div
        className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] flex items-start gap-3 leading-relaxed"
        role="region"
        aria-label="Care and availability disclaimer"
      >
        <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-1" aria-hidden="true" />
        <div>
          <p className="font-semibold text-[var(--color-text-main)] mb-0.5">Care & Availability Notice</p>
          <p>
            Helplines are operated independently by certified crisis organizations and government health ministries. Calmspace provides directory access but not clinical treatment or guaranteed response times. If in acute danger, dial <strong>112</strong> directly.
          </p>
        </div>
      </div>

      {/* API failure banner */}
      {hasError && (
        <div
          className="p-4 rounded-[var(--radius-card)] bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-sm text-[var(--color-amber-text)] flex items-start justify-between gap-3"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--color-amber-text)] shrink-0 mt-1" aria-hidden="true" />
            <div>
              <p className="font-semibold">Viewing offline verified directory</p>
              <p className="text-[var(--color-text-secondary)] mt-0.5">
                Couldn't connect to the live registry. Verified numbers (112 and 14416) are available below.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadResources}
            className="shrink-0 flex items-center gap-1.5"
            aria-label="Retry loading live resources"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* 1. National Helplines */}
      <section className="space-y-3" aria-labelledby="heading-helplines">
        <h2 id="heading-helplines" className="text-base font-bold text-[var(--color-text-main)]">
          National Mental Health Helplines (Free & Confidential)
        </h2>

        {helplineResources.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-sm text-[var(--color-text-muted)]">
            No helpline resources currently available in the active directory.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helplineResources.map((contact) => (
              <Card key={contact.id} padding="lg" className="space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)]">
                      {contact.badge_label}
                    </span>
                    <span className="text-sm text-[var(--color-sage-text)] flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      Verified
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text-main)]">{contact.name}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                    {contact.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)]">
                  <div className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                        {contact.hours}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        Last verified: {contact.last_verified_date}
                      </span>
                    </div>
                    {contact.official_source_url && (
                      <div className="pt-0.5">
                        <a
                          href={contact.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                          aria-label={`Official registry source for ${contact.name} (opens in new tab)`}
                        >
                          <span>Source: {contact.verification_source}</span>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Large call button */}
                  <a
                    href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                    className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-[var(--radius-button)] bg-[var(--color-primary-fill)] text-white text-base font-bold hover:bg-[var(--color-primary-fill-hover)] active:bg-[var(--color-primary-fill-active)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    aria-label={`Call ${contact.name} at ${contact.display_phone}`}
                  >
                    <Phone className="w-5 h-5" aria-hidden="true" />
                    <span>Call {contact.display_phone}</span>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 2. Emergency Services */}
      <section className="space-y-3" aria-labelledby="heading-emergency">
        <h2 id="heading-emergency" className="text-base font-bold text-[var(--color-text-main)]">
          National Emergency Services (24/7 Immediate Dispatch)
        </h2>

        {emergencyResources.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-sm text-[var(--color-text-muted)]">
            Emergency numbers unavailable. If in immediate danger, dial 112 directly.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {emergencyResources.map((contact) => (
              <Card key={contact.id} padding="lg" className="bg-[var(--color-surface)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-amber-text)] bg-[var(--color-amber-soft)] px-2.5 py-0.5 rounded-full">
                        {contact.badge_label}
                      </span>
                      <span className="text-sm text-[var(--color-sage-text)] flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        Verified: {contact.last_verified_date}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-main)]">{contact.name}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{contact.description}</p>
                    {contact.official_source_url && (
                      <a
                        href={contact.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline pt-1"
                        aria-label={`Official registry for ${contact.name}`}
                      >
                        <span>Source: {contact.verification_source}</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {/* Large dial button */}
                  <a
                    href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                    className="shrink-0 inline-flex items-center justify-center gap-3 px-6 py-4 rounded-[var(--radius-button)] bg-[var(--color-surface)] border-2 border-[var(--color-border-dark)] text-base font-bold text-[var(--color-text-main)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
                    aria-label={`Dial emergency services at ${contact.display_phone}`}
                  >
                    <Phone className="w-5 h-5" aria-hidden="true" />
                    <span>Dial {contact.display_phone}</span>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 3. Campus Counselling — de-emphasized demo section */}
      {campusResources.length > 0 && (
        <section className="space-y-3" aria-labelledby="heading-campus">
          <div className="flex items-center gap-2">
            <h2 id="heading-campus" className="text-base font-bold text-[var(--color-text-main)]">
              University Campus Counselling
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] border border-[var(--color-amber-border)]">
              Demo
            </span>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            These entries are demonstration templates. Your institution's administrators configure live campus counselling contacts for production deployments.{' '}
            <button
              type="button"
              onClick={() => setDemoNoticeOpen(true)}
              className="text-[var(--color-primary)] underline hover:no-underline font-medium"
            >
              Learn more
            </button>
          </p>

          <div className="grid grid-cols-1 gap-4">
            {campusResources.map((contact) => (
              <Card
                key={contact.id}
                padding="md"
                className="bg-[var(--color-bg)] border border-[var(--color-border)] opacity-75"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-amber-soft)] text-[var(--color-amber-text)]">
                    {contact.badge_label}
                  </span>
                  <h3 className="text-base font-bold text-[var(--color-text-main)] pt-1">{contact.name}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{contact.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                      {contact.hours}
                    </span>
                    {!contact.is_demo_placeholder && contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                        {contact.email}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Demo Notice Dialog */}
      <Dialog
        isOpen={demoNoticeOpen}
        onClose={() => setDemoNoticeOpen(false)}
        title="Campus Integration Notice"
        description="Institutional support integration details."
        maxWidth="md"
      >
        <div className="space-y-4 text-sm text-[var(--color-text-main)] leading-relaxed">
          <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber-text)] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-1" aria-hidden="true" />
            <div>
              <p className="font-semibold mb-0.5">Template Placeholder</p>
              <p>
                This campus entry is a demonstration template. Calmspace does not send student data without configured institutional webhooks.
              </p>
            </div>
          </div>

          <p className="text-[var(--color-text-secondary)]">
            In production deployments, university administrators configure verified student welfare contacts, campus psychologists, and live appointment booking APIs.
          </p>

          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-lavender-soft)] border border-[var(--color-lavender-border)]">
            <p className="font-semibold text-[var(--color-text-main)] mb-1">Need immediate confidential support?</p>
            <p className="text-[var(--color-text-secondary)] mb-3">Call Tele-MANAS (Govt. of India), 24/7 national mental health helpline:</p>
            <a
              href="tel:14416"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-button)] bg-[var(--color-primary-fill)] text-white text-sm font-bold hover:bg-[var(--color-primary-fill-hover)] transition-colors"
              aria-label="Call Tele-MANAS at 14416"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              Call Tele-MANAS (14416)
            </a>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDemoNoticeOpen(false)}>
            Close Notice
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
