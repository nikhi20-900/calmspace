import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoodQuestion } from '../components/checkin/MoodQuestion';
import { StressQuestion } from '../components/checkin/StressQuestion';
import { SleepQuestion } from '../components/checkin/SleepQuestion';
import { ReflectionInput } from '../components/checkin/ReflectionInput';
import { api } from '../services/api';
import { persistSuccessfulCheckIn } from '../services/checkinState';
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
  Heart,
  Activity,
  Moon,
  MessageCircle,
  Sparkles,
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
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(currentStep);

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

  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      stepContentRef.current?.focus();
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  const stepTitles = [
    'Your Mood',
    'Stress Level',
    'Rest & Sleep',
    'Reflection (Optional)',
  ];
  const stepIcons = [Heart, Activity, Moon, MessageCircle];

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

      // Cache the latest response locally in sessionStorage and clear any prior Safe Exit flag
      persistSuccessfulCheckIn(response);
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
    <div className="max-w-3xl mx-auto pb-8 animate-fade-in">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#E4E1F2] bg-gradient-to-br from-white via-[#F7F6FF] to-[#EFF6F1] px-5 py-6 sm:px-8 sm:py-8 mb-6 sm:mb-8">
        <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#E9E7FB]/70 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCD9F5] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5554B8]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> A moment for you
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[#25233B]">
            How are you arriving today?
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#625F78]">
            A gentle check-in on mood, stress, and sleep. It takes about a minute, and you can skip the reflection.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#625F78]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#39704B]" aria-hidden="true" /> Your reflection isn’t saved to check-in history</span>
            <span className="hidden sm:inline text-[#C5C1D5]" aria-hidden="true">•</span>
            <span>Take this at your own pace</span>
          </div>
        </div>
      </header>

      {/* Same-day duplicate check-in notice */}
      {priorTodayCheckin && (
        <div
          className="p-4 sm:px-5 rounded-2xl bg-[#F0EFFC] border border-[#D5D1E5] text-sm text-[#25233B] flex items-start gap-3 animate-fade-in mb-6"
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

      {/* Progress through the four short check-in steps */}
      <div
        className="mb-5 sm:mb-6 rounded-2xl bg-white p-4 sm:p-5 border border-[#E8E6F1] shadow-subtle"
        aria-label={`Check-in progress: step ${currentStep} of ${totalSteps}, ${stepTitles[currentStep - 1]}`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#77738D]">Your check-in</p>
            <p className="mt-0.5 text-sm font-semibold text-[#25233B]" aria-live="polite">
              Step {currentStep} of {totalSteps} <span className="text-[#A5A1B6]" aria-hidden="true">·</span> {stepTitles[currentStep - 1]}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F1F0FA] px-2.5 py-1 text-xs font-semibold text-[#5554B8]">
            {Math.round((currentStep / totalSteps) * 100)}% complete
          </span>
        </div>
        <div
          className="w-full bg-[#E8E6F1] h-2 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Check-in steps completed"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          <div
            className="bg-gradient-to-r from-[#5554B8] to-[#7772CF] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <ol className="grid grid-cols-4 gap-1 sm:gap-3 mt-4" aria-label="Check-in steps">
          {stepTitles.map((title, index) => {
            const StepIcon = stepIcons[index];
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            return (
              <li
                key={title}
                aria-current={isCurrent ? 'step' : undefined}
                className={`min-w-0 flex flex-col items-center gap-1.5 text-center ${isCurrent ? 'text-[#5554B8]' : isComplete ? 'text-[#39704B]' : 'text-[#9692A8]'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${isCurrent ? 'border-[#5554B8] bg-[#F0EFFC]' : isComplete ? 'border-[#BCD4C3] bg-[#EFF6F1]' : 'border-[#E8E6F1] bg-[#FAF9FC]'}`}>
                  <StepIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[10px] sm:text-xs leading-tight font-medium">{title}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step Card Content */}
      <Card padding="lg" className="rounded-[1.75rem] border-[#E5E2F0] shadow-soft animate-fade-up !p-5 sm:!p-8">
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

        <div
          ref={stepContentRef}
          tabIndex={-1}
          role="group"
          aria-label={`Step ${currentStep} of ${totalSteps}: ${stepTitles[currentStep - 1]}`}
          className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-4"
        >
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
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-6 sm:pt-7 mt-6 border-t border-[#F0EFF7]">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              disabled={isSubmitting}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
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
            {currentStep === totalSteps ? 'Submit my check-in' : 'Continue'}
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
