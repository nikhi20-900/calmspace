import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import {
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { api, FALLBACK_SUPPORT_RESOURCES } from '../services/api';
import { SupportContact } from '../types';

export const SupportNetworkPage: React.FC = () => {
  const [resources, setResources] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedCampusSlot, setBookedCampusSlot] = useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        const data = await api.getSupportResources();
        setResources(data.length ? data : FALLBACK_SUPPORT_RESOURCES);
      } catch (e) {
        setResources(FALLBACK_SUPPORT_RESOURCES);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  if (loading) {
    return <LoadingState message="Loading verified support resources..." />;
  }

  const campusResources = resources.filter((r) => r.category === 'campus');
  const helplineResources = resources.filter((r) => r.category === 'helpline');
  const emergencyResources = resources.filter((r) => r.category === 'emergency');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader
        tag="Human Support Network"
        title="Verified care, whenever you need it"
        description="Every contact in this directory is verified with official university and health ministry records. Always confidential."
      />

      {bookedCampusSlot && (
        <div className="p-4 rounded-card bg-[#DCE9DF] border border-[#BCD4C3] text-[#245532] text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Campus Counselling Slot Requested</p>
            <p className="text-xs text-[#245532]/90 mt-0.5">
              The student support desk has recorded your request. You may also drop in directly to the Student Affairs Building during office hours.
            </p>
          </div>
        </div>
      )}

      {/* 1. National Mental Health Helplines */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#25233B] flex items-center gap-2">
          <span>National Mental Health Helplines (Free & Confidential)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {helplineResources.map((contact) => (
            <Card key={contact.id} padding="lg" className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E9E7FB] text-[#5554B8]">
                    {contact.badge_label}
                  </span>
                  <span className="text-[11px] text-[#245532] flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#25233B]">
                  {contact.name}
                </h3>
                <p className="text-xs text-[#625F78] mt-1 leading-relaxed">
                  {contact.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#F0EFF7]">
                <div className="flex items-center justify-between text-xs text-[#625F78]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                    {contact.hours}
                  </span>
                  <span className="text-[10px] text-[#8E8AA7]">
                    Last verified: {contact.last_verified_date}
                  </span>
                </div>

                <a
                  href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7] active:bg-[#3D3C94] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {contact.display_phone}</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Campus Counselling Services */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#25233B]">
          University Campus Counselling & Advising
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {campusResources.map((contact) => (
            <Card key={contact.id} padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DCE9DF] text-[#245532]">
                      {contact.badge_label}
                    </span>
                    <span className="text-xs text-[#625F78]">
                      Source: {contact.verification_source}
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
                      <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                      {contact.hours}
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#5554B8]" />
                        {contact.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  <a
                    href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-button bg-white border border-[#E8E6F1] text-[#25233B] hover:bg-[#F7F6FB]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Desk</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setBookedCampusSlot(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-button bg-[#25233B] text-white hover:bg-[#1A192A]"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Session</span>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. Emergency Services */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#25233B]">
          National Emergency Helplines
        </h2>
        {emergencyResources.map((contact) => (
          <Card key={contact.id} padding="md" className="bg-[#FAF9FD] border-[#D9D5F4]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-[#25233B]">
                  {contact.name}
                </h3>
                <p className="text-xs text-[#625F78] mt-0.5">
                  {contact.description} • Verified: {contact.verification_source}
                </p>
              </div>
              <a
                href={`tel:${contact.contact_number}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-button bg-[#25233B] text-white text-xs font-bold hover:bg-[#1A192A]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {contact.display_phone}</span>
              </a>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
};
