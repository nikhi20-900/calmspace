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
} from 'lucide-react';
import { FALLBACK_SUPPORT_RESOURCES } from '../services/api';

export const CheckInResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [demoNoticeOpen, setDemoNoticeOpen] = useState(false);

  useEffect(() => {
    const wasExited = sessionStorage.getItem('calmspace_high_risk_exited') === 'true';
    if (wasExited) {
      window.history.replaceState({}, '');
      navigate('/', { replace: true });
      return;
    }

    const stateResult = (location.state as any)?.result;
    if (stateResult) {
      setResult(stateResult);
    } else {
      const stored = sessionStorage.getItem('calmspace_latest_checkin');
      if (stored) {
        try {
          setResult(JSON.parse(stored));
        } catch {
          navigate('/checkin');
        }
      } else {
        navigate('/checkin');
      }
    }
  }, [location, navigate]);

  if (!result) return null;

  const { safety, guidance, record } = result;
  const isHighRisk = safety.route === 'HIGH';

  // Only show verified (non-demo) contacts on the high-risk screen
  const allContacts: SupportContact[] = result.support_contacts?.length
    ? result.support_contacts
    : FALLBACK_SUPPORT_RESOURCES;
  const verifiedContacts = allContacts.filter((c) => !c.is_demo_placeholder);

  /**
   * Safe Exit — wipes transient session state and returns to overview.
   * Browser "Back" cannot reload the exited result.
   */
  const handleSafeExit = () => {
    sessionStorage.removeItem('calmspace_latest_checkin');
    sessionStorage.setItem('calmspace_high_risk_exited', 'true');
    window.history.replaceState({}, '');
    navigate('/', { replace: true, state: {} });
  };

  // =========================================================================
  // HIGH-RISK ESCALATION SCREEN
  // Calm tone · verified contacts only · large tap-to-call buttons · no demo cards
  // =========================================================================
  if (isHighRisk) {
    return (
      <div
        className="max-w-lg mx-auto py-8 sm:py-12 px-4 animate-fade-in"
        role="alert"
        aria-live="assertive"
      >
        {/* Header: calm, human, non-clinical */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[var(--color-lavender-soft)] flex items-center justify-center mx-auto mb-5">
            <HeartHandshake className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] tracking-tight leading-snug">
            You don't have to handle this alone.
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] mt-3 max-w-sm mx-auto leading-relaxed">
            Reach out to a trained crisis listener right now — these are real people, free and confidential.
          </p>
        </div>

        {/* Verified call cards only — demo cards intentionally hidden */}
        <div className="space-y-4">
          {verifiedContacts.map((contact) => {
            const isPrimary = contact.id === 'tele-manas';
            return (
              <div
                key={contact.id}
                className={`rounded-[var(--radius-card)] p-5 sm:p-6 ${
                  isPrimary
                    ? 'bg-[var(--color-surface)] border-2 border-[var(--color-primary)] shadow-[var(--shadow-soft)]'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
                }`}
              >
                {/* Badge + verification */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isPrimary
                        ? 'text-[var(--color-primary)] bg-[var(--color-lavender-soft)]'
                        : 'text-[var(--color-amber-text)] bg-[var(--color-amber-soft)]'
                    }`}
                  >
                    {contact.badge_label}
                  </span>
                  <span className="text-[11px] text-[var(--color-sage-text)] flex items-center gap-1 font-medium">
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    Verified
                  </span>
                </div>

                <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">{contact.name}</h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
                  {contact.description}
                </p>

                {/* Hours + source link */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--color-text-secondary)] mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                    {contact.hours}
                  </span>
                  {contact.official_source_url && (
                    <a
                      href={contact.official_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                      aria-label={`Official registry for ${contact.name}`}
                    >
                      Source: {contact.verification_source}
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>

                {/* Large tap-to-call button */}
                <a
                  href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                  className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-[var(--radius-button)] text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    isPrimary
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] shadow-sm'
                      : 'bg-[var(--color-surface)] border-2 border-[var(--color-border-dark)] text-[var(--color-text-main)] hover:bg-[var(--color-bg)]'
                  }`}
                  aria-label={`Call ${contact.name} at ${contact.display_phone}`}
                >
                  <Phone className="w-5 h-5" aria-hidden="true" />
                  <span>Call {contact.display_phone}</span>
                </a>
              </div>
            );
          })}
        </div>

        {/* Demo integration note — text only, no card */}
        <p className="mt-6 text-xs text-[var(--color-text-muted)] text-center leading-relaxed">
          Campus counselling integrations are configured by your institution and are not shown here.{' '}
          <Link to="/support" className="text-[var(--color-primary)] hover:underline font-medium">
            View full support directory →
          </Link>
        </p>

        {/* Demo Integration Dialog (accessible via /support page only) */}
        <Dialog
          isOpen={demoNoticeOpen}
          onClose={() => setDemoNoticeOpen(false)}
          title="Campus Integration Notice"
          description="Important information regarding campus support connections."
          maxWidth="md"
        >
          <div className="space-y-4 text-sm text-[var(--color-text-main)] leading-relaxed">
            <p className="text-[var(--color-text-secondary)]">
              Campus entries are demonstration templates. Calmspace does not send student data to institutional systems without configured webhooks.
            </p>
            <a
              href="tel:14416"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-hover)] transition-colors"
              aria-label="Call Tele-MANAS at 14416"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              Call Tele-MANAS (14416)
            </a>
          </div>
          <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setDemoNoticeOpen(false)}>
              Close
            </Button>
          </div>
        </Dialog>

        {/* Safe exit */}
        <div className="mt-10 p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-subtle)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                Safe Exit
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-xs">
                Closes this screen and returns you to overview. No AI conversation will resume automatically.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSafeExit}
              className="shrink-0 font-semibold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Return to Overview
            </Button>
          </div>
          <p className="mt-4 pt-3 border-t border-[var(--color-border-light)] text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            <strong>Availability notice:</strong> Helplines and emergency dispatch are independently operated; Calmspace cannot guarantee response times or clinical outcomes.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LOW / MEDIUM SUPPORTIVE GUIDANCE SCREEN
  // =========================================================================
  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Badge route={safety.route} />
        <span className="text-xs text-[var(--color-text-secondary)]">
          Logged today at{' '}
          {new Date(record.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Supportive Response Card */}
      <Card padding="lg" className="border-t-4 border-t-[var(--color-primary)] space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--color-primary)]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Supportive Reflection</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)]">
            {safety.status_label}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{safety.status_summary}</p>
        </div>

        {/* AI Guidance Text */}
        {guidance && (
          <div className="p-4 sm:p-5 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)]">
            <p className="text-sm sm:text-base text-[var(--color-text-main)] leading-relaxed font-normal">
              "{guidance.message}"
            </p>

            {guidance.suggestion_chips && guidance.suggestion_chips.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Gentle suggestions for today:
                </span>
                <div className="flex flex-wrap gap-2">
                  {guidance.suggestion_chips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] shadow-[var(--shadow-subtle)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                      <span>{chip}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
          <Info className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
          <p>{guidance?.disclaimer || 'This is supportive guidance, not medical advice.'}</p>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[var(--color-border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/support"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Prefer to talk to a human counsellor?</span>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Return to Overview
          </Button>
        </div>
      </Card>
    </div>
  );
};
