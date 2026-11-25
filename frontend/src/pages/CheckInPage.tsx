import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoodQuestion } from '../components/checkin/MoodQuestion';
import { StressQuestion } from '../components/checkin/StressQuestion';
import { SleepQuestion } from '../components/checkin/SleepQuestion';
import { ReflectionInput } from '../components/checkin/ReflectionInput';
import { api } from '../services/api';
import { CheckInRecord } from '../types';
import { usePrivacyModal } from '../context/PrivacyModalContext';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const { openPrivacyModal } = usePrivacyModal();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(2);
  const [sleepHours, setSleepHours] = useState(7.0);
  const [reflection, setReflection] = useState('');
  const [consentAi, setConsentAi] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // Duplicate same-day check-in detection state
  const [priorTodayCheckin, setPriorTodayCheckin] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    async function checkPriorCheckins() {
      try {
        const history = await api.getCheckInHistory();
        const now = new Date();
        const isSameLocalDate = (d1: Date, d2: Date) =>
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();

        // Filter valid entries logged on the user's current calendar day
        const todayEntries = history.filter((c) => {
          const recordDate = new Date(c.timestamp);
          return !isNaN(recordDate.getTime()) && isSameLocalDate(recordDate, now);
        });

        if (todayEntries.length > 0) {
          // Sort descending by timestamp so the most recent entry of the day is displayed
          todayEntries.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setPriorTodayCheckin(todayEntries[0]);
        }
      } catch (err) {
        // Non-blocking history lookup
        console.debug('Could not load checkin history for duplicate policy check:', err);
      }
    }
    checkPriorCheckins();
  }, []);

  const stepTitles = [
    'Your Mood',
    'Stress Level',
    'Rest & Sleep',
    'Reflection (Optional)',
  ];

  /**
   * Client-side validation ensuring inputs adhere strictly to agreed ranges
   * before sending payload to FastAPI backend.
   */
  const validateCurrentInputs = (): string | null => {
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      return 'Mood must be a whole rating between 1 (Very low) and 5 (Great).';
    }
    if (!Number.isInteger(stress) || stress < 1 || stress > 5) {
      return 'Stress must be a whole rating between 1 (Very low) and 5 (Very high).';
    }
    if (
      typeof sleepHours !== 'number' ||
      !Number.isFinite(sleepHours) ||
      sleepHours < 0.0 ||
      sleepHours > 24.0
    ) {
      return 'Sleep duration must be a finite number between 0.0 and 24.0 hours.';
    }
    if (reflection.length > 2000) {
      return 'Optional reflection text must be within 2000 characters.';
    }
    return null;
  };

  const handleNext = () => {
    setErrorMsg(null);
    setIsNetworkError(false);

    // Validate active step inputs
    if (currentStep === 1 && (!Number.isInteger(mood) || mood < 1 || mood > 5)) {
      setErrorMsg('Please select a valid mood rating between 1 and 5.');
      return;
    }
    if (currentStep === 2 && (!Number.isInteger(stress) || stress < 1 || stress > 5)) {
      setErrorMsg('Please select a valid stress rating between 1 and 5.');
      return;
    }
    if (
      currentStep === 3 &&
      (!Number.isFinite(sleepHours) || sleepHours < 0.0 || sleepHours > 24.0)
    ) {
      setErrorMsg('Sleep duration must be between 0.0 and 24.0 hours.');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setIsNetworkError(false);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    const validationErr = validateCurrentInputs();
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setIsNetworkError(false);

    try {
      const response = await api.submitCheckIn({
        mood,
        stress,
        sleep_hours: sleepHours,
        reflection: reflection.trim() ? reflection.trim() : undefined,
        consent_ai_processing: consentAi,
      });

      // Cache the latest response locally in sessionStorage to power immediate result page rendering
      sessionStorage.setItem('calmspace_latest_checkin', JSON.stringify(response));
      navigate('/checkin/result');
    } catch (err: any) {
      console.error('Check-in submission failed:', err);
      setIsNetworkError(true);
      setErrorMsg(
        err?.message ||
          'Unable to reach the wellbeing evaluation service. Please verify your connection and retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-xl mx-auto">
      <PageHeader
        tag="Daily Check-in"
        title="How are you arriving today?"
        description="Takes about 60 seconds. Rules decide your safety, reflection text is never saved to your check-in history, and you remain anonymous."
      />

      {/* Same-day duplicate check-in notice */}
      {priorTodayCheckin && (
        <div
          className="p-3.5 rounded-card bg-[#F0EFFC] border border-[#D5D1E5] text-xs text-[#25233B] flex items-start gap-2.5 animate-fade-in"
          role="status"
        >
          <Info className="w-4 h-4 text-[#5554B8] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#5554B8]">
              Most recent check-in logged today{' '}
            </span>
            at{' '}
            {new Date(priorTodayCheckin.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            . You can submit an updated check-in anytime if your feelings, stress, or rest
            have shifted.
          </div>
        </div>
      )}

      {/* Progress Stepper Bar */}
      <div
        className="mb-6 bg-white p-4 rounded-card border border-[#E8E6F1] shadow-subtle"
        aria-label="Check-in progress"
      >
        <div className="flex items-center justify-between text-xs font-medium text-[#625F78] mb-2">
          <span>
            Step {currentStep} of {totalSteps}:{' '}
            <strong className="text-[#25233B]">{stepTitles[currentStep - 1]}</strong>
          </span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div
          className="w-full bg-[#E8E6F1] h-1.5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          <div
            className="bg-[#5554B8] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Card Content */}
      <Card padding="lg" className="animate-fade-up">
        {errorMsg && (
          <div
            className={`p-3.5 mb-5 rounded-button text-xs flex items-start gap-2.5 ${
              isNetworkError
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{isNetworkError ? 'Connection Issue' : 'Validation Error'}</p>
              <p className="mt-0.5">{errorMsg}</p>
              {isNetworkError && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-xs text-rose-900 underline hover:no-underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Retry Submission</span>
                </button>
              )}
            </div>
          </div>
        )}

        {currentStep === 1 && <MoodQuestion value={mood} onChange={setMood} />}

        {currentStep === 2 && <StressQuestion value={stress} onChange={setStress} />}

        {currentStep === 3 && <SleepQuestion value={sleepHours} onChange={setSleepHours} />}

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
              disabled={isSubmitting}
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
            disabled={isSubmitting}
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
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-[#625F78] flex-wrap">
        <ShieldCheck className="w-4 h-4 text-[#245532]" />
        <span>Encrypted anonymous session. No clinical diagnosis.</span>
        <span>·</span>
        <button
          type="button"
          onClick={openPrivacyModal}
          className="text-[#5554B8] font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5554B8] rounded"
        >
          Privacy & Data Inventory
        </button>
      </div>
    </div>
  );
};
