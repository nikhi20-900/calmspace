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
  HeartHandshake,
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
      // Ensure only active resources are retained, fallback if empty array returned
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

  // Filter strictly for active items
  const activeResources = resources.filter((r) => r.is_active !== false);
  const campusResources = activeResources.filter((r) => r.category === 'campus');
  const helplineResources = activeResources.filter((r) => r.category === 'helpline');
  const emergencyResources = activeResources.filter((r) => r.category === 'emergency');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      <PageHeader
        tag="Human Support Network"
        title="Verified care, whenever you need it"
        description="National helplines and emergency dispatch numbers are officially verified against Government of India registries. Campus counselling services are demonstration templates requiring institutional configuration."
      />

      {/* Non-clinical guarantee disclaimer banner */}
      <div
        className="p-4 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] text-xs text-[#625F78] flex items-start gap-3 leading-relaxed"
        role="region"
        aria-label="Care and availability disclaimer"
      >
        <Info className="w-4 h-4 text-[#5554B8] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-[#25233B] mb-0.5">
            Care & Availability Notice
          </p>
          <p>
            National helplines and emergency services are operated independently by certified crisis organizations
            and government health ministries. Calmspace provides directory access and deterministic crisis triage, but
            does not provide clinical treatment, emergency dispatch, or guaranteed response times. If you or someone you
            know is in acute danger, dial 112 directly.
          </p>
        </div>
      </div>

      {/* API Failure warning banner with immediate fallback */}
      {hasError && (
        <div
          className="p-4 rounded-card bg-[#FFFDF9] border border-[#F4DCCB] text-xs text-[#7A4D05] flex items-start justify-between gap-3"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#B24823] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#B24823]">
                Viewing offline verified directory
              </p>
              <p className="text-[#625F78] mt-0.5">
                We couldn't connect to the live resource registry, but verified emergency numbers (112) and Tele-MANAS (14416) are always available below.
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

      {/* 1. National Mental Health Helplines */}
      <section className="space-y-3" aria-labelledby="heading-helplines">
        <h2 id="heading-helplines" className="text-base font-bold text-[#25233B]">
          National Mental Health Helplines (Free & Confidential)
        </h2>

        {helplineResources.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-xs text-[#8E8AA7]">
            No helpline resources currently available in the active directory.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helplineResources.map((contact) => (
              <Card
                key={contact.id}
                padding="lg"
                className="space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E9E7FB] text-[#5554B8]">
                      {contact.badge_label}
                    </span>
                    <span className="text-[11px] text-[#245532] flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#25233B]">{contact.name}</h3>
                  <p className="text-xs text-[#625F78] mt-1 leading-relaxed">
                    {contact.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#F0EFF7]">
                  <div className="space-y-1 text-xs text-[#625F78]">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5554B8]" aria-hidden="true" />
                        {contact.hours}
                      </span>
                      <span className="text-[10px] text-[#8E8AA7]">
                        Last verified: {contact.last_verified_date}
                      </span>
                    </div>

                    {contact.official_source_url && (
                      <div className="pt-0.5">
                        <a
                          href={contact.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5554B8] hover:underline"
                          aria-label={`Official registry source for ${contact.name} (opens in new tab)`}
                        >
                          <span>Source: {contact.verification_source}</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>

                  <a
                    href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                    aria-label={`Call ${contact.name} at ${contact.display_phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Call {contact.display_phone}</span>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 2. National Emergency Services */}
      <section className="space-y-3" aria-labelledby="heading-emergency">
        <h2 id="heading-emergency" className="text-base font-bold text-[#25233B]">
          National Emergency Services (24/7 Immediate Dispatch)
        </h2>

        {emergencyResources.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-xs text-[#8E8AA7]">
            Emergency dispatch numbers unavailable. If in immediate danger, dial 112 directly.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {emergencyResources.map((contact) => (
              <Card key={contact.id} padding="lg" className="space-y-3 bg-[#FBFBFE]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A4D05] bg-[#F6E6CC] px-2.5 py-0.5 rounded-full">
                        {contact.badge_label}
                      </span>
                      <span className="text-xs text-[#245532] flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Verified: {contact.last_verified_date}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#25233B]">{contact.name}</h3>
                    <p className="text-xs text-[#625F78]">{contact.description}</p>
                    {contact.official_source_url && (
                      <a
                        href={contact.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5554B8] hover:underline pt-1"
                        aria-label={`Official registry source for ${contact.name} (opens in new tab)`}
                      >
                        <span>Source: {contact.verification_source}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <div className="shrink-0">
                    <a
                      href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-button bg-white border border-[#D5D1E5] text-xs font-bold text-[#25233B] hover:bg-[#F7F6FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                      aria-label={`Dial emergency services at ${contact.display_phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Dial {contact.display_phone}</span>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 3. Campus Counselling Services (Demo Template Placeholder) */}
      <section className="space-y-3" aria-labelledby="heading-campus">
        <h2 id="heading-campus" className="text-base font-bold text-[#25233B] flex items-center gap-2">
          <span>University Campus Counselling & Advising</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FBF0EA] text-[#7A4D05] border border-[#F4DCCB]">
            Demo Integration
          </span>
        </h2>

        {campusResources.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-xs text-[#8E8AA7]">
            No campus counselling integrations configured for this demonstration environment.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campusResources.map((contact) => (
              <Card key={contact.id} padding="lg" className="space-y-4 bg-[#FFFDF9] border border-[#F4DCCB]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FBF0EA] text-[#7A4D05]">
                        {contact.badge_label}
                      </span>
                      <span className="text-xs text-[#8E8AA7]">
                        {contact.verification_source}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#25233B]">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-[#625F78] max-w-2xl leading-relaxed">
                      {contact.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#625F78] pt-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#5554B8]" aria-hidden="true" />
                        {contact.hours}
                      </span>
                      {!contact.is_demo_placeholder && contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-[#5554B8]" aria-hidden="true" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDemoNoticeOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-button bg-[#25233B] text-white hover:bg-[#1A192A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                      aria-label="View demo template integration notice"
                    >
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Demo Notice</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Demo Notice Dialog */}
      <Dialog
        isOpen={demoNoticeOpen}
        onClose={() => setDemoNoticeOpen(false)}
        title="Campus Integration Notice (Demo Placeholder)"
        description="Institutional support integration details."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-[#25233B] leading-relaxed">
          <div className="p-3.5 rounded-card bg-[#FBF0EA] border border-[#F4DCCB] text-[#7A4D05] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B24823]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm mb-0.5 text-[#B24823]">
                Template Placeholder Notice
              </p>
              <p>
                This campus entry is a demonstration template. Calmspace does not dispatch student distress data without configured institutional webhooks.
              </p>
            </div>
          </div>

          <p className="text-[#625F78]">
            In production deployments, university administrators configure this entry with verified student welfare contacts, campus psychologists, and live appointment booking APIs.
          </p>

          <div className="p-4 rounded-card bg-[#E9E7FB] border border-[#D5D1E5]">
            <p className="font-semibold text-sm text-[#25233B] mb-1">
              Need immediate confidential support?
            </p>
            <p className="text-[#625F78] mb-3">
              Call Tele-MANAS (Govt. of India), 24/7 national mental health helpline:
            </p>
            <a
              href="tel:14416"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7]"
              aria-label="Call Tele-MANAS at 14416"
            >
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Call Tele-MANAS (14416)</span>
            </a>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#E8E6F1] flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDemoNoticeOpen(false)}>
            Close Notice
          </Button>
        </div>
      </Dialog>
    </div>
  );
};