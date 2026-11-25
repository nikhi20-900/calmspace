import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import {
  HeartPulse,
  Smile,
  Moon,
  Activity,
  Coffee,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Calendar,
  Phone,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../services/api';
import { InsightSummary, CheckInRecord, UserSettings } from '../types';
import { usePrivacyModal } from '../context/PrivacyModalContext';

/** Lazy-load the Three.js mascot so it never blocks the initial paint */
const BlobScene = lazy(() =>
  import('../components/mascot/BlobScene').then((m) => ({ default: m.BlobScene }))
);

export const OverviewPage: React.FC = () => {
  const { openPrivacyModal } = usePrivacyModal();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [insights, setInsights] = useState<InsightSummary | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    nickname: 'Student',
    break_reminders_enabled: true,
    reminder_interval_minutes: 45,
    share_anonymous_analytics: false,
    data_retention_days: 30,
  });
  const [breakTaken, setBreakTaken] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [histRes, insRes, setRes] = await Promise.allSettled([
          api.getCheckInHistory(),
          api.getInsights(7),
          api.getSettings(),
        ]);

        let hasSuccess = false;
        if (histRes.status === 'fulfilled') {
          setHistory(histRes.value);
          hasSuccess = true;
        }
        if (insRes.status === 'fulfilled') {
          setInsights(insRes.value);
          hasSuccess = true;
        }
        if (setRes.status === 'fulfilled') {
          setSettings(setRes.value);
          hasSuccess = true;
        }

        if (!hasSuccess && (histRes.status === 'rejected' || insRes.status === 'rejected')) {
          setLoadError(true);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <LoadingState message="Welcoming you to Calmspace..." />;
  }

  const latestCheckin = history.length > 0 ? history[history.length - 1] : null;
  const isCheckedInToday = latestCheckin
    ? new Date(latestCheckin.timestamp).toDateString() === new Date().toDateString()
    : false;

  const hasNoCheckins = history.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Offline / Connection Resilience Banner */}
      {loadError && (
        <div
          role="status"
          className="p-3.5 rounded-card bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber-text)] flex items-center justify-between gap-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Unable to reach the server. Verified helpline contacts remain accessible below.
            </span>
          </div>
          <Link
            to="/support"
            className="font-semibold underline hover:text-[var(--color-primary)] shrink-0"
          >
            Support directory
          </Link>
        </div>
      )}

      {/* Editorial Welcome Header — CTA button first on mobile */}
      <section className="bg-gradient-to-r from-[var(--color-lavender-soft)] via-[var(--color-bg)] to-[var(--color-peach-soft)]/30 p-6 sm:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        {/* Primary CTA */}
        <div className="mb-5 shrink-0 flex flex-col items-start gap-2">
          {isCheckedInToday ? (
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex items-center gap-2 bg-[var(--color-sage-soft)] text-[var(--color-sage-text)] px-4 py-2 rounded-full text-sm font-semibold border border-[var(--color-sage-border)]">
                <ShieldCheck className="w-4 h-4" />
                <span>Today's check-in complete</span>
              </div>
              <Link
                to="/checkin/result"
                className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1"
              >
                <span>View today's summary</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <Link to="/checkin">
              <Button
                variant="primary"
                size="md"
                leftIcon={<HeartPulse className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Start Daily Check-in
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] flex-wrap">
            <span>Takes ~60 seconds · Your wellbeing check-in starts here</span>
            <span>·</span>
            <button
              type="button"
              onClick={openPrivacyModal}
              className="text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded"
            >
              <ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)]" />
              <span>Privacy & Data Inventory</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quiet Room for Reflection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] tracking-tight">
              {getGreeting()}, {settings.nickname || 'Student'}.
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
              Take a breath. No deadlines or performance metrics live here. A private space to reflect on how you're feeling.
            </p>
          </div>

          {/* Mascot: lazy-loaded, only shown on md+ */}
          <div className="hidden md:block w-32 h-32 shrink-0">
            <Suspense fallback={<div className="w-full h-full rounded-full bg-[var(--color-lavender-soft)] animate-pulse" />}>
              <BlobScene expression="idle" className="w-full h-full" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Quick Human Support Bar */}
      <section
        aria-label="Immediate Crisis & Support Contacts"
        className="p-4 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-[var(--color-text-main)] block">
              Immediate Human Support Ready 24/7
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              Tele-MANAS: <strong className="text-[var(--color-text-main)]">14416</strong> • Emergency:{' '}
              <strong className="text-[var(--color-text-main)]">112</strong> • Free & confidential
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:14416"
            className="text-sm font-semibold px-3.5 py-2 rounded-button bg-[var(--color-lavender-soft)] text-[var(--color-primary)] hover:bg-[var(--color-lavender-border)] transition-colors"
          >
            Call 14416
          </a>
          <Link
            to="/support"
            className="text-sm font-semibold px-3.5 py-2 rounded-button bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg)] transition-colors flex items-center gap-1"
          >
            <span>Full directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* FIRST-TIME STUDENT EMPTY STATE */}
      {hasNoCheckins ? (
        <Card padding="lg" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)] flex items-center justify-center mx-auto shadow-subtle">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">
              No check-ins yet.
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Your first one takes about a minute. We'll help you track your sleep, stress, and mood patterns gently over time without clinical diagnoses.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/checkin">
              <Button variant="primary" size="md">
                Begin First Check-in
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={openPrivacyModal}
              leftIcon={<ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)]" />}
            >
              Review Privacy & Data Inventory
            </Button>
          </div>
        </Card>
      ) : (
        /* DASHBOARD SUMMARY GRIDS */
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Recent wellbeing summaries">
            {/* Mood Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Recent Mood</span>
                </span>
                {latestCheckin && <Badge route={latestCheckin.route} />}
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-main)]">
                {latestCheckin ? `${latestCheckin.mood} / 5` : '—'}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {insights ? `Averaged ${insights.average_mood} this week` : 'Logged recently'}
              </p>
            </Card>

            {/* Sleep Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Sleep Rest</span>
                </span>
                <span className="text-xs text-[var(--color-sage-text)] font-medium bg-[var(--color-sage-soft)] px-2.5 py-0.5 rounded-full">
                  {latestCheckin && latestCheckin.sleep_hours >= 6 ? 'Adequate' : 'Light'}
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-main)]">
                {latestCheckin ? `${latestCheckin.sleep_hours.toFixed(1)} hrs` : '—'}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {insights ? `Avg ${insights.average_sleep} hrs recently` : 'Rest duration'}
              </p>
            </Card>

            {/* Stress Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[var(--color-amber-text)]" />
                  <span>Stress Pressure</span>
                </span>
                <span className="text-xs text-[var(--color-amber-text)] font-medium bg-[var(--color-amber-soft)] px-2.5 py-0.5 rounded-full">
                  {latestCheckin && latestCheckin.stress <= 2 ? 'Low' : 'Noticeable'}
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-main)]">
                {latestCheckin ? `${latestCheckin.stress} / 5` : '—'}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {insights ? `Avg ${insights.average_stress} stress rating` : 'Academic load'}
              </p>
            </Card>
          </section>

          {/* Trends & Study Break Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Mood Trend Rechart */}
            <Card padding="lg" className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-main)]">
                    Weekly Mood Pattern
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    Gentle snapshot of your daily baseline over the last 7 entries.
                  </p>
                </div>
                <Link
                  to="/insights"
                  className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 shrink-0"
                >
                  <span>Detailed insights</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {insights && insights.mood_trend.length >= 2 ? (
                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.mood_trend}>
                      <XAxis
                        dataKey="day"
                        stroke="var(--color-chart-axis)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        stroke="var(--color-chart-axis)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-main)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-soft)',
                          fontSize: '13px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: 'var(--color-surface)' }}
                        activeDot={{ r: 6, fill: 'var(--color-primary-hover)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {insights.plain_summary && (
                    <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2 italic">
                      "{insights.plain_summary}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-sm text-[var(--color-text-secondary)] text-center p-4 bg-[var(--color-bg)] rounded-button border border-[var(--color-border)]">
                  <Calendar className="w-5 h-5 text-[var(--color-text-muted)] mb-1.5" />
                  <span>Complete 2 or more daily check-ins to view your personal trend graph.</span>
                </div>
              )}
            </Card>

            {/* Next Break Reminder & Balance Card */}
            <Card padding="lg" className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-2">
                  <Coffee className="w-4 h-4" />
                  <span>Pacing & Breaks</span>
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-main)]">
                  Next mindful breather
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  Stepping away from computer screens every {settings.reminder_interval_minutes || 45} minutes protects your focus from mental fatigue.
                </p>
              </div>

              <div className="p-4 rounded-button bg-[var(--color-bg)] border border-[var(--color-border)] my-2">
                <p className="text-sm font-medium text-[var(--color-text-main)] mb-2.5">
                  {breakTaken ? '✓ Breather logged! Hydrate and return when ready.' : 'Would you like to take a short break right now?'}
                </p>
                <Button
                  variant={breakTaken ? 'outline' : 'secondary'}
                  size="sm"
                  className="w-full"
                  onClick={() => setBreakTaken(true)}
                >
                  {breakTaken ? 'Pause Completed' : 'Log a 5-min Breather'}
                </Button>
              </div>

              <div className="pt-2 border-t border-[var(--color-border-light)] flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                <Link to="/planner" className="hover:text-[var(--color-primary)] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded">
                  <Calendar className="w-4 h-4" />
                  <span>Open study planner</span>
                </Link>
                <Link to="/support" className="hover:text-[var(--color-primary)] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded">
                  <HelpCircle className="w-4 h-4" />
                  <span>Get human help</span>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
