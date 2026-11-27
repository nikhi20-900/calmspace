import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, Heart, Moon, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/layout/PageHeader';
import { InsightSummaryV2 } from '../types';

const PERIODS = [7, 14, 30] as const;

function dateRange(start: string, end: string): string[] {
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  const result: string[] = [];
  while (current <= last) {
    result.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function ComparisonValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  const sign = value > 0 ? '+' : '';
  return (
    <div className="rounded-input border border-[#E8E6F1] bg-white p-3">
      <p className="text-xs text-[#625F78]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#25233B]">
        {sign}{value.toFixed(1)} <span className="text-xs font-medium text-[#625F78]">{unit}</span>
      </p>
    </div>
  );
}

export const InsightsV2Page: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [insights, setInsights] = useState<InsightSummaryV2 | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setInsights(await api.getInsightsV2(days));
    } catch {
      setInsights(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, InsightSummaryV2['timeline_entries']>();
    for (const entry of insights?.timeline_entries ?? []) {
      grouped.set(entry.date_key, [...(grouped.get(entry.date_key) ?? []), entry]);
    }
    return grouped;
  }, [insights]);

  const calendarCells = useMemo(() => {
    if (!insights) return [];
    const dates = dateRange(insights.window_start_date, insights.window_end_date);
    const firstWeekday = new Date(`${dates[0]}T00:00:00Z`).getUTCDay();
    return [...Array.from({ length: firstWeekday }, () => null), ...dates];
  }, [insights]);

  useEffect(() => {
    if (insights) setSelectedDate(insights.window_end_date);
  }, [insights]);

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];
  const selectedDateLabel = selectedDate ? formatDate(selectedDate, { weekday: 'long', year: 'numeric' }) : '';
  const dailySeries = insights?.daily_series ?? [];
  const maxSleep = Math.max(8, ...dailySeries.map((point) => point.average_sleep));
  const dailySleepValues = dailySeries.map((point) => point.average_sleep);
  const dailySleepRange = dailySleepValues.length
    ? `${Math.min(...dailySleepValues).toFixed(1)}–${Math.max(...dailySleepValues).toFixed(1)} h`
    : '—';

  if (loading && !insights) return <LoadingState message="Gathering your check-in rhythm..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          tag="Your private check-in patterns"
          title="Understanding your rhythm"
          description="A calm view of the check-ins you chose to share. These observations are not diagnoses."
        />
        <div role="group" aria-label="Select Insights period" className="flex shrink-0 gap-1 rounded-button border border-[#E8E6F1] bg-white p-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={`rounded-button px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${days === period ? 'bg-[#5554B8] text-white' : 'text-[#625F78] hover:bg-[#F7F6FB]'}`}
            >
              {period} days
            </button>
          ))}
        </div>
      </div>

      <div role="region" aria-label="Supportive reflection" className="flex items-start gap-3 rounded-card border border-[#E8E6F1] bg-[#F7F6FB] p-4 text-xs leading-relaxed text-[#625F78]">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#5554B8]" aria-hidden="true" />
        <p><strong className="text-[#25233B]">Supportive reflection, not a diagnosis.</strong> These summaries describe your self-reported check-ins. They do not explain why something happened or predict what will happen.</p>
      </div>

      {error && (
        <Card padding="md" className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-[#25233B]">Your insights could not load.</p>
          <Button variant="outline" size="sm" onClick={() => void loadInsights()} leftIcon={<RefreshCw className="h-4 w-4" />}>Try again</Button>
        </Card>
      )}

      {insights && (
        <>
          <Card padding="lg" className="space-y-4 bg-gradient-to-r from-[#F0EFFC]/60 via-white to-[#F4DCCB]/20">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9E7FB] text-[#5554B8]"><Heart className="h-4 w-4" aria-hidden="true" /></div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#5554B8]">A note from your check-ins</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#25233B]">{insights.plain_summary}</p>
              </div>
            </div>
            <div className="grid gap-3 border-t border-[#E8E6F1] pt-4 sm:grid-cols-3">
              <div className="rounded-input border border-[#E8E6F1] bg-white p-3"><p className="text-xs text-[#625F78]">Average mood</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.average_mood}<span className="text-xs font-medium text-[#625F78]"> / 5</span></p></div>
              <div className="rounded-input border border-[#E8E6F1] bg-white p-3"><p className="text-xs text-[#625F78]">Average sleep reported</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.average_sleep}<span className="text-xs font-medium text-[#625F78]"> hours</span></p></div>
              <div className="rounded-input border border-[#E8E6F1] bg-white p-3"><p className="text-xs text-[#625F78]">Average stress</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.average_stress}<span className="text-xs font-medium text-[#625F78]"> / 5</span></p></div>
            </div>
          </Card>

          <section aria-label="Mood, sleep, and stress charts" className="grid gap-5 lg:grid-cols-3">
            <Card padding="md" className="min-w-0 space-y-3 border-[#E7E4F7] shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <div><h2 className="font-bold text-[#25233B]">Mood</h2><p className="text-xs text-[#625F78]">Daily average · 1 to 5</p></div>
                <span className="rounded-full bg-[#F0EFFC] px-2.5 py-1 text-xs font-bold text-[#5554B8]">{insights.average_mood} / 5</span>
              </div>
              {dailySeries.length ? <div className="h-52 rounded-2xl border border-[#EFEDFA] bg-gradient-to-b from-[#F8F7FF] to-white px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 12, right: 12, left: -18, bottom: 2 }}>
                    <defs><linearGradient id="v2MoodFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7775D5" stopOpacity={0.22} /><stop offset="95%" stopColor="#7775D5" stopOpacity={0.015} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#EAE8F5" />
                    <XAxis dataKey="day_label" stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} tickMargin={9} minTickGap={18} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} width={26} />
                    <Tooltip cursor={{ stroke: '#B9B7E8', strokeDasharray: '4 4' }} labelStyle={{ color: '#25233B', fontWeight: 700, marginBottom: 4 }} contentStyle={{ borderColor: '#E3E0F3', borderRadius: 14, boxShadow: '0 12px 32px rgba(45,42,94,0.12)', fontSize: 12, padding: '10px 12px' }} formatter={(value: number) => [`${value} / 5`, 'Daily mood average']} />
                    <Area type="monotone" dataKey="average_mood" stroke="#5D5BBE" strokeWidth={3} fill="url(#v2MoodFill)" dot={{ r: 4, fill: '#5D5BBE', stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#FFFFFF', stroke: '#5D5BBE', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div> : <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-[#DCD9F5] bg-[#F8F7FF] px-5 text-center text-sm text-[#625F78]">Your mood chart will appear after a check-in.</div>}
              {dailySeries.length === 1 && <p className="text-xs text-[#625F78]">One day logged so far. Another check-in day will reveal a trend.</p>}
            </Card>

            <Card padding="md" className="min-w-0 space-y-3 border-[#E2EBE4] shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <div><h2 className="font-bold text-[#25233B]">Sleep</h2><p className="text-xs text-[#625F78]">Hours reported each day</p></div>
                <span className="rounded-full bg-[#EDF5EF] px-2.5 py-1 text-xs font-bold text-[#245532]">{insights.average_sleep} hrs avg</span>
              </div>
              {dailySeries.length ? <div className="h-52 rounded-2xl border border-[#E9F0EA] bg-gradient-to-b from-[#F5FAF6] to-white px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySeries} margin={{ top: 14, right: 12, left: -18, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E7EEE8" />
                    <XAxis dataKey="day_label" stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} tickMargin={9} minTickGap={18} />
                    <YAxis domain={[0, maxSleep]} stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} width={30} />
                    <ReferenceLine y={7} stroke="#79A886" strokeDasharray="5 5" label={{ value: '7h reference', position: 'insideTopLeft', fill: '#477453', fontSize: 9, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: '#EAF2EC', opacity: 0.55 }} labelStyle={{ color: '#25233B', fontWeight: 700, marginBottom: 4 }} contentStyle={{ borderColor: '#E0E9E1', borderRadius: 14, boxShadow: '0 12px 32px rgba(45,42,94,0.12)', fontSize: 12, padding: '10px 12px' }} formatter={(value: number) => [`${value} hrs`, 'Daily sleep average']} />
                    <Bar dataKey="average_sleep" maxBarSize={32} radius={[8, 8, 3, 3]}>
                      {dailySeries.map((point, index) => <Cell key={point.date_key} fill={index % 2 === 0 ? '#4F805B' : '#65916E'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div> : <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-[#DCE9DF] bg-[#F5FAF6] px-5 text-center text-sm text-[#625F78]">Sleep chart details will appear after a check-in.</div>}
              <p className="text-xs text-[#625F78]">The dashed line is a 7-hour reference for comparison, not a clinical target.</p>
            </Card>

            <Card padding="md" className="min-w-0 space-y-3 border-[#EFE6D7] shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <div><h2 className="font-bold text-[#25233B]">Stress</h2><p className="text-xs text-[#625F78]">Daily average · 1 to 5</p></div>
                <span className="rounded-full bg-[#FBF2E4] px-2.5 py-1 text-xs font-bold text-[#7A4D05]">{insights.average_stress} / 5</span>
              </div>
              {dailySeries.length ? <div className="h-52 rounded-2xl border border-[#F1EBDD] bg-gradient-to-b from-[#FFFAF1] to-white px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 12, right: 12, left: -18, bottom: 2 }}>
                    <defs><linearGradient id="v2StressFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B8873E" stopOpacity={0.2} /><stop offset="95%" stopColor="#B8873E" stopOpacity={0.015} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#F0E9DC" />
                    <XAxis dataKey="day_label" stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} tickMargin={9} minTickGap={18} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#AAA6BF" fontSize={10} tickLine={false} axisLine={false} width={26} />
                    <Tooltip cursor={{ stroke: '#D5BD91', strokeDasharray: '4 4' }} labelStyle={{ color: '#25233B', fontWeight: 700, marginBottom: 4 }} contentStyle={{ borderColor: '#EFE5D3', borderRadius: 14, boxShadow: '0 12px 32px rgba(45,42,94,0.12)', fontSize: 12, padding: '10px 12px' }} formatter={(value: number) => [`${value} / 5`, 'Daily stress average']} />
                    <Area type="monotone" dataKey="average_stress" stroke="#9A6B23" strokeWidth={3} fill="url(#v2StressFill)" dot={{ r: 4, fill: '#9A6B23', stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#FFFFFF', stroke: '#9A6B23', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div> : <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-[#E7CCA0] bg-[#FFFAF1] px-5 text-center text-sm text-[#625F78]">Stress chart details will appear after a check-in.</div>}
              {dailySeries.length === 1 && <p className="text-xs text-[#625F78]">One day logged so far. Another check-in day will reveal a trend.</p>}
            </Card>
          </section>

          <section aria-labelledby="calendar-heading" className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <Card padding="md" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9E7FB] text-[#5554B8]"><CalendarDays className="h-4 w-4" aria-hidden="true" /></div>
                <div><h2 id="calendar-heading" className="font-bold text-[#25233B]">Mood & wellbeing calendar</h2><p className="text-xs text-[#625F78]">{formatDate(insights.window_start_date)} – {formatDate(insights.window_end_date)} · {insights.timezone}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-center text-xs" aria-label={`Daily check-in calendar for the last ${days} days`}>
                  <thead><tr>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <th key={weekday} scope="col" className="pb-2 font-semibold text-[#625F78]">{weekday}</th>)}</tr></thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, row) => (
                      <tr key={row}>
                        {calendarCells.slice(row * 7, row * 7 + 7).map((dateKey, column) => {
                          const count = dateKey ? entriesByDate.get(dateKey)?.length ?? 0 : 0;
                          return <td key={`${row}-${column}`} className="p-0.5 align-top">
                            {dateKey && <button type="button" onClick={() => setSelectedDate(dateKey)} aria-pressed={selectedDate === dateKey} aria-label={`${formatDate(dateKey, { weekday: 'long', year: 'numeric' })}, ${count} ${count === 1 ? 'check-in' : 'check-ins'}`} className={`flex min-h-12 w-full flex-col items-center justify-center rounded-lg border text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${selectedDate === dateKey ? 'border-[#5554B8] bg-[#E9E7FB] text-[#25233B]' : 'border-transparent hover:border-[#DCD9F5] hover:bg-[#F7F6FB]'}`}>
                              <span>{Number(dateKey.slice(-2))}</span><span className={`mt-1 h-1.5 w-1.5 rounded-full ${count ? 'bg-[#5554B8]' : 'bg-transparent'}`} aria-hidden="true" />{count > 1 && <span className="sr-only">{count} check-ins</span>}
                            </button>}
                          </td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card padding="md" className="space-y-4" aria-live="polite">
              <div><h2 className="font-bold text-[#25233B]">{selectedDateLabel || 'Selected day'}</h2><p className="text-xs text-[#625F78]">{selectedEntries.length} {selectedEntries.length === 1 ? 'check-in' : 'check-ins'}</p></div>
              {selectedEntries.length === 0 ? <div className="rounded-input border border-dashed border-[#DCD9F5] bg-[#F7F6FB]/70 p-5 text-center text-sm text-[#625F78]">No check-ins on this day. That’s okay.</div> : <ul className="space-y-2">
                {selectedEntries.map((entry) => <li key={entry.id} className="rounded-input border border-[#E8E6F1] bg-white p-3">
                  <p className="text-xs font-semibold text-[#5554B8]">{entry.local_time_label}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-[#625F78]">Mood</dt><dd className="font-semibold text-[#25233B]">{entry.mood} / 5</dd></div><div><dt className="text-[#625F78]">Sleep</dt><dd className="font-semibold text-[#25233B]">{entry.sleep_hours.toFixed(1)} h</dd></div><div><dt className="text-[#625F78]">Stress</dt><dd className="font-semibold text-[#25233B]">{entry.stress} / 5</dd></div></dl>
                </li>)}
              </ul>}
            </Card>
          </section>

          <section aria-labelledby="comparison-heading">
            <Card padding="md" className="space-y-4">
              <div className="flex items-center justify-between gap-3"><div><h2 id="comparison-heading" className="font-bold text-[#25233B]">Period comparison</h2><p className="text-xs text-[#625F78]">This {days}-day period compared with the previous {days} days</p></div><Activity className="h-5 w-5 text-[#5554B8]" aria-hidden="true" /></div>
              {insights.comparison.state === 'ready' && insights.comparison.mood && insights.comparison.stress && insights.comparison.sleep ? <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ComparisonValue label="Mood change" value={insights.comparison.mood.difference} unit="points" />
                  <ComparisonValue label="Stress change" value={insights.comparison.stress.difference} unit="points" />
                  <ComparisonValue label="Sleep reported change" value={insights.comparison.sleep.difference} unit="hours" />
                </div>
                <p className="text-xs leading-relaxed text-[#625F78]">Averages use {insights.comparison.current_check_in_count} recent and {insights.comparison.previous_check_in_count} earlier check-ins. Differences describe the ratings only; they do not show that one thing caused another.</p>
              </> : <div role="status" className="rounded-input bg-[#F7F6FB] p-4 text-sm text-[#625F78]">Not enough check-ins to compare yet. Each period needs at least {insights.comparison.minimum_checkins_per_period} check-ins across 2 or more days.</div>}
            </Card>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <Card padding="md" className="space-y-4">
              <div><h2 className="font-bold text-[#25233B]">Check-in rhythm</h2><p className="text-xs text-[#625F78]">Participation across this {days}-day window</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Check-ins</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.check_in_count}</p></div>
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Active days</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.distinct_local_days} <span className="text-xs font-medium">/ {days}</span></p></div>
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Average per week</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.average_checkins_per_week}</p></div>
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Days with a check-in</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.active_day_rate}%</p></div>
              </div>
              <p className="text-xs text-[#625F78]">There’s no streak to maintain. Checking in when it’s useful is enough.</p>
              <p className="text-xs text-[#8E8AA7]">{insights.total_stored_count} check-ins in retained history (up to {insights.retention_days} days).</p>
            </Card>

            <Card padding="md" className="space-y-4">
              <div className="flex items-center gap-2"><Moon className="h-5 w-5 text-[#245532]" aria-hidden="true" /><div><h2 className="font-bold text-[#25233B]">Sleep rhythm</h2><p className="text-xs text-[#625F78]">Based on sleep durations entered in check-ins</p></div></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Average</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.average_sleep}<span className="text-xs font-medium"> h</span></p></div>
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Daily range</p><p className="mt-1 text-sm font-bold text-[#25233B]">{dailySleepRange}</p></div>
                <div className="rounded-input bg-[#F7F6FB] p-3"><p className="text-xs text-[#625F78]">Days at 7+ h*</p><p className="mt-1 text-lg font-bold text-[#25233B]">{insights.sleep_7h_plus_day_count}</p></div>
              </div>
              {dailySeries.length ? <div className="space-y-2" aria-label="Daily average sleep durations">
                {dailySeries.slice(-7).map((point) => <div key={point.date_key} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-xs"><span className="text-[#625F78]">{formatDate(point.date_key)}</span><div className="h-2 overflow-hidden rounded-full bg-[#E8E6F1]"><div className="h-full rounded-full bg-[#84A98C]" style={{ width: `${Math.max(0, Math.min(100, point.average_sleep / maxSleep * 100))}%` }} /></div><span className="text-right font-medium text-[#25233B]">{point.average_sleep} h</span></div>)}
              </div> : <p className="text-sm text-[#625F78]">Sleep rhythm details will appear after a check-in.</p>}
              <p className="text-xs text-[#625F78]">*Counts days where the average sleep duration entered that day was at least 7 hours. This is a summary of your entries, not a health rating.</p>
            </Card>
          </section>

          <section aria-labelledby="reflection-heading" className="space-y-3">
            <div><h2 id="reflection-heading" className="font-bold text-[#25233B]">Patterns to reflect on</h2><p className="text-xs text-[#625F78]">Generated from check-in numbers using fixed rules.</p></div>
            {insights.pattern_highlights.length ? <div className="grid gap-3 md:grid-cols-2">
              {insights.pattern_highlights.map((pattern) => <Card key={pattern.id} padding="md" className="space-y-2"><h3 className="text-sm font-bold text-[#25233B]">{pattern.title}</h3><p className="text-sm leading-relaxed text-[#625F78]">{pattern.summary}</p><p className="text-xs text-[#8E8AA7]">{pattern.sample_basis}</p></Card>)}
            </div> : <Card padding="md" className="text-sm text-[#625F78]">A few more check-ins across multiple days can help reveal descriptive patterns. No pressure to check in on a schedule.</Card>}
          </section>

          <div className="pt-2 text-center"><p className="mx-auto max-w-2xl text-xs leading-relaxed text-[#625F78]">Your check-in history is scoped to your anonymous session and follows your data-retention setting. <Link to="/settings" className="font-semibold text-[#5554B8] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]">View privacy settings</Link></p></div>
        </>
      )}
    </div>
  );
};
