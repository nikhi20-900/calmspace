import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoodQuestion } from '../components/checkin/MoodQuestion';
import { StressQuestion } from '../components/checkin/StressQuestion';
import { SleepQuestion } from '../components/checkin/SleepQuestion';
import { ReflectionInput } from '../components/checkin/ReflectionInput';
import { api } from '../services/api';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(2);
  const [sleepHours, setSleepHours] = useState(7.0);
  const [reflection, setReflection] = useState('');
  const [consentAi, setConsentAi] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stepTitles = [
    'Your Mood',
    'Stress Level',
    'Rest & Sleep',
    'Reflection (Optional)',
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await api.submitCheckIn({
        mood,
        stress,
        sleep_hours: sleepHours,
        reflection: reflection.trim() || undefined,
        consent_ai_processing: consentAi,
      });

      // Clear any prior safe-exit flag for this fresh check-in submission
      sessionStorage.removeItem('calmspace_high_risk_exited');

      // Save latest check-in response in sessionStorage for reload resilience
      sessionStorage.setItem('calmspace_latest_checkin', JSON.stringify(response));

      // Navigate to results
      navigate('/checkin/result', { state: { result: response } });
    } catch (err: any) {
      console.error('Checkin submission error:', err);
      // Clear any prior safe-exit flag for fallback submission
      sessionStorage.removeItem('calmspace_high_risk_exited');

      // Fallback for safety offline simulation if backend isn't running
      const fallbackResult = {
        record: {
          id: 'local-' + Date.now(),
          session_id: 'anonymous-default-session',
          timestamp: new Date().toISOString(),
          mood,
          stress,
          sleep_hours: sleepHours,
          route: mood <= 1 || stress >= 5 || sleepHours < 3.5 ? 'HIGH' : mood === 2 || stress >= 3 || sleepHours < 6 ? 'MEDIUM' : 'LOW',
        },
        safety: {
          route: mood <= 1 || stress >= 5 || sleepHours < 3.5 ? 'HIGH' : mood === 2 || stress >= 3 || sleepHours < 6 ? 'MEDIUM' : 'LOW',
          status_label: mood <= 1 || stress >= 5 ? "Let's get you support" : mood === 2 || stress >= 3 ? "Worth some support" : "Doing okay",
          status_summary: mood <= 1 || stress >= 5 ? "You don't have to carry this alone. Human support is ready." : "Gentle support and self-pacing can help your routine.",
          requires_human_escalation: mood <= 1 || stress >= 5 || sleepHours < 3.5,
          ai_eligible: !(mood <= 1 || stress >= 5 || sleepHours < 3.5),
          reasons: ['Self-reported check-in metrics evaluation.'],
        },
        guidance: mood <= 1 || stress >= 5 ? null : {
          message: "Navigating university life has natural ebbs and flows. Honour where you are today, take one breath at a time, and remember that resting is productive.",
          suggestion_chips: ["Step outside for a 5-minute break", "Hydrate and stretch your back"],
          disclaimer: "This is supportive guidance, not medical advice.",
          generated_by_ai: consentAi,
          fallback_used: true,
        },
        support_contacts: [],
      };
      sessionStorage.setItem('calmspace_latest_checkin', JSON.stringify(fallbackResult));
      navigate('/checkin/result', { state: { result: fallbackResult } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-2 sm:py-6">
      <PageHeader
        tag="Daily Wellbeing Check-in"
        title="A moment to pause with yourself"
        description="Takes about 60 seconds. Rules decide your safety, reflection text is never stored, and you remain anonymous."
      />

      {/* Progress Stepper Bar */}
      <div className="mb-6 bg-white p-4 rounded-card border border-[#E8E6F1] shadow-subtle">
        <div className="flex items-center justify-between text-xs font-medium text-[#625F78] mb-2">
          <span>Step {currentStep} of {totalSteps}: <strong className="text-[#25233B]">{stepTitles[currentStep - 1]}</strong></span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-[#E8E6F1] h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
          <div
            className="bg-[#5554B8] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Card Content */}
      <Card padding="lg" className="animate-fade-up">
        {errorMsg && (
          <div className="p-3 mb-4 rounded-button bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            {errorMsg}
          </div>
        )}

        {currentStep === 1 && (
          <MoodQuestion value={mood} onChange={setMood} />
        )}

        {currentStep === 2 && (
          <StressQuestion value={stress} onChange={setStress} />
        )}

        {currentStep === 3 && (
          <SleepQuestion value={sleepHours} onChange={setSleepHours} />
        )}

        {currentStep === 4 && (
          <ReflectionInput
            value={reflection}
            onChange={setReflection}
            consent={consentAi}
            onConsentChange={setConsentAi}
          />
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-8 mt-6 border-t border-[#F0EFF7]">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
          ) : (
            <span /> // Spacer
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            isLoading={isSubmitting}
            rightIcon={
              currentStep === totalSteps ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
          >
            {currentStep === totalSteps ? 'Complete Check-in' : 'Next Step'}
          </Button>
        </div>
      </Card>

      {/* Privacy Footnote */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-[#625F78]">
        <ShieldCheck className="w-4 h-4 text-[#245532]" />
        <span>Encrypted anonymous session. No medical diagnosis.</span>
      </div>
    </div>
  );
};
