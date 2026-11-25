import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { api } from '../services/api';
import { InsightSummary, RiskRoute } from '../types';
import {
  Smile,
  Moon,
  Activity,
  Info,
  Calendar,
  AlertCircle,
  RefreshCw,
  HeartPulse,
  ShieldCheck,
  Table,
} from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [insights, setInsights] = useState<InsightSummary | null>(null);
  const [isTableVisible, setIsTableVisible] = useState<boolean>(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.getInsights(days);
      setInsights(data);
    } catch {
      setLoadError(true);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const tableRows = useMemo(() => {
    if (!insights) return [];

    const dayMap = new Map<
      string,
      {
        day: string;
        mood: number | null;
        sleep: number | null;
        stress: number | null;
        route?: RiskRoute;
      }
    >();

    (insights.mood_trend || []).forEach((m) => {
      if (!dayMap.has(m.day)) {
        dayMap.set(m.day, {
          day: m.day,
          mood: m.mood ?? null,
          sleep: null,
          stress: null,
          route: m.route,
        });
      } else {
        const row = dayMap.get(m.day)!;
        row.mood = m.mood ?? null;
        if (m.route) row.route = m.route;
      }
    });

    (insights.sleep_trend || []).forEach((s) => {
      if (!dayMap.has(s.day)) {
        dayMap.set(s.day, {
          day: s.day,
          mood: null,
          sleep: s.sleep ?? null,
          stress: null,
        });
      } else {
        dayMap.get(s.day)!.sleep = s.sleep ?? null;
      }
    });

    (insights.stress_trend || []).forEach((st) => {
      if (!dayMap.has(st.day)) {
        dayMap.set(st.day, {
          day: st.day,
          mood: null,
          sleep: null,
          stress: st.stress ?? null,
        });
      } else {
        dayMap.get(st.day)!.stress = st.stress ?? null;
      }
    });

    return Array.from(dayMap.values());
  }, [insights]);

  if (loading) {
    return <LoadingState message="Compiling your personal insights..." />;
  }

  if (loadError) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
        <PageHeader
          tag="Personal Wellbeing Analytics"
          title="Understanding your rhythm"
          description="Reflective patterns over time. Never medical diagnoses — strictly supportive observations."
        />

        <Card padding="lg" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-danger-soft)] flex items-center justify-center text-[var(--color-danger-text)] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">
              Unable to load your insights
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              We couldn&apos;t reach the server to compile your trend charts. Your check-in records remain safe.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={fetchInsights}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
            <Link to="/checkin">
              <Button variant="outline" size="sm" leftIcon={<HeartPulse className="w-4 h-4" />}>
                Daily Check-in
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const hasData = Boolean(insights && insights.check_in_count > 0);
  const isSmallSample = Boolean(insights && insights.check_in_count > 0 && insights.check_in_count < 3);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header and Time-Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          tag="Personal Wellbeing Analytics"
          title="Understanding your rhythm"
          description="Reflective patterns over time. Never medical diagnoses — strictly supportive observations."
        />

        <div
          role="group"
          aria-label="Select insight time range"
          className="flex items-center gap-1.5 p-1 bg-[var(--color-surface)] rounded-button border border-[var(--color-border)] shadow-subtle shrink-0 self-start sm:self-auto"
        >
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-button transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                days === d
                  ? 'bg-[var(--color-primary-fill)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Non-Diagnostic Commitment Alert */}
      <div
        role="region"
        aria-label="Non-diagnostic medical disclaimer"
        className="p-3.5 sm:p-4 rounded-card bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-start gap-3"
      >
        <ShieldCheck className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <strong className="text-[var(--color-text-main)] font-semibold block sm:inline mr-1">
            Supportive Reflection, Not a Diagnosis:
          </strong>
          These charts reflect your self-reported check-ins to help you observe personal rhythms. Calmspace never calculates clinical scores, diagnoses medical conditions, or substitutes for professional care.
        </div>
      </div>

      {!hasData ? (
        <Card padding="lg" className="text-center py-16 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-main)]">
              No check-ins logged for this {days}-day window
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Check-ins take about 60 seconds. Log how you are feeling today to start visualizing your personal mood, sleep, and stress rhythms.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/checkin">
              <Button variant="primary" size="md" leftIcon={<HeartPulse className="w-4 h-4" />}>
                Start Daily Check-in
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {isSmallSample && (
            <div
              role="status"
              className="p-3.5 rounded-card bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] flex items-start gap-3 text-sm text-[var(--color-amber-text)]"
            >
              <Info className="w-4 h-4 shrink-0 mt-1" />
              <span>
                <strong>Early observations:</strong> You have logged {insights?.check_in_count}{' '}
                {insights?.check_in_count === 1 ? 'check-in' : 'check-ins'} in this {days}-day window. Averages and lines will reflect clearer patterns as you continue checking in.
              </span>
            </div>
          )}

          {/* Plain Language Summary & Summary Metric Chips */}
          <Card padding="lg" className="space-y-4 bg-gradient-to-r from-[var(--color-lavender-light)] via-[var(--color-surface)] to-[var(--color-peach-light)]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Accessible Plain-Language Summary
                </span>
                <p className="text-sm sm:text-base text-[var(--color-text-main)] font-medium leading-relaxed">
                  {insights?.plain_summary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="p-3 rounded-input bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Average Mood</span>
                </div>
                <span className="text-sm font-bold text-[var(--color-text-main)]">
                  {insights?.average_mood} <span className="text-sm font-normal text-[var(--color-text-secondary)]">/ 5</span>
                </span>
              </div>

              <div className="p-3 rounded-input bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[var(--color-sage-text)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Average Sleep</span>
                </div>
                <span className="text-sm font-bold text-[var(--color-text-main)]">
                  {insights?.average_sleep} <span className="text-sm font-normal text-[var(--color-text-secondary)]">hrs</span>
                </span>
              </div>

              <div className="p-3 rounded-input bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--color-amber-text)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Average Stress</span>
                </div>
                <span className="text-sm font-bold text-[var(--color-text-main)]">
                  {insights?.average_stress} <span className="text-sm font-normal text-[var(--color-text-secondary)]">/ 5</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Metric 1: Mood Evolution Chart */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[var(--color-border-light)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-lavender-soft)] flex items-center justify-center text-[var(--color-primary)]">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-main)]">
                    Mood Evolution (1 to 5)
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Higher values reflect more balanced headspace. Average: {insights?.average_mood} / 5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] self-start sm:self-auto">
                <span className="inline-block w-3 h-3 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                <span>Solid line with circles (Mood rating)</span>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-3 rounded-input border border-[var(--color-border)]">
              <strong className="text-[var(--color-text-main)]">Mood Summary:</strong> Over the last {days} days, your self-reported mood averaged {insights?.average_mood} out of 5 across {insights?.check_in_count} check-in entries.
            </p>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights?.mood_trend} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-chart-grid)" />
                  <XAxis dataKey="day" stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} aria-label="Date of check-in" />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} aria-label="Mood score from 1 to 5" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-main)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-soft)',
                      fontSize: '13px',
                    }}
                    formatter={(val: any) => [val != null ? `${val} / 5` : 'Not recorded', 'Mood Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    name="Mood Score"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    activeDot={{ r: 7, stroke: 'var(--color-primary)', strokeWidth: 2, fill: 'var(--color-surface)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Metrics 2 & 3: Sleep & Stress side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sleep Rest Chart */}
            <Card padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-sage-soft)] flex items-center justify-center text-[var(--color-sage-text)]">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-main)]">
                      Sleep Duration (Hours)
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Average nightly rest: {insights?.average_sleep} hrs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] self-start sm:self-auto">
                  <span className="inline-block w-3 h-3 bg-[var(--color-sage-text)] rounded-xs" aria-hidden="true" />
                  <span>Vertical bars (Hours)</span>
                </div>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-3 rounded-input border border-[var(--color-border)]">
                <strong className="text-[var(--color-text-main)]">Sleep Summary:</strong> You logged an average of {insights?.average_sleep} hours of sleep nightly across this tracking window (7h reference line provided for visual orientation).
              </p>

              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights?.sleep_trend} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="day" stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} />
                    <YAxis domain={[0, 'auto']} stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} />
                    <ReferenceLine
                      y={7}
                      stroke="var(--color-sage-border)"
                      strokeDasharray="4 4"
                      label={{ value: '7h Reference', position: 'insideTopRight', fill: 'var(--color-sage-text)', fontSize: 11 }}
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
                      formatter={(val: any) => [val != null ? `${val} hrs` : 'Not recorded', 'Hours Slept']}
                    />
                    <Bar dataKey="sleep" name="Hours Slept" fill="var(--color-sage-text)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Academic Stress Load Chart */}
            <Card padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-amber-soft)] flex items-center justify-center text-[var(--color-amber-text)]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-main)]">
                      Academic Stress Load (1 to 5)
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Average load: {insights?.average_stress} / 5
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] self-start sm:self-auto">
                  <span className="inline-block w-3 h-1 bg-[var(--color-amber-text)] border-t border-dashed border-[var(--color-amber-text)]" aria-hidden="true" />
                  <span>Dashed line (Stress)</span>
                </div>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-3 rounded-input border border-[var(--color-border)]">
                <strong className="text-[var(--color-text-main)]">Stress Summary:</strong> Academic and workload pressure averaged {insights?.average_stress} out of 5 over the active {days}-day tracking window.
              </p>

              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights?.stress_trend} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="day" stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--color-chart-axis)" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-main)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-soft)',
                        fontSize: '13px',
                      }}
                      formatter={(val: any) => [val != null ? `${val} / 5` : 'Not recorded', 'Stress Rating']}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      name="Stress Rating"
                      stroke="var(--color-amber-text)"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      connectNulls={false}
                      dot={{ r: 5, fill: 'var(--color-surface)', stroke: 'var(--color-amber-text)', strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: 'var(--color-amber-text)', strokeWidth: 2, fill: 'var(--color-surface)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Accessible Data Table Section */}
          <div className="mt-8 bg-[var(--color-surface)] p-5 rounded-card border border-[var(--color-border)] shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                <Table className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Screen-Reader Accessible Data Table</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTableVisible(!isTableVisible)}
                aria-expanded={isTableVisible}
                aria-controls="accessible-insights-table"
                className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:underline"
              >
                {isTableVisible ? 'Hide Table View' : 'Show Table View'}
              </button>
            </div>

            {isTableVisible && (
              <div id="accessible-insights-table" className="overflow-x-auto pt-1">
                <table className="w-full text-left text-sm text-[var(--color-text-main)]">
                  <caption className="sr-only">
                    Tabular breakdown of your daily check-in ratings for mood, sleep duration, and stress level over the selected {days}-day period.
                  </caption>
                  <thead className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg)]">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Entry Date / Label</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Mood (1 to 5)</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Sleep Duration</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Stress Load (1 to 5)</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Support Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {tableRows.map((row) => (
                      <tr key={row.day} className="hover:bg-[var(--color-bg)]/60 transition-colors">
                        <th scope="row" className="py-2.5 px-3 font-medium text-[var(--color-text-main)]">
                          {row.day}
                        </th>
                        <td className="py-2.5 px-3">
                          {row.mood != null ? `${row.mood} / 5` : 'Not recorded'}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.sleep != null ? `${row.sleep} hrs` : 'Not recorded'}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.stress != null ? `${row.stress} / 5` : 'Not recorded'}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.route ? <Badge route={row.route} /> : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
              Your check-in ratings are private and scoped to your anonymous session. Calmspace never computes clinical diagnosis metrics or shares wellbeing records with academic systems.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
