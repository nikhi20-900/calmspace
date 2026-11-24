import React, { useState, useEffect } from 'react';
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
  ExternalLink,
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

export const OverviewPage: React.FC = () => {
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
      } catch (e) {
        console.error('Overview load error', e);
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
          className="p-3.5 rounded-card bg-[#FDF8F0] border border-[#E8CEA5] text-[#7A4D05] flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#7A4D05]" />
            <span>
              Unable to sync latest cloud data. Your offline support contacts and local tools remain fully active.
            </span>
          </div>
          <Link
            to="/support"
            className="font-semibold underline hover:text-[#5554B8] shrink-0"
          >
            Support directory
          </Link>
        </div>
      )}

      {/* Editorial Welcome Header */}
      <section className="bg-gradient-to-r from-[#F0EFFC] via-[#F7F6FB] to-[#F4DCCB]/20 p-6 sm:p-8 rounded-card border border-[#E8E6F1] shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quiet Room for Reflection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#25233B] tracking-tight">
              {getGreeting()}, {settings.nickname || 'Student'}.
            </h1>
            <p className="text-sm sm:text-base text-[#625F78] leading-relaxed-wellness">
              Take a breath. No deadlines or performance metrics live here. Just a safe, confidential corner to check in with how you are feeling.
            </p>
          </div>

          {/* Today's Check-in Status Action */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            {isCheckedInToday ? (
              <div className="flex flex-col items-start md:items-end gap-1.5">
                <div className="flex items-center gap-2 bg-[#DCE9DF] text-[#245532] px-4 py-2 rounded-full text-xs font-semibold border border-[#BCD4C3]">
                  <ShieldCheck className="w-4 h-4 text-[#245532]" />
                  <span>Today's check-in complete</span>
                </div>
                <Link
                  to="/checkin/result"
                  className="text-xs font-medium text-[#5554B8] hover:text-[#4645A7] flex items-center gap-1"
                >
                  <span>View today's summary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
            <span className="text-xs text-[#625F78]">
              Takes ~60 seconds • Completely confidential
            </span>
          </div>
        </div>
      </section>

      {/* Quick Human Support Bar */}
      <section
        aria-label="Immediate Crisis & Support Contacts"
        className="p-4 rounded-card bg-white border border-[#E8E6F1] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E9E7FB] text-[#5554B8] flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#25233B] block">
              Immediate Human Support Ready 24/7
            </span>
            <span className="text-[11px] text-[#625F78]">
              Tele-MANAS: <strong className="text-[#25233B]">14416</strong> • Emergency: <strong className="text-[#25233B]">112</strong> • Free & confidential
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:14416"
            className="text-xs font-semibold px-3 py-1.5 rounded-button bg-[#E9E7FB] text-[#5554B8] hover:bg-[#DCD8F7] transition-colors"
          >
            Call 14416
          </a>
          <Link
            to="/support"
            className="text-xs font-semibold px-3 py-1.5 rounded-button bg-white border border-[#E8E6F1] text-[#25233B] hover:bg-[#F7F6FB] transition-colors flex items-center gap-1"
          >
            <span>Full directory</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {/* FIRST-TIME STUDENT EMPTY STATE */}
      {hasNoCheckins ? (
        <Card padding="lg" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E9E7FB] text-[#5554B8] flex items-center justify-center mx-auto shadow-subtle">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-lg font-bold text-[#25233B]">
              No check-ins yet.
            </h2>
            <p className="text-sm text-[#625F78] leading-relaxed">
              Your first one takes about a minute. We'll help you track your sleep, stress, and mood patterns gently over time without clinical diagnoses.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/checkin">
              <Button variant="primary" size="md">
                Begin First Check-in
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* DASHBOARD SUMMARY GRIDS */
        <>
          {/* Three Compact Summary Cards: Mood, Sleep, Stress */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Recent wellbeing summaries">
            {/* Mood Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#625F78] flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-[#5554B8]" />
                  <span>Recent Mood</span>
                </span>
                {latestCheckin && <Badge route={latestCheckin.route} />}
              </div>
              <div className="text-2xl font-bold text-[#25233B]">
                {latestCheckin ? `${latestCheckin.mood} / 5` : '—'}
              </div>
              <p className="text-xs text-[#625F78]">
                {insights ? `Averaged ${insights.average_mood} this week` : 'Logged recently'}
              </p>
            </Card>

            {/* Sleep Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#625F78] flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-[#5554B8]" />
                  <span>Sleep Rest</span>
                </span>
                <span className="text-xs text-[#245532] font-medium bg-[#DCE9DF] px-2 py-0.5 rounded-full">
                  {latestCheckin && latestCheckin.sleep_hours >= 6 ? 'Adequate' : 'Light'}
                </span>
              </div>
              <div className="text-2xl font-bold text-[#25233B]">
                {latestCheckin ? `${latestCheckin.sleep_hours.toFixed(1)} hrs` : '—'}
              </div>
              <p className="text-xs text-[#625F78]">
                {insights ? `Avg ${insights.average_sleep} hrs recently` : 'Rest duration'}
              </p>
            </Card>

            {/* Stress Card */}
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#625F78] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#7A4D05]" />
                  <span>Stress Pressure</span>
                </span>
                <span className="text-xs text-[#7A4D05] font-medium bg-[#F6E6CC] px-2 py-0.5 rounded-full">
                  {latestCheckin && latestCheckin.stress <= 2 ? 'Low' : 'Noticeable'}
                </span>
              </div>
              <div className="text-2xl font-bold text-[#25233B]">
                {latestCheckin ? `${latestCheckin.stress} / 5` : '—'}
              </div>
              <p className="text-xs text-[#625F78]">
                {insights ? `Avg ${insights.average_stress} stress rating` : 'Academic load'}
              </p>
            </Card>
          </section>

          {/* Trends & Study Break Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Mood Trend Rechart */}
            <Card padding="lg" className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#25233B]">
                    Weekly Mood Pattern
                  </h2>
                  <p className="text-xs text-[#625F78] mt-0.5">
                    Gentle snapshot of your daily baseline over the last 7 entries.
                  </p>
                </div>
                <Link
                  to="/insights"
                  className="text-xs font-semibold text-[#5554B8] hover:text-[#4645A7] flex items-center gap-1"
                >
                  <span>Detailed insights</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {insights && insights.mood_trend.length >= 2 ? (
                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.mood_trend}>
                      <XAxis
                        dataKey="day"
                        stroke="#8E8AA7"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#E8E6F1' }}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        stroke="#8E8AA7"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#E8E6F1' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E8E6F1',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="#5554B8"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#5554B8', strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#4645A7' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {insights.plain_summary && (
                    <p className="text-xs text-[#625F78] text-center mt-2 italic">
                      "{insights.plain_summary}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-xs text-[#625F78] text-center p-4 bg-[#F7F6FB] rounded-button border border-[#E8E6F1]/50">
                  <Calendar className="w-5 h-5 text-[#8E8AA7] mb-1.5" />
                  <span>Complete 2 or more daily check-ins to view your personal trend graph.</span>
                </div>
              )}
            </Card>

            {/* Next Break Reminder & Balance Card */}
            <Card padding="lg" className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8] mb-2">
                  <Coffee className="w-4 h-4" />
                  <span>Pacing & Breaks</span>
                </div>
                <h2 className="text-base font-bold text-[#25233B]">
                  Next mindful breather
                </h2>
                <p className="text-xs text-[#625F78] mt-1 leading-relaxed">
                  Stepping away from computer screens every {settings.reminder_interval_minutes || 45} minutes protects your focus from mental fatigue.
                </p>
              </div>

              <div className="p-4 rounded-button bg-[#F7F6FB] border border-[#E8E6F1] my-2">
                <p className="text-xs font-medium text-[#25233B] mb-2">
                  {breakTaken ? "✓ Breather logged! Hydrate and return when ready." : "Would you like to take a short break right now?"}
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

              <div className="pt-2 border-t border-[#F0EFF7] flex items-center justify-between text-xs text-[#625F78]">
                <Link to="/planner" className="hover:text-[#5554B8] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5554B8] rounded">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Open study planner</span>
                </Link>
                <Link to="/support" className="hover:text-[#5554B8] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5554B8] rounded">
                  <HelpCircle className="w-3.5 h-3.5" />
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
