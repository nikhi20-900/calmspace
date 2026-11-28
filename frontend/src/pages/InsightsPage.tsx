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
import { InsightSummary } from '../types';
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

type TimestampedTrend = { day: string; timestamp: string; record_index: number };

const chartDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
});
const chartTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});
const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const withLocalChartLabels = <T extends TimestampedTrend>(entries: T[]) => {
  const parsedEntries = entries.map((entry) => {
    const date = new Date(entry.timestamp);
    const validDate = Number.isNaN(date.getTime()) ? null : date;
    const localDay = validDate
      ? `${validDate.getFullYear()}-${validDate.getMonth()}-${validDate.getDate()}`
      : null;
    return { entry, date: validDate, localDay };
  });
  const entriesPerDay = new Map<string, number>();
  parsedEntries.forEach(({ localDay }) => {
    if (localDay) entriesPerDay.set(localDay, (entriesPerDay.get(localDay) ?? 0) + 1);
  });

  const usedLabels = new Set<string>();
  return parsedEntries.map(({ entry, date, localDay }) => {
    let day = date ? chartDateFormatter.format(date) : `Entry ${entry.record_index + 1}`;
    if (date && localDay && (entriesPerDay.get(localDay) ?? 0) > 1) {
      day = `${day} · ${chartTimeFormatter.format(date)}`;
    }
    if (usedLabels.has(day)) day = `${day} · Entry ${entry.record_index + 1}`;
    usedLabels.add(day);
    return { ...entry, day };
  });
};

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
      // Suppress detailed internal error objects from browser console
      setLoadError(true);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const moodChartData = useMemo(
    () => withLocalChartLabels(insights?.mood_trend ?? []),
    [insights],
  );
  const sleepChartData = useMemo(
    () => withLocalChartLabels(insights?.sleep_trend ?? []),
    [insights],
  );
  const stressChartData = useMemo(
    () => withLocalChartLabels(insights?.stress_trend ?? []),
    [insights],
  );

  // Keep one table row per check-in, including multiple entries on the same date.
  const tableRows = useMemo(() => {
    if (!insights) return [];

    const sleepByIndex = new Map(insights.sleep_trend.map((entry, index) => [entry.record_index ?? index, entry]));
    const stressByIndex = new Map(insights.stress_trend.map((entry, index) => [entry.record_index ?? index, entry]));
    return moodChartData.map((mood, index) => {
      const recordIndex = mood.record_index ?? index;
      return {
        day: mood.day,
        timestamp: mood.timestamp,
        recordIndex,
        mood: mood.mood ?? null,
        sleep: sleepByIndex.get(recordIndex)?.sleep ?? null,
        stress: stressByIndex.get(recordIndex)?.stress ?? null,
        route: mood.route,
      };
    });
  }, [insights, moodChartData]);

  const formatTooltipDate = (label: unknown, payload: ReadonlyArray<{ payload?: { timestamp?: string } }> = []) => {
    const timestamp = payload[0]?.payload?.timestamp;
    if (!timestamp) return String(label ?? '');
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? String(label ?? '') : tooltipDateFormatter.format(date);
  };

  // Loading State
  if (loading) {
    return <LoadingState message="Compiling your personal insights..." />;
  }

  // Error State
  if (loadError) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
        <PageHeader
          tag="Personal Wellbeing Analytics"
          title="Understanding your rhythm"
          description="Reflective patterns over time. Never medical diagnoses — strictly supportive observations."
        />

        <Card padding="lg" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FDEEE9] flex items-center justify-center text-[#B24823] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-[#25233B]">
              Unable to load your insights
            </h2>
            <p className="text-xs sm:text-sm text-[#625F78] leading-relaxed">
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

        {/* Time-Range Filter */}
        <div
          role="group"
          aria-label="Select insight time range"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-button border border-[#E8E6F1] shadow-subtle shrink-0 self-start sm:self-auto"
        >
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-button transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${days === d
                ? 'bg-[#5554B8] text-white shadow-xs'
                : 'text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
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
        className="p-3.5 sm:p-4 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] flex items-start gap-3"
      >
        <ShieldCheck className="w-5 h-5 text-[#5554B8] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-[#625F78] leading-relaxed">
          <strong className="text-[#25233B] font-semibold block sm:inline mr-1">
            Supportive Reflection, Not a Diagnosis:
          </strong>
          These charts reflect your self-reported check-ins to help you observe personal rhythms. Calmspace never calculates clinical scores, diagnoses medical conditions, or substitutes for professional care.
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <Card padding="lg" className="text-center py-16 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E9E7FB] flex items-center justify-center text-[#5554B8] mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-[#25233B]">
              No check-ins logged for this {days}-day window
            </h2>
            <p className="text-xs sm:text-sm text-[#625F78] leading-relaxed">
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
          {/* Small Sample Size Notice */}
          {isSmallSample && (
            <div
              role="status"
              className="p-3.5 rounded-card bg-[#FFFDF9] border border-[#F4DCCB] flex items-start gap-3 text-xs text-[#7A4D05]"
            >
              <Info className="w-4 h-4 text-[#7A4D05] shrink-0 mt-0.5" />
              <span>
                <strong>Early observations:</strong> You have logged {insights?.check_in_count}{' '}
                {insights?.check_in_count === 1 ? 'check-in' : 'check-ins'} in this {days}-day window. Averages and lines will reflect clearer patterns as you continue checking in.
              </span>
            </div>
          )}

          {/* Plain Language Summary & Summary Metric Chips */}
          <Card padding="lg" className="space-y-4 bg-gradient-to-r from-[#F0EFFC]/40 via-white to-[#F4DCCB]/15">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E9E7FB] flex items-center justify-center text-[#5554B8] shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5554B8]">
                  Accessible Plain-Language Summary
                </span>
                <p className="text-sm sm:text-base text-[#25233B] font-medium leading-relaxed">
                  {insights?.plain_summary}
                </p>
              </div>
            </div>

            {/* Quick summary stat pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8E6F1]/80">
              <div className="p-3 rounded-input bg-white border border-[#E8E6F1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[#5554B8]" />
                  <span className="text-xs text-[#625F78]">Average Mood</span>
                </div>
                <span className="text-sm font-bold text-[#25233B]">
                  {insights?.average_mood} <span className="text-xs font-normal text-[#625F78]">/ 5</span>
                </span>
              </div>

              <div className="p-3 rounded-input bg-white border border-[#E8E6F1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#245532]" />
                  <span className="text-xs text-[#625F78]">Average Sleep</span>
                </div>
                <span className="text-sm font-bold text-[#25233B]">
                  {insights?.average_sleep} <span className="text-xs font-normal text-[#625F78]">hrs</span>
                </span>
              </div>

              <div className="p-3 rounded-input bg-white border border-[#E8E6F1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7A4D05]" />
                  <span className="text-xs text-[#625F78]">Average Stress</span>
                </div>
                <span className="text-sm font-bold text-[#25233B]">
                  {insights?.average_stress} <span className="text-xs font-normal text-[#625F78]">/ 5</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Consistent chart grid keeps single-entry datasets compact and readable. */}
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 items-stretch">
          {/* Metric 1: Mood Evolution Chart */}
          <Card padding="md" className="h-full min-w-0 flex flex-col gap-3">
            <div className="flex flex-col gap-2 pb-2 border-b border-[#F0EFF7]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#E9E7FB] flex items-center justify-center text-[#5554B8] shrink-0">
                  <Smile className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-[#25233B]">
                    Mood Evolution (1 to 5)
                  </h3>
                  <p className="text-xs text-[#625F78]">
                    Higher values reflect more balanced headspace. Average: {insights?.average_mood} / 5
                  </p>
                </div>
              </div>

              {/* Non-color-only legend */}
              <div className="flex items-center gap-2 text-xs text-[#625F78]">
                <span className="inline-block w-3 h-3 rounded-full bg-[#5554B8]" aria-hidden="true" />
                <span>Mood rating</span>
              </div>
            </div>

            {/* Accompanying plain text summary */}
            <p className="text-xs leading-relaxed text-[#625F78] bg-[#F7F6FB] p-2.5 rounded-input border border-[#E8E6F1]">
              <strong>Mood Summary:</strong> Average {insights?.average_mood} out of 5 across {insights?.check_in_count} {insights?.check_in_count === 1 ? 'check-in' : 'check-ins'} in the last {days} days.
            </p>
            {insights?.mood_trend.length === 1 && (
              <p className="text-xs text-[#625F78]">One check-in is shown. Add another check-in to see how your mood changes over time.</p>
            )}

            <div className="h-48 w-full mt-auto pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={moodChartData}
                  margin={{ top: 10, right: 12, left: -18, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                  <XAxis
                    dataKey="day"
                    stroke="#8E8AA7"
                    fontSize={11}
                    tickLine={false}
                    aria-label="Date of check-in"
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="#8E8AA7"
                    fontSize={11}
                    tickLine={false}
                    aria-label="Mood score from 1 to 5"
                  />
                  <Tooltip
                    labelFormatter={formatTooltipDate}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E8E6F1',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [
                      val != null ? `${val} / 5` : 'Not recorded',
                      'Mood Score',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    name="Mood Score"
                    stroke="#5554B8"
                    strokeWidth={(insights?.mood_trend?.length ?? 0) > 1 ? 2.5 : 0}
                    connectNulls={false}
                    dot={{ r: 5, fill: '#5554B8', stroke: '#FFFFFF', strokeWidth: 2 }}
                    activeDot={{ r: 7, stroke: '#5554B8', strokeWidth: 2, fill: '#FFFFFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

            {/* Sleep Rest Chart */}
            <Card padding="md" className="h-full min-w-0 flex flex-col gap-3">
              <div className="flex flex-col gap-2 pb-2 border-b border-[#F0EFF7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#DCE9DF] flex items-center justify-center text-[#245532] shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold leading-snug text-[#25233B]">
                      Sleep Duration (Hours)
                    </h3>
                    <p className="text-xs text-[#625F78]">
                      Average nightly rest: {insights?.average_sleep} hrs
                    </p>
                  </div>
                </div>

                {/* Non-color-only legend */}
                <div className="flex items-center gap-1.5 text-xs text-[#625F78]">
                  <span className="inline-block w-3 h-3 bg-[#245532] rounded-xs" aria-hidden="true" />
                  <span>Sleep duration</span>
                </div>
              </div>

              {/* Accompanying plain text summary */}
              <p className="text-xs leading-relaxed text-[#625F78] bg-[#F7F6FB] p-2.5 rounded-input border border-[#E8E6F1]">
                <strong>Sleep Summary:</strong> Average nightly rest was {insights?.average_sleep} hours over the last {days} days. The dashed line is a 7-hour reference for comparison, not a clinical target.
              </p>
              {insights?.sleep_trend.length === 1 && (
                <p className="text-xs text-[#625F78]">One check-in is shown. Add another check-in to compare sleep across dates.</p>
              )}

              <div className="h-48 w-full mt-auto pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sleepChartData}
                    margin={{ top: 10, right: 12, left: -18, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                    <XAxis
                      dataKey="day"
                      stroke="#8E8AA7"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      stroke="#8E8AA7"
                      fontSize={11}
                      tickLine={false}
                    />
                    <ReferenceLine
                      y={7}
                      stroke="#BCD4C3"
                      strokeDasharray="4 4"
                      label={{
                        value: '7h reference',
                        position: 'insideTopLeft',
                        fill: '#245532',
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      labelFormatter={formatTooltipDate}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E8E6F1',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [
                        val != null ? `${val} hrs` : 'Not recorded',
                        'Hours Slept',
                      ]}
                    />
                    <Bar
                      dataKey="sleep"
                      name="Hours Slept"
                      fill="#245532"
                      maxBarSize={40}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Academic Stress Load Chart */}
            <Card padding="md" className="h-full min-w-0 flex flex-col gap-3">
              <div className="flex flex-col gap-2 pb-2 border-b border-[#F0EFF7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F6E6CC] flex items-center justify-center text-[#7A4D05] shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold leading-snug text-[#25233B]">
                      Academic Stress Load (1 to 5)
                    </h3>
                    <p className="text-xs text-[#625F78]">
                      Average load: {insights?.average_stress} / 5
                    </p>
                  </div>
                </div>

                {/* Non-color-only legend */}
                <div className="flex items-center gap-1.5 text-xs text-[#625F78]">
                  <span className="inline-block w-3 h-0.5 bg-[#7A4D05]" aria-hidden="true" />
                  <span>Stress rating</span>
                </div>
              </div>

              {/* Accompanying plain text summary */}
              <p className="text-xs leading-relaxed text-[#625F78] bg-[#F7F6FB] p-2.5 rounded-input border border-[#E8E6F1]">
                <strong>Stress Summary:</strong> Average load was {insights?.average_stress} out of 5 over the last {days} days.
              </p>
              {insights?.stress_trend.length === 1 && (
                <p className="text-xs text-[#625F78]">One check-in is shown. Add another check-in to see how your stress rating changes over time.</p>
              )}

              <div className="h-48 w-full mt-auto pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stressChartData}
                    margin={{ top: 10, right: 12, left: -18, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                    <XAxis
                      dataKey="day"
                      stroke="#8E8AA7"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      stroke="#8E8AA7"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={formatTooltipDate}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E8E6F1',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [
                        val != null ? `${val} / 5` : 'Not recorded',
                        'Stress Rating',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      name="Stress Rating"
                      stroke="#7A4D05"
                      strokeWidth={(insights?.stress_trend?.length ?? 0) > 1 ? 2.5 : 0}
                      connectNulls={false}
                      dot={{ r: 5, fill: '#7A4D05', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: '#7A4D05', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Accessible Data Table Section (Screen-Reader Optimized) */}
          <div className="mt-8 bg-white p-4 sm:p-5 rounded-card border border-[#E8E6F1] shadow-subtle space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#625F78]">
                <Table className="w-4 h-4 text-[#5554B8]" />
                <span>Screen-Reader Accessible Data Table</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTableVisible(!isTableVisible)}
                aria-expanded={isTableVisible}
                aria-controls="accessible-insights-table"
                className="text-xs font-medium text-[#5554B8] hover:text-[#4645A7] focus-visible:outline-none focus-visible:underline"
              >
                {isTableVisible ? 'Hide Table View' : 'Show Table View'}
              </button>
            </div>

            {isTableVisible && (
              <div id="accessible-insights-table" className="overflow-x-auto pt-1">
                <table className="w-full text-left text-xs text-[#25233B]">
                  <caption className="sr-only">
                    Tabular breakdown of your daily check-in ratings for mood, sleep duration, and stress level over the selected {days}-day period.
                  </caption>
                  <thead className="border-b border-[#E8E6F1] text-[#625F78] bg-[#F7F6FB]">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Entry Date / Label</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Mood (1 to 5)</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Sleep Duration</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Stress Load (1 to 5)</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Support Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFF7]">
                    {tableRows.map((row) => (
                      <tr key={row.recordIndex} className="hover:bg-[#F7F6FB]/60 transition-colors">
                        <th scope="row" className="py-2.5 px-3 font-medium text-[#25233B]">
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
                          {row.route ? <Badge route={row.route} /> : <span className="text-[#8E8AA7]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Privacy & Non-diagnostic Assurance Footer */}
          <div className="pt-4 text-center">
            <p className="text-xs text-[#625F78] max-w-lg mx-auto leading-relaxed">
              Your check-in ratings are private and scoped to your anonymous session. Calmspace never computes clinical diagnosis metrics or shares wellbeing records with academic systems.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
