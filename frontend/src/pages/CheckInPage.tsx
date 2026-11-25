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

/** Next-step label per step index */
const STEP_NEXT_LABELS: Record<number, string> = {
  1: 'Next — Stress Level',
  2: 'Next — Rest & Sleep',
  3: 'Next — Reflection',
  4: 'Complete Check-in',
};

/** Friendly step subtitle shown in progress bar */
const STEP_TITLES = ['Your Mood', 'Stress Level', 'Rest & Sleep', 'Reflection (Optional)'];

export const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const { openPrivacyModal } = usePrivacyModal();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // null = no default selection; forces conscious choice on mood & stress
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [reflection, setReflection] = useState('');
  const [consentAi, setConsentAi] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

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

        const todayEntries = history.filter((c) => {
          const recordDate = new Date(c.timestamp);
          return !isNaN(recordDate.getTime()) && isSameLocalDate(recordDate, now);
        });

        if (todayEntries.length > 0) {
          todayEntries.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setPriorTodayCheckin(todayEntries[0]);
        }
      } catch (err) {
        console.debug('Could not load checkin history for duplicate policy check:', err);
      }
    }
    checkPriorCheckins();
  }, []);

  const validateCurrentInputs = (): string | null => {
    if (mood === null || !Number.isInteger(mood) || mood < 1 || mood > 5) {
      return 'Mood must be a whole rating between 1 (Very low) and 5 (Great).';
    }
    if (stress === null || !Number.isInteger(stress) || stress < 1 || stress > 5) {
      return 'Stress must be a whole rating between 1 (Very low) and 5 (Very high).';
    }
    if (typeof sleepHours !== 'number' || !Number.isFinite(sleepHours) || sleepHours < 0.0 || sleepHours > 24.0) {
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

    if (currentStep === 1) {
      if (mood === null) {
        setErrorMsg('Please select a mood rating to continue.');
        return;
      }
      if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
        setErrorMsg('Please select a valid mood rating between 1 and 5.');
        return;
      }
    }
    if (currentStep === 2) {
      if (stress === null) {
        setErrorMsg('Please select a stress rating to continue.');
        return;
      }
      if (!Number.isInteger(stress) || stress < 1 || stress > 5) {
        setErrorMsg('Please select a valid stress rating between 1 and 5.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!Number.isFinite(sleepHours) || sleepHours < 0.0 || sleepHours > 24.0) {
        setErrorMsg('Sleep duration must be between 0.0 and 24.0 hours.');
        return;
      }
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
    const validationError = validateCurrentInputs();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setIsNetworkError(false);

    try {
      const response = await api.submitCheckIn({
        mood: mood!,
        stress: stress!,
        sleep_hours: sleepHours,
        reflection: reflection.trim() || undefined,
        consent_ai_processing: consentAi,
      });

      sessionStorage.removeItem('calmspace_high_risk_exited');
      sessionStorage.setItem('calmspace_latest_checkin', JSON.stringify(response));
      navigate('/checkin/result', { state: { result: response } });
    } catch (err: any) {
      console.error('Checkin submission error:', err);
      setIsNetworkError(true);
      setErrorMsg(
        err?.message || 'Unable to submit check-in. Please check your connection and retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-2 sm:py-6">
      <PageHeader
        tag="Daily Wellbeing Check-in"
        title="A moment to pause with yourself"
        description="Takes about 60 seconds. Rules decide your safety, reflection text is never saved to history, and you remain anonymous."
      />

      {/* Pre-check-in Privacy Disclosure Banner */}
      <div className="mb-4 flex items-center justify-between gap-2 p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)] shrink-0" />
          <span>Rules decide safety · Reflection text is never persisted</span>
        </div>
        <button
          type="button"
          onClick={openPrivacyModal}
          className="text-[var(--color-primary)] font-semibold hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded"
        >
          Privacy disclosures →
        </button>
      </div>

      {/* Same-day duplicate notice */}
      {priorTodayCheckin && (
        <div
          className="mb-4 p-3.5 rounded-[var(--radius-card)] bg-[var(--color-lavender-soft)] border border-[var(--color-lavender-border)] text-sm text-[var(--color-text-main)] flex items-start gap-2.5 animate-fade-in"
          role="status"
        >
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-1" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[var(--color-primary)]">
              Most recent check-in logged today{' '}
            </span>
            at{' '}
            {new Date(priorTodayCheckin.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            . You can submit an updated check-in if your feelings, stress, or rest have shifted.
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="mb-6 bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-subtle)]"
        aria-label="Check-in progress"
      >
        <div className="flex items-center justify-between text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          <span>
            Step {currentStep} of {totalSteps}:{' '}
            <strong className="text-[var(--color-text-main)]">{STEP_TITLES[currentStep - 1]}</strong>
          </span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div
          className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          <div
            className="bg-[var(--color-primary-fill)] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content card */}
      <Card padding="lg" className="animate-fade-up">
        {errorMsg && (
          <div
            className={`p-3.5 mb-5 rounded-[var(--radius-button)] text-sm flex items-start gap-2.5 ${
              isNetworkError
                ? 'bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)]'
                : 'bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber-text)]'
            }`}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-semibold">{isNetworkError ? 'Connection Issue' : 'Please check your answer'}</p>
              <p className="mt-0.5">{errorMsg}</p>
              {isNetworkError && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-sm text-[var(--color-danger-text)] underline hover:no-underline"
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

        {/* Navigation controls */}
        <div className="flex items-center justify-between pt-8 mt-6 border-t border-[var(--color-border-light)]">
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
            <span />
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
            {STEP_NEXT_LABELS[currentStep]}
          </Button>
        </div>
      </Card>

      {/* Privacy footnote */}
      <div className="flex items-center justify-center gap-2 mt-6 text-sm text-[var(--color-text-secondary)] flex-wrap">
        <ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)]" />
        <span>Encrypted anonymous session. No clinical diagnosis.</span>
        <span>·</span>
        <button
          type="button"
          onClick={openPrivacyModal}
          className="text-[var(--color-primary)] font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded"
        >
          Privacy & Data Inventory
        </button>
      </div>
    </div>
  );
};
