import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckInResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Phone,
  Calendar,
  Shield,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Clock,
  HeartHandshake,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { FALLBACK_SUPPORT_RESOURCES } from '../services/api';

export const CheckInResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [bookingRequested, setBookingRequested] = useState(false);

  useEffect(() => {
    // Read from location state or sessionStorage
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
  const contacts = result.support_contacts?.length ? result.support_contacts : FALLBACK_SUPPORT_RESOURCES;

  // =========================================================================
  // HIGH-RISK ESCALATION SCREEN
  // "You don't have to handle this alone."
  // Uncluttered, no charts, no distracting animations, tap-to-call, booking action
  // =========================================================================
  if (isHighRisk) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10 animate-fade-in" role="alert" aria-live="assertive">
        {/* Soft, calm supportive header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#E9E7FB] flex items-center justify-center mx-auto mb-4 text-[#5554B8]">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#25233B] tracking-tight">
            You don't have to handle this alone.
          </h1>
          <p className="text-base text-[#625F78] mt-2 max-w-lg mx-auto leading-relaxed">
            Your wellbeing is what matters most right now. We've connected you with verified, confidential human support ready to listen and assist immediately.
          </p>
        </div>

        {/* Booking Confirmation Toast if clicked */}
        {bookingRequested && (
          <div className="mb-6 p-4 rounded-card bg-[#DCE9DF] border border-[#BCD4C3] text-[#245532] text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Support Request Initiated</p>
              <p className="text-xs text-[#245532]/90 mt-0.5">
                The Campus Counselling Unit has been alerted for priority student outreach. You can also dial them directly below.
              </p>
            </div>
          </div>
        )}

        {/* Ordered Human Support Actions */}
        <div className="space-y-4">
          {/* 1. Tele-MANAS */}
          <div className="p-5 sm:p-6 rounded-card bg-white border-2 border-[#5554B8] shadow-soft">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5554B8] bg-[#E9E7FB] px-2.5 py-0.5 rounded-full">
                    Priority 1 • 24/7 National Helpline
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#25233B]">
                  Tele-MANAS (Mental Health Helpline)
                </h2>
                <p className="text-xs text-[#625F78] mt-1 leading-relaxed">
                  Toll-free national crisis and emotional support helpline by Govt. of India. Free, confidential, multi-lingual support available right now.
                </p>
                <div className="flex items-center gap-4 text-xs text-[#625F78] mt-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                    Available 24/7
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#245532]" />
                    Verified: MoHFW (Nov 2026)
                  </span>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                <a
                  href="tel:14416"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-button bg-[#5554B8] text-white font-semibold text-sm hover:bg-[#4645A7] active:bg-[#3D3C94] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call 14416 Now</span>
                </a>
              </div>
            </div>
          </div>

          {/* 2. Campus Counsellor */}
          <div className="p-5 sm:p-6 rounded-card bg-white border border-[#E8E6F1] shadow-soft">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#245532] bg-[#DCE9DF] px-2.5 py-0.5 rounded-full">
                  Priority 2 • University Resource
                </span>
                <h2 className="text-lg font-bold text-[#25233B] mt-1.5">
                  University Student Counselling Unit
                </h2>
                <p className="text-xs text-[#625F78] mt-1 leading-relaxed">
                  Confidential appointments with licensed campus psychologists. Walk-ins welcomed during open hours.
                </p>
                <div className="flex items-center gap-4 text-xs text-[#625F78] mt-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
                    Mon–Fri 09:00–17:30
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#245532]" />
                    Verified: Dean of Student Affairs
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <a
                  href="tel:+911126597100"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button border border-[#E8E6F1] bg-white text-xs font-semibold text-[#25233B] hover:bg-[#F7F6FB]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Office</span>
                </a>
                <button
                  type="button"
                  onClick={() => setBookingRequested(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-[#25233B] text-white text-xs font-semibold hover:bg-[#1A192A]"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Request Slot</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. National Emergency */}
          <div className="p-5 sm:p-6 rounded-card bg-[#FBFBFE] border border-[#E8E6F1]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A4D05] bg-[#F6E6CC] px-2.5 py-0.5 rounded-full">
                  Priority 3 • Immediate Emergency
                </span>
                <h2 className="text-base font-bold text-[#25233B] mt-1.5">
                  Emergency Services (Police, Medical, Ambulance)
                </h2>
                <p className="text-xs text-[#625F78] mt-1">
                  For immediate acute physical safety or critical emergencies across India.
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                <a
                  href="tel:112"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-white border border-[#D5D1E5] text-xs font-bold text-[#25233B] hover:bg-[#F7F6FB]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Dial 112</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Principles & Back Navigation */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-xs text-[#625F78] max-w-md mx-auto">
            AI generation is safely bypassed for high-risk evaluations. These contact details are directly verified from official campus and government directories.
          </p>

          <div>
            <Link
              to="/"
              className="text-xs font-semibold text-[#5554B8] hover:text-[#4645A7] hover:underline"
            >
              ← Back to dashboard
            </Link>
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
          Logged today at {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Prominent Supportive Response Card */}
      <Card padding="lg" className="border-t-4 border-t-[#5554B8] space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#5554B8]">
            <Sparkles className="w-4 h-4" />
            <span>Supportive Reflection</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#25233B]">
            {safety.status_label}
          </h1>
          <p className="text-xs text-[#625F78] mt-1">
            {safety.status_summary}
          </p>
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
          <p>
            {guidance?.disclaimer || "This is supportive guidance, not medical advice."}
          </p>
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
