import { CheckInRecord, RiskRoute } from '../types';

export type MoodRangeDays = 7 | 14 | 30;

export const MOOD_RANGE_OPTIONS: readonly MoodRangeDays[] = [7, 14, 30];

export interface MoodTrendInputItem {
  day?: string | null;
  mood?: number | null;
  route?: RiskRoute;
}

export interface DailyMoodPoint {
  day: string;
  mood: number;
  count: number;
}

export interface MoodSummaryMetricDay {
  day: string;
  mood: number;
}

export interface MoodTrendSummary {
  overallAverage: number | null;
  highestDay: MoodSummaryMetricDay | null;
  lowestDay: MoodSummaryMetricDay | null;
  totalCheckIns: number;
  dayCount: number;
}

function isValidMoodValue(mood: unknown): mood is number {
  return typeof mood === 'number' && Number.isFinite(mood) && mood >= 1 && mood <= 5;
}

function formatShortDayLabel(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const dayNum = date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' });
  return `${weekday} ${dayNum}`;
}

/**
 * Aggregates check-in mood entries by their existing `day` key, preserving
 * chronological order and computing the daily average mood (rounded to 1 decimal).
 * Invalid, missing, or out-of-range (outside 1–5) entries are safely skipped.
 */
export function aggregateDailyMoodTrend(
  moodTrend: readonly MoodTrendInputItem[] | null | undefined
): DailyMoodPoint[] {
  if (!Array.isArray(moodTrend) || moodTrend.length === 0) {
    return [];
  }

  const dailyBuckets = new Map<string, { sum: number; count: number }>();

  for (const entry of moodTrend) {
    if (!entry || typeof entry.day !== 'string') {
      continue;
    }
    const dayKey = entry.day.trim();
    if (!dayKey || !isValidMoodValue(entry.mood)) {
      continue;
    }

    const existing = dailyBuckets.get(dayKey);
    if (existing) {
      existing.sum += entry.mood;
      existing.count += 1;
    } else {
      dailyBuckets.set(dayKey, { sum: entry.mood, count: 1 });
    }
  }

  const result: DailyMoodPoint[] = [];
  for (const [day, { sum, count }] of dailyBuckets.entries()) {
    const average = Math.round((sum / count) * 10) / 10;
    result.push({ day, mood: average, count });
  }

  return result;
}

/**
 * Filters raw CheckInRecord items to the requested day window using full ISO
 * timestamps (never parsing abbreviated display labels), sorts chronologically,
 * and aggregates into one DailyMoodPoint per calendar day.
 */
export function filterAndAggregateMoodHistory(
  records: readonly CheckInRecord[] | null | undefined,
  days: MoodRangeDays,
  referenceDate: Date = new Date()
): DailyMoodPoint[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  const refMs = referenceDate.getTime();
  if (!Number.isFinite(refMs)) {
    return [];
  }

  // Start of UTC day (days - 1) days ago so "7 Days" includes today + prior 6 days.
  const startOfRefDayUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
  const cutoffMs = startOfRefDayUtc - (days - 1) * 24 * 60 * 60 * 1000;

  const validRecords: Array<{ ms: number; isoDay: string; label: string; mood: number }> = [];

  for (const rec of records) {
    if (!rec || typeof rec.timestamp !== 'string' || !isValidMoodValue(rec.mood)) {
      continue;
    }
    const ms = Date.parse(rec.timestamp);
    if (!Number.isFinite(ms) || ms < cutoffMs || ms > refMs + 24 * 60 * 60 * 1000) {
      continue;
    }
    const d = new Date(ms);
    const isoDay = d.toISOString().slice(0, 10);
    validRecords.push({
      ms,
      isoDay,
      label: formatShortDayLabel(d),
      mood: rec.mood,
    });
  }

  validRecords.sort((a, b) => a.ms - b.ms);

  // Group by full YYYY-MM-DD key so cross-month labels (e.g., in 30-day view) stay distinct.
  const buckets = new Map<string, { label: string; sum: number; count: number }>();
  for (const item of validRecords) {
    const existing = buckets.get(item.isoDay);
    if (existing) {
      existing.sum += item.mood;
      existing.count += 1;
    } else {
      buckets.set(item.isoDay, { label: item.label, sum: item.mood, count: 1 });
    }
  }

  const result: DailyMoodPoint[] = [];
  for (const { label, sum, count } of buckets.values()) {
    result.push({
      day: label,
      mood: Math.round((sum / count) * 10) / 10,
      count,
    });
  }

  return result;
}

/**
 * Computes mood summary metrics directly from aggregated DailyMoodPoint data.
 */
export function computeMoodTrendSummary(
  dailyPoints: readonly DailyMoodPoint[] | null | undefined
): MoodTrendSummary {
  if (!Array.isArray(dailyPoints) || dailyPoints.length === 0) {
    return {
      overallAverage: null,
      highestDay: null,
      lowestDay: null,
      totalCheckIns: 0,
      dayCount: 0,
    };
  }

  let moodSum = 0;
  let validDays = 0;
  let totalCheckIns = 0;
  let highestDay: MoodSummaryMetricDay | null = null;
  let lowestDay: MoodSummaryMetricDay | null = null;

  for (const point of dailyPoints) {
    if (!point || typeof point.day !== 'string' || !isValidMoodValue(point.mood)) {
      continue;
    }
    const count =
      typeof point.count === 'number' && Number.isFinite(point.count) && point.count > 0
        ? Math.floor(point.count)
        : 1;

    moodSum += point.mood;
    validDays += 1;
    totalCheckIns += count;

    if (!highestDay || point.mood > highestDay.mood) {
      highestDay = { day: point.day, mood: point.mood };
    }
    if (!lowestDay || point.mood < lowestDay.mood) {
      lowestDay = { day: point.day, mood: point.mood };
    }
  }

  if (validDays === 0) {
    return {
      overallAverage: null,
      highestDay: null,
      lowestDay: null,
      totalCheckIns: 0,
      dayCount: 0,
    };
  }

  return {
    overallAverage: Math.round((moodSum / validDays) * 10) / 10,
    highestDay,
    lowestDay,
    totalCheckIns,
    dayCount: validDays,
  };
}
