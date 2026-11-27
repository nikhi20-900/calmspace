import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckInResponse, SupportContact } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import {
  Phone,
  Shield,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Clock,
  HeartHandshake,
  CheckCircle2,
  Info,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { FALLBACK_SUPPORT_RESOURCES } from '../services/api';
import { executeSafeExitState, resolveCheckInResultState } from '../services/checkinState';

type CalmPlanAction = { title: string; reason: string; action: string };

function buildCalmPlan(record: CheckInResponse['record']): CalmPlanAction[] {
  return [
    record.mood <= 2
      ? {
          title: 'Make room for a small comfort',
          reason: 'Your mood check-in was on the lower side today.',
          action: 'Pick one kind, low-effort thing: step outside for a few minutes, listen to a favorite song, or message someone you trust.',
        }
      : {
          title: 'Stay connected to what helps',
          reason: 'A small moment of connection can support a steady day.',
          action: 'Take a short pause for something you enjoy, or share a moment with someone who feels supportive.',
        },
    record.stress >= 4
      ? {
          title: 'Create a little breathing space',
          reason: 'You marked stress as high today.',
          action: 'Try a slow exhale: breathe in comfortably, then let the breath out a little longer. Repeat a few times, and stop if it feels uncomfortable.',
        }
      : {
          title: 'Reset between tasks',
          reason: 'A brief pause can make a busy day feel more manageable.',
          action: 'Step away from your screen, stretch gently, or get a glass of water before your next task.',
        },
    record.sleep_hours < 6
      ? {
          title: 'Make tonight easier',
          reason: 'You logged less than six hours of sleep.',
          action: 'If it suits your schedule, give yourself a calm wind-down: dim the lights, set aside one next-day task, and choose a comfortable bedtime.',
        }
      : {
          title: 'Protect your rest',
          reason: 'Keeping a gentle wind-down can help preserve your rest routine.',
          action: 'Choose a time to pause studying tonight and do one relaxing, screen-light activity before bed.',
        },
  ];
}

export const CheckInResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [demoNoticeOpen, setDemoNoticeOpen] = useState(false);

  useEffect(() => {
    const stateResult = (location.state as { result?: CheckInResponse } | null)?.result;
    const resolution = resolveCheckInResultState(stateResult);
    if (resolution.action === 'redirect_overview') {
      window.history.replaceState({}, '');
      navigate('/app', { replace: true });
      return;
    }
    if (resolution.action === 'redirect_checkin') {
      navigate('/checkin');
      return;
    }
    setResult(resolution.result);
  }, [location, navigate]);

  if (!result) return null;

  const { safety, guidance, record } = result;
  const isHighRisk = safety.route === 'HIGH';
  const contacts: SupportContact[] = result.support_contacts?.length
    ? result.support_contacts
    : FALLBACK_SUPPORT_RESOURCES;

  /**
   * Explicit Safe Exit Navigation Policy
   * Enforces that exiting from a HIGH-route evaluation cleans up transient
   * check-in session state and returns to the overview without triggering,
   * prompting, or resuming any AI dialogue or conversation.
   * Wipes window.history state so browser "Back" cannot reload the exited result.
   */
  const handleSafeExit = () => {
    executeSafeExitState();
    window.history.replaceState({}, '');
    navigate('/app', { replace: true, state: {} });
  };

  // =========================================================================
  // HIGH-RISK ESCALATION SCREEN
  // "You don't have to handle this alone."
  // Uncluttered, no charts, verified tap-to-call helplines, honest demo notices
  // =========================================================================
  if (isHighRisk) {
    return (
      <div
        className="max-w-2xl mx-auto py-6 sm:py-10 animate-fade-in"
        role="alert"
        aria-live="assertive"
      >
        {/* Soft, calm supportive header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#E9E7FB] flex items-center justify-center mx-auto mb-4 text-[#5554B8]">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#25233B] tracking-tight">
            You don't have to handle this alone.
          </h1>
          <p className="text-base text-[#625F78] mt-2 max-w-lg mx-auto leading-relaxed">
            Your wellbeing is what matters most right now. We've surfaced verified national crisis
            helplines ready to listen immediately, alongside campus integration options.
          </p>
        </div>

        {/* Ordered Human Support Actions */}
        <div className="space-y-4">
          {contacts.map((contact, index) => {
            const isNationalHelpline = contact.id === 'tele-manas';
            const isEmergency = contact.category === 'emergency';
            const isDemo = Boolean(contact.is_demo_placeholder);

            return (
              <div
                key={contact.id}
                className={`p-5 sm:p-6 rounded-card transition-all ${
                  isNationalHelpline
                    ? 'bg-white border-2 border-[#5554B8] shadow-soft'
                    : isEmergency
                      ? 'bg-[#FBFBFE] border border-[#E8E6F1]'
                      : isDemo
                        ? 'bg-[#FFFDF9] border border-[#F4DCCB]'
                        : 'bg-white border border-[#E8E6F1] shadow-soft'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isNationalHelpline
                            ? 'text-[#5554B8] bg-[#E9E7FB]'
                            : isEmergency
                              ? 'text-[#7A4D05] bg-[#F6E6CC]'
                              : isDemo
                                ? 'text-[#7A4D05] bg-[#FBF0EA] border border-[#F4DCCB]'
                                : 'text-[#245532] bg-[#DCE9DF]'
                        }`}
                      >
                        Priority {index + 1} • {contact.badge_label}
                      </span>
                      {isDemo && (
                        <span className="text-[10px] font-semibold text-[#B24823] bg-[#FDEEE9] px-2 py-0.5 rounded-full">
                          Demo Only • Not Connected
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-[#25233B] pt-1">
                      {contact.name}
                    </h2>

                    <p className="text-xs text-[#625F78] leading-relaxed">
                      {contact.description}
                    </p>

                    {/* Metadata & Verification Source */}
                    <div className="pt-2 space-y-1 text-xs text-[#625F78]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                          {contact.hours}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-[#245532]" />
                          Verified: {contact.last_verified_date}
                        </span>
                      </div>

                      {/* Official Verification Authority Link */}
                      {contact.official_source_url ? (
                        <div className="pt-0.5">
                          <a
                            href={contact.official_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5554B8] hover:underline"
                          >
                            <span>Source: {contact.verification_source}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#7A4D05] italic">
                          Source: {contact.verification_source}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 flex sm:flex-col gap-2">
                    {isDemo ? (
                      <button
                        type="button"
                        onClick={() => setDemoNoticeOpen(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-[#25233B] text-white text-xs font-semibold hover:bg-[#1A192A] transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Integration Info</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-button font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                          isNationalHelpline
                            ? 'bg-[#5554B8] text-white hover:bg-[#4645A7] active:bg-[#3D3C94] shadow-sm'
                            : 'bg-white border border-[#D5D1E5] text-[#25233B] hover:bg-[#F7F6FB]'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call {contact.display_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demo Integration Explanation Modal */}
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
                  No Request Has Been Sent
                </p>
                <p>
                  This is a demonstration preview of the campus counseling booking workflow.
                  Calmspace is not connected to a live institutional clinic in this demo environment.
                </p>
              </div>
            </div>

            <p className="text-[#625F78]">
              In a production university deployment, this action integrates directly with your
              institution's authenticated student health API or confidential booking portal.
            </p>

            <div className="p-4 rounded-card bg-[#E9E7FB] border border-[#D5D1E5]">
              <p className="font-semibold text-sm text-[#25233B] mb-1">
                Need immediate human support?
              </p>
              <p className="text-[#625F78] mb-3">
                Call Tele-MANAS (Government of India national mental health helpline), available
                24/7 in 20+ languages. Free and confidential.
              </p>
              <a
                href="tel:14416"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
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

        {/* Prominent Safe Exit Policy & Navigation */}
        <div className="mt-10 p-5 rounded-card bg-white border border-[#E8E6F1] shadow-soft">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left space-y-1">
              <h3 className="text-sm font-bold text-[#25233B] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#5554B8]" />
                <span>Safe Exit Policy</span>
              </h3>
              <p className="text-xs text-[#625F78] max-w-md">
                Exiting closes this crisis evaluation and returns you to the overview. Calmspace will
                never automatically resume an AI conversation.
              </p>
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={handleSafeExit}
              className="shrink-0 font-semibold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Safe Exit to Overview
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EFF7] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#8E8AA7]">
              <span>
                AI generation is strictly disabled for high-risk evaluations. National helplines are verified against official government registries; campus entries are configurable demo placeholders.
              </span>
              <Link
                to="/support"
                className="font-medium text-[#5554B8] hover:underline shrink-0"
              >
                View Full Support Directory →
              </Link>
            </div>
            <p className="text-[10px] text-[#A29EBA] leading-relaxed">
              <strong>Availability notice:</strong> Helplines and emergency dispatch are independently operated; Calmspace cannot guarantee response times, immediate availability, or clinical outcomes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LOW / MEDIUM SUPPORTIVE GUIDANCE SCREEN
  // "AI writes the language. Rules decide safety. Humans help."
  // =========================================================================
  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Badge route={safety.route} />
        <span className="text-xs text-[#625F78]">
          Logged today at{' '}
          {new Date(record.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Prominent Supportive Response Card */}
      <Card padding="lg" className="border-t-4 border-t-[#5554B8] space-y-6">
        <section
          aria-labelledby="calm-plan-title"
          className="rounded-card border border-[#DCD9F5] bg-[#F6F5FE] p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#5554B8]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="calm-plan-title" className="text-base font-bold text-[#25233B]">
                A gentle plan for today
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#625F78]">
                Three optional ideas based on your check-in. Choose what feels useful and leave the rest.
              </p>
            </div>
          </div>

          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {buildCalmPlan(record).map((item, index) => (
              <li key={item.title} className="rounded-xl border border-[#E8E6F1] bg-white p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8AA7]">
                  Idea {index + 1}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-[#25233B]">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#625F78]">{item.reason}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#25233B]">{item.action}</p>
              </li>
            ))}
          </ol>
        </section>
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#5554B8]">
            <Sparkles className="w-4 h-4" />
            <span>Supportive Reflection</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#25233B]">
            {safety.status_label}
          </h1>
          <p className="text-xs text-[#625F78] mt-1">{safety.status_summary}</p>
        </div>

        {/* AI Guidance Text */}
        {guidance && (
          <div className="p-4 sm:p-5 rounded-card bg-[#F7F6FB] border border-[#E8E6F1]">
            <p className="text-sm sm:text-base text-[#25233B] leading-relaxed-wellness font-normal">
              "{guidance.message}"
            </p>

            {/* Optional suggestion chips */}
            {guidance.suggestion_chips && guidance.suggestion_chips.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8E6F1]">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#625F78] mb-2">
                  Gentle suggestions for today:
                </span>
                <div className="flex flex-wrap gap-2">
                  {guidance.suggestion_chips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E8E6F1] text-[#25233B] shadow-subtle"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5554B8]" />
                      <span>{chip}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer Note */}
        <div className="flex items-start gap-2 text-xs text-[#625F78]">
          <Info className="w-4 h-4 text-[#8E8AA7] shrink-0 mt-0.5" />
          <p>{guidance?.disclaimer || 'This is supportive guidance, not medical advice.'}</p>
        </div>

        {/* Actions Row */}
        <div className="pt-4 border-t border-[#F0EFF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/support"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5554B8] hover:text-[#4645A7]"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Prefer to talk to a human counsellor?</span>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Return to Overview
          </Button>
        </div>
      </Card>
    </div>
  );
};
